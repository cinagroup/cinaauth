import { describe, expect, it } from "vitest";
import {
	createAuthProxyRequest,
	isAllowedProxyOrigin,
	splitSetCookieHeader,
	toHostOnlyCookie,
} from "./index";

describe("auth proxy contracts", () => {
	it("preserves the request path while replacing only the authority", () => {
		const request = createAuthProxyRequest(
			new Request("https://accounts.cinaseek.ai/api/auth/get-session?fresh=1"),
			"https://auth.cinaseek.ai",
		);
		expect(request.url).toBe(
			"https://auth.cinaseek.ai/api/auth/get-session?fresh=1",
		);
		expect(request.redirect).toBe("manual");
	});

	it("preserves request bodies while keeping upstream redirects visible", async () => {
		const request = createAuthProxyRequest(
			new Request("https://accounts.cinaseek.ai/api/auth/sign-in/social", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ provider: "github" }),
				redirect: "follow",
			}),
			"https://auth.cinaseek.ai",
		);

		expect(request.method).toBe("POST");
		expect(request.headers.get("content-type")).toBe("application/json");
		expect(request.redirect).toBe("manual");
		expect(await request.json()).toEqual({ provider: "github" });
	});

	it("splits cookies safely and strips upstream Domain attributes", () => {
		expect(
			splitSetCookieHeader(
				"session=one; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/, csrf=two; Path=/",
			),
		).toHaveLength(2);
		expect(
			toHostOnlyCookie(
				"session=one; Path=/; Domain=.cinagroup.com; Secure; HttpOnly",
			),
		).toBe("session=one; Path=/; Secure; HttpOnly");
	});

	it("matches proxy origins exactly", () => {
		expect(
			isAllowedProxyOrigin(
				"https://admin.cinaseek.ai",
				"https://admin.cinaseek.ai",
			),
		).toBe(true);
		expect(
			isAllowedProxyOrigin(
				"https://admin.cinaseek.ai.attacker.example",
				"https://admin.cinaseek.ai",
			),
		).toBe(false);
	});
});
