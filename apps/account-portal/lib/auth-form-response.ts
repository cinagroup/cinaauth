type LocalSignInSuccessOptions = {
	notifySuccess: () => void;
	onSuccess?: () => void;
};

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
