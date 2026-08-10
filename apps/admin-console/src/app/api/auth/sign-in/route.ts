import { AUTH_WEB_ENDPOINTS } from "@cinaauth/auth-web-contract";
import { type NextRequest, NextResponse } from "next/server";
import { cinaauthConfig } from "@/lib/cinaauth/config";
import { fetchAuthRequest } from "@/lib/cinaauth/fetcher";
import {
	splitSetCookieHeader,
	toHostOnlyCookie,
} from "@/lib/cinaauth/proxy-cookie";
import { isAllowedProxyOrigin } from "@/lib/cinaauth/proxy-origin";

/**
 * POST /api/auth/sign-in — same-origin proxy for cinaauth's sign-in API.
 *
 * The embedded /login page can't call auth.cinaseek.ai directly because
 * of CORS. This route proxies the request server-side (no CORS) and passes
 * the Set-Cookie headers back to the browser.
 *
 * IMPORTANT: cinaauth returns MULTIPLE Set-Cookie headers (session_token,
 * session_data, last_used_login_method, transfer_token). The standard
 * Headers API merges them into one comma-separated string which breaks
 * cookie parsing. We use getSetCookie() (or manual split) to forward
 * each cookie individually.
 */
export async function POST(request: NextRequest) {
	if (
		!isAllowedProxyOrigin(
			request.headers.get("origin"),
			cinaauthConfig.adminOrigin,
		)
	) {
		return NextResponse.json(
			{ ok: false, error: { code: "FORBIDDEN", message: "Invalid origin" } },
			{ status: 403 },
		);
	}

	// This route is unauthenticated (under the public /api/auth prefix), so
	// guard the body parse — a malformed POST must yield 400, not a 500.
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_BODY", message: "Invalid JSON" } },
			{ status: 400 },
		);
	}
	const resp = await fetchAuthRequest(
		new Request(new URL(AUTH_WEB_ENDPOINTS.signInEmail, cinaauthConfig.baseUrl), {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: cinaauthConfig.requestOrigin,
			},
			body: JSON.stringify(body),
		}),
	);

	const data = await resp.json().catch(() => ({}));

	// Build the response with the JSON body
	const response = NextResponse.json(data, { status: resp.status });

	// Forward ALL Set-Cookie headers individually.
	// getSetCookie() returns an array of individual Set-Cookie strings
	// (available in Node 18+ and Cloudflare Workers runtime).
	let setCookies = resp.headers.getSetCookie?.() ?? [];
	if (setCookies.length === 0) {
		// Fallback: try getSetCookie via raw headers
		const raw = resp.headers.get("set-cookie");
		if (raw) {
			setCookies = splitSetCookieHeader(raw);
		}
	}
	for (const cookie of setCookies) {
		response.headers.append("set-cookie", toHostOnlyCookie(cookie));
	}

	return response;
}
