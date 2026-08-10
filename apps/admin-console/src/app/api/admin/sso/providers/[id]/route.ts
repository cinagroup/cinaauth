import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** GET /api/admin/sso/providers/[id] — get one provider. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) return NextResponse.json({ ok: false }, { status: 403 });
	const { id } = await params;
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/sso/get-provider?id=${encodeURIComponent(id)}`, { cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}

/** DELETE /api/admin/sso/providers/[id] — delete a provider. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") return NextResponse.json({ ok: false }, { status: 403 });
	const { id } = await params;
	await request.json().catch(() => ({}));
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/sso/delete-provider", { method: "POST", body: { id }, cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
