import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * POST /api/admin/organizations/[id]/invite — invite a member by email.
 * Forwards to cinaauth's /organization/invite-member. Requires super_admin.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
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
	const cookie = request.headers.get("cookie") ?? "";
	// Spread body first, then pin organizationId so the path param always wins.
	const res = await cinaauthFetch(`/organization/invite-member`, {
		method: "POST",
		body: { ...body, organizationId: id },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
