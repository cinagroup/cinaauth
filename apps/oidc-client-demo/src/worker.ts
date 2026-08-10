import {
	OIDC_DEMO_CLIENT_ID,
	OIDC_DEMO_ISSUER,
	OIDC_DEMO_POST_LOGOUT_URI,
	OIDC_DEMO_REDIRECT_URI,
} from "@cinaauth/auth-web-contract";

type CloudflareEnv = {
	ASSETS: Fetcher;
};

const securityHeaders = {
	"Content-Security-Policy": [
		"default-src 'self'",
		"connect-src 'self' https://auth.cinaseek.ai",
		"img-src 'self' data: https:",
		"style-src 'self' 'unsafe-inline'",
		"script-src 'self'",
		"font-src 'self' data:",
		"base-uri 'none'",
		"frame-ancestors 'none'",
		"form-action 'self' https://auth.cinaseek.ai https://accounts.cinaseek.ai",
	].join("; "),
	"Cross-Origin-Opener-Policy": "same-origin",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"X-Content-Type-Options": "nosniff",
};

const json = (body: unknown) =>
	new Response(JSON.stringify(body), {
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "application/json; charset=utf-8",
			...securityHeaders,
		},
	});

export const handleRequest = async (
	request: Request,
	fetchAsset: (request: Request) => Promise<Response>,
) => {
	const url = new URL(request.url);
	if (url.pathname === "/health") {
		return json({ status: "ok", service: "cinaauth-oidc-demo" });
	}
	if (url.pathname === "/config.json") {
		return json({
			issuer: OIDC_DEMO_ISSUER,
			clientId: OIDC_DEMO_CLIENT_ID,
			redirectUri: OIDC_DEMO_REDIRECT_URI,
			postLogoutRedirectUri: OIDC_DEMO_POST_LOGOUT_URI,
			scope: "openid profile email",
		});
	}

	const asset = await fetchAsset(request);
	const response = new Response(asset.body, asset);
	for (const [name, value] of Object.entries(securityHeaders)) {
		response.headers.set(name, value);
	}
	response.headers.set(
		"Cache-Control",
		url.pathname.startsWith("/assets/")
			? "public, max-age=31536000, immutable"
			: "no-cache",
	);
	return response;
};

export default {
	fetch: (request: Request, env: CloudflareEnv) =>
		handleRequest(request, (assetRequest) => env.ASSETS.fetch(assetRequest)),
};
