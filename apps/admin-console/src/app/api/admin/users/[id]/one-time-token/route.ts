import { type NextRequest, NextResponse } from "next/server";
import {
	requireAdmin,
	requireRole,
	SUPER_ADMIN_ONLY,
} from "@/lib/auth-guard";
import type { StandardResponse } from "@/lib/cinaauth/types";

/**
 * POST /api/admin/users/[id]/one-time-token — retired because the upstream
 * plugin issues a token for the acting session, not the path-param user.
 */
export async function POST(
	request: NextRequest,
	_context: { params: Promise<{ id: string }> },
) {
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireRole(session, SUPER_ADMIN_ONLY);
	} catch (e) {
		return e as Response;
	}

	const body: StandardResponse<never> = {
		ok: false,
		error: {
			code: "ADMIN_ONE_TIME_TOKEN_DISABLED",
			message: "Administrator one-time token issuance is disabled",
			status: 410,
		},
	};
	return NextResponse.json(body, { status: 410 });
}
