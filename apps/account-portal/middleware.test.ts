import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";

describe("account portal middleware", () => {
	it("permanently redirects the legacy account hostname", () => {
		const response = middleware(
			new NextRequest(
				"https://demo-auth.cinagroup.com/sign-in?callbackURL=%2Fdashboard",
			),
		);

		expect(response.status).toBe(308);
		expect(response.headers.get("location")).toBe(
			"https://accounts.cinaseek.ai/sign-in?callbackURL=%2Fdashboard",
		);
	});

	it("keeps anonymous account pages public but protects the dashboard", () => {
		const publicResponse = middleware(
			new NextRequest("https://accounts.cinaseek.ai/sign-in"),
		);
		const protectedResponse = middleware(
			new NextRequest(
				"https://accounts.cinaseek.ai/dashboard/developer?section=clients",
			),
		);

		expect(publicResponse.headers.get("x-middleware-next")).toBe("1");
		expect(protectedResponse.status).toBe(307);
		expect(protectedResponse.headers.get("location")).toBe(
			"https://accounts.cinaseek.ai/sign-in?callbackURL=%2Fdashboard%2Fdeveloper%3Fsection%3Dclients",
		);
	});

	it("preserves a complete device verification target through sign-in", () => {
		const response = middleware(
			new NextRequest(
				"https://accounts.cinaseek.ai/device?user_code=ABCD-1234",
			),
		);

		expect(response.status).toBe(307);
		const location = new URL(response.headers.get("location") ?? "");
		expect(location.origin).toBe("https://accounts.cinaseek.ai");
		expect(location.pathname).toBe("/sign-in");
		expect(location.searchParams.get("callbackURL")).toBe(
			"/device?user_code=ABCD-1234",
		);
		expect(location.searchParams.has("callbackUrl")).toBe(false);
	});

	it("forwards the trusted device path for authoritative stale-session fallback", () => {
		const response = middleware(
			new NextRequest(
				"https://accounts.cinaseek.ai/device/approve?user_code=ABCD-1234",
				{
					headers: {
						cookie: "cinaauth.session_token=stale",
						"x-cinaauth-account-return-path":
							"https://attacker.example/collect",
					},
				},
			),
		);

		expect(response.headers.get("x-middleware-next")).toBe("1");
		expect(
			response.headers.get(
				"x-middleware-request-x-cinaauth-account-return-path",
			),
		).toBe("/device/approve?user_code=ABCD-1234");
	});
});
