import { type NextRequest, NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";

/** GET /api/admin/users — proxy list-users to cinaauth (second-layer guard). */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	try {
		requireAdminControlPermission(session, "identity.user.read");
	} catch (e) {
		return e as Response;
	}
	const qs = new URL(request.url).searchParams.toString();
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/admin/list-users?${qs}`, { cookie });
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
