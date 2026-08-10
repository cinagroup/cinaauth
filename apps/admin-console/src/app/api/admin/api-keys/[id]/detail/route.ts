import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** GET /api/admin/api-keys/[id]/detail — fetch a single API key's metadata. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) return NextResponse.json({ ok: false }, { status: 403 });
	const { id } = await params;
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/api-key/get?id=${encodeURIComponent(id)}`, { cookie });
	if (!res.ok) {
		const status = res.error?.status === 404 ? 404 : 502;
		return NextResponse.json({ ok: false, data: null, error: res.error }, { status });
	}
	return NextResponse.json(res, { status: 200 });
}
