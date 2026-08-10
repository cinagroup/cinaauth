import {
	OIDC_DEMO_CLIENT_ID,
	OIDC_DEMO_ORIGIN,
	OIDC_DEMO_POST_LOGOUT_URI,
	OIDC_DEMO_REDIRECT_URI,
} from "@cinaauth/auth-web-contract";

type OidcDemoClientDatabase = {
	query: (queryText: string, values: unknown[]) => Promise<unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Returns true only for an authorization request using the fixed demo client. */
export const isOidcDemoAuthorizationRequest = (request: Request) => {
	if (request.method !== "GET") return false;
	const url = new URL(request.url);
	return (
		url.pathname === "/api/auth/oauth2/authorize" &&
		url.searchParams.get("client_id") === OIDC_DEMO_CLIENT_ID
	);
};

/** Converts the provider's internal redirect envelope into browser OIDC 302. */
export const normalizeOidcDemoAuthorizationResponse = async (
	response: Response,
) => {
	if (
		response.status !== 200 ||
		!response.headers.get("Content-Type")?.includes("application/json")
	) {
		return response;
	}
	let body: unknown;
	try {
		body = await response.clone().json();
	} catch {
		return response;
	}
	if (
		!isRecord(body) ||
		body.redirect !== true ||
		typeof body.url !== "string"
	) {
		return response;
	}
	let target: URL;
	try {
		target = new URL(body.url);
	} catch {
		return response;
	}
	if (target.origin !== "https://accounts.cinaseek.ai") return response;

	return new Response(null, {
		status: 302,
		headers: {
			"Cache-Control": "no-store",
			Location: target.toString(),
		},
	});
};

/**
 * Reconciles the first-party OIDC acceptance client before it is resolved by
 * the provider. The fixed identifier and exact URI allow-list make this safe
 * to trigger from the public authorize endpoint without accepting user input.
 */
export const ensureOidcDemoClient = async (
	database: OidcDemoClientDatabase,
) => {
	const now = new Date();
	const values: unknown[] = [
		`${OIDC_DEMO_CLIENT_ID}:first-party`,
		OIDC_DEMO_CLIENT_ID,
		null,
		false,
		false,
		true,
		"public",
		JSON.stringify(["openid", "profile", "email"]),
		null,
		null,
		now,
		now,
		"CinaSeek OIDC 标准客户端",
		OIDC_DEMO_ORIGIN,
		`${OIDC_DEMO_ORIGIN}/favicon.ico`,
		JSON.stringify([OIDC_DEMO_REDIRECT_URI]),
		JSON.stringify([OIDC_DEMO_POST_LOGOUT_URI]),
		"none",
		JSON.stringify(["authorization_code"]),
		JSON.stringify(["code"]),
		true,
		"user-agent-based",
		true,
		"cinaauth-first-party-oidc-demo",
		"1.0.0",
	];

	await database.query(
		`INSERT INTO "oauthClient" (
			"id", "clientId", "clientSecret", "disabled", "skipConsent",
			"enableEndSession", "subjectType", "scopes", "userId", "referenceId",
			"createdAt", "updatedAt", "name", "uri", "icon", "redirectUris",
			"postLogoutRedirectUris", "tokenEndpointAuthMethod", "grantTypes",
			"responseTypes", "public", "type", "requirePKCE", "softwareId",
			"softwareVersion"
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
			$14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
		)
		ON CONFLICT ("clientId") DO UPDATE SET
			"clientSecret" = EXCLUDED."clientSecret",
			"disabled" = EXCLUDED."disabled",
			"skipConsent" = EXCLUDED."skipConsent",
			"enableEndSession" = EXCLUDED."enableEndSession",
			"subjectType" = EXCLUDED."subjectType",
			"scopes" = EXCLUDED."scopes",
			"userId" = NULL,
			"referenceId" = NULL,
			"updatedAt" = EXCLUDED."updatedAt",
			"name" = EXCLUDED."name",
			"uri" = EXCLUDED."uri",
			"icon" = EXCLUDED."icon",
			"redirectUris" = EXCLUDED."redirectUris",
			"postLogoutRedirectUris" = EXCLUDED."postLogoutRedirectUris",
			"tokenEndpointAuthMethod" = EXCLUDED."tokenEndpointAuthMethod",
			"grantTypes" = EXCLUDED."grantTypes",
			"responseTypes" = EXCLUDED."responseTypes",
			"public" = EXCLUDED."public",
			"type" = EXCLUDED."type",
			"requirePKCE" = EXCLUDED."requirePKCE",
			"softwareId" = EXCLUDED."softwareId",
			"softwareVersion" = EXCLUDED."softwareVersion"`,
		values,
	);
};
