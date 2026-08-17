import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readPage = (name: "delivery" | "privacy-erasure") =>
	readFileSync(
		resolve("src", "app", "(admin)", "settings", name, "page.tsx"),
		"utf8",
	);

describe("post-deploy configuration pages", () => {
	it("shows accessible operation progress and fail-closed structural guidance", () => {
		for (const name of ["delivery", "privacy-erasure"] as const) {
			const source = readPage(name);

			expect(source, name).toContain("getAdminApiErrorMessage");
			expect(source, name).toContain('role="status"');
			expect(source, name).toContain("aria-busy={mutation.isPending}");
			expect(source, name).toContain('t("configuration.operationInProgress")');
			expect(source, name).toContain(
				't("configuration.structuralUnavailableHint")',
			);
			expect(source, name).toContain(
				"disabled={!status.structuralReady || mutation.isPending}",
			);
		}
	});

	it("keeps delivery credentials write-only and follows stage-test-activate", () => {
		const source = readPage("delivery");

		for (const field of [
			"apiKey",
			"accountSid",
			"authToken",
			"fromNumber",
			"recipient",
			"nextVersion",
			"ACTIVATE",
			"ROLLBACK",
			'autoComplete="new-password"',
		]) {
			expect(source).toContain(field);
		}
		expect(source).toContain('"integration.delivery.manage"');
		expect(source).not.toContain("localStorage");
		expect(source).not.toContain("URLSearchParams");
	});

	it("offers both email providers with provider-specific write-only fields", () => {
		const source = readPage("delivery");

		for (const field of [
			"cloudflare-email",
			"apiToken",
			"accountId",
			"delivery.provider.resend",
			"delivery.provider.cloudflare-email",
			"delivery.provider.${status.provider}",
		]) {
			expect(source).toContain(field);
		}
	});

	it("uses structured erasure targets without displaying target secrets", () => {
		const source = readPage("privacy-erasure");

		for (const field of [
			"targets",
			"targetIds",
			"signingSecret",
			"targetIds",
			"ACTIVATE",
			"ROLLBACK",
			'autoComplete="new-password"',
		]) {
			expect(source).toContain(field);
		}
		expect(source).toContain('"privacy.erasure.manage"');
		expect(source).not.toContain("localStorage");
		expect(source).not.toContain("URLSearchParams");
	});
});
