import { CinaAuth } from "cinaauth";
import { drizzleAdapter } from "cinaauth/adapters/drizzle";
import { createAccessControl } from "cinaauth/plugins/access";
import { admin } from "cinaauth/plugins/admin";
import { auditLog } from "cinaauth/plugins/audit-log";
import { jwt } from "cinaauth/plugins/jwt";
import { createDrizzle } from "./db";
import type { CloudflareBindings } from "./env";

/**
 * Access-control statements for the admin plugin.
 *
 * Roles mirror cinaadmin's two-tier model (spec §3.1):
 *   - super_admin:     full CRUD across every module
 *   - security_admin:  read + ban/unban + session revoke + audit read;
 *                      NO create/delete/set-role/set-password/impersonate
 */
const ac = createAccessControl({
	user: [
		"create",
		"list",
		"set-role",
		"ban",
		"impersonate",
		"delete",
		"set-password",
		"set-email",
		"get",
		"update",
	],
	session: ["list", "revoke", "delete"],
});

const roles = {
	super_admin: ac.newRole({
		user: [
			"create",
			"list",
			"set-role",
			"ban",
			"impersonate",
			"delete",
			"set-password",
			"set-email",
			"get",
			"update",
		],
		session: ["list", "revoke", "delete"],
	}),
	security_admin: ac.newRole({
		// read + ban/unban + sessions; NO create/delete/role/password/impersonate
		user: ["list", "ban", "get", "update"],
		session: ["list", "revoke", "delete"],
	}),
	user: ac.newRole({ user: [], session: [] }),
};

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
			admin({
				// Roles recognized by the admin console's whitelist
				// (CINAADMIN_ALLOWED_ROLES = super_admin,security_admin).
				defaultRole: "user",
				adminRoles: ["super_admin", "security_admin"],
				ac,
				roles,
			}),
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
