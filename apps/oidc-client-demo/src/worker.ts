import type {
	OidcDemoProfile,
	OidcDemoProfileInput,
} from "@cinaauth/auth-web-contract";
import { resolveOidcDemoProfile } from "@cinaauth/auth-web-contract";

type CloudflareEnv = {
	ASSETS: Fetcher;
	CINAAUTH_OIDC_DEMO_ENVIRONMENT?: string;
	CINAAUTH_OIDC_DEMO_ORIGIN?: string;
	CINAAUTH_URL?: string;
	CINAAUTH_ACCOUNT_ORIGIN?: string;
	CINAAUTH_OIDC_DEMO_CLIENT_ID?: string;
};

const failClosedSecurityHeaders = {
	"Content-Security-Policy":
		"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
	"Cross-Origin-Opener-Policy": "same-origin",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
	"Referrer-Policy": "no-referrer",
	"X-Content-Type-Options": "nosniff",
};

const createSecurityHeaders = (profile: OidcDemoProfile) => ({
	"Content-Security-Policy": [
		"default-src 'self'",
		`connect-src 'self' ${profile.issuer}`,
		"img-src 'self' data: https:",
		"style-src 'self' 'unsafe-inline'",
		"script-src 'self'",
		"font-src 'self' data:",
		"base-uri 'none'",
		"frame-ancestors 'none'",
		`form-action 'self' ${profile.issuer} ${profile.accountOrigin}`,
	].join("; "),
	"Cross-Origin-Opener-Policy": "same-origin",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"X-Content-Type-Options": "nosniff",
});

const json = (body: unknown, headers: Record<string, string>, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "application/json; charset=utf-8",
			...headers,
		},
	});

const profileFromEnv = (env: CloudflareEnv): OidcDemoProfileInput => ({
	environment: env.CINAAUTH_OIDC_DEMO_ENVIRONMENT,
	applicationOrigin: env.CINAAUTH_OIDC_DEMO_ORIGIN,
	issuer: env.CINAAUTH_URL,
	accountOrigin: env.CINAAUTH_ACCOUNT_ORIGIN,
	clientId: env.CINAAUTH_OIDC_DEMO_CLIENT_ID,
});

export const handleRequest = async (
	request: Request,
	fetchAsset: (request: Request) => Promise<Response>,
	profileInput: OidcDemoProfileInput | undefined,
) => {
	let profile: OidcDemoProfile;
	try {
		profile = resolveOidcDemoProfile(profileInput);
	} catch {
		return json(
			{ error: "OIDC acceptance profile is invalid" },
			failClosedSecurityHeaders,
			503,
		);
	}

	const url = new URL(request.url);
	const securityHeaders = createSecurityHeaders(profile);
	if (url.origin !== profile.applicationOrigin) {
		return json(
			{ error: "OIDC acceptance origin does not match its profile" },
			securityHeaders,
			421,
		);
	}
	if (url.pathname === "/health") {
		return json(
			{
				status: "ok",
				service: "cinaauth-oidc-demo",
				environment: profile.environment,
			},
			securityHeaders,
		);
	}
	if (url.pathname === "/config.json") {
		return json(profile, securityHeaders);
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
		handleRequest(
			request,
			(assetRequest) => env.ASSETS.fetch(assetRequest),
			profileFromEnv(env),
		),
} satisfies ExportedHandler<CloudflareEnv>;
