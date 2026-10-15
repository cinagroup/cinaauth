import { readFileSync } from "node:fs";
import { OIDC_DEMO_CLIENT_ID } from "@cinaauth/auth-web-contract";
import { describe, expect, it } from "vitest";
import { getConfiguredSocialProviders } from "../src/auth";
import type { CloudflareBindings } from "../src/env";
import worker from "../src/index";
import { createAuthPlugins } from "../src/plugins";

const stagingEnv = {
	CINAAUTH_URL: "https://auth-siwe-staging.cinaseek.si",
	CINAAUTH_ACCOUNT_ORIGIN: "https://accounts-siwe-staging.cinaseek.si",
	CINAAUTH_ADMIN_ORIGIN: "https://admin-siwe-staging.cinaseek.si",
	CINAAUTH_PASSKEY_RP_ID: "accounts-siwe-staging.cinaseek.si",
	CINAAUTH_OIDC_DEMO_ENVIRONMENT: "staging",
	CINAAUTH_OIDC_DEMO_ORIGIN: "https://oidc-demo-siwe-staging.cinaseek.si",
	CINAAUTH_OIDC_DEMO_CLIENT_ID: "cinaauth-oidc-demo-siwe-staging",
} as CloudflareBindings;

describe("environment-specific origin wiring", () => {
	/**
	 * @see https://github.com/cinagroup/cinaauth/blob/main/workers/auth-api/DEPLOYMENT.md#production-domain-migration
	 */
	it("uses the tracked production domain migration for exact CORS trust", async () => {
		const config = JSON.parse(
			readFileSync(new URL("../wrangler.json", import.meta.url), "utf8"),
		) as { vars: CloudflareBindings };
		const preflight = (origin: string) =>
			worker.fetch(
				new Request("https://auth.cinaseek.si/api/auth/get-session", {
					method: "OPTIONS",
					headers: {
						Origin: origin,
						"Access-Control-Request-Method": "GET",
					},
				}),
				config.vars,
				{} as ExecutionContext,
			);

		const current = await preflight("https://accounts.cinaseek.si");
		expect(current.headers.get("Access-Control-Allow-Origin")).toBe(
			"https://accounts.cinaseek.si",
		);
		const legacy = await preflight("https://accounts.cinaseek.ai");
		expect(legacy.headers.get("Access-Control-Allow-Origin")).toBeNull();
	});

	it("derives callbacks, Passkey, OAuth pages, and trusted clients from staging", () => {
		const plugins = createAuthPlugins(stagingEnv);

		expect(plugins.find(({ id }) => id === "passkey")?.options).toMatchObject({
			rpID: "accounts-siwe-staging.cinaseek.si",
			origin: ["https://accounts-siwe-staging.cinaseek.si"],
		});
		expect(
			plugins.find(({ id }) => id === "device-authorization")?.options,
		).toMatchObject({
			verificationUri: "https://accounts-siwe-staging.cinaseek.si/device",
		});
		const oauthProvider = plugins.find(({ id }) => id === "oauth-provider");
		expect(oauthProvider?.options).toMatchObject({
			loginPage: "https://accounts-siwe-staging.cinaseek.si/sign-in",
			consentPage: "https://accounts-siwe-staging.cinaseek.si/oauth/consent",
			resources: [
				"https://auth-siwe-staging.cinaseek.si",
				"https://admin-siwe-staging.cinaseek.si",
				"https://accounts-siwe-staging.cinaseek.si/api/mcp",
			],
		});
		expect(
			(oauthProvider?.options.cachedTrustedClients as Set<string>).has(
				"cinaauth-oidc-demo-siwe-staging",
			),
		).toBe(true);
		expect(
			(oauthProvider?.options.cachedTrustedClients as Set<string>).has(
				OIDC_DEMO_CLIENT_ID,
			),
		).toBe(false);
	});

	it("pins configured social callbacks to the staging Accounts facade", () => {
		expect(
			getConfiguredSocialProviders(
				{
					GOOGLE_CLIENT_ID: "google-client-id",
					GOOGLE_CLIENT_SECRET: "google-secret",
				},
				"https://accounts-siwe-staging.cinaseek.si",
			),
		).toMatchObject({
			google: {
				redirectURI:
					"https://accounts-siwe-staging.cinaseek.si/api/auth/callback/google",
			},
		});
	});

	it("allows the configured staging CORS origin but not production or another port", async () => {
		const preflight = (origin: string) =>
			worker.fetch(
				new Request(
					"https://auth-siwe-staging.cinaseek.si/api/auth/get-session",
					{
						method: "OPTIONS",
						headers: {
							Origin: origin,
							"Access-Control-Request-Method": "GET",
						},
					},
				),
				stagingEnv,
				{} as ExecutionContext,
			);

		await expect(
			preflight("https://accounts-siwe-staging.cinaseek.si").then((response) =>
				response.headers.get("Access-Control-Allow-Origin"),
			),
		).resolves.toBe("https://accounts-siwe-staging.cinaseek.si");
		await expect(
			preflight("https://accounts.cinaseek.si").then((response) =>
				response.headers.get("Access-Control-Allow-Origin"),
			),
		).resolves.toBeNull();
		await expect(
			preflight("https://accounts-siwe-staging.cinaseek.si:8443").then(
				(response) => response.headers.get("Access-Control-Allow-Origin"),
			),
		).resolves.toBeNull();
	});
});
