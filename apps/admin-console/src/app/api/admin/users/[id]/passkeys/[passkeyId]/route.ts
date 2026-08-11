import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/**
 * DELETE /api/admin/users/[id]/passkeys/[passkeyId] — revoke a passkey.
 * Proxies to cinaauth's target-aware Admin endpoint.
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; passkeyId: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	try {
		requireAdminControlPermission(session, "identity.credential.revoke");
	} catch (e) {
		return e as Response;
	}
	const { id, passkeyId } = await params;
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (e) {
		return e as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/delete-user-passkey", {
		method: "POST",
		body: { userId: id, passkeyId },
		cookie,
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
