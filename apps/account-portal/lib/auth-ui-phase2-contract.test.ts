import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { completeLocalSignInSuccess } from "./auth-form-response";
import {
	completeEmailOtpAuthentication,
	getEmailOtpCopy,
	normalizeEmailOtp,
	requiresExistingEmailOtpUser,
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
	it("preserves signed OIDC context through unified email authentication", () => {
		const target = new URL(
			buildPreservedAuthPath("/sign-in", signedSignUpQuery, "/dashboard"),
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

	it("allows ordinary email sign-in to create a verified user", () => {
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
		expect(requiresExistingEmailOtpUser("signin")).toBe(false);
		expect(requiresExistingEmailOtpUser("signup")).toBe(false);
	});

	it("continues prompt=create exactly once without trusting redirect_uri", async () => {
		const continueOidcCreation = vi.fn().mockResolvedValue(undefined);
		const navigate = vi.fn();
		const outcome = await completeEmailOtpAuthentication({
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
			await completeEmailOtpAuthentication({
				params: signedSignUpQuery,
				callbackURL: "/dashboard",
				continueOidcCreation,
				navigate,
			}),
		).toBe("oidc-auto-resume");
		expect(continueOidcCreation).not.toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();

		expect(
			await completeEmailOtpAuthentication({
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
		expect(formSource).toContain("requiresExistingEmailOtpUser(intent)");
		expect(formSource).toContain("completeLocalSignInSuccess");
		expect(formSource).not.toContain("<button");
		expect(formSource).not.toContain("setInterval(");
	});

	it("does not complete email OTP sign-in while a 2FA redirect is pending", () => {
		const notifySuccess = vi.fn();
		const onSuccess = vi.fn();

		expect(
			completeLocalSignInSuccess(
				{ twoFactorRedirect: true, twoFactorMethods: ["totp"] },
				{ notifySuccess, onSuccess },
			),
		).toBe(false);
		expect(notifySuccess).not.toHaveBeenCalled();
		expect(onSuccess).not.toHaveBeenCalled();

		expect(
			completeLocalSignInSuccess(
				{ token: "session-token" },
				{ notifySuccess, onSuccess },
			),
		).toBe(true);
		expect(notifySuccess).toHaveBeenCalledOnce();
		expect(onSuccess).toHaveBeenCalledOnce();
	});

	it("forwards the complete signed OIDC query through email OTP requests", () => {
		const accountClientSource = readSource("./auth-client.ts");
		const oauthClientSource = readSource(
			"../../../packages/oauth-provider/src/client.ts",
		);
		const signedQuerySource = readSource(
			"../../../packages/oauth-provider/src/signed-query.ts",
		);

		expect(accountClientSource).toContain("oauthProviderClient()");
		expect(oauthClientSource).toContain(
			"oauth_query: buildSignedOAuthQuery(window.location.search)",
		);
		expect(signedQuerySource).toContain(
			"for (const [key, value] of params.entries())",
		);
		expect(signedQuerySource).toContain("signedParams.append(key, value)");
		expect(signedQuerySource).not.toContain("Object.fromEntries(params)");
	});

	it("wires the unified sign-in page through the preserved auth context", () => {
		const signInPageSource = readSource("../app/(auth)/sign-in/page.tsx");
		const signInSource = readSource(
			"../app/(auth)/sign-in/_components/sign-in.tsx",
		);
		const i18nSource = readSource("./i18n.ts");

		expect(signInSource).toContain("hasSignedOidcCreatePrompt");
		expect(signInSource).toContain("completeEmailOtpAuthentication");
		expect(signInSource).toContain("authClient.oauth2.continue");
		expect(signInSource).toContain("created: true");
		expect(signInSource).toContain("suppressAutomaticRedirect");
		expect(signInSource).toContain(
			'intent={hasCreatePrompt ? "signup" : "signin"}',
		);
		expect(signInSource).toContain("messages.newWalletAccount");
		expect(i18nSource).toContain(
			"New wallet? We'll create your account after you verify the",
		);
		expect(signInPageSource).not.toContain("<SignUpLink />");
	});
});
