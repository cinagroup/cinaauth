import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import type { StandardResponse } from "@/lib/cinaauth/types";

/** Retired: device authorization must be completed by the end user. */
export async function POST(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role))
		return NextResponse.json({ ok: false }, { status: 403 });

	const body: StandardResponse<never> = {
		ok: false,
		error: {
			code: "ADMIN_DEVICE_AUTHORIZATION_DISABLED",
			message: "Device authorization must be completed by the end user",
			status: 410,
		},
	};
	return NextResponse.json(body, { status: 410 });
}
