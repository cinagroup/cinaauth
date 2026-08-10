import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** POST /api/admin/users/[id]/passkeys/[passkeyId]/rename — rename a passkey. */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; passkeyId: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const { passkeyId } = await params;
	const body = await request.json().catch(() => ({}));
	const { name } = body as { name?: string };
	if (!name || typeof name !== "string") {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_REQUEST", message: "name is required" } },
			{ status: 400 },
		);
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/passkey/update-passkey", {
		method: "POST",
		body: { id: passkeyId, name },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
