import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/locales/en.json";
import zh from "@/lib/i18n/locales/zh.json";

describe("translation dictionaries", () => {
	it("keep English and Chinese keys in parity", () => {
		expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort());
	});

	it("does not ship blank translations", () => {
		for (const dictionary of [en, zh]) {
			for (const [key, value] of Object.entries(dictionary)) {
				expect(value.trim(), key).not.toBe("");
			}
		}
	});
});
