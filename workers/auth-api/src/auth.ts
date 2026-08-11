import { AsyncLocalStorage } from "node:async_hooks";
import { CinaAuth } from "cinaauth";
import { createDatabase } from "./database";
import { enqueueDelivery } from "./delivery";
import type { CloudflareBindings } from "./env";
import { createAuthPlugins, TRUSTED_ORIGINS } from "./plugins";
import {
	createDurableObjectRateLimitStorage,
	LOGIN_RATE_LIMIT_RULES,
} from "./rate-limit-storage";

/** Maximum age of a session used for sensitive self-service mutations. */
export const SECURITY_FRESH_AGE_SECONDS = 15 * 60;

const logBackgroundTaskError = (error: unknown) => {
	console.error(
		JSON.stringify({
			level: "error",
			message: "cinaauth.background_task_failed",
			error: error instanceof Error ? error.message : String(error),
		}),
	);
};

/**
 * Carries the current request's ExecutionContext to background-task handlers.
 * The request path runs inside runWithExecutionCtx so background tasks can be
 * attached to the active Worker request without closing over its context.
 */
type BackgroundTaskContext = {
	waitUntil: (promise: Promise<unknown>) => void;
};

const executionCtxStore = new AsyncLocalStorage<BackgroundTaskContext>();

type SocialProviderEnv = Pick<
	CloudflareBindings,
	| "GOOGLE_CLIENT_ID"
	| "GOOGLE_CLIENT_SECRET"
	| "GITHUB_CLIENT_ID"
	| "GITHUB_CLIENT_SECRET"
>;

const hasCredential = (value: string | undefined) =>
	typeof value === "string" && value.trim().length > 0;
const ACCOUNT_ORIGIN = "https://accounts.cinaseek.ai";

/** Builds only fully configured social providers; partial credentials fail closed. */
export const getConfiguredSocialProviders = (env: SocialProviderEnv) => ({
	...(hasCredential(env.GOOGLE_CLIENT_ID) &&
	hasCredential(env.GOOGLE_CLIENT_SECRET)
		? {
				google: {
					clientId: env.GOOGLE_CLIENT_ID!,
					clientSecret: env.GOOGLE_CLIENT_SECRET!,
					redirectURI: `${ACCOUNT_ORIGIN}/api/auth/callback/google`,
				},
			}
		: {}),
	...(hasCredential(env.GITHUB_CLIENT_ID) &&
	hasCredential(env.GITHUB_CLIENT_SECRET)
		? {
				github: {
					clientId: env.GITHUB_CLIENT_ID!,
					clientSecret: env.GITHUB_CLIENT_SECRET!,
					redirectURI: `${ACCOUNT_ORIGIN}/api/auth/callback/github`,
				},
			}
		: {}),
});

const RESERVED_SOCIAL_PROVIDER_CONFIG = {
	clientId: "provider-id-reservation-only",
	clientSecret: "provider-id-reservation-only",
	enabled: false,
} as const;

/**
 * Preserves the production provider-id namespace across credential outages.
 * Disabled placeholders are not usable providers, but their raw option keys
 * keep SSO and SCIM from claiming the well-known Google/GitHub identifiers.
 */
export const getProductionSocialProviders = (env: SocialProviderEnv) => {
	const configured = getConfiguredSocialProviders(env);
	return {
		google: configured.google ?? RESERVED_SOCIAL_PROVIDER_CONFIG,
		github: configured.github ?? RESERVED_SOCIAL_PROVIDER_CONFIG,
	};
};

export const runWithExecutionCtx = <T>(
	ctx: BackgroundTaskContext,
	fn: () => T,
): T => executionCtxStore.run(ctx, fn);

/**
 * Builds a CinaAuth instance for the current Worker bindings. PostgreSQL is
 * reached exclusively through Hyperdrive, while rate-limit mutations are
 * serialized by sharded Durable Objects.
 */
const buildAuth = (env: CloudflareBindings) =>
	CinaAuth({
		baseURL: env.CINAAUTH_URL || "https://auth.cinaseek.ai",
		secret: env.CINAAUTH_SECRET,
		database: createDatabase(env),
		socialProviders: getProductionSocialProviders(env),
		emailAndPassword: {
			enabled: true,
			revokeSessionsOnPasswordReset: true,
			// Wire the classic reset-link flow to the delivery queue; without this
			// /request-password-reset returns 400 RESET_PASSWORD_DISABLED.
			sendResetPassword: async ({ user, url }) => {
				await enqueueDelivery(env, {
					kind: "password-reset",
					payload: { email: user.email, url },
				});
			},
		},
		session: {
			// Sensitive account operations require a recent authentication. Keep
			// this materially shorter than the session lifetime while still allowing
			// a user to finish a security-settings workflow without racing the clock.
			freshAge: SECURITY_FRESH_AGE_SECONDS,
			// Serve most get-session calls from a signed session cookie instead of a
			// PostgreSQL read. Revocations and bans take effect within maxAge (5 min).
			cookieCache: {
				enabled: true,
				maxAge: 300,
			},
		},
		user: {
			deleteUser: {
				enabled: true,
			},
		},
		account: {
			accountLinking: {
				enabled: true,
				// Linking is an explicit Security Center action. A matching email at
				// sign-in must never silently attach a new identity to an account.
				disableImplicitLinking: true,
				requireLocalEmailVerified: true,
				allowDifferentEmails: false,
				allowUnlinkingAll: false,
			},
		},
		rateLimit: {
			enabled: true,
			customStorage: createDurableObjectRateLimitStorage(env),
			customRules: LOGIN_RATE_LIMIT_RULES,
			window: 60,
			max: 300,
		},
		plugins: createAuthPlugins(env, { advancedOrganization: true }),
		trustedOrigins: TRUSTED_ORIGINS,
		advanced: {
			backgroundTasks: {
				handler: (p) => {
					const wrapped = p.catch(logBackgroundTaskError);
					// Present during any request wrapped by runWithExecutionCtx; absent
					// paths (e.g. the queue handler) never register background tasks.
					executionCtxStore.getStore()?.waitUntil(wrapped);
				},
			},
			ipAddress: {
				ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
			},
		},
	});

export type Auth = ReturnType<typeof buildAuth>;

/**
 * Creates a request-scoped auth instance. The PostgreSQL driver must not retain
 * request I/O across Worker invocations; Hyperdrive owns the durable upstream
 * pool, while the local pg pool releases idle clients promptly.
 */
export const createAuth = (env: CloudflareBindings): Auth => buildAuth(env);
