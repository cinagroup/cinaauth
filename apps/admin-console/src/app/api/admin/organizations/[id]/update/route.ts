import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** POST /api/admin/organizations/[id]/update — rename/reconfigure an org. */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const { id } = await params;
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const cookie = request.headers.get("cookie") ?? "";
	// Spread body first, then pin organizationId so the path param always wins.
	const res = await cinaauthFetch("/organization/update", {
		method: "POST",
		body: { ...body, organizationId: id },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
