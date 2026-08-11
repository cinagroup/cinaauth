import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/** POST /api/admin/users/[id]/ban — ban user (7d/30d/permanent + reason). */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "identity.user.ban");
	} catch (e) {
		return e as Response;
	}
	if (id === session.userId) {
		return NextResponse.json(
			{
				ok: false,
				error: { code: "SELF_TARGET", message: "Cannot ban your own account" },
			},
			{ status: 400 },
		);
	}
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_BODY", message: "Invalid JSON" } },
			{ status: 400 },
		);
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (e) {
		return e as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	// Spread body first, then pin userId so the path param always wins — a
	// crafted body must not be able to redirect the ban to another user.
	const res = await cinaauthFetch("/admin/ban-user", {
		method: "POST",
		body: { ...body, userId: id },
		cookie,
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
