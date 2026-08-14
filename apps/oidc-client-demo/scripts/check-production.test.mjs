import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	resolveProductionAcceptanceProfile,
	resolveProductionTargetOrigin,
} from "./check-production.mjs";

const productionProfile = {
	environment: "production",
	applicationOrigin: "https://oidc-demo.cinaseek.ai",
	issuer: "https://auth.cinaseek.ai",
	accountOrigin: "https://accounts.cinaseek.ai",
	clientId: "cinaauth-oidc-demo",
};

describe("OIDC production acceptance profile", () => {
	it("requires an explicit canonical target origin", () => {
		assert.equal(
			resolveProductionTargetOrigin("https://oidc-demo.cinaseek.ai"),
			"https://oidc-demo.cinaseek.ai",
		);
		for (const value of [
			undefined,
			"http://oidc-demo.cinaseek.ai",
			"https://oidc-demo.cinaseek.ai/",
			"https://OIDC-DEMO.cinaseek.ai",
		]) {
			assert.throws(
				() => resolveProductionTargetOrigin(value),
				/target origin/,
			);
		}
	});

	it("validates the deployed profile before using issuer and client values", () => {
		assert.deepEqual(
			resolveProductionAcceptanceProfile({
				targetOrigin: productionProfile.applicationOrigin,
				profileInput: productionProfile,
			}),
			{
				...productionProfile,
				redirectUri: "https://oidc-demo.cinaseek.ai/callback",
				postLogoutRedirectUri: "https://oidc-demo.cinaseek.ai",
				scope: "openid profile email",
			},
		);
	});

	it("rejects staging or cross-origin config in the production checker", () => {
		assert.throws(
			() =>
				resolveProductionAcceptanceProfile({
					targetOrigin: "https://oidc-demo.cinaseek.ai",
					profileInput: {
						environment: "staging",
						applicationOrigin: "https://oidc-demo-staging.example.com",
						issuer: "https://auth-staging.example.com",
						accountOrigin: "https://accounts-staging.example.com",
						clientId: "cinaauth-oidc-demo-staging",
					},
				}),
			/production profile/,
		);
	});
});
