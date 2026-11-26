import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	resolveProductionAcceptanceProfile,
	resolveProductionTargetOrigin,
	runProductionAcceptance,
} from "./check-production.mjs";

const productionProfile = {
	environment: "production",
	applicationOrigin: "https://oidc-demo.cinaseek.si",
	issuer: "https://auth.cinaseek.si",
	accountOrigin: "https://accounts.cinaseek.si",
	clientId: "cinaauth-oidc-demo",
};

describe("OIDC production acceptance profile", () => {
	/** @see https://developers.cloudflare.com/waf/tools/browser-integrity-check/ */
	it("identifies every production probe while preserving protocol checks", async (t) => {
		let requests = 0;
		t.mock.method(globalThis, "fetch", async (input, init) => {
			requests += 1;
			const url = new URL(input);
			const headers = new Headers(init?.headers);
			assert.match(headers.get("user-agent") ?? "", /^CinaAuth-Deployment\//);
			if (url.pathname === "/config.json") {
				assert.equal(headers.get("accept"), "application/json");
				assert.equal(init.cache, "no-store");
				return Response.json(productionProfile);
			}
			if (url.pathname === "/health") {
				return Response.json({
					status: "ok",
					service: "cinaauth-oidc-demo",
					environment: "production",
				});
			}
			if (url.pathname === "/") {
				return new Response("CinaSeek OIDC Lab", {
					headers: {
						"content-security-policy": `frame-ancestors 'none'; connect-src ${productionProfile.issuer} ${productionProfile.accountOrigin}`,
					},
				});
			}
			if (url.pathname === "/.well-known/openid-configuration") {
				return Response.json({
					issuer: productionProfile.issuer,
					token_endpoint: `${productionProfile.issuer}/token`,
					authorization_endpoint: `${productionProfile.issuer}/authorize`,
					token_endpoint_auth_methods_supported: ["none"],
					code_challenge_methods_supported: ["S256"],
					id_token_signing_alg_values_supported: ["ES256"],
				});
			}
			if (url.pathname === "/token") {
				assert.equal(init.method, "OPTIONS");
				assert.equal(
					headers.get("origin"),
					productionProfile.applicationOrigin,
				);
				return new Response(null, {
					headers: {
						"access-control-allow-origin": productionProfile.applicationOrigin,
					},
				});
			}
			assert.equal(url.pathname, "/authorize");
			assert.equal(init.redirect, "manual");
			assert.equal(url.searchParams.get("code_challenge_method"), "S256");
			return new Response(null, {
				status: 302,
				headers: { location: `${productionProfile.accountOrigin}/sign-in` },
			});
		});
		await runProductionAcceptance({
			targetOrigin: productionProfile.applicationOrigin,
			log() {},
		});
		assert.equal(requests, 6);
	});

	it("requires an explicit canonical target origin", () => {
		assert.equal(
			resolveProductionTargetOrigin("https://oidc-demo.cinaseek.si"),
			"https://oidc-demo.cinaseek.si",
		);
		for (const value of [
			undefined,
			"http://oidc-demo.cinaseek.si",
			"https://oidc-demo.cinaseek.si/",
			"https://OIDC-DEMO.cinaseek.si",
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
				redirectUri: "https://oidc-demo.cinaseek.si/callback",
				postLogoutRedirectUri: "https://oidc-demo.cinaseek.si",
				scope: "openid profile email",
			},
		);
	});

	it("rejects staging or cross-origin config in the production checker", () => {
		assert.throws(
			() =>
				resolveProductionAcceptanceProfile({
					targetOrigin: "https://oidc-demo.cinaseek.si",
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
