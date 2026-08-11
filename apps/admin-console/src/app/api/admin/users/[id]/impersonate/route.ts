import { type NextRequest, NextResponse } from "next/server";
import {
	requireAdmin,
	requireAdminControlPermission,
} from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/** POST /api/admin/users/[id]/impersonate — start impersonation (super_admin). */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "identity.user.impersonate");
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
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/impersonate-user", {
		method: "POST",
		body: { userId: id },
		cookie,
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
