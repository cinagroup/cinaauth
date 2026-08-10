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
});
