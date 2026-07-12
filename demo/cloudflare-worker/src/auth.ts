import { apiKey } from "@cinaauth/api-key";
import { CinaAuth } from "cinaauth";
import { drizzleAdapter } from "cinaauth/adapters/drizzle";
import { createAccessControl } from "cinaauth/plugins/access";
import { admin } from "cinaauth/plugins/admin";
import { auditLog } from "cinaauth/plugins/audit-log";
import { jwt } from "cinaauth/plugins/jwt";
import { organization } from "cinaauth/plugins/organization";
import { twoFactor } from "cinaauth/plugins/two-factor";
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
export const ac = createAccessControl({
	user: [
		"create",
		"list",
		"set-role",
		"ban",
		"impersonate",
		// Restricts impersonation: without this, admin plugin's impersonate
		// endpoint refuses to target other admins (routes.ts:1283-1300).
		// Only super_admin gets it; security_admin cannot impersonate admins.
		"impersonate-admins",
		"delete",
		"set-password",
		"set-email",
		"get",
		"update",
	],
	session: ["list", "revoke", "delete"],
	// The admin plugin's stats endpoints (overview/signups/security-today)
	// gate on `permissions: { stats: ["read"] }`, so the statement must exist.
	stats: ["read"],
});

export const roles = {
	super_admin: ac.newRole({
		user: [
			"create",
			"list",
			"set-role",
			"ban",
			"impersonate",
			"impersonate-admins",
			"delete",
			"set-password",
			"set-email",
			"get",
			"update",
		],
		session: ["list", "revoke", "delete"],
		stats: ["read"],
	}),
	security_admin: ac.newRole({
		// read + ban/unban + sessions + stats; NO create/delete/role/password/impersonate
		// Also NO impersonate-admins → cannot impersonate super_admin/security_admin.
		user: ["list", "ban", "get", "update"],
		session: ["list", "revoke", "delete"],
		stats: ["read"],
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
			twoFactor(),
			organization(),
			apiKey({
				// API keys are scoped to individual users, not organizations.
				references: "user",
			}),
			admin({
				// Roles recognized by the admin console's whitelist
				// (CINAADMIN_ALLOWED_ROLES = super_admin,security_admin).
				defaultRole: "user",
				adminRoles: ["super_admin", "security_admin"],
				ac,
				roles,
			}),
			auditLog({
				// Roles permitted to query audit logs. Defaults to ["admin"] if
				// omitted, which would exclude our super_admin/security_admin
				// roles — so authorize both console roles explicitly.
				allowedRoles: ["super_admin", "security_admin"],
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
