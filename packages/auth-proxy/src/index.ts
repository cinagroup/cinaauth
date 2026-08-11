export type AuthFetcher = {
	fetch: (request: Request) => Promise<Response>;
};

const COOKIE_BOUNDARY = /,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/g;

/** Split a merged Set-Cookie header without splitting an Expires date. */
export const splitSetCookieHeader = (header: string) =>
	header
		.split(COOKIE_BOUNDARY)
		.map((cookie) => cookie.trim())
		.filter(Boolean);

/** Scope an upstream auth cookie to the frontend host serving the proxy. */
export const toHostOnlyCookie = (cookie: string) =>
	cookie
		.split(";")
		.filter((attribute) => !/^\s*domain=/i.test(attribute))
		.join(";");

/** Only allow browser mutations submitted by the configured frontend origin. */
export const isAllowedProxyOrigin = (
	requestOrigin: string | null,
	expectedOrigin: string,
) => requestOrigin === expectedOrigin;

export const createAuthProxyRequest = (request: Request, baseURL: string) => {
	const sourceURL = new URL(request.url);
	const targetURL = new URL(sourceURL.pathname + sourceURL.search, baseURL);
	// Service-binding fetches otherwise follow OAuth callback redirects inside the
	// auth Worker. That hides the intermediate Set-Cookie response from the
	// browser and resolves relative callback URLs against the upstream host.
	const proxied = new Request(new Request(targetURL, request), {
		redirect: "manual",
	});
	proxied.headers.delete("host");
	return proxied;
};

/** Preserve every Set-Cookie header while rebuilding an upstream response. */
export const createAuthProxyResponse = (response: Response) => {
	const headers = new Headers();
	for (const [name, value] of response.headers) {
		if (name.toLowerCase() !== "set-cookie") headers.append(name, value);
	}

	const setCookies =
		typeof response.headers.getSetCookie === "function"
			? response.headers.getSetCookie()
			: splitSetCookieHeader(response.headers.get("set-cookie") || "");
	for (const setCookie of setCookies) headers.append("set-cookie", setCookie);
	headers.set("Cache-Control", "no-store");

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
};
