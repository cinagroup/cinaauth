import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createPasswordResetRequestPayload } from "./password-reset-request";

const AUTH_ORIGIN = "https://auth.cinaseek.ai";

const formSource = readFileSync(
	new URL("../components/forms/forgot-password-form.tsx", import.meta.url),
	"utf8",
);
describe("password-reset redirect contract", () => {
	it("posts the trusted Accounts reset URL in the forgot-password payload", () => {
		const headers = { "x-captcha-response": "captcha-token" };

		expect(
			createPasswordResetRequestPayload("person@example.com", headers),
		).toEqual({
			email: "person@example.com",
			redirectTo: "https://accounts.cinaseek.ai/reset-password",
			fetchOptions: { headers },
		});
		expect(formSource).toContain("createPasswordResetRequestPayload(");
		expect(formSource).not.toContain("window.location.origin");
		expect(formSource).not.toContain("redirectTo?:");
	});

	it("makes an Auth Worker reset email return to Accounts", () => {
		const resetURL = createPasswordResetRequestPayload(
			"person@example.com",
			undefined,
		).redirectTo;
		const emailURL = new URL("/reset-password/token-123", AUTH_ORIGIN);
		emailURL.searchParams.set("callbackURL", resetURL);

		const redirectLocation = new URL(
			emailURL.searchParams.get("callbackURL") ?? "",
			AUTH_ORIGIN,
		);
		expect(redirectLocation.href).toBe(resetURL);
		expect(redirectLocation.origin).not.toBe(AUTH_ORIGIN);
	});
});
