import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CinaSeek account brand copy", () => {
	it("presents the homepage as the CinaSeek Identity account center", () => {
		const homepageSource = readFileSync(
			new URL("../app/page.tsx", import.meta.url),
			"utf8",
		);

		expect(homepageSource).toContain("CinaSeek Identity account center");
		expect(homepageSource).toContain("Email code sign-in");
		expect(homepageSource).not.toContain("Official demo");
		expect(homepageSource).not.toContain("cinaauth");
		expect(homepageSource).not.toContain("Email & Password");
		expect(homepageSource).not.toContain("Password Reset");
	});

	it("keeps account, consent, security, privacy, and organization copy on the CinaSeek brand", () => {
		const userVisibleSources = [
			"./email/invitation.tsx",
			"./ethereum-wallet.ts",
			"../app/(auth)/oauth/consent/page.tsx",
			"../app/dashboard/privacy/privacy-center.tsx",
			"../app/dashboard/privacy/page.tsx",
			"../app/dashboard/security/security-center.tsx",
			"../app/dashboard/security/page.tsx",
			"../app/dashboard/organization/enterprise-connections-card.tsx",
			"../app/dashboard/organization/organization-console.tsx",
			"../app/dashboard/organization/page.tsx",
			"../app/dashboard/developer/developer-console.tsx",
			"../app/dashboard/developer/page.tsx",
		].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

		for (const source of userVisibleSources) {
			expect(source).not.toContain('"CinaAuth');
			expect(source).not.toContain("`CinaAuth");
			expect(source).not.toContain(">CinaAuth");
			expect(source).not.toContain(" CinaAuth ");
		}
	});

	it("describes personal API keys without claiming unsupported permission scopes", () => {
		const securityCenterSource = readFileSync(
			new URL("../app/dashboard/security/security-center.tsx", import.meta.url),
			"utf8",
		);
		const normalizedSecurityCenterSource = securityCenterSource.replace(
			/\s+/g,
			" ",
		);

		expect(normalizedSecurityCenterSource).toContain(
			"Create personal credentials bound to this account for scripts and integrations.",
		);
		expect(normalizedSecurityCenterSource).not.toContain(
			"Create scoped CinaSeek credentials",
		);
	});

	it("documents the production account portal instead of the retired demo database setup", () => {
		const readme = readFileSync(
			new URL("../README.md", import.meta.url),
			"utf8",
		);

		expect(readme).toContain("# CinaSeek Accounts");
		expect(readme).toContain('src="./public/logo.png"');
		expect(readme).toContain("Cloudflare Hyperdrive");
		expect(readme).toContain("Email code sign-in");
		expect(readme).not.toContain("# CinaAuth Demo App");
		expect(readme).not.toContain("Email & Password");
		expect(readme).not.toContain("Password Reset");
		expect(readme).not.toContain("TURSO_DATABASE_URL");
	});

	it("brands MCP discovery and user download filenames without changing the audit format identifier", () => {
		const mcpSource = readFileSync(
			new URL("../app/api/mcp/route.ts", import.meta.url),
			"utf8",
		);
		const privacySource = readFileSync(
			new URL("./privacy-center.ts", import.meta.url),
			"utf8",
		);
		const auditExportSource = readFileSync(
			new URL("./organization-audit-export.ts", import.meta.url),
			"utf8",
		);

		expect(mcpSource).toContain('name: "CinaSeek Accounts"');
		expect(mcpSource).not.toContain("demo-cinaauth");
		expect(privacySource).toContain("cinaseek-personal-data-");
		expect(privacySource).toContain("cinaseek-deletion-receipt-");
		expect(auditExportSource).toContain("cinaseek-${organizationSlug}-audit-");
		expect(auditExportSource).toContain(
			'format: "cinaauth.organization-audit"',
		);
	});
});
