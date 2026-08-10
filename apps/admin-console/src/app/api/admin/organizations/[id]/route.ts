import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * GET /api/admin/organizations/[id] — fetch a single organization with its
 * members and invitations. Forwards to cinaauth's /organization/get-full-organization.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const { id } = await params;
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/organization/get-full-organization`, {
		method: "POST",
		body: { organizationId: id },
		cookie,
	});
	if (!res.ok) {
		return NextResponse.json({ ok: false }, { status: 404 });
	}
	return NextResponse.json({ ok: true, data: res.data });
}
