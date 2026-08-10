import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * GET /api/admin/users/[id]/passkeys — list a user's registered passkeys.
 * Proxies to cinaauth's /passkey/list-user-passkeys.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const { id } = await params;
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/passkey/list-user-passkeys?userId=${encodeURIComponent(id)}`, { cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
