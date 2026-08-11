import { type NextRequest, NextResponse } from "next/server";
import {
	requireAdmin,
	requireAdminControlPermission,
} from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";

/**
 * GET /api/admin/organizations/[id]/members — list organization members.
 * Forwards to cinaauth's /organization/list-members.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "organization.member.read");
	} catch (error) {
		return error as Response;
	}
	const { id } = await params;
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/organization/list-members`, {
		method: "POST",
		body: { organizationId: id },
		cookie,
	});
	if (!res.ok) {
		return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
	}
	return NextResponse.json({ ok: true, data: res.data });
}
