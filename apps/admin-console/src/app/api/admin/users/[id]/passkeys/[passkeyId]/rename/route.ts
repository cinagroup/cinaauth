import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/** POST /api/admin/users/[id]/passkeys/[passkeyId]/rename — rename a passkey. */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; passkeyId: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	try {
		requireAdminControlPermission(session, "identity.credential.update");
	} catch (e) {
		return e as Response;
	}
	const { id, passkeyId } = await params;
	const body = await request.json().catch(() => ({}));
	const { name } = body as { name?: string };
	const normalizedName = typeof name === "string" ? name.trim() : "";
	if (!normalizedName || normalizedName.length > 128) {
		return NextResponse.json(
			{
				ok: false,
				error: { code: "BAD_REQUEST", message: "name is required" },
			},
			{ status: 400 },
		);
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (e) {
		return e as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/update-user-passkey", {
		method: "POST",
		body: { userId: id, passkeyId, name: normalizedName },
		cookie,
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
