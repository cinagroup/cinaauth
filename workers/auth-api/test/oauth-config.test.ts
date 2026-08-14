import { describe, expect, it } from "vitest";
import {
	genericOAuthRedirectURI,
	getPublicGenericOAuthProviders,
	parseProductionGenericOAuthConfig,
} from "../src/oauth-config";

const ACCOUNT_ORIGIN = "https://accounts.cinaseek.ai";

const provider = {
	providerId: "github",
	clientId: "client-id",
	clientSecret: "client-secret",
	discoveryUrl: "https://github.example/.well-known/openid-configuration",
	redirectURI: genericOAuthRedirectURI("github", ACCOUNT_ORIGIN),
};

describe("production Generic OAuth configuration", () => {
	it("accepts a provider pinned to the account-portal callback", () => {
		expect(
			parseProductionGenericOAuthConfig(
				JSON.stringify([provider]),
				ACCOUNT_ORIGIN,
			),
		).toEqual([provider]);
		expect(
			getPublicGenericOAuthProviders(
				JSON.stringify([provider]),
				ACCOUNT_ORIGIN,
			),
		).toEqual([{ id: "github", type: "generic-oauth" }]);
	});

	it("accepts explicit HTTPS endpoints when discovery is unavailable", () => {
		const explicit = {
			providerId: "enterprise-idp",
			clientId: "client-id",
			pkce: true,
			authorizationUrl: "https://idp.example.com/oauth/authorize",
			tokenUrl: "https://idp.example.com/oauth/token",
			userInfoUrl: "https://idp.example.com/oauth/userinfo",
			redirectURI: genericOAuthRedirectURI("enterprise-idp", ACCOUNT_ORIGIN),
		};
		expect(
			parseProductionGenericOAuthConfig(
				JSON.stringify([explicit]),
				ACCOUNT_ORIGIN,
			),
		).toEqual([explicit]);
	});

	it.each([
		["default auth-domain callback", { ...provider, redirectURI: undefined }],
		[
			"cross-origin callback",
			{
				...provider,
				redirectURI: "https://auth.cinaseek.ai/api/auth/oauth2/callback/github",
			},
		],
		["insecure discovery", { ...provider, discoveryUrl: "http://idp.test" }],
		["unsafe provider id", { ...provider, providerId: "GitHub Login" }],
		["insecure issuer", { ...provider, issuer: "http://idp.test" }],
		[
			"public client without PKCE",
			{ ...provider, clientSecret: undefined, pkce: false },
		],
		["implicit response type", { ...provider, responseType: "token" }],
		["duplicate scopes", { ...provider, scopes: ["openid", "openid"] }],
		["invalid headers", { ...provider, discoveryHeaders: { key: "" } }],
	])("rejects %s", (_name, invalid) => {
		expect(
			parseProductionGenericOAuthConfig(
				JSON.stringify([invalid]),
				ACCOUNT_ORIGIN,
			),
		).toEqual([]);
	});

	it("rejects duplicate providers without leaking configuration", () => {
		expect(
			parseProductionGenericOAuthConfig(
				JSON.stringify([provider, { ...provider, clientId: "second" }]),
				ACCOUNT_ORIGIN,
			),
		).toEqual([]);
	});

	it("pins provider callbacks to the configured Accounts origin", () => {
		const stagingOrigin = "https://accounts-siwe-staging.cinaseek.ai";
		const stagingProvider = {
			...provider,
			redirectURI: genericOAuthRedirectURI("github", stagingOrigin),
		};

		expect(
			parseProductionGenericOAuthConfig(
				JSON.stringify([stagingProvider]),
				stagingOrigin,
			),
		).toEqual([stagingProvider]);
		expect(
			parseProductionGenericOAuthConfig(
				JSON.stringify([provider]),
				stagingOrigin,
			),
		).toEqual([]);
	});
});
