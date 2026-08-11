import { ADMIN_CONSOLE_ROLES } from "@cinaauth/auth-web-contract";

/**
 * Runtime config for the cinaauth integration. Values come from environment
 * (Cloudflare Workers secrets in prod, .env.local in dev).
 */
function required(name: string, fallback?: string): string {
	const v = process.env[name] ?? fallback;
	if (!v) {
		throw new Error(`Missing required env: ${name}`);
	}
	return v;
}

const adminOrigin = required("CINAADMIN_ORIGIN", "http://localhost:3000");

export const cinaauthConfig = {
	/** Canonical same-origin URL for browser-facing admin requests. */
	adminOrigin,
	/** Canonical admin origin sent by server-side proxy requests. */
	requestOrigin: required("CINAUTH_REQUEST_ORIGIN", adminOrigin),
	/** API host — session check + admin API calls. */
	baseUrl: required("CINAUTH_BASE_URL", "http://localhost:2025"),
	/** Frontend host (demo-auth.cinagroup.com) — login/sign-out page redirects. */
	authUrl: required("CINAUTH_AUTH_URL", "https://accounts.cinaseek.ai"),
	allowedRoles: (
		process.env.CINAADMIN_ALLOWED_ROLES ?? ADMIN_CONSOLE_ROLES.join(",")
	)
		.split(",")
		.map((r) => r.trim())
		.filter(Boolean),
};
