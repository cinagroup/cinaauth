import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * GET /api/admin/audit/alerts — proxy cinaauth's /audit/alerts endpoint.
 * Returns actors exceeding a failure threshold within a time window
 * (brute-force / suspicious activity detection).
 *
 * Query params: windowHours (default 24), failThreshold (default 5).
 */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const qs = new URL(request.url).searchParams.toString();
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/audit/alerts?${qs}`, { cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
