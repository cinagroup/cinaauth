import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/**
 * DELETE /api/admin/api-keys/[id] — delete an API key.
 * Forwards to cinaauth's /api-key/delete. Requires super_admin.
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	try {
		requireAdminControlPermission(session, "integration.api-key.revoke");
	} catch (error) {
		return error as Response;
	}
	const { id } = await params;
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/api-key/delete`, {
		method: "POST",
		body: { keyId: id },
		cookie,
	});
	return NextResponse.json(res, {
		status: adminUpstreamResponseStatus(res),
		headers: { "Cache-Control": "no-store" },
	});
}
