import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/**
 * POST /api/admin/sessions/revoke — revoke a single session or all sessions
 * for a user.
 *
 * Body `{ sessionId }` → revoke one. Body `{ userId }` → revoke all for user.
 */
export async function POST(request: NextRequest) {
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "identity.session.revoke");
	} catch (e) {
		return e as Response;
	}
	let body: { sessionId?: unknown; userId?: unknown };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_BODY", message: "Invalid JSON" } },
			{ status: 400 },
		);
	}
	if (typeof body.userId !== "string" && typeof body.sessionId !== "string") {
		return NextResponse.json(
			{
				ok: false,
				error: { code: "BAD_BODY", message: "sessionId or userId required" },
			},
			{ status: 400 },
		);
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (e) {
		return e as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";

	const path =
		typeof body.userId === "string"
			? "/admin/revoke-user-sessions"
			: "/admin/revoke-user-session";
	const res = await cinaauthFetch(path, { method: "POST", body, cookie });
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
