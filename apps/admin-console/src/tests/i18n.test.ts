import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n/dictionary";
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

	it("localizes post-deploy configuration progress and structural blockers", () => {
		for (const key of [
			"configuration.operationInProgress",
			"configuration.structuralUnavailableHint",
		]) {
			expect(en[key as keyof typeof en], `en:${key}`).toBeTruthy();
			expect(zh[key as keyof typeof zh], `zh:${key}`).toBeTruthy();
		}
	});

	it("interpolates both supported placeholder styles", () => {
		expect(translate("en", "common.typeToConfirm", { value: "user-123" })).toBe(
			"Type user-123 to confirm.",
		);
		expect(
			translate("zh", "impersonate.banner", { user: "admin@cina.test" }),
		).toBe("正在以 admin@cina.test 身份操作");
	});
});
