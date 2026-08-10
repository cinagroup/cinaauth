import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireRole, SUPER_ADMIN_ONLY } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** POST /api/admin/users/[id]/impersonate — start impersonation (super_admin). */
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
	const res = await cinaauthFetch("/admin/impersonate-user", {
		method: "POST",
		body: { userId: id },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
