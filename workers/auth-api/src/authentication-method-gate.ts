import type { SocialSignInSettings } from "./social-provider-store";

export type DisabledAuthenticationMethod =
	| "email_otp"
	| "email_password"
	| "passkey"
	| "siwe"
	| "google_one_tap";

const stripAuthPrefix = (pathname: string) =>
	pathname.startsWith("/api/auth")
		? pathname.slice("/api/auth".length)
		: pathname;

/**
 * Return the disabled public sign-in method for one Auth API path. Account
 * security endpoints such as passkey registration and wallet linking remain
 * available so disabling login never strands credential management.
 */
export const getDisabledAuthenticationMethod = (
	pathname: string,
	settings: SocialSignInSettings,
): DisabledAuthenticationMethod | null => {
	const authPath = stripAuthPrefix(pathname);
	if (
		!settings.emailOtpLoginEnabled &&
		(authPath === "/email-otp/send-verification-otp" ||
			authPath === "/sign-in/email-otp")
	) {
		return "email_otp";
	}
	if (!settings.emailPasswordLoginEnabled && authPath === "/sign-in/email") {
		return "email_password";
	}
	if (
		!settings.passkeyLoginEnabled &&
		(authPath === "/passkey/generate-authenticate-options" ||
			authPath === "/passkey/verify-authentication")
	) {
		return "passkey";
	}
	if (!settings.siweLoginEnabled && authPath === "/siwe/verify") {
		return "siwe";
	}
	if (!settings.googleOneTapEnabled && authPath === "/one-tap/callback") {
		return "google_one_tap";
	}
	return null;
};
