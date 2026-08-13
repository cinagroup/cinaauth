import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("Accounts authentication UI phase one contract", () => {
	it("uses the accessible password visibility control for password sign-in", () => {
		const pageSource = readSource("../app/(auth)/sign-in/password/page.tsx");
		const inputSource = readSource("../components/ui/password-input.tsx");

		expect(pageSource).toContain("showPasswordToggle");
		expect(inputSource).not.toContain(": any");
		expect(inputSource).not.toContain('name="password_fake"');
		expect(inputSource).toContain("ref={ref}");
		expect(inputSource).toContain("{...props}");
		expect(inputSource).toContain("aria-pressed={showPassword}");
		expect(inputSource).toContain(
			'aria-label={showPassword ? "Hide password" : "Show password"}',
		);
		expect(inputSource.match(/className="h-4 w-4"/g) ?? []).toHaveLength(2);
	});

	it("renders forgot-password states in the shared AuthShell", () => {
		const pageSource = readSource("../app/(auth)/forgot-password/page.tsx");
		const formSource = readSource(
			"../components/forms/forgot-password-form.tsx",
		);

		expect(pageSource).toContain("<AuthShell");
		expect(pageSource).not.toContain("<Card");
		expect(pageSource).toContain("<Alert");
		expect(pageSource).toContain(
			"If you don't see the email, check your spam folder.",
		);
		expect(formSource).toContain("<TurnstileChallenge challenge={captcha}");
	});

	it("renders reset-password in the shared AuthShell without changing reset behavior", () => {
		const pageSource = readSource("../app/(auth)/reset-password/page.tsx");
		const formSource = readSource(
			"../components/forms/reset-password-form.tsx",
		);

		expect(pageSource).toContain("<AuthShell");
		expect(pageSource).not.toContain("<Card");
		expect(pageSource).toContain("if (!token)");
		expect(pageSource).toContain('role="alert"');
		expect(pageSource.indexOf("if (!token)")).toBeLessThan(
			pageSource.indexOf("<ResetPasswordForm"),
		);
		expect(pageSource).toContain('router.push("/sign-in")');
		expect(formSource).toContain("authClient.resetPassword");
		expect(formSource.match(/autoComplete="new-password"/g) ?? []).toHaveLength(
			2,
		);
	});
});
