import { describe, expect, it } from "vitest";
import { getSetCookieHeaders } from "./cookie-headers";

describe("custom session cookie headers", () => {
	it("reads comma-joined Set-Cookie values without getSetCookie", () => {
		const headers = {
			get: (name: string) =>
				name.toLowerCase() === "set-cookie"
					? "cinaauth.session_token=signed; Path=/; HttpOnly, cinaauth.session_data=cached; Path=/; Max-Age=300; HttpOnly"
					: null,
		} as unknown as Headers;

		expect(getSetCookieHeaders(headers)).toEqual([
			"cinaauth.session_token=signed; Path=/; HttpOnly",
			"cinaauth.session_data=cached; Path=/; Max-Age=300; HttpOnly",
		]);
	});

	it("uses native getSetCookie when the runtime provides it", () => {
		const headers = {
			get: () => "combined-value-must-not-be-used",
			getSetCookie: () => ["session=one", "cache=two"],
		} as unknown as Headers;

		expect(getSetCookieHeaders(headers)).toEqual(["session=one", "cache=two"]);
	});
});
