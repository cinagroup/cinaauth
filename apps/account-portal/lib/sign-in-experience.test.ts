import { describe, expect, it } from "vitest";
import {
	getSignInAlert,
	getSignInContextMessage,
	sanitizeAccountCallbackURL,
} from "./sign-in-experience";

describe("sign-in experience copy", () => {
	it("does not render an alert when no error is present", () => {
		expect(getSignInAlert(null)).toBeNull();
	});

	it("keeps provider failures generic and actionable", () => {
		expect(getSignInAlert("access_denied")).toEqual({
			title: "Sign-in wasn’t completed",
			description: "Try again or choose another secure sign-in method.",
		});
	});

	it("explains the return step only for an OIDC authorization request", () => {
		expect(getSignInContextMessage(false)).toBeNull();
		expect(getSignInContextMessage(true)).toBe(
			"After signing in, you’ll return to the requesting application.",
		);
	});

	it("keeps direct post-login navigation on the account portal", () => {
		expect(sanitizeAccountCallbackURL("/dashboard?tab=security")).toBe(
			"/dashboard?tab=security",
		);
		expect(sanitizeAccountCallbackURL("https://attacker.example/collect")).toBe(
			"/dashboard",
		);
		expect(sanitizeAccountCallbackURL("//attacker.example/collect")).toBe(
			"/dashboard",
		);
	});
});
