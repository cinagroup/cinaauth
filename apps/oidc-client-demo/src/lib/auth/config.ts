import {
	OIDC_DEMO_CLIENT_ID,
	OIDC_DEMO_ISSUER,
	OIDC_DEMO_ORIGIN,
	OIDC_DEMO_POST_LOGOUT_URI,
	OIDC_DEMO_REDIRECT_URI,
} from "@cinaauth/auth-web-contract";

export type OidcClientConfig = {
	issuer: string;
	clientId: string;
	redirectUri: string;
	postLogoutRedirectUri: string;
	scope: string;
};

const productionConfig: OidcClientConfig = {
	issuer: OIDC_DEMO_ISSUER,
	clientId: OIDC_DEMO_CLIENT_ID,
	redirectUri: OIDC_DEMO_REDIRECT_URI,
	postLogoutRedirectUri: OIDC_DEMO_POST_LOGOUT_URI,
	scope: "openid profile email",
};

const isAbsoluteHttpUrl = (value: string) => {
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.hostname === "localhost";
	} catch {
		return false;
	}
};

export const getOidcClientConfig = (): OidcClientConfig => {
	const issuer = import.meta.env.VITE_OIDC_ISSUER || productionConfig.issuer;
	const clientId =
		import.meta.env.VITE_OIDC_CLIENT_ID || productionConfig.clientId;
	const redirectUri =
		import.meta.env.VITE_OIDC_REDIRECT_URI ||
		(window.location.origin === OIDC_DEMO_ORIGIN
			? productionConfig.redirectUri
			: `${window.location.origin}/callback`);
	const postLogoutRedirectUri =
		window.location.origin === OIDC_DEMO_ORIGIN
			? productionConfig.postLogoutRedirectUri
			: window.location.origin;

	if (!clientId.trim()) throw new Error("OIDC client ID is missing");
	if (!isAbsoluteHttpUrl(issuer)) throw new Error("OIDC issuer URL is invalid");
	if (!isAbsoluteHttpUrl(redirectUri)) {
		throw new Error("OIDC redirect URI is invalid");
	}
	if (new URL(redirectUri).origin !== window.location.origin) {
		throw new Error("OIDC redirect URI must belong to this application");
	}

	return {
		issuer: new URL(issuer).origin,
		clientId,
		redirectUri,
		postLogoutRedirectUri,
		scope: productionConfig.scope,
	};
};
