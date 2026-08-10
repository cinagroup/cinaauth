import { getSessionCookie } from "cinaauth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "experimental-edge";

export function middleware(request: NextRequest) {
	if (request.nextUrl.hostname === "demo-auth.cinagroup.com") {
		const accountURL = request.nextUrl.clone();
		accountURL.hostname = "accounts.cinaseek.ai";
		accountURL.protocol = "https:";
		accountURL.port = "";
		return NextResponse.redirect(accountURL, 308);
	}

	const isProtectedAccountRoute =
		request.nextUrl.pathname.startsWith("/dashboard");
	if (isProtectedAccountRoute && !getSessionCookie(request)) {
		const signInURL = new URL("/sign-in", request.url);
		signInURL.searchParams.set(
			"callbackURL",
			`${request.nextUrl.pathname}${request.nextUrl.search}`,
		);
		return NextResponse.redirect(signInURL);
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
