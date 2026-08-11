import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/**
 * POST /api/admin/organizations/[id]/members/[memberId]/role — change a
 * member's role within an org. Forwards to cinaauth's
 * /organization/update-member-role. Requires super_admin.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; memberId: string }> },
) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "organization.member.update-role");
	} catch (error) {
		return error as Response;
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
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/organization/update-member-role", {
		method: "POST",
		body: { organizationId: id, memberId, role },
		cookie,
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
