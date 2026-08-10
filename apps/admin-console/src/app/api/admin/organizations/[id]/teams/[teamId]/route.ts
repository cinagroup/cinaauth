import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** POST /api/admin/organizations/[id]/teams/[teamId] — update a team. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; teamId: string }> }) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") return NextResponse.json({ ok: false }, { status: 403 });
	const { teamId } = await params;
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const cookie = request.headers.get("cookie") ?? "";
	// Pin teamId after the spread so the path param always wins.
	const res = await cinaauthFetch("/organization/update-team", { method: "POST", body: { ...body, teamId }, cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}

/** DELETE /api/admin/organizations/[id]/teams/[teamId] — delete a team. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; teamId: string }> }) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") return NextResponse.json({ ok: false }, { status: 403 });
	const { teamId } = await params;
	await request.json().catch(() => ({}));
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/organization/remove-team", { method: "POST", body: { teamId }, cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
