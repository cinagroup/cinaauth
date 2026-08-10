import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * POST /api/admin/users/impersonate/stop — stop impersonation.
 *
 * No role gate here: while impersonating, the session presents the TARGET
 * user's role (usually "user"), so requiring super_admin would 403 the very
 * session that needs to stop. cinaauth itself verifies the session is an
 * impersonation session (impersonatedBy set) before restoring the admin.
 */
export async function POST(request: NextRequest) {
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	// Consume request body to prevent request smuggling.
	// No validation needed: this is an action-only route (no body expected).
	await request.json().catch(() => ({}));
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/stop-impersonating", {
		method: "POST",
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
