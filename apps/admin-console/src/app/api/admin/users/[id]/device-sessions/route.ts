import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * GET /api/admin/users/[id]/device-sessions — list a user's multi-device
 * sessions via cinaauth's multi-session plugin. Degrades gracefully to
 * empty if the plugin is unavailable or the user has no device sessions.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const cookie = request.headers.get("cookie") ?? "";
	// The multi-session plugin's list-device-sessions is user-scoped (returns
	// the caller's own sessions). For admin viewing, we use the admin plugin's
	// list-user-sessions which shows all sessions for a user. The device info
	// (userAgent, ipAddress) is already included.
	const res = await cinaauthFetch("/admin/list-user-sessions", {
		method: "POST",
		body: { userId: id },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
