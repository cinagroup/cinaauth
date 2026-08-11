import { type NextRequest, NextResponse } from "next/server";
import {
	requireAdmin,
	requireAdminControlPermission,
} from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/**
 * DELETE /api/admin/organizations/[id]/invitations/[inviteId] — cancel a
 * pending org invitation. Forwards to /organization/cancel-invitation.
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; inviteId: string }> },
) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "organization.member.invite");
	} catch (error) {
		return error as Response;
	}
	const { inviteId } = await params;
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/organization/cancel-invitation", {
		method: "POST",
		body: { id: inviteId },
		cookie,
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
