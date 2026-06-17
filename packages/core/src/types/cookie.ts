import type { CookieOptions } from "better-call";

export type CinaAuthCookie = { name: string; attributes: CookieOptions };

export type CinaAuthCookies = {
	sessionToken: CinaAuthCookie;
	sessionData: CinaAuthCookie;
	accountData: CinaAuthCookie;
	dontRememberToken: CinaAuthCookie;
};
