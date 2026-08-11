import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";

/** GET /api/admin/api-keys/[id]/detail — fetch a single API key's metadata. */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session) return NextResponse.json({ ok: false }, { status: 403 });
	try {
		requireAdminControlPermission(session, "integration.api-key.read");
	} catch (error) {
		return error as Response;
	}
	const { id } = await params;
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/api-key/get?id=${encodeURIComponent(id)}`, {
		cookie,
	});
	if (!res.ok) {
		const status = adminUpstreamResponseStatus(res, { allowNotFound: true });
		return NextResponse.json(
			{ ok: false, data: null, error: res.error },
			{ status, headers: { "Cache-Control": "no-store" } },
		);
	}
	return NextResponse.json(res, {
		status: 200,
		headers: { "Cache-Control": "no-store" },
	});
}
