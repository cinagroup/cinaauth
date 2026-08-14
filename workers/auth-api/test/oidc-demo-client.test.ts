import {
	OIDC_DEMO_CLIENT_ID,
	OIDC_DEMO_PRODUCTION_PROFILE_INPUT,
	OIDC_DEMO_REDIRECT_URI,
	resolveOidcDemoProfile,
} from "@cinaauth/auth-web-contract";
import { describe, expect, it, vi } from "vitest";
import {
	ensureOidcDemoClient,
	isOidcDemoAuthorizationRequest,
	normalizeOidcDemoAuthorizationResponse,
} from "../src/oidc-demo-client";

const ACCOUNT_ORIGIN = "https://accounts.cinaseek.ai";
const PRODUCTION_PROFILE = resolveOidcDemoProfile(
	OIDC_DEMO_PRODUCTION_PROFILE_INPUT,
);
const STAGING_PROFILE = resolveOidcDemoProfile({
	environment: "staging",
	applicationOrigin: "https://oidc-demo-siwe-staging.cinaseek.ai",
	issuer: "https://auth-siwe-staging.cinaseek.ai",
	accountOrigin: "https://accounts-siwe-staging.cinaseek.ai",
	clientId: "cinaauth-oidc-demo-siwe-staging",
});

describe("OIDC demo client bootstrap", () => {
	it("recognizes only authorize requests for the configured first-party client", () => {
		const authorizeUrl = new URL(
			"https://auth.cinaseek.ai/api/auth/oauth2/authorize",
		);
		authorizeUrl.searchParams.set("client_id", OIDC_DEMO_CLIENT_ID);

		expect(
			isOidcDemoAuthorizationRequest(
				new Request(authorizeUrl, { method: "GET" }),
				PRODUCTION_PROFILE,
			),
		).toBe(true);
		expect(
			isOidcDemoAuthorizationRequest(
				new Request(authorizeUrl, { method: "POST" }),
				PRODUCTION_PROFILE,
			),
		).toBe(false);
		expect(
			isOidcDemoAuthorizationRequest(new Request(authorizeUrl), null),
		).toBe(false);
		authorizeUrl.searchParams.set("client_id", "untrusted-client");
		expect(
			isOidcDemoAuthorizationRequest(
				new Request(authorizeUrl),
				PRODUCTION_PROFILE,
			),
		).toBe(false);
	});

	it("recognizes the staging client and rejects the production client", () => {
		const authorizeUrl = new URL(
			"https://auth-siwe-staging.cinaseek.ai/api/auth/oauth2/authorize",
		);
		authorizeUrl.searchParams.set("client_id", STAGING_PROFILE.clientId);
		expect(
			isOidcDemoAuthorizationRequest(
				new Request(authorizeUrl),
				STAGING_PROFILE,
			),
		).toBe(true);

		authorizeUrl.searchParams.set("client_id", OIDC_DEMO_CLIENT_ID);
		expect(
			isOidcDemoAuthorizationRequest(
				new Request(authorizeUrl),
				STAGING_PROFILE,
			),
		).toBe(false);
	});

	it("upserts an immutable public PKCE client with exact redirect URIs", async () => {
		const query = vi.fn(async (_sql: string, _values: readonly unknown[]) => ({
			rows: [],
		}));

		await ensureOidcDemoClient({ query }, PRODUCTION_PROFILE);

		expect(query).toHaveBeenCalledOnce();
		const [sql, values] = query.mock.calls[0] ?? [];
		expect(sql).toContain('INSERT INTO "oauthClient"');
		expect(sql).toContain('ON CONFLICT ("clientId") DO UPDATE');
		expect(values).toContain(OIDC_DEMO_CLIENT_ID);
		expect(values).toContain("CinaSeek OIDC 标准客户端");
		expect(values).toContain("https://oidc-demo.cinaseek.ai/favicon.ico");
		expect(values).toContain(JSON.stringify([OIDC_DEMO_REDIRECT_URI]));
		expect(values).toContain(JSON.stringify(["openid", "profile", "email"]));
		expect(values).toContain("none");
		expect(values).toContain(true);
	});

	it("converts the fixed client's trusted JSON navigation into an HTTP redirect", async () => {
		const target = "https://accounts.cinaseek.ai/sign-in?state=opaque";
		const response = await normalizeOidcDemoAuthorizationResponse(
			Response.json({ redirect: true, url: target }),
			ACCOUNT_ORIGIN,
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("Location")).toBe(target);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});

	it("does not redirect to an untrusted origin", async () => {
		const source = Response.json({
			redirect: true,
			url: "https://attacker.example/sign-in",
		});
		const response = await normalizeOidcDemoAuthorizationResponse(
			source,
			ACCOUNT_ORIGIN,
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ redirect: true });
	});

	it("derives staging client URIs without retaining production redirects", async () => {
		const query = vi.fn(async () => ({ rows: [] }));

		await ensureOidcDemoClient({ query }, STAGING_PROFILE);

		const values = query.mock.calls[0]?.[1] ?? [];
		expect(values).toContain(`${STAGING_PROFILE.clientId}:first-party`);
		expect(values).toContain(STAGING_PROFILE.clientId);
		expect(values).toContain(STAGING_PROFILE.applicationOrigin);
		expect(values).toContain(
			`${STAGING_PROFILE.applicationOrigin}/favicon.ico`,
		);
		expect(values).toContain(JSON.stringify([STAGING_PROFILE.redirectUri]));
		expect(values).toContain(
			JSON.stringify([STAGING_PROFILE.postLogoutRedirectUri]),
		);
		expect(values).not.toContain(`${OIDC_DEMO_CLIENT_ID}:first-party`);
		expect(values).not.toContain(OIDC_DEMO_CLIENT_ID);
		expect(values).not.toContain(JSON.stringify([OIDC_DEMO_REDIRECT_URI]));
	});
});
