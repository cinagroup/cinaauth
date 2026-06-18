import { getSessionCookie } from "cinaauth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = 'experimental-edge';

export function middleware(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);
	if (!sessionCookie) {
		return NextResponse.redirect(new URL("/sign-in", request.url));
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard"],
};
