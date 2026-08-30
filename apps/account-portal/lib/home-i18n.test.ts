import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, homeMessages, resolveLocale } from "./i18n";

describe("CinaSeek Accounts homepage localization", () => {
	it("defaults to Simplified Chinese and honors an explicit saved locale", () => {
		expect(DEFAULT_LOCALE).toBe("zh-CN");
		expect(resolveLocale({ cookieLocale: "en", acceptLanguage: "zh-CN" })).toBe(
			"en",
		);
		expect(
			resolveLocale({ cookieLocale: "zh-CN", acceptLanguage: "en-US" }),
		).toBe("zh-CN");
	});

	it("negotiates supported browser languages and rejects unknown values", () => {
		expect(resolveLocale({ acceptLanguage: "en-US,en;q=0.9" })).toBe("en");
		expect(resolveLocale({ acceptLanguage: "zh-TW,zh;q=0.9,en;q=0.8" })).toBe(
			"zh-CN",
		);
		expect(
			resolveLocale({ acceptLanguage: "fr;q=1,en;q=0.4,zh-CN;q=0.9" }),
		).toBe("zh-CN");
		expect(resolveLocale({ cookieLocale: "fr", acceptLanguage: "fr-FR" })).toBe(
			DEFAULT_LOCALE,
		);
	});

	it("keeps every visible homepage message available in both languages", () => {
		expect(Object.keys(homeMessages.en).sort()).toEqual(
			Object.keys(homeMessages["zh-CN"]).sort(),
		);
		expect(homeMessages["zh-CN"].heroTitle).toContain("一个账户");
		expect(homeMessages.en.heroTitle).toContain("One account");
		expect(homeMessages["zh-CN"].heroTitle).not.toBe(homeMessages.en.heroTitle);
	});

	it("persists language choice without reloading the page", () => {
		const providerSource = readFileSync(
			new URL("../components/i18n-provider.tsx", import.meta.url),
			"utf8",
		);

		expect(providerSource).toContain("document.cookie");
		expect(providerSource).toContain("document.documentElement.lang");
		expect(providerSource).not.toContain("window.location.reload");
	});
});
