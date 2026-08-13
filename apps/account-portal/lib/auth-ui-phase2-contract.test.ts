import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
	completeEmailOtpSignUp,
	getEmailOtpCopy,
	normalizeEmailOtp,
	requiresNewEmailOtpUser,
	suppressEmailOtpAutomaticRedirect,
} from "./email-otp-flow";
import {
	buildPreservedAuthPath,
	hasSignedOidcAuthorizationQuery,
	hasSignedOidcCreatePrompt,
} from "./oidc-navigation";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

const signedSignUpQuery = new URLSearchParams([
	["client_id", "cinaauth-oidc-demo"],
	["redirect_uri", "https://oidc-demo.cinaseek.ai/callback"],
	["state", "state"],
	["code_challenge", "challenge"],
	["code_challenge_method", "S256"],
	["resource", "https://api-one.example"],
	["resource", "https://api-two.example"],
	["ba_param", "client_id"],
	["ba_param", "redirect_uri"],
	["ba_param", "code_challenge"],
	["ba_param", "code_challenge_method"],
	["ba_param", "resource"],
	["sig", "signature"],
]);

const signedCreateQuery = new URLSearchParams(signedSignUpQuery);
signedCreateQuery.set("prompt", "consent create");
signedCreateQuery.append("ba_param", "prompt");

describe("Accounts authentication UI phase two contract", () => {
	it("preserves signed OIDC context through email registration", () => {
		const target = new URL(
			buildPreservedAuthPath("/sign-up/email", signedSignUpQuery, "/dashboard"),
			"https://accounts.cinaseek.ai",
		);

		expect(hasSignedOidcAuthorizationQuery(target.searchParams)).toBe(true);
		expect(target.searchParams.getAll("ba_param")).toEqual([
			"client_id",
			"redirect_uri",
			"code_challenge",
			"code_challenge_method",
			"resource",
		]);
		expect(target.searchParams.getAll("resource")).toEqual([
			"https://api-one.example",
			"https://api-two.example",
		]);
		expect(target.searchParams.get("sig")).toBe("signature");
		expect(hasSignedOidcCreatePrompt(signedCreateQuery)).toBe(true);
		expect(
			hasSignedOidcCreatePrompt(
				new URLSearchParams(`${signedSignUpQuery.toString()}&prompt=create`),
			),
		).toBe(false);
	});

	it("keeps sign-up on the sign-in email OTP server contract", () => {
		expect(getEmailOtpCopy("signup")).toMatchObject({
			sendButton: "Send sign-up code",
			verifyButton: "Verify and continue",
		});
		expect(getEmailOtpCopy("signin")).toMatchObject({
			sendButton: "Send sign-in code",
			verifyButton: "Verify and sign in",
		});
		expect(requiresNewEmailOtpUser("signup")).toBe(true);
		expect(requiresNewEmailOtpUser("signin")).toBe(false);
	});

	it("continues prompt=create exactly once without trusting redirect_uri", async () => {
		const continueOidcCreation = vi.fn().mockResolvedValue(undefined);
		const navigate = vi.fn();
		const outcome = await completeEmailOtpSignUp({
			params: signedCreateQuery,
			callbackURL: "/dashboard",
			continueOidcCreation,
			navigate,
		});

		expect(outcome).toBe("oidc-create");
		expect(continueOidcCreation).toHaveBeenCalledTimes(1);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("delegates regular signed OIDC and locally navigates only safe callbacks", async () => {
		const continueOidcCreation = vi.fn().mockResolvedValue(undefined);
		const navigate = vi.fn();

		expect(
			await completeEmailOtpSignUp({
				params: signedSignUpQuery,
				callbackURL: "/dashboard",
				continueOidcCreation,
				navigate,
			}),
		).toBe("oidc-auto-resume");
		expect(continueOidcCreation).not.toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();

		expect(
			await completeEmailOtpSignUp({
				params: new URLSearchParams(),
				callbackURL: "/device?user_code=ABCD-EFGH",
				continueOidcCreation,
				navigate,
			}),
		).toBe("callback");
		expect(navigate).toHaveBeenCalledWith("/device?user_code=ABCD-EFGH");
	});

	it("suppresses only the stale create-prompt redirect payload", () => {
		const payload = { redirect: true, url: "/sign-up?signed=query" };
		expect(suppressEmailOtpAutomaticRedirect(payload)).toBe(true);
		expect(payload.redirect).toBe(false);
		expect(suppressEmailOtpAutomaticRedirect({ token: "session" })).toBe(false);
	});

	it("normalizes the six-digit OTP without accepting other characters", () => {
		expect(normalizeEmailOtp(" 12a3-4567 ")).toBe("123456");
		expect(normalizeEmailOtp("abc")).toBe("");
	});

	it("uses the shared accessible fields and throws client failures", () => {
		const formSource = readSource("../components/forms/email-otp-form.tsx");

		expect(formSource).toContain("<FieldGroup");
		expect(formSource).toContain("<FieldError");
		expect(formSource).toContain('autoComplete="one-time-code"');
		expect(formSource).toContain("throw: true");
		expect(formSource).toContain('type: "sign-in"');
		expect(formSource).toContain("requiresNewEmailOtpUser(intent)");
		expect(formSource).not.toContain("<button");
		expect(formSource).not.toContain("setInterval(");
	});

	it("wires both registration pages through the preserved auth context", () => {
		const signInPageSource = readSource("../app/(auth)/sign-in/page.tsx");
		const signUpLinkSource = readSource(
			"../app/(auth)/sign-in/_components/sign-up-link.tsx",
		);
		const signUpSource = readSource(
			"../app/(auth)/sign-up/_components/sign-up.tsx",
		);
		const emailPageSource = readSource("../app/(auth)/sign-up/email/page.tsx");

		expect(signUpSource).toContain("useSearchParams");
		expect(signUpSource).toContain("buildPreservedAuthPath");
		expect(signUpSource).toContain("hasSignedOidcCreatePrompt");
		expect(signUpSource).toContain("hasCreatePrompt ? null");
		expect(signUpSource).not.toContain('href="/sign-up/email"');
		expect(signUpSource).not.toContain('callbackURL="/dashboard"');
		expect(emailPageSource).toContain("completeEmailOtpSignUp");
		expect(emailPageSource).toContain("hasSignedOidcCreatePrompt");
		expect(emailPageSource).toContain("authClient.oauth2.continue");
		expect(emailPageSource).toContain("created: true");
		expect(emailPageSource).toContain("suppressAutomaticRedirect");
		expect(emailPageSource).toContain('intent="signup"');
		expect(emailPageSource).not.toContain(
			'onSuccess={() => (window.location.href = "/dashboard")}',
		);
		expect(signInPageSource).toContain("<SignUpLink />");
		expect(signUpLinkSource).toContain("useSearchParams");
		expect(signUpLinkSource).toContain("buildPreservedAuthPath");
		expect(signUpLinkSource).not.toContain('href="/sign-up"');
	});
});
