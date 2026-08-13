export type SignInAlert = {
	title: string;
	description: string;
};

export const ACCOUNT_RETURN_PATH_HEADER = "x-cinaauth-account-return-path";

/** Returns safe, non-protocol-specific copy for a failed sign-in attempt. */
export const getSignInAlert = (error: string | null): SignInAlert | null =>
	error
		? {
				title: "Sign-in wasn’t completed",
				description: "Try again or choose another secure sign-in method.",
			}
		: null;

/** Explains the return step without exposing an untrusted client name. */
export const getSignInContextMessage = (hasOidcQuery: boolean) =>
	hasOidcQuery
		? "After signing in, you’ll return to the requesting application."
		: null;

/** Prevents a direct browser redirect from leaving the account portal. */
export const sanitizeAccountCallbackURL = (value: string | null) => {
	if (!value?.startsWith("/") || value.startsWith("//")) return "/dashboard";
	try {
		const url = new URL(value, "https://accounts.cinaseek.ai");
		if (url.origin !== "https://accounts.cinaseek.ai") return "/dashboard";
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return "/dashboard";
	}
};

type CallbackSearchParams = Pick<URLSearchParams, "get">;

/** Reads the canonical return target while preserving legacy device-flow links. */
export const getAccountCallbackURL = (params: CallbackSearchParams) =>
	sanitizeAccountCallbackURL(
		params.get("callbackURL") ?? params.get("callbackUrl") ?? "/dashboard",
	);

/** Builds a canonical account-portal sign-in link for an internal return target. */
export const buildAccountSignInPath = (callbackURL: string) => {
	const params = new URLSearchParams({
		callbackURL: sanitizeAccountCallbackURL(callbackURL),
	});
	return `/sign-in?${params.toString()}`;
};
