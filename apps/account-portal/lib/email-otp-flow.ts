import {
	hasSignedOidcAuthorizationQuery,
	hasSignedOidcCreatePrompt,
} from "./oidc-navigation";

export type EmailOtpIntent = "signin" | "signup";

export function normalizeEmailOtp(value: string) {
	return value.replace(/\D/g, "").slice(0, 6);
}

export function requiresNewEmailOtpUser(intent: EmailOtpIntent) {
	return intent === "signup";
}

/**
 * Ordinary email authentication is intentionally account-mode agnostic.
 * Account creation still occurs only after the OTP has been verified.
 */
export function requiresExistingEmailOtpUser(_intent: EmailOtpIntent) {
	return false;
}

export function suppressEmailOtpAutomaticRedirect(data: unknown) {
	if (
		typeof data !== "object" ||
		data === null ||
		!("redirect" in data) ||
		data.redirect !== true
	) {
		return false;
	}
	data.redirect = false;
	return true;
}

export async function completeEmailOtpAuthentication({
	params,
	callbackURL,
	continueOidcCreation,
	navigate,
}: {
	params: URLSearchParams;
	callbackURL: string;
	continueOidcCreation: () => Promise<void>;
	navigate: (path: string) => void;
}) {
	if (hasSignedOidcCreatePrompt(params)) {
		await continueOidcCreation();
		return "oidc-create" as const;
	}
	if (hasSignedOidcAuthorizationQuery(params)) {
		return "oidc-auto-resume" as const;
	}
	navigate(callbackURL);
	return "callback" as const;
}
