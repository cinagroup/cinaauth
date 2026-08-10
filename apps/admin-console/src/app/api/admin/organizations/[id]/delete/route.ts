import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** POST /api/admin/organizations/[id]/delete — permanently delete an org. */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const { id } = await params;
	await request.json().catch(() => ({}));
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/organization/delete", {
		method: "POST",
		body: { organizationId: id },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
