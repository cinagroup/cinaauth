import { resolveAdminSession } from "@/lib/cinaauth/session";
import type { NextRequest } from "next/server";
import type { AdminSession } from "@/lib/cinaauth/types";

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

export const SUPER_ADMIN_ONLY = ["super_admin"];
export const ADMIN_AND_SECURITY = ["super_admin", "security_admin"];
