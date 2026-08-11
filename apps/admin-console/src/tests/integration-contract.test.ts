import { describe, expect, it } from "vitest";
import {
	buildDnsVerificationRecords,
	parseDomainVerificationAction,
	parseOidcSsoRegistration,
	parseScimTokenRegistration,
} from "@/lib/integration-contract";

describe("Admin integration contracts", () => {
	it("builds a canonical OIDC registration and rejects pseudo-fields", () => {
		expect(
			parseOidcSsoRegistration({
				providerId: "acme-oidc",
				organizationId: "organization-1",
				domain: "acme.example",
				issuer: "https://idp.acme.example",
				oidcConfig: {
					clientId: "client-id",
					clientSecret: "client-secret",
					discoveryEndpoint:
						"https://idp.acme.example/.well-known/openid-configuration",
				},
			}),
		).toEqual({
			success: true,
			value: {
				providerId: "acme-oidc",
				organizationId: "organization-1",
				domain: "acme.example",
				issuer: "https://idp.acme.example",
				oidcConfig: {
					clientId: "client-id",
					clientSecret: "client-secret",
					discoveryEndpoint:
						"https://idp.acme.example/.well-known/openid-configuration",
					pkce: true,
					scopes: ["openid", "email", "profile"],
				},
			},
		});
		expect(
			parseOidcSsoRegistration({
				name: "Acme",
				entityId: "https://idp.acme.example",
				domain: "acme.example",
			}),
		).toMatchObject({ success: false });
	});

	it("pins domain verification to action, providerId, and organizationId", () => {
		expect(
			parseDomainVerificationAction({
				action: "request",
				providerId: "acme-oidc",
				organizationId: "organization-1",
				domain: "attacker.example",
			}),
		).toEqual({
			success: true,
			value: {
				action: "request",
				providerId: "acme-oidc",
				organizationId: "organization-1",
			},
		});
	});

	it("renders one authoritative TXT record per configured domain", () => {
		expect(
			buildDnsVerificationRecords(
				"acme-oidc",
				"https://acme.example/path,subsidiary.example",
				"verification-token",
			),
		).toEqual([
			{
				domain: "acme.example",
				host: "_cinaauth-token-acme-oidc.acme.example",
				value: "_cinaauth-token-acme-oidc=verification-token",
			},
			{
				domain: "subsidiary.example",
				host: "_cinaauth-token-acme-oidc.subsidiary.example",
				value: "_cinaauth-token-acme-oidc=verification-token",
			},
		]);
	});

	it("requires both SCIM providerId and organizationId", () => {
		expect(
			parseScimTokenRegistration({ providerId: "acme-scim" }),
		).toMatchObject({ success: false });
		expect(
			parseScimTokenRegistration({
				providerId: "acme-scim",
				organizationId: "organization-1",
			}),
		).toEqual({
			success: true,
			value: {
				providerId: "acme-scim",
				organizationId: "organization-1",
			},
		});
		expect(parseScimTokenRegistration({})).toMatchObject({ success: false });
	});
});
