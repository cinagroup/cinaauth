import { describe, expect, it } from "vitest";
import {
	CINATOKEN_OIDC_SESSION_RATE_LIMIT,
	CINATOKEN_ROLE_VERIFY_RATE_LIMIT,
	hasAuthorizedCinatokenRole,
	isCinatokenAccessToken,
} from "../src/cinatoken-oidc-bridge";
import { CINATOKEN_OIDC_CLIENT_ID } from "../src/cinatoken-oidc-client";

describe("cinatoken OIDC bridge policy", () => {
	it("uses bounded session and live-role rate limits", () => {
		expect(CINATOKEN_OIDC_SESSION_RATE_LIMIT).toEqual({ window: 60, max: 10 });
		expect(CINATOKEN_ROLE_VERIFY_RATE_LIMIT).toEqual({ window: 60, max: 600 });
	});

	it("requires the cinatoken audience and authorized party", () => {
		expect(
			isCinatokenAccessToken(
				{ aud: "https://cinatoken.com", azp: CINATOKEN_OIDC_CLIENT_ID },
				"https://cinatoken.com",
			),
		).toBe(true);
		expect(
			isCinatokenAccessToken(
				{ aud: "https://other.example", azp: CINATOKEN_OIDC_CLIENT_ID },
				"https://cinatoken.com",
			),
		).toBe(false);
		expect(
			isCinatokenAccessToken(
				{ aud: "https://cinatoken.com", azp: "other-client" },
				"https://cinatoken.com",
			),
		).toBe(false);
	});

	it("accepts only current administrator roles and trims role lists", () => {
		expect(hasAuthorizedCinatokenRole("super_admin")).toBe(true);
		expect(hasAuthorizedCinatokenRole("user, security_admin")).toBe(true);
		expect(hasAuthorizedCinatokenRole("user")).toBe(false);
		expect(hasAuthorizedCinatokenRole(undefined)).toBe(false);
	});
});
