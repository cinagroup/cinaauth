import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * POST /api/admin/organizations/[id]/members/[memberId]/role — change a
 * member's role within an org. Forwards to cinaauth's
 * /organization/update-member-role. Requires super_admin.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; memberId: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const { id, memberId } = await params;
	const body = await request.json().catch(() => ({}));
	const { role } = body as { role?: string };
	if (!role || !["owner", "admin", "member"].includes(role)) {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_REQUEST", message: "Invalid role" } },
			{ status: 400 },
		);
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/organization/update-member-role", {
		method: "POST",
		body: { organizationId: id, memberId, role },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
