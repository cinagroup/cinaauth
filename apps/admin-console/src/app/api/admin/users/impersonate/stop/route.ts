import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import {
	cinaauthFetchWithResponse,
	getCinaauthSetCookies,
} from "@/lib/cinaauth/client";
import { toHostOnlyCookie } from "@/lib/cinaauth/proxy-cookie";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";

/**
 * POST /api/admin/users/impersonate/stop — stop impersonation.
 *
 * No role gate here: while impersonating, the session presents the TARGET
 * user's role (usually "user"), so requiring super_admin would 403 the very
 * session that needs to stop. cinaauth itself verifies the session is an
 * impersonation session (impersonatedBy set) before restoring the admin.
 */
export async function POST(request: NextRequest) {
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	// Consume request body to prevent request smuggling.
	// No validation needed: this is an action-only route (no body expected).
	await request.json().catch(() => ({}));
	const cookie = request.headers.get("cookie") ?? "";
	const { result, response: upstreamResponse } =
		await cinaauthFetchWithResponse("/admin/stop-impersonating", {
			method: "POST",
			cookie,
		});
	const setCookies = getCinaauthSetCookies(upstreamResponse);
	if (
		result.ok &&
		!setCookies.some((cookie) => cookie.includes("cinaauth.session_token="))
	) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "CINAUTH_SESSION_COOKIE_MISSING",
					message:
						"CinaSeek Identity did not restore the administrator session",
					status: 502,
				},
			},
			{ status: 502, headers: { "Cache-Control": "no-store" } },
		);
	}
	const response = NextResponse.json(result, {
		status: adminUpstreamResponseStatus(result),
	});
	if (result.ok) {
		for (const setCookie of setCookies) {
			response.headers.append("set-cookie", toHostOnlyCookie(setCookie));
		}
	}
	response.headers.set("Cache-Control", "no-store");
	return response;
}
