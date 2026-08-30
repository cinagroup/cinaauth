import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("localized account sign-in contract", () => {
	it("keeps the homepage language active throughout the primary sign-in flow", () => {
		const pageSource = readSource("../app/(auth)/sign-in/page.tsx");
		const shellSource = readSource("../components/auth/sign-in-page-shell.tsx");
		const signInSource = readSource(
			"../app/(auth)/sign-in/_components/sign-in.tsx",
		);
		const emailOtpSource = readSource("../components/forms/email-otp-form.tsx");
		const oauthSource = readSource("../components/oauth-provider-buttons.tsx");

		expect(pageSource).toContain("<SignInPageShell>");
		expect(shellSource).toContain("<LanguageSwitcher");
		for (const source of [
			shellSource,
			signInSource,
			emailOtpSource,
			oauthSource,
		]) {
			expect(source).toContain("useI18n");
		}
		expect(emailOtpSource).not.toContain(">Email</FieldLabel>");
		expect(oauthSource).not.toContain("<FieldSeparator>Or</FieldSeparator>");
	});
});
