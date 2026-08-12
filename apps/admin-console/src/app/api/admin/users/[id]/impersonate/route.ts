import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import {
	cinaauthFetchWithResponse,
	getCinaauthSetCookies,
} from "@/lib/cinaauth/client";
import { toHostOnlyCookie } from "@/lib/cinaauth/proxy-cookie";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/** POST /api/admin/users/[id]/impersonate — start impersonation (super_admin). */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "identity.user.impersonate");
	} catch (e) {
		return e as Response;
	}
	// Consume request body to prevent request smuggling.
	// No validation needed: this is an action-only route (no body expected).
	await request.json().catch(() => ({}));
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (e) {
		return e as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	const { result, response: upstreamResponse } =
		await cinaauthFetchWithResponse("/admin/impersonate-user", {
			method: "POST",
			body: { userId: id },
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
						"CinaSeek Identity did not establish the impersonated session",
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
		for (const cookie of setCookies) {
			response.headers.append("set-cookie", toHostOnlyCookie(cookie));
		}
	}
	response.headers.set("Cache-Control", "no-store");
	return response;
}
