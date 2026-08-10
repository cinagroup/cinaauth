import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** DELETE .../teams/[teamId]/members/[memberId] — remove a team member. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; teamId: string; memberId: string }> }) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") return NextResponse.json({ ok: false }, { status: 403 });
	const { teamId, memberId } = await params;
	await request.json().catch(() => ({}));
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/organization/remove-team-member", { method: "POST", body: { teamId, memberId }, cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
