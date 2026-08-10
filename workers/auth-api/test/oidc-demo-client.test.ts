import {
	OIDC_DEMO_CLIENT_ID,
	OIDC_DEMO_REDIRECT_URI,
} from "@cinaauth/auth-web-contract";
import { describe, expect, it, vi } from "vitest";
import {
	ensureOidcDemoClient,
	isOidcDemoAuthorizationRequest,
	normalizeOidcDemoAuthorizationResponse,
} from "../src/oidc-demo-client";

describe("OIDC demo client bootstrap", () => {
	it("recognizes only authorize requests for the fixed first-party client", () => {
		const authorizeUrl = new URL(
			"https://auth.cinaseek.ai/api/auth/oauth2/authorize",
		);
		authorizeUrl.searchParams.set("client_id", OIDC_DEMO_CLIENT_ID);

		expect(
			isOidcDemoAuthorizationRequest(
				new Request(authorizeUrl, { method: "GET" }),
			),
		).toBe(true);
		expect(
			isOidcDemoAuthorizationRequest(
				new Request(authorizeUrl, { method: "POST" }),
			),
		).toBe(false);
		authorizeUrl.searchParams.set("client_id", "untrusted-client");
		expect(isOidcDemoAuthorizationRequest(new Request(authorizeUrl))).toBe(
			false,
		);
	});

	it("upserts an immutable public PKCE client with exact redirect URIs", async () => {
		const query = vi.fn(async (_sql: string, _values: readonly unknown[]) => ({
			rows: [],
		}));

		await ensureOidcDemoClient({ query });

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
		const response = await normalizeOidcDemoAuthorizationResponse(source);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ redirect: true });
	});
});
