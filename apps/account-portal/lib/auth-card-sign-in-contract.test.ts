import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAuthenticationPath } from "./dashboard-navigation";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("Accounts card-first sign-in contract", () => {
	it("renders password sign-in as the primary task without inventing methods", () => {
		const source = readSource("../app/(auth)/sign-in/_components/sign-in.tsx");
		const formSource = readSource("../components/forms/sign-in-form.tsx");
		const providerSource = readSource(
			"../components/oauth-provider-buttons.tsx",
		);

		expect(source).toContain("<SignInForm");
		expect(source).toContain("callbackURL={callbackURL}");
		expect(source).toContain("showPasswordToggle");
		expect(source).toContain("<OAuthProviderButtons");
		expect(source).toContain("signInPolicy.allowFederatedProviders");
		expect(source).not.toContain("Continue with password");
		expect(source).not.toContain("Continue with Magic Link");
		expect(formSource).toContain('placeholder="Enter your email"');
		expect(formSource.match(/size="lg"/g) ?? []).toHaveLength(4);
		expect(providerSource).toContain("<FieldSeparator>Or</FieldSeparator>");
		expect(providerSource).toContain('data-icon="inline-start"');
		expect(providerSource).toContain("new ResizeObserver");
		expect(providerSource).toContain("googleButtonWidth");
		expect(providerSource).toContain("googleButtonMeasureRef");
		expect(providerSource).toContain('key={googleButtonWidth ?? "pending"}');
		expect(providerSource).not.toContain("content-visibility: hidden");
		expect(providerSource).not.toContain("flex-grow border-t");
	});

	it("isolates every authentication route from the marketing chrome", () => {
		const chromeSource = readSource("../components/site-chrome.tsx");

		expect(chromeSource).toContain("isAuthenticationPath(pathname)");
		expect(isAuthenticationPath("/sign-in")).toBe(true);
		expect(isAuthenticationPath("/sign-in/password")).toBe(true);
		expect(isAuthenticationPath("/sign-up")).toBe(true);
		expect(isAuthenticationPath("/forgot-password")).toBe(true);
		expect(isAuthenticationPath("/reset-password")).toBe(true);
		expect(isAuthenticationPath("/two-factor/backup")).toBe(false);
		expect(isAuthenticationPath("/oauth/consent")).toBe(false);
		expect(isAuthenticationPath("/device/approve")).toBe(false);
		expect(isAuthenticationPath("/accept-invitation/example")).toBe(false);
		expect(isAuthenticationPath("/sign-in-preview")).toBe(false);
		expect(isAuthenticationPath("/dashboard")).toBe(false);
	});
});
