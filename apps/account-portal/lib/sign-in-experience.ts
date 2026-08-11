export type SignInAlert = {
	title: string;
	description: string;
};

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
