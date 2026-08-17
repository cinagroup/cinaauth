import {
	hasSignedOidcAuthorizationQuery,
	hasSignedOidcCreatePrompt,
} from "./oidc-navigation";

export type EmailOtpIntent = "signin" | "signup";

const emailOtpCopy = {
	signin: {
		sendButton: "Send sign-in code",
		verifyButton: "Verify and sign in",
		sentMessage: "We sent a 6-digit sign-in code to",
		successMessage: "Successfully signed in",
	},
	signup: {
		sendButton: "Send sign-up code",
		verifyButton: "Verify and continue",
		sentMessage: "We sent a 6-digit sign-up code to",
		successMessage: "Email verified successfully",
	},
} as const satisfies Record<
	EmailOtpIntent,
	{
		sendButton: string;
		verifyButton: string;
		sentMessage: string;
		successMessage: string;
	}
>;

export function getEmailOtpCopy(intent: EmailOtpIntent) {
	return emailOtpCopy[intent];
}

export function normalizeEmailOtp(value: string) {
	return value.replace(/\D/g, "").slice(0, 6);
}

export function requiresNewEmailOtpUser(intent: EmailOtpIntent) {
	return intent === "signup";
}

/** Prevents the sign-in path from silently registering an unknown address. */
export function requiresExistingEmailOtpUser(intent: EmailOtpIntent) {
	return intent === "signin";
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

export async function completeEmailOtpSignUp({
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
