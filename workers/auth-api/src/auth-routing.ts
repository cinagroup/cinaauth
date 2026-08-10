export const OPENID_CONFIGURATION_PATH =
	"/.well-known/openid-configuration" as const;
export const OAUTH_AUTHORIZATION_SERVER_PATH =
	"/.well-known/oauth-authorization-server" as const;

export const AUTH_DISCOVERY_PATHS = [
	OPENID_CONFIGURATION_PATH,
	`/api/auth${OPENID_CONFIGURATION_PATH}`,
	OAUTH_AUTHORIZATION_SERVER_PATH,
	`/api/auth${OAUTH_AUTHORIZATION_SERVER_PATH}`,
] as const;

const AUTH_DISCOVERY_ALIASES = new Map<string, string>([
	[`/api/auth${OPENID_CONFIGURATION_PATH}`, OPENID_CONFIGURATION_PATH],
	[
		`/api/auth${OAUTH_AUTHORIZATION_SERVER_PATH}`,
		OAUTH_AUTHORIZATION_SERVER_PATH,
	],
]);

/** Returns true when the Worker must create and invoke the Auth handler. */
export const isAuthHandlerRequestPath = (pathname: string) =>
	pathname.startsWith("/api/auth/") ||
	AUTH_DISCOVERY_PATHS.some((path) => path === pathname);

/** Rewrites compatibility aliases to the canonical issuer-root endpoint. */
export const createCanonicalDiscoveryRequest = (request: Request) => {
	const url = new URL(request.url);
	const canonicalPath = AUTH_DISCOVERY_ALIASES.get(url.pathname);
	if (!canonicalPath) return request;
	url.pathname = canonicalPath;
	return new Request(url, {
		method: request.method,
		headers: request.headers,
		redirect: request.redirect,
		signal: request.signal,
	});
};
