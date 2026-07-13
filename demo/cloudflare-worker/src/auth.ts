import { apiKey } from "@cinaauth/api-key";
import { CinaAuth } from "cinaauth";
import { drizzleAdapter } from "cinaauth/adapters/drizzle";
import { createAccessControl } from "cinaauth/plugins/access";
import { admin } from "cinaauth/plugins/admin";
import { anonymous } from "cinaauth/plugins/anonymous";
import { auditLog } from "cinaauth/plugins/audit-log";
import { emailOTP } from "cinaauth/plugins/email-otp";
import { haveIBeenPwned } from "cinaauth/plugins/haveibeenpwned";
import { jwt } from "cinaauth/plugins/jwt";
import { magicLink } from "cinaauth/plugins/magic-link";
import { oneTimeToken } from "cinaauth/plugins/one-time-token";
import { multiSession } from "cinaauth/plugins/multi-session";
import { customSession } from "cinaauth/plugins/custom-session";
import { organization } from "cinaauth/plugins/organization";
import { phoneNumber } from "cinaauth/plugins/phone-number";
import { siwe } from "cinaauth/plugins/siwe";
import { twoFactor } from "cinaauth/plugins/two-factor";
import { username } from "cinaauth/plugins/username";
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
		"impersonate-admins",
		"delete",
		"set-password",
		"set-email",
		"get",
		"update",
	],
	session: ["list", "revoke", "delete"],
	stats: ["read"],
	wallet: ["list", "unbind"],
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
		wallet: ["list", "unbind"],
	}),
	security_admin: ac.newRole({
		user: ["list", "ban", "get", "update"],
		session: ["list", "revoke", "delete"],
		stats: ["read"],
		wallet: ["list"],
	}),
	user: ac.newRole({ user: [], session: [] }),
};

/**
 * Creates a CinaAuth instance per-request with the current D1 binding.
 * Cloudflare Workers are stateless, so the D1 database binding must be
 * injected from the request environment on every invocation.
 *
 * All available plugins are loaded to maximize functionality. Plugins that
 * require database tables will auto-create them via the migration system
 * (POST /api/migrate on the worker).
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
			// ── Core auth plugins ──
			jwt(),
			twoFactor(),
			organization(),
			apiKey({
				references: "user",
			}),
			admin({
				defaultRole: "user",
				adminRoles: ["super_admin", "security_admin"],
				ac,
				roles,
			}),
			auditLog({
				allowedRoles: ["super_admin", "security_admin"],
				writeTokens: env.CINAUTH_ADMIN_SERVICE_KEY
					? [env.CINAUTH_ADMIN_SERVICE_KEY]
					: [],
			}),

			// ── SIWE (wallet binding) ──
			siwe(),

			// ── Sign-in methods ──
			username(),
			emailOTP({
				sendVerificationOTP: async ({ email, otp }) => {
					console.log(`[email-otp] OTP for ${email}: ${otp}`);
				},
			}),
			magicLink({
				sendMagicLink: async ({ email, url }) => {
					console.log(`[magic-link] ${email}: ${url}`);
				},
			}),
			phoneNumber({
				sendOTP: async ({ phoneNumber, code }) => {
					console.log(`[phone-number] OTP for ${phoneNumber}: ${code}`);
				},
			}),
			anonymous(),

			// ── Session & security ──
			oneTimeToken(),
			haveIBeenPwned(),
			multiSession({
				maximumSessions: 10,
			}),
			customSession(async ({ user, session }) => {
				return {
					user,
					session,
				};
			}),
		],
		trustedOrigins: [
			"https://demo-auth.cinagroup.com",
			"https://*.cinagroup.com",
		],
		advanced: {
			backgroundTasks: {
				handler: (p) => {
					const ctx = (globalThis as any).__ctx;
					if (ctx?.waitUntil) ctx.waitUntil(p);
				},
			},
			crossSubDomainCookies: {
				enabled: true,
				domain: ".cinagroup.com",
			},
		},
	});

export type Auth = ReturnType<typeof createAuth>;
