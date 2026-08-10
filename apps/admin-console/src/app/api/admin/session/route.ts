import { NextResponse, type NextRequest } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";

/**
 * GET /api/admin/session
 *
 * Second-layer access enforcement (the Route-Handler layer, on top of the edge
 * middleware). Returns the resolved admin session or 403. The client (Topbar,
 * RoleGuard) also consumes this to drive role-based UI.
 *
 * Impersonation exception: while impersonating, the session presents the
 * TARGET user's role (usually "user"), so a strict role gate would hide the
 * session from the ImpersonateBanner and leave no way to stop impersonating.
 * We return the session when impersonatedBy is set; RoleGuard still gates
 * admin UI by role, and every other admin route keeps its own role check.
 */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || (!hasAdminRole(session.role) && !session.impersonatedBy)) {
		return NextResponse.json(
			{ ok: false, error: { code: "FORBIDDEN", message: "Insufficient role" } },
			{ status: 403 },
		);
	}
	return NextResponse.json({ ok: true, data: session });
}
