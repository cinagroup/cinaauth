import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readPage = (name: "sso" | "scim") =>
	readFileSync(
		resolve("src", "app", "(admin)", "settings", name, "page.tsx"),
		"utf8",
	);

describe("Admin integration page contracts", () => {
	it("uses the authoritative OIDC SSO fields and tenant-scoped response", () => {
		const source = readPage("sso");

		for (const field of [
			"providerId",
			"issuer",
			"domainVerified",
			"oidcConfig",
			"clientId",
			"clientSecret",
			"discoveryEndpoint",
			"providers",
		]) {
			expect(source).toContain(field);
		}
		expect(source).toContain("sso.tenantScope");
		expect(source).toContain("hasAdminControlPermission");
		expect(source).toContain('"integration.sso.manage"');
		expect(source).toContain("domainVerificationToken");
		expect(source).toContain("selectedOrganizationId");
		expect(source).toContain("sso.selectedTenant");
		expect(source).not.toContain("entityId");
		expect(source).not.toContain("interface SsoProvider {\n\tid:");
	});

	it("uses providerId, the authoritative active tenant, providers, and scimToken", () => {
		const source = readPage("scim");

		for (const field of [
			"providerId",
			"organizationId",
			"providers",
			"scimToken",
			"scim.tenantScope",
		]) {
			expect(source).toContain(field);
		}
		expect(source).toContain("hasAdminControlPermission");
		expect(source).toContain('"integration.scim.manage"');
		expect(source).toContain("selectedOrganizationId");
		expect(source).toContain("scim.selectedTenant");
		expect(source).not.toContain("setOrganizationId");
		expect(source).not.toContain("organizationIdOptional");
		expect(source).not.toContain("connections");
		expect(source).not.toContain("body: JSON.stringify({})");
		expect(source).not.toContain("data?.token");
	});
});
