import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	buildLegacyPasswordSignInRedirect,
	buildRetiredEmailTwoFactorRedirect,
} from "./legacy-auth-redirect";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("Accounts authentication UI phase one contract", () => {
	it("gates existing-account password sign-in from the runtime capability", () => {
		const pageSource = readSource("../app/(auth)/sign-in/password/page.tsx");
		const formSource = readSource(
			"../components/forms/password-sign-in-form.tsx",
		);

		expect(pageSource).toContain("useAuthCapabilities");
		expect(pageSource).toContain("methods.emailPassword === true");
		expect(pageSource).toContain("<PasswordSignInForm");
		expect(pageSource).toContain("Password sign-in is unavailable");
		expect(formSource).toContain("authClient.signIn.email");
		expect(formSource).toContain('useTurnstileChallenge("/sign-in/email")');
		expect(formSource).toContain('autoComplete="current-password"');
		expect(formSource).not.toContain("authClient.signUp");
	});

	it("preserves repeated signed OIDC parameters through the retired password route", () => {
		const target = new URL(
			buildLegacyPasswordSignInRedirect({
				client_id: "cinaauth-oidc-demo",
				redirect_uri: "https://client.example/callback",
				resource: ["https://api-one.example", "https://api-two.example"],
				ba_param: ["client_id", "redirect_uri", "resource", "resource"],
				sig: "signature",
				callbackURL: "/device?user_code=ABCD-EFGH",
			}),
			"https://accounts.cinaseek.ai",
		);

		expect(target.pathname).toBe("/sign-in");
		expect(target.searchParams.getAll("resource")).toEqual([
			"https://api-one.example",
			"https://api-two.example",
		]);
		expect(target.searchParams.getAll("ba_param")).toEqual([
			"client_id",
			"redirect_uri",
			"resource",
			"resource",
		]);
		expect(target.searchParams.get("sig")).toBe("signature");
		expect(target.searchParams.get("callbackURL")).toBe(
			"/device?user_code=ABCD-EFGH",
		);
	});

	it("canonicalizes an unsafe legacy callback without forwarding other query data", () => {
		const target = new URL(
			buildLegacyPasswordSignInRedirect({
				callbackURL: "https://attacker.example/steal",
				password: "must-not-be-forwarded",
			}),
			"https://accounts.cinaseek.ai",
		);

		expect(target.searchParams.get("callbackURL")).toBe("/dashboard");
		expect(target.searchParams.has("password")).toBe(false);
	});

	it("does not rewrite a callback covered by the OIDC signature", () => {
		const camelCaseTarget = new URL(
			buildLegacyPasswordSignInRedirect({
				client_id: "cinaauth-oidc-demo",
				redirect_uri: "https://client.example/callback",
				callbackUrl: "/signed-return",
				ba_param: ["client_id", "redirect_uri", "callbackUrl"],
				sig: "signature",
			}),
			"https://accounts.cinaseek.ai",
		);

		expect(camelCaseTarget.searchParams.get("callbackUrl")).toBe(
			"/signed-return",
		);
		expect(camelCaseTarget.searchParams.getAll("ba_param")).toContain(
			"callbackUrl",
		);

		const canonicalTarget = new URL(
			buildLegacyPasswordSignInRedirect({
				client_id: "cinaauth-oidc-demo",
				redirect_uri: "https://client.example/callback",
				callbackURL: "/signed-canonical-return",
				ba_param: ["client_id", "redirect_uri", "callbackURL"],
				sig: "signature",
			}),
			"https://accounts.cinaseek.ai",
		);

		expect(canonicalTarget.searchParams.get("callbackURL")).toBe(
			"/signed-canonical-return",
		);
		expect(canonicalTarget.searchParams.getAll("ba_param")).toContain(
			"callbackURL",
		);
	});

	it("preserves a signed challenge when retiring email-delivered 2FA", () => {
		const target = new URL(
			buildRetiredEmailTwoFactorRedirect({
				client_id: "cinaauth-oidc-demo",
				redirect_uri: "https://client.example/callback",
				resource: ["https://api-one.example", "https://api-two.example"],
				ba_param: ["client_id", "redirect_uri", "resource"],
				sig: "signature",
			}),
			"https://accounts.cinaseek.ai",
		);

		expect(target.pathname).toBe("/two-factor");
		expect(target.searchParams.getAll("resource")).toEqual([
			"https://api-one.example",
			"https://api-two.example",
		]);
		expect(target.searchParams.get("sig")).toBe("signature");
	});

	it("redirects the retired forgot-password route", () => {
		const pageSource = readSource("../app/(auth)/forgot-password/page.tsx");

		expect(pageSource).toContain('redirect("/sign-in")');
		expect(pageSource).not.toContain("ForgotPasswordForm");
	});

	it("redirects the retired reset-password route without forwarding its token", () => {
		const pageSource = readSource("../app/(auth)/reset-password/page.tsx");

		expect(pageSource).toContain('redirect("/sign-in")');
		expect(pageSource).not.toContain("ResetPasswordForm");
		expect(pageSource).not.toContain("searchParams");
	});

	it("does not expose change-password or credential deletion controls", () => {
		const userCardSource = readSource(
			"../app/dashboard/_components/user-card.tsx",
		);
		const securitySource = readSource(
			"../app/dashboard/security/security-center.tsx",
		);

		expect(userCardSource).not.toContain("ChangePasswordForm");
		expect(userCardSource).not.toContain("Change Password");
		expect(securitySource).not.toContain("ChangePasswordForm");
		expect(securitySource).not.toContain("delete-password");
		expect(securitySource).toContain("recentAuthentication");
	});

	it("keeps the existing two-factor management surfaces", () => {
		const userCardSource = readSource(
			"../app/dashboard/_components/user-card.tsx",
		);
		const securitySource = readSource(
			"../app/dashboard/security/security-center.tsx",
		);

		expect(userCardSource).toContain("<TwoFactorEnableForm");
		expect(userCardSource).toContain("<TwoFactorDisableForm");
		expect(userCardSource).toContain("<TwoFactorQrForm");
		expect(userCardSource).toContain(
			"requiresPassword={requiresPasswordForTwoFactor}",
		);
		expect(securitySource).toContain("<TwoFactorEnableForm");
		expect(securitySource).toContain("<TwoFactorDisableForm");
		expect(securitySource).toContain(
			"requiresPassword={requiresPasswordForTwoFactor}",
		);
	});

	it("omits 2FA password input only for accounts without a retained credential", () => {
		const enableSource = readSource(
			"../components/forms/two-factor-enable-form.tsx",
		);
		const disableSource = readSource(
			"../components/forms/two-factor-disable-form.tsx",
		);
		const qrSource = readSource("../components/forms/two-factor-qr-form.tsx");

		for (const source of [enableSource, disableSource, qrSource]) {
			expect(source).toContain("requiresPassword = true");
			expect(source).toContain("getTwoFactorPasswordBody");
		}
	});
});
