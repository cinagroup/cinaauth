import { AsyncLocalStorage } from "node:async_hooks";
import { CinaAuth } from "cinaauth";
import { createDatabase } from "./database";
import type { CloudflareBindings } from "./env";
import { requireAuthOriginConfig } from "./origin-config";
import { createAuthPlugins } from "./plugins";
import {
	AUTH_RATE_LIMIT_RULES,
	createDurableObjectRateLimitStorage,
} from "./rate-limit-storage";
import { resolveSocialSignInConfig } from "./social-provider-store";

export {
	getConfiguredSocialProviders,
	getProductionSocialProviders,
} from "./social-provider-catalog";

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

export const runWithExecutionCtx = <T>(
	ctx: BackgroundTaskContext,
	fn: () => T,
): T => executionCtxStore.run(ctx, fn);

/**
 * Builds a CinaAuth instance for the current Worker bindings. PostgreSQL is
 * reached exclusively through Hyperdrive, while rate-limit mutations are
 * serialized by sharded Durable Objects.
 */
const buildAuth = (
	env: CloudflareBindings,
	social: Awaited<ReturnType<typeof resolveSocialSignInConfig>>,
) => {
	const origins = requireAuthOriginConfig(env);
	return CinaAuth({
		baseURL: origins.authOrigin,
		secret: env.CINAAUTH_SECRET,
		database: createDatabase(env),
		socialProviders: social.socialProviders,
		emailAndPassword: {
			// Production email authentication is deliberately passwordless. Existing
			// credential rows remain untouched as a rollback aid, but no public email
			// password sign-in, sign-up, or reset route is registered.
			enabled: false,
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
			customRules: AUTH_RATE_LIMIT_RULES,
			window: 60,
			max: 300,
		},
		plugins: createAuthPlugins(
			env,
			{ advancedOrganization: true },
			social.genericProviders,
		),
		trustedOrigins: origins.trustedOrigins,
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
};

export type Auth = ReturnType<typeof buildAuth>;

/**
 * Creates a request-scoped auth instance. The PostgreSQL driver must not retain
 * request I/O across Worker invocations; Hyperdrive owns the durable upstream
 * pool, while the local pg pool releases idle clients promptly. Social sign-in
 * providers come from the cached runtime resolver (database rows overriding
 * deploy-time environment credentials).
 */
export const createAuth = async (env: CloudflareBindings): Promise<Auth> => {
	const accountOrigin = requireAuthOriginConfig(env).accountOrigin;
	const social = await resolveSocialSignInConfig(env, accountOrigin);
	return buildAuth(env, social);
};
