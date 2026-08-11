import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CinaSeek Admin brand assets", () => {
	it("uses the same authoritative logo and favicon as CinaSeek Accounts", () => {
		const adminLogo = readFileSync("public/logo.png");
		const accountLogo = readFileSync("../account-portal/public/logo.png");
		const adminFavicon = readFileSync("public/favicon.ico");
		const accountFavicon = readFileSync(
			"../account-portal/public/favicon/favicon.ico",
		);

		expect(adminLogo.equals(accountLogo)).toBe(true);
		expect(adminFavicon.equals(accountFavicon)).toBe(true);
	});

	it("keeps public Admin copy on the CinaSeek brand", () => {
		const layout = readFileSync("src/app/layout.tsx", "utf8");
		const apiDocs = readFileSync("src/app/(admin)/api-docs/page.tsx", "utf8");
		const apiKeyRotation = readFileSync(
			"src/app/api/admin/api-keys/[id]/rotate/route.ts",
			"utf8",
		);
		const subscriptions = readFileSync(
			"src/app/api/admin/subscriptions/route.ts",
			"utf8",
		);

		expect(layout).toContain("CinaSeek Admin");
		expect(layout).toContain("/favicon.ico");
		expect(layout).toContain("/logo.png");
		expect(apiDocs).toContain("CinaSeek Identity API Reference");
		expect(apiDocs).not.toContain('title="CinaAuth');
		expect(apiKeyRotation).not.toContain('"CinaAuth');
		expect(subscriptions).not.toContain('"CinaAuth');
	});

	it("does not expose the internal CinaAuth name in Admin API errors", () => {
		const publicErrorRoutes = [
			"src/app/api/admin/settings/security/route.ts",
			"src/app/api/admin/scim/tokens/route.ts",
			"src/app/api/admin/sso/providers/route.ts",
			"src/app/api/admin/users/[id]/route.ts",
		];

		for (const route of publicErrorRoutes) {
			const source = readFileSync(route, "utf8");
			expect(source, route).not.toMatch(/message:\s*"cinaauth\b/i);
		}
	});
});
