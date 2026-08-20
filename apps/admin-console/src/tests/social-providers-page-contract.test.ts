import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readPage = (name: string) =>
	readFileSync(
		join(process.cwd(), `src/app/(admin)/settings/${name}/page.tsx`),
		"utf8",
	);

const readLocale = (name: "en" | "zh") =>
	readFileSync(
		join(process.cwd(), `src/lib/i18n/locales/${name}.json`),
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
		expect(source.match(/clearSocialClientSecret\(/g)).toHaveLength(2);
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

	it("uses explicit edit dialogs, dirty-state saves, and localized actions", () => {
		const source = readPage("social-providers");
		for (const marker of [
			"genericFormFromProvider",
			"genericDialogOpen",
			"settingsDirty",
			"socialDirty",
			"closeGenericDialog",
			"<Dialog",
			"<Checkbox",
			't("social.edit")',
			't("social.cancel")',
			't("social.genericHint")',
		]) {
			expect(source).toContain(marker);
		}

		for (const localeName of ["en", "zh"] as const) {
			const locale = readLocale(localeName);
			for (const key of [
				'"social.disabled"',
				'"social.edit"',
				'"social.cancel"',
				'"social.genericHint"',
				'"social.deleteHint"',
				'"social.editGenericTitle"',
			]) {
				expect(locale).toContain(key);
			}
		}
	});
});
