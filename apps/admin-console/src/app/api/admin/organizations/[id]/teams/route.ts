import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** GET /api/admin/organizations/[id]/teams — list teams in an org. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) return NextResponse.json({ ok: false }, { status: 403 });
	const { id } = await params;
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/organization/list-teams`, { method: "POST", body: { organizationId: id }, cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}

/** POST /api/admin/organizations/[id]/teams — create a team. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") return NextResponse.json({ ok: false }, { status: 403 });
	const { id } = await params;
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const cookie = request.headers.get("cookie") ?? "";
	// Pin organizationId after the spread so the path param always wins.
	const res = await cinaauthFetch("/organization/create-team", { method: "POST", body: { ...body, organizationId: id }, cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
