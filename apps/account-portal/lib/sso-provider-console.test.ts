import { describe, expect, it } from "vitest";
import type { SSOProviderSummary } from "./auth";
import {
	createEditSSOProviderDraft,
	createEmptySSOProviderDraft,
	getOIDCCallbackURL,
	getSAMLCallbackURL,
	getSAMLMetadataURL,
	getSSOProviderDraftError,
	parseSSOScopes,
} from "./sso-provider-console";

const oidcProvider: SSOProviderSummary = {
	providerId: "acme-oidc",
	type: "oidc",
	issuer: "https://idp.acme.example",
	domain: "acme.example",
	organizationId: "organization-1",
	domainVerified: true,
	spMetadataUrl: "https://auth.cinaseek.ai/api/auth/sso/saml2/sp/metadata",
	oidcConfig: {
		clientIdLastFour: "****1234",
		discoveryEndpoint:
			"https://idp.acme.example/.well-known/openid-configuration",
		authorizationEndpoint: "https://idp.acme.example/oauth2/authorize",
		tokenEndpoint: "https://idp.acme.example/oauth2/token",
		jwksEndpoint: "https://idp.acme.example/oauth2/jwks",
		scopes: ["openid", "profile", "email"],
		pkce: true,
		tokenEndpointAuthentication: "client_secret_basic",
	},
};

describe("SSO provider console policy", () => {
	it("accepts a standard organization OIDC registration draft", () => {
		const draft = {
			...createEmptySSOProviderDraft(),
			providerId: "acme-oidc",
			issuer: "https://idp.acme.example",
			domain: "acme.example,subsidiary.example",
			clientId: "client-id",
			clientSecret: "client-secret",
		};

		expect(
			getSSOProviderDraftError({
				draft,
				mode: "create",
				providers: [],
				scimProviders: [],
			}),
		).toBeNull();
	});

	it("requires complete manual OIDC endpoints", () => {
		const draft = {
			...createEmptySSOProviderDraft(),
			providerId: "manual-oidc",
			issuer: "https://idp.acme.example",
			domain: "acme.example",
			clientId: "client-id",
			clientSecret: "client-secret",
			manualOIDC: true,
			authorizationEndpoint: "https://idp.acme.example/authorize",
			tokenEndpoint: "https://idp.acme.example/token",
		};

		expect(
			getSSOProviderDraftError({
				draft,
				mode: "create",
				providers: [],
				scimProviders: [],
			}),
		).toBe(
			"Manual OIDC configuration requires authorization, token, and JWKS endpoints.",
		);
	});

	it("does not load stored credentials and requires replacement pairs", () => {
		const draft = createEditSSOProviderDraft(oidcProvider);
		expect(draft.clientId).toBe("");
		expect(draft.clientSecret).toBe("");
		expect(draft.manualOIDC).toBe(false);

		expect(
			getSSOProviderDraftError({
				draft: { ...draft, clientId: "replacement-id" },
				mode: "edit",
				providers: [oidcProvider],
				scimProviders: [],
			}),
		).toBe(
			"Enter both replacement client ID and client secret, or leave both blank.",
		);
	});

	it("accepts SAML metadata but rejects oversized XML", () => {
		const baseDraft = {
			...createEmptySSOProviderDraft(),
			type: "saml" as const,
			providerId: "acme-saml",
			issuer: "https://idp.acme.example/saml",
			domain: "acme.example",
			samlMode: "metadata" as const,
			idpMetadataXml: "<EntityDescriptor />",
		};

		expect(
			getSSOProviderDraftError({
				draft: baseDraft,
				mode: "create",
				providers: [],
				scimProviders: [],
			}),
		).toBeNull();
		expect(
			getSSOProviderDraftError({
				draft: { ...baseDraft, idpMetadataXml: "x".repeat(100 * 1024 + 1) },
				mode: "create",
				providers: [],
				scimProviders: [],
			}),
		).toBe("IdP metadata must not exceed 100 KiB.");
	});

	it("rejects provider IDs already used by SSO or SCIM", () => {
		const draft = {
			...createEmptySSOProviderDraft(),
			providerId: "acme-oidc",
			issuer: "https://idp.acme.example",
			domain: "acme.example",
			clientId: "client-id",
			clientSecret: "client-secret",
		};

		expect(
			getSSOProviderDraftError({
				draft,
				mode: "create",
				providers: [oidcProvider],
				scimProviders: [],
			}),
		).toBe("That provider ID is already in use.");
	});

	it("builds exact public callback and metadata URLs", () => {
		expect(getOIDCCallbackURL("acme oidc")).toBe(
			"https://auth.cinaseek.ai/api/auth/sso/callback/acme%20oidc",
		);
		expect(getSAMLCallbackURL("acme-saml")).toBe(
			"https://auth.cinaseek.ai/api/auth/sso/saml2/sp/acs/acme-saml",
		);
		expect(getSAMLMetadataURL("acme-saml")).toBe(
			"https://auth.cinaseek.ai/api/auth/sso/saml2/sp/metadata?providerId=acme-saml",
		);
	});

	it("normalizes duplicate scope input without losing order", () => {
		expect(parseSSOScopes("openid profile,email openid")).toEqual([
			"openid",
			"profile",
			"email",
		]);
	});
});
