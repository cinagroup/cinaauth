import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	$fetch: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
	authClient: {
		$fetch: mocks.$fetch,
	},
}));

import {
	deleteSSOProvider,
	generateSCIMToken,
	getSSODomainVerificationRecords,
	registerOIDCSSOProvider,
	registerSAMLSSOProvider,
	requestSSODomainVerification,
	revokeSCIMProvider,
	updateOIDCSSOProvider,
	updateSAMLSSOProvider,
	verifySSODomain,
} from "./enterprise-connection-mutations";

describe("enterprise connection mutations", () => {
	beforeEach(() => {
		mocks.$fetch.mockReset();
	});

	it("requests DNS proof material without persisting it", async () => {
		mocks.$fetch.mockResolvedValue({
			data: { domainVerificationToken: "verification-token" },
			error: null,
		});

		await expect(requestSSODomainVerification("acme-oidc")).resolves.toBe(
			"verification-token",
		);
		expect(mocks.$fetch).toHaveBeenCalledWith(
			"/sso/request-domain-verification",
			{
				method: "POST",
				body: { providerId: "acme-oidc" },
			},
		);
	});

	it("builds one TXT record per normalized provider domain", () => {
		expect(
			getSSODomainVerificationRecords(
				"acme-oidc",
				" acme.example,login.acme.example,acme.example ",
				"verification-token",
			),
		).toEqual([
			{
				name: "_cinaauth-token-acme-oidc.acme.example",
				value: "_cinaauth-token-acme-oidc=verification-token",
			},
			{
				name: "_cinaauth-token-acme-oidc.login.acme.example",
				value: "_cinaauth-token-acme-oidc=verification-token",
			},
		]);
	});

	it("normalizes legacy URL-shaped provider domains before showing DNS names", () => {
		expect(
			getSSODomainVerificationRecords(
				"acme-oidc",
				"https://Login.Acme.Example/sso",
				"verification-token",
			),
		).toEqual([
			{
				name: "_cinaauth-token-acme-oidc.login.acme.example",
				value: "_cinaauth-token-acme-oidc=verification-token",
			},
		]);
	});

	it("asks the server to verify the DNS proof", async () => {
		mocks.$fetch.mockResolvedValue({ data: null, error: null });

		await expect(verifySSODomain("acme-oidc")).resolves.toBeUndefined();
		expect(mocks.$fetch).toHaveBeenCalledWith("/sso/verify-domain", {
			method: "POST",
			body: { providerId: "acme-oidc" },
		});
	});

	it("generates an organization-scoped SCIM token", async () => {
		mocks.$fetch.mockResolvedValue({
			data: { scimToken: "one-time-scim-token" },
			error: null,
		});

		await expect(
			generateSCIMToken({
				providerId: "acme-scim",
				organizationId: "organization-1",
			}),
		).resolves.toBe("one-time-scim-token");
		expect(mocks.$fetch).toHaveBeenCalledWith("/scim/generate-token", {
			method: "POST",
			body: {
				providerId: "acme-scim",
				organizationId: "organization-1",
			},
		});
	});

	it("revokes the provider connection by stable provider id", async () => {
		mocks.$fetch.mockResolvedValue({
			data: { success: true },
			error: null,
		});

		await expect(revokeSCIMProvider("acme-scim")).resolves.toBeUndefined();
		expect(mocks.$fetch).toHaveBeenCalledWith(
			"/scim/delete-provider-connection",
			{
				method: "POST",
				body: { providerId: "acme-scim" },
			},
		);
	});

	it("surfaces the authoritative server error", async () => {
		mocks.$fetch.mockResolvedValue({
			data: null,
			error: { message: "Recent authentication required" },
		});

		await expect(verifySSODomain("acme-oidc")).rejects.toThrow(
			"Recent authentication required",
		);
	});

	it("registers an organization-scoped OIDC provider and discards echoed secrets", async () => {
		mocks.$fetch.mockResolvedValue({
			data: {
				providerId: "acme-oidc",
				oidcConfig: { clientSecret: "echoed-secret" },
			},
			error: null,
		});

		await expect(
			registerOIDCSSOProvider({
				providerId: "acme-oidc",
				issuer: "https://idp.acme.example",
				domain: "acme.example",
				organizationId: "organization-1",
				clientId: "client-id",
				clientSecret: "client-secret",
				discoveryEndpoint:
					"https://idp.acme.example/.well-known/openid-configuration",
				skipDiscovery: false,
				authorizationEndpoint: "",
				tokenEndpoint: "",
				jwksEndpoint: "",
				userInfoEndpoint: "",
				scopes: ["openid", "profile", "email"],
				pkce: true,
				tokenEndpointAuthentication: "client_secret_basic",
			}),
		).resolves.toBeUndefined();
		expect(mocks.$fetch).toHaveBeenCalledWith("/sso/register", {
			method: "POST",
			body: {
				providerId: "acme-oidc",
				issuer: "https://idp.acme.example",
				domain: "acme.example",
				organizationId: "organization-1",
				oidcConfig: {
					clientId: "client-id",
					clientSecret: "client-secret",
					discoveryEndpoint:
						"https://idp.acme.example/.well-known/openid-configuration",
					skipDiscovery: false,
					scopes: ["openid", "profile", "email"],
					pkce: true,
					tokenEndpointAuthentication: "client_secret_basic",
				},
			},
		});
	});

	it("registers a SAML provider from IdP metadata without inventing secret state", async () => {
		mocks.$fetch.mockResolvedValue({
			data: { providerId: "acme-saml" },
			error: null,
		});

		await expect(
			registerSAMLSSOProvider({
				providerId: "acme-saml",
				issuer: "https://idp.acme.example/saml",
				domain: "acme.example",
				organizationId: "organization-1",
				entryPoint: "",
				certificate: "",
				idpMetadataXml: "<EntityDescriptor />",
				callbackUrl:
					"https://auth.cinaseek.ai/api/auth/sso/saml2/sp/acs/acme-saml",
				idpInitiatedCallbackUrl: "/dashboard",
				audience: "",
				wantAssertionsSigned: true,
			}),
		).resolves.toBeUndefined();
		expect(mocks.$fetch).toHaveBeenCalledWith("/sso/register", {
			method: "POST",
			body: {
				providerId: "acme-saml",
				issuer: "https://idp.acme.example/saml",
				domain: "acme.example",
				organizationId: "organization-1",
				samlConfig: {
					entryPoint: "",
					cert: "",
					callbackUrl:
						"https://auth.cinaseek.ai/api/auth/sso/saml2/sp/acs/acme-saml",
					idpInitiatedCallbackUrl: "/dashboard",
					idpMetadata: { metadata: "<EntityDescriptor />" },
					spMetadata: {},
					wantAssertionsSigned: true,
					authnRequestsSigned: false,
				},
			},
		});
	});

	it("updates OIDC public settings while omitting blank replacement credentials", async () => {
		mocks.$fetch.mockResolvedValue({
			data: { providerId: "acme-oidc" },
			error: null,
		});

		await expect(
			updateOIDCSSOProvider({
				providerId: "acme-oidc",
				issuer: "https://idp.acme.example",
				domain: "new.acme.example",
				clientId: "",
				clientSecret: "",
				discoveryEndpoint:
					"https://idp.acme.example/.well-known/openid-configuration",
				authorizationEndpoint: "",
				tokenEndpoint: "",
				jwksEndpoint: "",
				userInfoEndpoint: "",
				scopes: ["openid", "email"],
				pkce: true,
				tokenEndpointAuthentication: "client_secret_basic",
			}),
		).resolves.toBeUndefined();
		expect(mocks.$fetch).toHaveBeenCalledWith("/sso/update-provider", {
			method: "POST",
			body: {
				providerId: "acme-oidc",
				issuer: "https://idp.acme.example",
				domain: "new.acme.example",
				oidcConfig: {
					discoveryEndpoint:
						"https://idp.acme.example/.well-known/openid-configuration",
					scopes: ["openid", "email"],
					pkce: true,
					tokenEndpointAuthentication: "client_secret_basic",
				},
			},
		});
	});

	it("updates SAML public settings without clearing the stored certificate", async () => {
		mocks.$fetch.mockResolvedValue({
			data: { providerId: "acme-saml" },
			error: null,
		});

		await expect(
			updateSAMLSSOProvider({
				providerId: "acme-saml",
				issuer: "https://idp.acme.example/saml",
				domain: "acme.example",
				entryPoint: "https://idp.acme.example/sso",
				certificate: "",
				idpMetadataXml: "",
				callbackUrl:
					"https://auth.cinaseek.ai/api/auth/sso/saml2/sp/acs/acme-saml",
				idpInitiatedCallbackUrl: "/dashboard",
				audience: "urn:acme:sp",
				wantAssertionsSigned: true,
			}),
		).resolves.toBeUndefined();
		expect(mocks.$fetch).toHaveBeenCalledWith("/sso/update-provider", {
			method: "POST",
			body: {
				providerId: "acme-saml",
				issuer: "https://idp.acme.example/saml",
				domain: "acme.example",
				samlConfig: {
					entryPoint: "https://idp.acme.example/sso",
					callbackUrl:
						"https://auth.cinaseek.ai/api/auth/sso/saml2/sp/acs/acme-saml",
					idpInitiatedCallbackUrl: "/dashboard",
					audience: "urn:acme:sp",
					wantAssertionsSigned: true,
					authnRequestsSigned: false,
				},
			},
		});
	});

	it("deletes an SSO provider by stable provider id", async () => {
		mocks.$fetch.mockResolvedValue({ data: { success: true }, error: null });

		await expect(deleteSSOProvider("acme-oidc")).resolves.toBeUndefined();
		expect(mocks.$fetch).toHaveBeenCalledWith("/sso/delete-provider", {
			method: "POST",
			body: { providerId: "acme-oidc" },
		});
	});

	it("uses the CinaSeek brand for malformed enterprise-service responses", async () => {
		const cases: Array<{
			invoke: () => Promise<unknown>;
			expected: string;
		}> = [
			{
				invoke: () => deleteSSOProvider("acme-oidc"),
				expected:
					"CinaSeek identity service did not confirm SSO provider deletion",
			},
			{
				invoke: () => requestSSODomainVerification("acme-oidc"),
				expected:
					"CinaSeek identity service did not return domain verification material",
			},
			{
				invoke: () =>
					generateSCIMToken({
						providerId: "acme-scim",
						organizationId: "organization-1",
					}),
				expected:
					"CinaSeek identity service did not return the one-time SCIM token",
			},
			{
				invoke: () => revokeSCIMProvider("acme-scim"),
				expected:
					"CinaSeek identity service did not confirm SCIM token revocation",
			},
		];

		for (const testCase of cases) {
			mocks.$fetch.mockResolvedValueOnce({ data: {}, error: null });
			await expect(testCase.invoke()).rejects.toThrow(testCase.expected);
		}
	});
});
