import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getPreferredTwoFactorPath } from "./two-factor-navigation";
import {
	classifyTwoFactorVerificationData,
	formatBackupCodesText,
} from "./two-factor-verification";

const readSource = (relativePath: string) =>
	readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

describe("two-factor recovery responses", () => {
	it("opens the first server-advertised factor while preserving recovery access", () => {
		expect(getPreferredTwoFactorPath(["totp", "otp"])).toBe("/two-factor");
		expect(getPreferredTwoFactorPath(["otp"])).toBe("/two-factor/backup");
		expect(getPreferredTwoFactorPath([])).toBe("/two-factor/backup");
		expect(getPreferredTwoFactorPath(undefined)).toBe("/two-factor");
	});

	it("accepts only session and redirect success payloads", () => {
		expect(classifyTwoFactorVerificationData({ token: "session-token" })).toBe(
			"session",
		);
		expect(
			classifyTwoFactorVerificationData({
				redirect: true,
				url: "https://client.example/callback",
			}),
		).toBe("redirect");
		expect(classifyTwoFactorVerificationData({ status: true })).toBe("invalid");
		expect(classifyTwoFactorVerificationData(null)).toBe("invalid");
	});

	it("formats one-time recovery codes without importing the source UI runtime", () => {
		expect(formatBackupCodesText(["alpha-1", "beta-2"])).toBe(
			[
				"CinaSeek Accounts backup codes",
				"Store these codes securely. Each code can be used only once.",
				"",
				"alpha-1",
				"beta-2",
			].join("\n"),
		);
	});
});

describe("two-factor recovery UI contract", () => {
	it("keeps recovery codes until the user explicitly confirms saving them", () => {
		const source = readSource("../components/forms/two-factor-enable-form.tsx");
		const dashboardI18n = readSource("./dashboard-i18n.ts");
		const overview = readSource("../app/dashboard/_components/user-card.tsx");
		const securityCenter = readSource(
			"../app/dashboard/security/security-center.tsx",
		);
		expect(source).toContain("setBackupCodes(ctx.data.backupCodes)");
		expect(source).toContain('setStep("backupCodes")');
		expect(source).toContain("messages.savedBackupCodes");
		expect(dashboardI18n).toContain(
			'savedBackupCodes: "I saved these codes"',
		);
		expect(source).toContain("onBackupCodesPendingChange?.(true)");
		for (const parentSource of [overview, securityCenter]) {
			expect(parentSource).toContain("backupCodesPending");
			expect(parentSource).toContain("onBackupCodesPendingChange");
			expect(parentSource).toContain("onEscapeKeyDown");
			expect(parentSource).toContain("onPointerDownOutside");
			expect(parentSource).toContain("event.preventDefault()");
		}
		expect(source).not.toContain("@better-auth-ui");
	});

	it("exposes only TOTP and backup-code challenges", () => {
		const client = readSource("./auth-client.ts");
		const navigation = readSource("./two-factor-navigation.ts");
		const totpPage = readSource("../app/(auth)/two-factor/page.tsx");
		const otpPage = readSource("../app/(auth)/two-factor/otp/page.tsx");
		const backupPage = readSource("../app/(auth)/two-factor/backup/page.tsx");

		expect(navigation).toContain('"/two-factor/backup"');
		expect(client).toContain("getPreferredTwoFactorPath(twoFactorMethods)");
		expect(totpPage).toContain('buildTwoFactorAuthPath("/two-factor/backup"');
		expect(totpPage).not.toContain('"/two-factor/otp"');
		expect(otpPage).toContain("buildRetiredEmailTwoFactorRedirect");
		expect(otpPage).not.toContain("TwoFactorEmailOtpForm");
		expect(backupPage).toContain("TwoFactorBackupCodeForm");
		expect(backupPage).toContain("getTwoFactorSuccessPath(params)");
		expect(backupPage).not.toContain('"/two-factor/otp"');
	});
});
