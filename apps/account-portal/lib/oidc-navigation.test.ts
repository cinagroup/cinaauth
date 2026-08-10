import { describe, expect, it } from "vitest";
import {
	buildPreservedAuthPath,
	hasSignedOidcAuthorizationQuery,
} from "./oidc-navigation";

const signedQuery = new URLSearchParams([
	["client_id", "cinaauth-oidc-demo"],
	["redirect_uri", "https://oidc-demo.cinaseek.ai/callback"],
	["state", "state"],
	["ba_param", "client_id"],
	["ba_param", "redirect_uri"],
	["sig", "signature"],
]);

describe("OIDC authentication navigation", () => {
	it("recognizes a signed authorization query", () => {
		expect(hasSignedOidcAuthorizationQuery(signedQuery)).toBe(true);
		expect(
			hasSignedOidcAuthorizationQuery(new URLSearchParams("client_id=demo")),
		).toBe(false);
	});

	it("preserves duplicate signed parameters through an auth method page", () => {
		const target = new URL(
			buildPreservedAuthPath("/sign-in/password", signedQuery, "/dashboard"),
			"https://accounts.cinaseek.ai",
		);

		expect(target.pathname).toBe("/sign-in/password");
		expect(target.searchParams.get("callbackURL")).toBe("/dashboard");
		expect(target.searchParams.getAll("ba_param")).toEqual([
			"client_id",
			"redirect_uri",
		]);
		expect(target.searchParams.get("sig")).toBe("signature");
	});
});
