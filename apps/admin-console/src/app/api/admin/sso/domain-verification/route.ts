import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** POST /api/admin/sso/domain-verification — request or verify domain. */
export async function POST(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") return NextResponse.json({ ok: false }, { status: 403 });
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const cookie = request.headers.get("cookie") ?? "";
	const endpoint = body.action === "verify" ? "/sso/verify-domain" : "/sso/request-domain-verification";
	const res = await cinaauthFetch(endpoint, { method: "POST", body, cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
