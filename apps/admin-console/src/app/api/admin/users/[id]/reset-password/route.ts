import { type NextRequest, NextResponse } from "next/server";
import {
	requireAdmin,
	requireAdminControlPermission,
} from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/**
 * POST /api/admin/users/[id]/reset-password — admin sets a new password for a
 * user. Forwards to cinaauth's /admin/set-user-password (super_admin only).
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "identity.user.reset-password");
	} catch (e) {
		return e as Response;
	}

	const body = await request.json().catch(() => ({}));
	const { newPassword } = body as { newPassword?: string };
	// Password validation: min 8 chars, max 128 chars, must have letter + digit
	if (!newPassword || newPassword.length < 8 || newPassword.length > 128) {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_REQUEST", message: "Password must be 8-128 characters" } },
			{ status: 400 },
		);
	}
	if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_REQUEST", message: "Password must contain letters and numbers" } },
			{ status: 400 },
		);
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (e) {
		return e as Response;
	}

	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/set-user-password", {
		method: "POST",
		body: { userId: id, newPassword },
		cookie,
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
