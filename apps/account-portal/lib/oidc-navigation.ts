type SearchParamsSource = Pick<URLSearchParams, "has" | "toString">;

/** Identifies the signed authorization query issued by the Auth Worker. */
export const hasSignedOidcAuthorizationQuery = (params: SearchParamsSource) =>
	params.has("client_id") &&
	params.has("redirect_uri") &&
	params.has("ba_param") &&
	params.has("sig");

/** Preserves every signed (including repeated) parameter between auth screens. */
export const buildPreservedAuthPath = (
	pathname: string,
	params: SearchParamsSource,
	fallbackCallbackURL: string,
) => {
	const nextParams = new URLSearchParams(params.toString());
	if (!nextParams.has("callbackURL")) {
		nextParams.set("callbackURL", fallbackCallbackURL);
	}
	return `${pathname}?${nextParams.toString()}`;
};
