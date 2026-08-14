import { resolveOidcDemoProfile } from "@cinaauth/auth-web-contract";

export type OidcClientConfig = {
	issuer: string;
	clientId: string;
	redirectUri: string;
	postLogoutRedirectUri: string;
	scope: string;
};

const parseBrowserOrigin = (value: string) => {
	try {
		const url = new URL(value);
		if (
			url.protocol !== "https:" ||
			url.username !== "" ||
			url.password !== "" ||
			url.port !== "" ||
			url.pathname !== "/" ||
			url.search !== "" ||
			url.hash !== "" ||
			url.origin !== value
		) {
			throw new Error("browser origin is not canonical HTTPS");
		}
		return url.origin;
	} catch {
		throw new Error("browser origin must be an exact canonical HTTPS origin");
	}
};

export const resolveBrowserOidcClientConfig = (
	profileInput: unknown,
	browserOrigin: string,
): OidcClientConfig => {
	const profile = resolveOidcDemoProfile(profileInput);
	if (parseBrowserOrigin(browserOrigin) !== profile.applicationOrigin) {
		throw new Error("OIDC profile does not match the current browser origin");
	}

	return {
		issuer: profile.issuer,
		clientId: profile.clientId,
		redirectUri: profile.redirectUri,
		postLogoutRedirectUri: profile.postLogoutRedirectUri,
		scope: profile.scope,
	};
};

type RuntimeConfigFetch = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

export const loadOidcClientConfig = async (
	fetchConfig: RuntimeConfigFetch = fetch,
	browserOrigin = window.location.origin,
): Promise<OidcClientConfig> => {
	const response = await fetchConfig("/config.json", {
		cache: "no-store",
		credentials: "same-origin",
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(
			`OIDC runtime configuration returned HTTP ${response.status}`,
		);
	}
	return resolveBrowserOidcClientConfig(await response.json(), browserOrigin);
};
