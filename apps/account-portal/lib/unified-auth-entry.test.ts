import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildUnifiedSignUpRedirect } from "./legacy-auth-redirect";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

const signedCreateInput = {
	client_id: "cinaauth-oidc-demo",
	redirect_uri: "https://oidc-demo.cinaseek.ai/callback",
	prompt: "consent create",
	ba_param: ["client_id", "redirect_uri", "prompt"],
	sig: "signature",
};

describe("Accounts unified sign-in and account creation entry", () => {
	it("redirects legacy sign-up routes to sign-in without dropping signed OIDC context", () => {
		const target = new URL(
			buildUnifiedSignUpRedirect(signedCreateInput),
			"https://accounts.cinaseek.ai",
		);

		expect(target.pathname).toBe("/sign-in");
		expect(target.searchParams.get("prompt")).toBe("consent create");
		expect(target.searchParams.getAll("ba_param")).toEqual([
			"client_id",
			"redirect_uri",
			"prompt",
		]);
		expect(target.searchParams.get("sig")).toBe("signature");
	});

	it("sanitizes unsigned return targets instead of preserving arbitrary input", () => {
		expect(
			buildUnifiedSignUpRedirect({
				callbackURL: "https://attacker.example/steal",
				untrusted: "value",
			}),
		).toBe("/sign-in?callbackURL=%2Fdashboard");
	});

	it("keeps legacy route files as redirects and removes the separate registration UI", () => {
		const signUpPage = readSource("../app/(auth)/sign-up/page.tsx");
		const emailSignUpPage = readSource("../app/(auth)/sign-up/email/page.tsx");
		const signInPage = readSource("../app/(auth)/sign-in/page.tsx");

		for (const source of [signUpPage, emailSignUpPage]) {
			expect(source).toContain("buildUnifiedSignUpRedirect");
			expect(source).toContain("redirect(");
			expect(source).not.toContain("<AuthShell");
			expect(source).not.toContain("<EmailOtpForm");
		}
		expect(signInPage).toContain('title="Sign in or create your account"');
		expect(signInPage).toContain("By continuing, you agree to our");
		expect(signInPage).not.toContain("<SignUpLink");
	});

	it("points public account-creation calls to the unified sign-in route", () => {
		const header = readSource("../components/header.tsx");
		const pricing = readSource("../app/pricing/page.tsx");
		const sitemap = readSource("../app/sitemap.ts");

		expect(header).toContain('<Link href="/sign-in">Get started</Link>');
		expect(header).not.toContain('href="/sign-up"');
		expect(pricing).not.toContain('href: "/sign-up"');
		expect(sitemap).not.toContain('"/sign-up"');
	});
});
