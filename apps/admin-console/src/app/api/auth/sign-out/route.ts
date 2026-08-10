import { AUTH_WEB_ENDPOINTS } from "@cinaauth/auth-web-contract";
import { type NextRequest, NextResponse } from "next/server";
import { cinaauthConfig } from "@/lib/cinaauth/config";
import { fetchAuthRequest } from "@/lib/cinaauth/fetcher";
import {
	splitSetCookieHeader,
	toHostOnlyCookie,
} from "@/lib/cinaauth/proxy-cookie";
import { isAllowedProxyOrigin } from "@/lib/cinaauth/proxy-origin";

/** Revoke the upstream session and clear its cookies on the admin host. */
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

	let upstream: Response;
	try {
		upstream = await fetchAuthRequest(new Request(new URL(AUTH_WEB_ENDPOINTS.signOut, cinaauthConfig.baseUrl), {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: cinaauthConfig.requestOrigin,
				cookie: request.headers.get("cookie") ?? "",
			},
			body: "{}",
			cache: "no-store",
		}));
	} catch {
		return NextResponse.json(
			{
				ok: false,
				error: { code: "AUTH_UNAVAILABLE", message: "Sign-out unavailable" },
			},
			{ status: 502 },
		);
	}

	const data = await upstream.json().catch(() => ({}));
	const response = NextResponse.json(data, { status: upstream.status });

	let setCookies = upstream.headers.getSetCookie?.() ?? [];
	if (setCookies.length === 0) {
		const raw = upstream.headers.get("set-cookie");
		if (raw) {
			setCookies = splitSetCookieHeader(raw);
		}
	}
	for (const cookie of setCookies) {
		response.headers.append("set-cookie", toHostOnlyCookie(cookie));
	}

	return response;
}
