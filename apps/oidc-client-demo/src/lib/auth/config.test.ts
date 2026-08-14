import { describe, expect, it } from "vitest";
import { loadOidcClientConfig, resolveBrowserOidcClientConfig } from "./config";

const stagingProfile = {
	environment: "staging",
	applicationOrigin: "https://oidc-demo-staging.example.com",
	issuer: "https://auth-staging.example.com",
	accountOrigin: "https://accounts-staging.example.com",
	clientId: "cinaauth-oidc-demo-staging",
} as const;

describe("browser OIDC configuration", () => {
	it("uses an explicit validated profile", () => {
		expect(
			resolveBrowserOidcClientConfig(
				stagingProfile,
				stagingProfile.applicationOrigin,
			),
		).toEqual({
			issuer: stagingProfile.issuer,
			clientId: stagingProfile.clientId,
			redirectUri: `${stagingProfile.applicationOrigin}/callback`,
			postLogoutRedirectUri: stagingProfile.applicationOrigin,
			scope: "openid profile email",
		});
	});

	it("fails closed instead of falling back to production", () => {
		expect(() =>
			resolveBrowserOidcClientConfig(
				{
					...stagingProfile,
					issuer: undefined,
				},
				stagingProfile.applicationOrigin,
			),
		).toThrow(/issuer/);
	});

	it("requires the browser and configured application origins to match", () => {
		expect(() =>
			resolveBrowserOidcClientConfig(
				stagingProfile,
				"https://other-staging.example.com",
			),
		).toThrow(/browser origin/);
	});

	it("loads the same-origin runtime profile without caching", async () => {
		let requestedInput: RequestInfo | URL | undefined;
		let requestedInit: RequestInit | undefined;
		const config = await loadOidcClientConfig(async (input, init) => {
			requestedInput = input;
			requestedInit = init;
			return Response.json(stagingProfile, {
				headers: { "Cache-Control": "no-store" },
			});
		}, stagingProfile.applicationOrigin);

		expect(requestedInput).toBe("/config.json");
		expect(requestedInit).toMatchObject({
			cache: "no-store",
			credentials: "same-origin",
		});
		expect(config.issuer).toBe(stagingProfile.issuer);
	});

	it("rejects an unavailable runtime profile", async () => {
		await expect(
			loadOidcClientConfig(
				async () => new Response("unavailable", { status: 503 }),
				stagingProfile.applicationOrigin,
			),
		).rejects.toThrow(/HTTP 503/);
	});
});
