import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Paths that bypass the auth gate. */
const PUBLIC_PATHS = [
	"/login",
	"/sign-in",
	"/api/auth",
	"/_next",
	"/favicon.ico",
	"/logo.png",
];

/**
 * Edge auth gate.
 *
 * Earlier versions called cinaauth's /get-session on EVERY request to verify
 * the role — but that added 0.8–1.8s of latency to each navigation, freezing
 * sidebar clicks ("卡死"). Edge isolates don't share memory, so caching was
 * unreliable.
 *
 * Instead, the middleware now does a fast cookie-presence check (no network).
 * Cookie presence is only a routing optimization, never a trust decision. Role
 * enforcement stays where it belongs — in the Route Handlers
 * (resolveAdminSession + hasAdminRole) and Server Components, which run the
 * actual cinaauth call once per page render, not once per RSC flight request.
 * This keeps navigation instant while access control remains two-layered
 * (edge cookie gate + handler role check).
 */
const SESSION_COOKIE = "__Secure-cinaauth.session_token";

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
		return NextResponse.next();
	}

	const hasSession = request.cookies.has(SESSION_COOKIE);

	if (!hasSession) {
		if (pathname.startsWith("/api/")) {
			return NextResponse.json(
				{ ok: false, error: { code: "UNAUTHORIZED", message: "no session" } },
				{ status: 401 },
			);
		}
		// Redirect to the local OIDC entry page. Credentials are collected only by
		// accounts.cinaseek.ai; the Admin Console remains a confidential client.
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set(
			"callbackURL",
			`${request.nextUrl.pathname}${request.nextUrl.search}`,
		);
		return NextResponse.redirect(loginUrl);
	}
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set(
		"x-cinaadmin-callback-url",
		`${request.nextUrl.pathname}${request.nextUrl.search}`,
	);
	return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
	// Run on everything except Next's static asset internals.
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
