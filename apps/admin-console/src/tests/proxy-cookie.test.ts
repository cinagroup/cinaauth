import { describe, expect, it } from "vitest";
import {
	splitSetCookieHeader,
	toHostOnlyCookie,
} from "@/lib/cinaauth/proxy-cookie";

describe("toHostOnlyCookie", () => {
	it("removes an upstream Domain attribute", () => {
		expect(
			toHostOnlyCookie(
				"__Secure-cinaauth.session_token=abc; Path=/; Domain=.cinagroup.com; HttpOnly; Secure; SameSite=Lax",
			),
		).toBe(
			"__Secure-cinaauth.session_token=abc; Path=/; HttpOnly; Secure; SameSite=Lax",
		);
	});

	it("leaves an existing host-only cookie unchanged", () => {
		const cookie = "theme=dark; Path=/; Secure; SameSite=Lax";
		expect(toHostOnlyCookie(cookie)).toBe(cookie);
	});
});

describe("splitSetCookieHeader", () => {
	it("keeps Expires commas while splitting multiple cookies", () => {
		const cookies = splitSetCookieHeader(
			"session=one; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/, csrf=two; Path=/; Secure",
		);
		expect(cookies).toEqual([
			"session=one; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/",
			"csrf=two; Path=/; Secure",
		]);
	});
});
