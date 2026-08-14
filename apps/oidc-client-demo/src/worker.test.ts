import { describe, expect, it } from "vitest";
import wrangler from "../wrangler.json";
import { handleRequest } from "./worker";

const productionProfile = {
	environment: "production",
	applicationOrigin: "https://oidc-demo.cinaseek.ai",
	issuer: "https://auth.cinaseek.ai",
	accountOrigin: "https://accounts.cinaseek.ai",
	clientId: "cinaauth-oidc-demo",
} as const;

const stagingProfile = {
	environment: "staging",
	applicationOrigin: "https://oidc-demo-staging.example.com",
	issuer: "https://auth-staging.example.com",
	accountOrigin: "https://accounts-staging.example.com",
	clientId: "cinaauth-oidc-demo-staging",
} as const;

describe("OIDC demo asset worker", () => {
	it("keeps the production profile explicit in tracked Worker config", () => {
		expect(wrangler.vars).toEqual({
			CINAAUTH_OIDC_DEMO_ENVIRONMENT: "production",
			CINAAUTH_OIDC_DEMO_ORIGIN: productionProfile.applicationOrigin,
			CINAAUTH_URL: productionProfile.issuer,
			CINAAUTH_ACCOUNT_ORIGIN: productionProfile.accountOrigin,
			CINAAUTH_OIDC_DEMO_CLIENT_ID: productionProfile.clientId,
		});
		expect(wrangler).not.toHaveProperty("env.staging");
	});

	it("publishes non-secret runtime configuration", async () => {
		const response = await handleRequest(
			new Request("https://oidc-demo.cinaseek.ai/config.json"),
			async () => new Response("unused"),
			productionProfile,
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		await expect(response.json()).resolves.toMatchObject({
			issuer: "https://auth.cinaseek.ai",
			clientId: "cinaauth-oidc-demo",
			redirectUri: "https://oidc-demo.cinaseek.ai/callback",
		});
	});

	it("adds security headers to SPA assets", async () => {
		const response = await handleRequest(
			new Request("https://oidc-demo.cinaseek.ai/dashboard"),
			async () =>
				new Response("<!doctype html>", {
					headers: { "Content-Type": "text/html" },
				}),
			productionProfile,
		);

		expect(response.headers.get("Content-Security-Policy")).toContain(
			"frame-ancestors 'none'",
		);
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(response.headers.get("Cache-Control")).toBe("no-cache");
	});

	it("derives staging config and CSP from the same validated profile", async () => {
		const response = await handleRequest(
			new Request("https://oidc-demo-staging.example.com/config.json"),
			async () => new Response("unused"),
			stagingProfile,
		);

		await expect(response.json()).resolves.toMatchObject({
			issuer: stagingProfile.issuer,
			clientId: stagingProfile.clientId,
			redirectUri: `${stagingProfile.applicationOrigin}/callback`,
		});
		const csp = response.headers.get("Content-Security-Policy") || "";
		expect(csp).toContain(`connect-src 'self' ${stagingProfile.issuer}`);
		expect(csp).toContain(
			`form-action 'self' ${stagingProfile.issuer} ${stagingProfile.accountOrigin}`,
		);
		expect(csp).not.toContain("auth.cinaseek.ai");
		expect(csp).not.toContain("accounts.cinaseek.ai");
	});

	it("fails closed before fetching assets when the profile is absent", async () => {
		let assetFetched = false;
		const response = await handleRequest(
			new Request("https://oidc-demo-staging.example.com/"),
			async () => {
				assetFetched = true;
				return new Response("should not be served");
			},
			undefined,
		);

		expect(response.status).toBe(503);
		expect(assetFetched).toBe(false);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		await expect(response.json()).resolves.toEqual({
			error: "OIDC acceptance profile is invalid",
		});
	});

	it("does not serve a valid profile on a different origin", async () => {
		const response = await handleRequest(
			new Request("https://unexpected.example.com/"),
			async () => new Response("should not be served"),
			stagingProfile,
		);

		expect(response.status).toBe(421);
	});
});
