import { type NextRequest, NextResponse } from "next/server";
import {
	requireAdmin,
	requireAdminControlPermission,
} from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/**
 * POST /api/admin/organizations/[id]/invite — invite a member by email.
 * Forwards to cinaauth's /organization/invite-member. Requires super_admin.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "organization.member.invite");
	} catch (error) {
		return error as Response;
	}
	const { id } = await params;
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_BODY", message: "Invalid JSON" } },
			{ status: 400 },
		);
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	// Spread body first, then pin organizationId so the path param always wins.
	const res = await cinaauthFetch(`/organization/invite-member`, {
		method: "POST",
		body: { ...body, organizationId: id },
		cookie,
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
