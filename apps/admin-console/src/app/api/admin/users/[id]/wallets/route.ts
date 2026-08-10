import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** GET /api/admin/users/[id]/wallets — proxy list-user-wallets. */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(
		`/admin/list-user-wallets?userId=${encodeURIComponent(id)}`,
		{ cookie },
	);
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
