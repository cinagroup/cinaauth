import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** GET /api/admin/sso/providers — list configured SSO providers. */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) return NextResponse.json({ ok: false }, { status: 403 });
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/sso/providers", { cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}

/** POST /api/admin/sso/providers — create or update a provider. */
export async function POST(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") return NextResponse.json({ ok: false }, { status: 403 });
	const body = await request.json().catch(() => ({}));
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/sso/update-provider", { method: "POST", body, cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
