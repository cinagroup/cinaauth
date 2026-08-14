export type SignUpAvailability =
	| { kind: "pending" }
	| { kind: "error" }
	| { kind: "create-unavailable" }
	| { kind: "unavailable" }
	| {
			kind: "ready";
			showEmailOtp: boolean;
			showOAuth: boolean;
	  };

type SignUpAvailabilityInput = {
	isPending: boolean;
	isError: boolean;
	hasCreatePrompt: boolean;
	emailOtpReady: boolean;
	oauthReady: boolean;
};

/** Resolves a non-empty registration state from the live capability query. */
export const getSignUpAvailability = ({
	isPending,
	isError,
	hasCreatePrompt,
	emailOtpReady,
	oauthReady,
}: SignUpAvailabilityInput): SignUpAvailability => {
	if (isPending) return { kind: "pending" };
	if (isError) return { kind: "error" };

	const showEmailOtp = emailOtpReady;
	const showOAuth = !hasCreatePrompt && oauthReady;
	if (showEmailOtp || showOAuth) {
		return { kind: "ready", showEmailOtp, showOAuth };
	}

	return hasCreatePrompt
		? { kind: "create-unavailable" }
		: { kind: "unavailable" };
};
