import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * POST /api/admin/users/[id]/reset-2fa — reset a user's two-factor auth.
 * Forwards to cinaauth's /admin/reset-2fa. Requires super_admin.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	// Consume request body to prevent request smuggling.
	// No validation needed: this is an action-only route (no body expected).
	await request.json().catch(() => ({}));
	const { id } = await params;
	const cookie = request.headers.get("cookie") ?? "";
	const origin = request.headers.get("origin") ?? "";
	const res = await cinaauthFetch(`/admin/reset-2fa`, {
		method: "POST",
		body: { userId: id },
		cookie,
		headers: origin ? { origin } : {},
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
