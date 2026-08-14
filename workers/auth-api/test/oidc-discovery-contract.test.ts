import { describe, expect, it } from "vitest";
import { createAuthPlugins } from "../src/plugins";
import { makeOriginEnv } from "./origin-test-env";

describe("OIDC discovery contract", () => {
	it("redirects account selection to the Accounts route", () => {
		const plugin = createAuthPlugins(makeOriginEnv()).find(
			(candidate) => candidate.id === "oauth-provider",
		);

		expect(plugin?.options?.selectAccount?.page).toBe(
			"https://accounts.cinaseek.ai/oauth/select-account",
		);
	});

	it("advertises the authentication claims emitted by Admin ID tokens", () => {
		const plugin = createAuthPlugins(makeOriginEnv()).find(
			(candidate) => candidate.id === "oauth-provider",
		);

		expect(plugin?.options?.advertisedMetadata?.claims_supported).toEqual(
			expect.arrayContaining(["auth_time", "acr"]),
		);
	});
});
