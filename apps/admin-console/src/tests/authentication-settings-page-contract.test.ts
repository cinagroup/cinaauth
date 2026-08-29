import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(path), "utf8");

describe("authentication settings page contract", () => {
	it("provides governed controls for every runtime-switchable sign-in method", () => {
		const source = readSource(
			"src/app/(admin)/settings/authentication/page.tsx",
		);

		for (const method of [
			"emailOtpLoginEnabled",
			"emailPasswordLoginEnabled",
			"passkeyLoginEnabled",
			"siweLoginEnabled",
			"googleOneTapEnabled",
		]) {
			expect(source).toContain(method);
		}
		expect(source).toContain('"security.policy.publish"');
		expect(source).toContain("ConfirmDialog");
		expect(source).toContain('role="status"');
		expect(source).toContain("aria-busy={mutation.isPending}");
		expect(source).not.toContain("localStorage");
	});

	it("surfaces integration-managed and unavailable authentication features", () => {
		const source = readSource(
			"src/app/(admin)/settings/authentication/page.tsx",
		);

		for (const marker of [
			"phoneOtp",
			"magicLink",
			"username",
			"twoFactor",
			"sso",
			"social-providers",
		]) {
			expect(source).toContain(marker);
		}
	});

	it("adds a dedicated navigation destination", () => {
		const source = readSource("src/components/layout/sidebar.tsx");
		expect(source).toContain("/settings/authentication");
		expect(source).toContain("nav.authentication");
	});
});
