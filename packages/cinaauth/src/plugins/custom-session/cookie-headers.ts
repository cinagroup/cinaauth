import { splitSetCookieHeader } from "../../cookies/cookie-utils";

/**
 * Read every Set-Cookie value from runtimes with or without
 * `Headers.getSetCookie()`. Cloudflare Workers can expose only the combined
 * header through `get()` on responses created by internal endpoint calls.
 */
export const getSetCookieHeaders = (headers: Headers): string[] =>
	typeof headers.getSetCookie === "function"
		? headers.getSetCookie()
		: splitSetCookieHeader(headers.get("set-cookie") || "");
