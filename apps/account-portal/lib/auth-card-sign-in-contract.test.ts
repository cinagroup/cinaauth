import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAuthenticationPath } from "./dashboard-navigation";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("Accounts card-first sign-in contract", () => {
	it("renders runtime-enabled primary methods without restoring retired sign-up flows", () => {
		const source = readSource("../app/(auth)/sign-in/_components/sign-in.tsx");
		const formSource = readSource("../components/forms/email-otp-form.tsx");
		const clientSource = readSource("./auth-client.ts");
		const providerSource = readSource(
			"../components/oauth-provider-buttons.tsx",
		);
		const i18nSource = readSource("./i18n.ts");

		expect(source).toContain("<EmailOtpForm");
		expect(source).toContain("window.location.href = path");
		expect(source).toContain("methods.emailPassword");
		expect(source).toContain("methods.passkey");
		expect(source).toContain("<OAuthProviderButtons");
		expect(source).toContain("signInPolicy.allowFederatedProviders");
		expect(source).not.toContain("Magic Link");
		expect(source).toContain("messages.continuePasskey");
		expect(i18nSource).toContain('continuePasskey: "Continue with passkey"');
		expect(source).toContain("signIn.passkey");
		expect(formSource).toContain('autoComplete="one-time-code"');
		expect(formSource).toContain("existingUserOnly");
		expect(source).toContain("completeEmailOtpAuthentication");
		expect(source).toContain("messages.newWalletAccount");
		expect(i18nSource).toContain(
			'newWalletAccount:\n\t\t"New wallet? We\'ll create your account after you verify the signature.",',
		);
		expect(clientSource).not.toContain("usernameClient");
		expect(clientSource).not.toContain("magicLinkClient");
		expect(clientSource).not.toContain("NEXT_PUBLIC_GOOGLE_CLIENT_ID");
		expect(providerSource).toContain(
			"<FieldSeparator>{messages.or}</FieldSeparator>",
		);
		expect(providerSource).toContain('data-icon="inline-start"');
		expect(providerSource).toContain("authClient.signIn.social");
		expect(providerSource).toContain("oneTapClient");
		expect(providerSource).toContain("oneTapClientId");
		expect(providerSource).toContain("googleOneTapClient.oneTap");
		expect(providerSource).not.toContain("NEXT_PUBLIC_GOOGLE_CLIENT_ID");
		expect(providerSource).toContain("new ResizeObserver");
		expect(providerSource).not.toContain("content-visibility: hidden");
		expect(providerSource).not.toContain("flex-grow border-t");
	});

	it("isolates focused authentication and OAuth transaction routes from the marketing chrome", () => {
		const chromeSource = readSource("../components/site-chrome.tsx");

		expect(chromeSource).toContain("isAuthenticationPath(pathname)");
		expect(isAuthenticationPath("/sign-in")).toBe(true);
		expect(isAuthenticationPath("/sign-in/password")).toBe(true);
		expect(isAuthenticationPath("/sign-up")).toBe(true);
		expect(isAuthenticationPath("/forgot-password")).toBe(true);
		expect(isAuthenticationPath("/reset-password")).toBe(true);
		expect(isAuthenticationPath("/oauth/consent")).toBe(true);
		expect(isAuthenticationPath("/oauth/select-account")).toBe(true);
		expect(isAuthenticationPath("/oauth/select-organization")).toBe(true);
		expect(isAuthenticationPath("/two-factor/backup")).toBe(false);
		expect(isAuthenticationPath("/device/approve")).toBe(false);
		expect(isAuthenticationPath("/accept-invitation/example")).toBe(false);
		expect(isAuthenticationPath("/sign-in-preview")).toBe(false);
		expect(isAuthenticationPath("/dashboard")).toBe(false);
	});

	it("uses the shared focused shell throughout OAuth transaction steps", () => {
		const transactionSources = [
			"../app/(auth)/oauth/consent/consent-view.tsx",
			"../app/(auth)/oauth/select-account/page.tsx",
			"../app/(auth)/oauth/select-organization/page.tsx",
		].map(readSource);

		for (const source of transactionSources) {
			expect(source).toContain("<AuthShell");
			expect(source).toContain('variant="transaction"');
			expect(source).not.toContain("<Card");
			expect(source).not.toContain("min-h-screen");
		}
	});
});
