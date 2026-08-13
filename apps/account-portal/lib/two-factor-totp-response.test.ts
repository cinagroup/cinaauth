import { describe, expect, it } from "vitest";
import { classifyTwoFactorVerificationData } from "./two-factor-verification";

describe("TOTP verification response classification", () => {
	it("keeps the existing token response on the local success path", () => {
		expect(
			classifyTwoFactorVerificationData({
				token: "session-token",
				user: { id: "user-1" },
			}),
		).toBe("session");
	});

	it("treats an OAuth continuation response as success delegated to the redirect plugin", () => {
		expect(
			classifyTwoFactorVerificationData({
				redirect: true,
				url: "https://client.example/callback?code=authorization-code",
			}),
		).toBe("redirect");
	});

	it("rejects empty or malformed success responses", () => {
		expect(classifyTwoFactorVerificationData(undefined)).toBe("invalid");
		expect(
			classifyTwoFactorVerificationData({ redirect: false, url: "/callback" }),
		).toBe("invalid");
		expect(classifyTwoFactorVerificationData({ redirect: true, url: "" })).toBe(
			"invalid",
		);
	});
});
