type PasswordResetRequestResult = {
	error?: { message?: string } | null;
};

type LocalSignInSuccessOptions = {
	notifySuccess: () => void;
	onSuccess?: () => void;
};

/** Promotes a default non-throw auth error before the UI reports success. */
export async function completePasswordResetRequest(
	request: () => Promise<PasswordResetRequestResult>,
	onSuccess?: () => void,
) {
	const result = await request();
	if (result.error) {
		throw new Error(
			result.error.message || "Unable to request a password reset.",
		);
	}
	onSuccess?.();
}

/** Lets the two-factor client exclusively own a pending challenge redirect. */
export function completeLocalSignInSuccess(
	data: unknown,
	options: LocalSignInSuccessOptions,
) {
	if (
		typeof data === "object" &&
		data !== null &&
		"twoFactorRedirect" in data &&
		data.twoFactorRedirect === true
	) {
		return false;
	}
	options.notifySuccess();
	options.onSuccess?.();
	return true;
}
