import {
	buildPreservedAuthPath,
	hasSignedOidcAuthorizationQuery,
} from "./oidc-navigation";
import { getAccountCallbackURL } from "./sign-in-experience";

type TwoFactorSearchParams = Pick<URLSearchParams, "get" | "has" | "toString">;

type TwoFactorPath = "/two-factor" | "/two-factor/otp" | "/two-factor/backup";

/** Selects an available primary factor while retaining backup-code recovery. */
export const getPreferredTwoFactorPath = (methods?: readonly string[]) => {
	if (methods?.includes("totp")) return "/two-factor" as const;
	if (methods?.includes("otp")) return "/two-factor/otp" as const;
	return methods ? ("/two-factor/backup" as const) : ("/two-factor" as const);
};

/** Preserves signed authorization state while canonicalizing local callbacks. */
export const buildTwoFactorAuthPath = (
	pathname: TwoFactorPath,
	params: TwoFactorSearchParams,
) => {
	const callbackURL = getAccountCallbackURL(params);
	const preservedPath = buildPreservedAuthPath(pathname, params, callbackURL);
	const [preservedPathname, query = ""] = preservedPath.split("?", 2);
	const nextParams = new URLSearchParams(query);
	const signedParameterNames = new Set(nextParams.getAll("ba_param"));

	// Never rewrite a signed field: doing so would invalidate the Worker signature.
	// Unsigned callback aliases are safe to canonicalize before the 2FA boundary.
	if (!signedParameterNames.has("callbackURL")) {
		nextParams.set("callbackURL", callbackURL);
	}
	if (!signedParameterNames.has("callbackUrl")) {
		nextParams.delete("callbackUrl");
	}

	return `${preservedPathname}?${nextParams.toString()}`;
};

/** Returns a safe local destination, or null when the OIDC plugin owns redirect. */
export const getTwoFactorSuccessPath = (params: TwoFactorSearchParams) =>
	hasSignedOidcAuthorizationQuery(params)
		? null
		: getAccountCallbackURL(params);
