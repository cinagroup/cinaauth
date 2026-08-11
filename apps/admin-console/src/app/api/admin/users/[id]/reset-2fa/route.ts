import { type NextRequest, NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/**
 * POST /api/admin/users/[id]/reset-2fa — reset a user's two-factor auth.
 * Forwards to cinaauth's /admin/reset-2fa. Requires super_admin.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	try {
		requireAdminControlPermission(session, "identity.user.reset-2fa");
	} catch (e) {
		return e as Response;
	}
	// Consume request body to prevent request smuggling.
	// No validation needed: this is an action-only route (no body expected).
	await request.json().catch(() => ({}));
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (e) {
		return e as Response;
	}
	const { id } = await params;
	const cookie = request.headers.get("cookie") ?? "";
	const origin = request.headers.get("origin") ?? "";
	const res = await cinaauthFetch(`/admin/reset-2fa`, {
		method: "POST",
		body: { userId: id },
		cookie,
		headers: origin ? { origin } : {},
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
