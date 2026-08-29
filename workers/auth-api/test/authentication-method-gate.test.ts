import { describe, expect, it } from "vitest";
import { getDisabledAuthenticationMethod } from "../src/authentication-method-gate";
import type { SocialSignInSettings } from "../src/social-provider-store";

const settings = (
	overrides: Partial<SocialSignInSettings> = {},
): SocialSignInSettings => ({
	socialProviderLimit: 20,
	emailOtpLoginEnabled: false,
	emailPasswordLoginEnabled: false,
	passkeyLoginEnabled: false,
	siweLoginEnabled: false,
	googleOneTapEnabled: false,
	...overrides,
});

describe("runtime authentication method gate", () => {
	it("fails closed for disabled public sign-in endpoints", () => {
		expect(
			getDisabledAuthenticationMethod(
				"/api/auth/email-otp/send-verification-otp",
				settings(),
			),
		).toBe("email_otp");
		expect(
			getDisabledAuthenticationMethod(
				"/api/auth/sign-in/email-otp",
				settings(),
			),
		).toBe("email_otp");
		expect(
			getDisabledAuthenticationMethod("/api/auth/sign-in/email", settings()),
		).toBe("email_password");
		expect(
			getDisabledAuthenticationMethod(
				"/api/auth/passkey/verify-authentication",
				settings(),
			),
		).toBe("passkey");
		expect(
			getDisabledAuthenticationMethod("/api/auth/siwe/verify", settings()),
		).toBe("siwe");
		expect(
			getDisabledAuthenticationMethod("/api/auth/one-tap/callback", settings()),
		).toBe("google_one_tap");
	});

	it("does not block account security management or enabled methods", () => {
		expect(
			getDisabledAuthenticationMethod(
				"/api/auth/passkey/generate-register-options",
				settings(),
			),
		).toBeNull();
		expect(
			getDisabledAuthenticationMethod("/api/auth/siwe/link-wallet", settings()),
		).toBeNull();
		expect(
			getDisabledAuthenticationMethod(
				"/api/auth/sign-in/email",
				settings({ emailPasswordLoginEnabled: true }),
			),
		).toBeNull();
	});
});
