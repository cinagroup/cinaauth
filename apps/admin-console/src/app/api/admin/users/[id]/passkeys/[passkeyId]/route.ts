import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * DELETE /api/admin/users/[id]/passkeys/[passkeyId] — revoke a passkey.
 * Proxies to cinaauth's /passkey/delete-passkey.
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; passkeyId: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const { passkeyId } = await params;
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/passkey/delete-passkey", {
		method: "POST",
		body: { id: passkeyId },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
