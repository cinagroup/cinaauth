import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	EMAIL_VERIFICATION_OTP_LENGTH,
	normalizeEmailVerificationOtp,
} from "./email-verification-otp";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("Dashboard email verification OTP contract", () => {
	it("normalizes pasted values to the six digits accepted by the server", () => {
		expect(EMAIL_VERIFICATION_OTP_LENGTH).toBe(6);
		expect(normalizeEmailVerificationOtp(" 12-34 56 ")).toBe("123456");
		expect(normalizeEmailVerificationOtp("12ab345678")).toBe("123456");
	});

	it("completes the verification OTP that the resend action delivers", () => {
		const userCardSource = readSource(
			"../app/dashboard/_components/user-card.tsx",
		);

		expect(userCardSource).toContain("EmailVerificationOtpForm");

		const formSource = readSource(
			"../components/forms/email-verification-otp-form.tsx",
		);
		const cooldownSource = readSource("../hooks/use-resend-cooldown.ts");

		expect(formSource).toContain("authClient.emailOtp.sendVerificationOtp");
		expect(formSource).toContain('type: "email-verification"');
		expect(formSource).toContain("headers: captcha.headers");
		expect(formSource).toContain("throw: true");
		expect(formSource).toContain("<TurnstileChallenge challenge={captcha} />");
		expect(formSource).toContain("captcha.reset()");
		expect(formSource).not.toContain("authClient.sendVerificationEmail");
		expect(formSource).toContain("authClient.emailOtp.verifyEmail");
		expect(formSource).toContain("queryKey: userKeys.session()");
		expect(formSource).toContain("router.refresh()");
		expect(formSource).toContain("useResendCooldown");
		expect(cooldownSource).toContain("RESEND_COOLDOWN_SECONDS = 60");
		expect(cooldownSource).toContain("window.clearTimeout(timeout)");
		expect(formSource).toContain('autoComplete="one-time-code"');
		expect(formSource).toContain('inputMode="numeric"');
		expect(formSource).toContain('pattern="[0-9]{6}"');
		expect(formSource).toContain("normalizeEmailVerificationOtp");
		expect(formSource).toContain('setOtp("")');
		expect(formSource).toContain("<FieldError>{errorMessage}</FieldError>");
		expect(formSource).not.toContain("sessionStorage");
		expect(formSource).not.toContain("OpenEmailButton");
	});
});
