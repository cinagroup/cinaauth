import {
	buildPreservedAuthPath,
	hasSignedOidcAuthorizationQuery,
} from "./oidc-navigation";
import {
	buildAccountSignInPath,
	getAccountCallbackURL,
} from "./sign-in-experience";
import { buildTwoFactorAuthPath } from "./two-factor-navigation";

export type LegacyAuthSearchParams = Record<
	string,
	string | string[] | undefined
>;

const toURLSearchParams = (input: LegacyAuthSearchParams) => {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(input)) {
		if (typeof value === "string") {
			params.append(key, value);
			continue;
		}
		for (const item of value ?? []) params.append(key, item);
	}
	return params;
};

/** Retires password sign-in without dropping a Worker-signed OIDC request. */
export function buildLegacyPasswordSignInRedirect(
	input: LegacyAuthSearchParams,
) {
	const params = toURLSearchParams(input);
	const callbackURL = getAccountCallbackURL(params);
	if (!hasSignedOidcAuthorizationQuery(params)) {
		return buildAccountSignInPath(callbackURL);
	}

	const signedParameterNames = new Set(params.getAll("ba_param"));
	if (!signedParameterNames.has("callbackURL")) {
		params.set("callbackURL", callbackURL);
	}
	if (!signedParameterNames.has("callbackUrl")) {
		params.delete("callbackUrl");
	}
	return buildPreservedAuthPath("/sign-in", params, callbackURL);
}

/**
 * Keeps old registration links functional while routing every account through
 * the unified sign-in-or-create experience.
 */
export function buildUnifiedSignUpRedirect(input: LegacyAuthSearchParams) {
	return buildLegacyPasswordSignInRedirect(input);
}

/** Retires email-delivered 2FA while retaining the pending challenge state. */
export function buildRetiredEmailTwoFactorRedirect(
	input: LegacyAuthSearchParams,
) {
	return buildTwoFactorAuthPath("/two-factor", toURLSearchParams(input));
}
