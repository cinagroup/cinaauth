import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * DELETE /api/admin/organizations/[id]/invitations/[inviteId] — cancel a
 * pending org invitation. Forwards to /organization/cancel-invitation.
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; inviteId: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const { inviteId } = await params;
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/organization/cancel-invitation", {
		method: "POST",
		body: { id: inviteId },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
