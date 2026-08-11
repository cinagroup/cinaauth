import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";

/** GET /api/admin/sessions — proxy cinaauth's core /list-sessions endpoint.
 *  The admin plugin doesn't expose a global session list; the core
 *  /list-sessions endpoint returns the current user's sessions. For a true
 *  global view, the backend would need an admin-level endpoint. */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	try {
		requireAdminControlPermission(session, "identity.session.read");
	} catch (e) {
		return e as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	// Try the core list-sessions endpoint (returns caller's sessions).
	const res = await cinaauthFetch(`/list-sessions`, { cookie });
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
