import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";

/**
 * GET /api/admin/audit/alerts — proxy cinaauth's /audit/alerts endpoint.
 * Returns actors exceeding a failure threshold within a time window
 * (brute-force / suspicious activity detection).
 *
 * Query params: windowHours (default 24), failThreshold (default 5).
 */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	try {
		requireAdminControlPermission(session, "security.audit.read");
	} catch (error) {
		return error as Response;
	}
	const qs = new URL(request.url).searchParams.toString();
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/audit/alerts?${qs}`, { cookie });
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
