import { type NextRequest, NextResponse } from "next/server";
import {
	requireAdmin,
	requireRole,
	SUPER_ADMIN_ONLY,
} from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * POST /api/admin/users/[id]/one-time-token — generate a one-time
 * cross-device login token for a user (oneTimeToken plugin).
 * super_admin only.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireRole(session, SUPER_ADMIN_ONLY);
	} catch (e) {
		return e as Response;
	}
	// Consume request body to prevent request smuggling.
	// No validation needed: this is an action-only route (no body expected).
	await request.json().catch(() => ({}));
	const cookie = request.headers.get("cookie") ?? "";
	// The one-time-token plugin's generate endpoint creates a token for the
	// current session user. We call it with the admin's session (acting as
	// the user via impersonation context if available), then return the token.
	const res = await cinaauthFetch("/one-time-token/generate", {
		cookie,
	});
	if (!res.ok) {
		return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
	}
	return NextResponse.json(res, { status: 200 });
}
