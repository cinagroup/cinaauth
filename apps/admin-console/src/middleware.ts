import { NextResponse, type NextRequest } from "next/server";

/** Paths that bypass the auth gate. */
const PUBLIC_PATHS = ["/login", "/sign-in", "/api/auth", "/_next", "/favicon.ico"];

/**
 * Edge auth gate.
 *
 * Earlier versions called cinaauth's /get-session on EVERY request to verify
 * the role — but that added 0.8–1.8s of latency to each navigation, freezing
 * sidebar clicks ("卡死"). Edge isolates don't share memory, so caching was
 * unreliable.
 *
 * Instead, the middleware now does a fast cookie-presence check (no network):
 * a signed session cookie proves the user authenticated with cinaauth. Role
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
		// Redirect to the embedded /login page (not demo-auth, which has a
		// SPA hydration bug that prevents the login form from rendering).
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("callbackURL", request.url);
		return NextResponse.redirect(loginUrl);
	}
	return NextResponse.next();
}

export const config = {
	// Run on everything except Next's static asset internals.
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
