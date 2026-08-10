import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * DELETE /api/admin/organizations/[id]/members/[memberId] — remove a member
 * from an organization. Forwards to cinaauth's /organization/remove-member.
 * Requires super_admin.
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; memberId: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const { id, memberId } = await params;
	// Consume request body to prevent request smuggling.
	await request.json().catch(() => ({}));
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/organization/remove-member`, {
		method: "POST",
		body: { organizationId: id, memberId },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
