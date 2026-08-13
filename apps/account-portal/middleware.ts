import { getSessionCookie } from "cinaauth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
	ACCOUNT_RETURN_PATH_HEADER,
	buildAccountSignInPath,
} from "./lib/sign-in-experience";

export const runtime = "experimental-edge";

export function middleware(request: NextRequest) {
	if (request.nextUrl.hostname === "demo-auth.cinagroup.com") {
		const accountURL = request.nextUrl.clone();
		accountURL.hostname = "accounts.cinaseek.ai";
		accountURL.protocol = "https:";
		accountURL.port = "";
		return NextResponse.redirect(accountURL, 308);
	}

	const isDeviceAccountRoute =
		request.nextUrl.pathname === "/device" ||
		request.nextUrl.pathname.startsWith("/device/");
	const isProtectedAccountRoute =
		request.nextUrl.pathname.startsWith("/dashboard") || isDeviceAccountRoute;
	const returnPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
	if (isProtectedAccountRoute && !getSessionCookie(request)) {
		const signInURL = new URL(buildAccountSignInPath(returnPath), request.url);
		return NextResponse.redirect(signInURL);
	}

	if (isDeviceAccountRoute) {
		const requestHeaders = new Headers(request.headers);
		requestHeaders.set(ACCOUNT_RETURN_PATH_HEADER, returnPath);
		return NextResponse.next({ request: { headers: requestHeaders } });
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
