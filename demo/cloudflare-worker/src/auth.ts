import { CinaAuth } from "cinaauth";
import { drizzleAdapter } from "cinaauth/adapters/drizzle";
import { auditLog } from "cinaauth/plugins/audit-log";
import { jwt } from "cinaauth/plugins/jwt";
import { createDrizzle } from "./db";
import type { CloudflareBindings } from "./env";

/**
 * Creates a CinaAuth instance per-request with the current D1 binding.
 * Cloudflare Workers are stateless, so the D1 database binding must be
 * injected from the request environment on every invocation.
 */
export const createAuth = (env: CloudflareBindings) =>
	CinaAuth({
		baseURL: env.CINAAUTH_URL || "https://auth.cinagroup.com",
		secret: env.CINAAUTH_SECRET,
		database: drizzleAdapter(createDrizzle(env.DB), { provider: "sqlite" }),
		emailAndPassword: {
			enabled: true,
		},
		plugins: [
			jwt(),
			auditLog({
				// Service token for the admin console (cinaadmin) to call
				// POST /audit/log without a user session.
				writeTokens: env.CINAUTH_ADMIN_SERVICE_KEY
					? [env.CINAUTH_ADMIN_SERVICE_KEY]
					: [],
			}),
		],
		trustedOrigins: [
			"https://demo-auth.cinagroup.com",
			"https://*.cinagroup.com",
		],
		advanced: {
			backgroundTasks: {
				handler: (p) => {
					// Use ExecutionContext.waitUntil for background tasks in Workers
					const ctx = (globalThis as any).__ctx;
					if (ctx?.waitUntil) ctx.waitUntil(p);
				},
			},
			// Share session cookies across all *.cinagroup.com subdomains so the
			// admin console (admin.cinagroup.com) can read the session cookie set
			// by the auth frontend (demo-auth.cinagroup.com) after login.
			crossSubDomainCookies: {
				enabled: true,
				domain: ".cinagroup.com",
			},
		},
	});

export type Auth = ReturnType<typeof createAuth>;
