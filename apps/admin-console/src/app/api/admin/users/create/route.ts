import { type NextRequest, NextResponse } from "next/server";
import {
	requireAdmin,
	requireAdminControlPermission,
} from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/** POST /api/admin/users/create — create user (super_admin only). */
export async function POST(request: NextRequest) {
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "identity.user.create");
	} catch (e) {
		return e as Response;
	}
	let body: unknown;
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
	const res = await cinaauthFetch("/admin/create-user", {
		method: "POST",
		body,
		cookie,
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
