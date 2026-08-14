export const DEFAULT_CINAAUTH_API_URL = "https://auth.cinaseek.ai";

/** A reserved, non-routable origin used only to construct fail-closed requests. */
export const UNAVAILABLE_CINAAUTH_API_URL = "https://cinaauth.invalid";

export const AUTH_SERVICE_UNAVAILABLE_BODY = {
	code: "AUTH_SERVICE_UNAVAILABLE",
	message: "Authentication service is temporarily unavailable.",
} as const;

export type AuthRuntimeConfigurationFailure =
	| "missing-auth-url"
	| "invalid-auth-url";

export type AuthRuntimeConfiguration = {
	baseURL: string | null;
	failure: AuthRuntimeConfigurationFailure | null;
	publicFallbackAllowed: boolean;
};

/** Public HTTP transport is an explicit local-development escape hatch only. */
export const isPublicAuthFallbackAllowed = (
	bindingPolicy: string | undefined = process.env
		.CINAAUTH_REQUIRE_AUTH_WORKER_BINDING,
) => bindingPolicy === "false";

const isLoopbackHostname = (hostname: string) =>
	hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

const hasExplicitPort = (value: string) => {
	const authority = /^[a-z][a-z\d+.-]*:\/\/([^/?#]*)/i.exec(value)?.[1];
	if (!authority) return false;
	const hostnameAndPort = authority.slice(authority.lastIndexOf("@") + 1);
	if (hostnameAndPort.startsWith("[")) {
		const closingBracket = hostnameAndPort.indexOf("]");
		return (
			closingBracket !== -1 &&
			hostnameAndPort.slice(closingBracket + 1).startsWith(":")
		);
	}
	return hostnameAndPort.includes(":");
};

/** Accept an exact HTTPS origin, plus loopback HTTP for explicit local mode. */
const normalizeAuthOrigin = (
	value: string | undefined,
	allowLocalHttp: boolean,
): string | null => {
	if (!value?.trim()) return null;
	try {
		const trimmedValue = value.trim();
		const url = new URL(trimmedValue);
		const protocolAllowed =
			url.protocol === "https:" ||
			(allowLocalHttp &&
				url.protocol === "http:" &&
				isLoopbackHostname(url.hostname));
		if (
			!protocolAllowed ||
			url.username ||
			url.password ||
			(!allowLocalHttp && hasExplicitPort(trimmedValue)) ||
			url.pathname !== "/" ||
			url.search ||
			url.hash
		) {
			return null;
		}
		return url.origin;
	} catch {
		return null;
	}
};

/** Resolve the Auth Worker origin without silently selecting production. */
export const resolveAuthRuntimeConfiguration = (
	configuredURL: string | undefined = process.env.CINAAUTH_URL,
	bindingPolicy: string | undefined = process.env
		.CINAAUTH_REQUIRE_AUTH_WORKER_BINDING,
): AuthRuntimeConfiguration => {
	const publicFallbackAllowed = isPublicAuthFallbackAllowed(bindingPolicy);
	if (!configuredURL?.trim()) {
		return publicFallbackAllowed
			? {
					baseURL: DEFAULT_CINAAUTH_API_URL,
					failure: null,
					publicFallbackAllowed,
				}
			: {
					baseURL: null,
					failure: "missing-auth-url",
					publicFallbackAllowed,
				};
	}

	const baseURL = normalizeAuthOrigin(configuredURL, publicFallbackAllowed);
	return baseURL
		? { baseURL, failure: null, publicFallbackAllowed }
		: {
				baseURL: null,
				failure: "invalid-auth-url",
				publicFallbackAllowed,
			};
};

/** Resolve a browser/client base URL without a production default in required mode. */
export const resolveAuthClientRuntimeBaseURL = (
	browserOrigin: string | undefined,
	configuredBaseURL: string | undefined,
	bindingPolicy: string | undefined = process.env
		.CINAAUTH_REQUIRE_AUTH_WORKER_BINDING,
) => {
	const publicFallbackAllowed = isPublicAuthFallbackAllowed(bindingPolicy);
	const browserBaseURL = normalizeAuthOrigin(browserOrigin, true);
	if (browserBaseURL) return browserBaseURL;
	const configured = normalizeAuthOrigin(
		configuredBaseURL,
		publicFallbackAllowed,
	);
	if (configured) return configured;
	return publicFallbackAllowed
		? DEFAULT_CINAAUTH_API_URL
		: UNAVAILABLE_CINAAUTH_API_URL;
};

export const createAuthServiceUnavailableResponse = () =>
	Response.json(AUTH_SERVICE_UNAVAILABLE_BODY, {
		status: 503,
		headers: { "Cache-Control": "no-store" },
	});
