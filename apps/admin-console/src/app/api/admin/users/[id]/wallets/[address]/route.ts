import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/** DELETE /api/admin/users/[id]/wallets/[address] — unbind a SIWE wallet. */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; address: string }> },
) {
	const { id, address } = await params;
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "identity.credential.revoke");
	} catch (e) {
		return e as Response;
	}
	const body: unknown = await request.json().catch(() => null);
	const chainId =
		typeof body === "object" &&
		body !== null &&
		"chainId" in body &&
		typeof body.chainId === "number"
			? body.chainId
			: 1;
	if (!Number.isSafeInteger(chainId) || chainId <= 0) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "BAD_BODY",
					message: "chainId must be a positive integer",
				},
			},
			{ status: 400 },
		);
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/unbind-wallet", {
		method: "POST",
		body: { userId: id, address, chainId },
		cookie,
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
