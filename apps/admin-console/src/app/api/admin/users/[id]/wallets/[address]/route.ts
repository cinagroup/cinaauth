import { type NextRequest, NextResponse } from "next/server";
import {
	ADMIN_AND_SECURITY,
	requireAdmin,
	requireRole,
} from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** DELETE /api/admin/users/[id]/wallets/[address] — unbind a SIWE wallet. */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; address: string }> },
) {
	const { id, address } = await params;
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireRole(session, ADMIN_AND_SECURITY);
	} catch (e) {
		return e as Response;
	}
	const body = (await request.json().catch(() => ({}))) as {
		chainId?: number;
	};
	const chainId = body.chainId ?? 1;
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/unbind-wallet", {
		method: "POST",
		body: { userId: id, address, chainId },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
