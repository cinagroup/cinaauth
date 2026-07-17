import { AsyncLocalStorage } from "node:async_hooks";
import { CinaAuth } from "cinaauth";
import { enqueueDelivery } from "./delivery";
import type { CloudflareBindings } from "./env";
import { createAuthPlugins, TRUSTED_ORIGINS } from "./plugins";

export { ac, roles } from "./plugins";

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
 * The auth instance is cached across requests (see createAuth), so it must not
 * close over a per-request ctx; instead the request path runs inside
 * runWithExecutionCtx and the handler reads the active ctx from here.
 */
const executionCtxStore = new AsyncLocalStorage<ExecutionContext>();

export const runWithExecutionCtx = <T>(
	ctx: ExecutionContext,
	fn: () => T,
): T => executionCtxStore.run(ctx, fn);

/**
 * Builds a CinaAuth instance for the current Worker bindings. D1 is passed
 * directly so CinaAuth's Kysely adapter can auto-detect Cloudflare D1 and keep
 * plugin schema generation aligned with runtime behavior.
 */
const buildAuth = (env: CloudflareBindings) =>
	CinaAuth({
		baseURL: env.CINAAUTH_URL || "https://auth.cinagroup.com",
		secret: env.CINAAUTH_SECRET,
		database: env.DB,
		emailAndPassword: {
			enabled: true,
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
			// Serve most get-session calls from a signed session cookie instead of a
			// D1 read. Revocations and bans take effect within maxAge (5 min).
			cookieCache: {
				enabled: true,
				maxAge: 300,
			},
		},
		rateLimit: {
			enabled: true,
			// "memory" avoids D1 hot-row contention on the rateLimit table under
			// high concurrency. Each isolate counts independently, so the effective
			// limit is per-isolate (slightly more permissive than a global counter).
			// For strict global rate limiting, use Cloudflare's native Rate Limiting
			// rules in the dashboard instead.
			storage: "memory",
			window: 60,
			max: 300,
		},
		plugins: createAuthPlugins(env),
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
			// Share session cookies across *.cinagroup.com subdomains so the admin
			// console can read the auth frontend session cookie after login.
			crossSubDomainCookies: {
				enabled: true,
				domain: ".cinagroup.com",
			},
			ipAddress: {
				ipAddressHeaders: [
					"cf-connecting-ip",
					"x-forwarded-for",
					"x-real-ip",
				],
			},
		},
	});

export type Auth = ReturnType<typeof buildAuth>;

/**
 * Cache the instance per isolate. Construction performs no DB or network I/O and
 * closes over `env` only, so one instance safely serves every request in an
 * isolate; the per-request ExecutionContext is supplied via executionCtxStore.
 * A new isolate (or a changed env identity) rebuilds it.
 */
let cached: { env: CloudflareBindings; auth: Auth } | null = null;

export const createAuth = (env: CloudflareBindings): Auth => {
	if (cached && cached.env === env) {
		return cached.auth;
	}
	const auth = buildAuth(env);
	cached = { env, auth };
	return auth;
};
