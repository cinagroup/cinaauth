import type { AdminControlPermission } from "@cinaauth/auth-web-contract";
import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import type { NextRequest } from "next/server";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import type { AdminSession } from "@/lib/cinaauth/types";

export type AdminPageAccess = "allow" | "sign-in" | "forbidden";

/** Decide whether a verified session may render the protected Admin shell. */
export function getAdminPageAccess(
	session: AdminSession | null,
): AdminPageAccess {
	if (!session) return "sign-in";
	// An impersonated session must retain access to the shell so the original
	// administrator can see the warning banner and stop impersonating.
	if (session.impersonatedBy) return "allow";
	return hasAdminControlPermission(session.role, "dashboard.read")
		? "allow"
		: "forbidden";
}

/** Build a local sign-in redirect without allowing an external callback. */
export function getAdminSignInRedirect(rawCallbackURL: string | null): string {
	// Browsers strip control characters before navigation, so reject them before
	// deciding whether this is a local path.
	// eslint-disable-next-line no-control-regex
	const hasControlCharacters = /[\u0000-\u001f\u007f]/.test(
		rawCallbackURL ?? "",
	);
	const callbackURL =
		!hasControlCharacters &&
		rawCallbackURL?.startsWith("/") &&
		!rawCallbackURL.startsWith("//") &&
		!rawCallbackURL.startsWith("/\\")
			? rawCallbackURL
			: "/dashboard";
	return `/login?callbackURL=${encodeURIComponent(callbackURL)}`;
}

/** Resolve the admin session or return a 401 Response (for Route Handlers). */
export async function requireAdmin(
	request: NextRequest,
): Promise<AdminSession> {
	const session = await resolveAdminSession(request);
	if (!session) {
		throw new Response(
			JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED" } }),
			{ status: 401 },
		);
	}
	return session;
}

/** Throw a 403 Response if the session role is not on `roles`. */
export function requireRole(session: AdminSession, roles: string[]): void {
	if (!roles.includes(session.role)) {
		throw new Response(
			JSON.stringify({
				ok: false,
				error: { code: "FORBIDDEN", message: "Insufficient role" },
			}),
			{ status: 403 },
		);
	}
}

/** Throw a 403 Response unless the verified session has `permission`. */
export function requireAdminControlPermission(
	session: AdminSession,
	permission: AdminControlPermission,
): void {
	if (!hasAdminControlPermission(session.role, permission)) {
		throw new Response(
			JSON.stringify({
				ok: false,
				error: { code: "FORBIDDEN", message: "Insufficient permission" },
			}),
			{ status: 403 },
		);
	}
}

export const SUPER_ADMIN_ONLY = ["super_admin"];
export const ADMIN_AND_SECURITY = ["super_admin", "security_admin"];
