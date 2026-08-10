import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireRole, SUPER_ADMIN_ONLY } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** POST /api/admin/users/create — create user (super_admin only). */
export async function POST(request: NextRequest) {
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireRole(session, SUPER_ADMIN_ONLY);
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
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/create-user", {
		method: "POST",
		body,
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
