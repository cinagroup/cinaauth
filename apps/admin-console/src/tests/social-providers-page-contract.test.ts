import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readPage = (name: string) =>
	readFileSync(
		join(process.cwd(), `src/app/(admin)/settings/${name}/page.tsx`),
		"utf8",
	);

describe("social providers settings page", () => {
	it("gates mutations on the manage permission and keeps secrets write-only", () => {
		const source = readPage("social-providers");

		for (const marker of [
			'"integration.social-provider.manage"',
			'autoComplete="new-password"',
			'type="password"',
			"/api/admin/social-providers",
			"/api/admin/sign-in-settings",
			"socialProviderLimit",
			"ConfirmDialog",
			"aria-busy",
			"getAdminApiErrorMessage",
		]) {
			expect(source).toContain(marker);
		}
		expect(source).not.toContain("localStorage");
		expect(source).not.toContain("URLSearchParams");
		expect(source).toContain("min={0}");
		expect(source).toContain("max={20}");
	});

	it("renders provider visibility through the shared i18n source labels", () => {
		const source = readPage("social-providers");
		for (const marker of [
			"social.source.${provider.source}",
			"social.source.none",
			"social.oneTapHint",
		]) {
			expect(source).toContain(marker);
		}
	});
});
