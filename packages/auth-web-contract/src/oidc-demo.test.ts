import { describe, expect, it } from "vitest";
import {
	OIDC_DEMO_CLIENT_ID,
	OIDC_DEMO_ISSUER,
	OIDC_DEMO_ORIGIN,
	OIDC_DEMO_PRODUCTION_PROFILE_INPUT,
	resolveOidcDemoProfile,
} from "./oidc-demo";

const stagingProfile = {
	environment: "staging",
	applicationOrigin: "https://oidc-demo-staging.example.com",
	issuer: "https://auth-staging.example.com",
	accountOrigin: "https://accounts-staging.example.com",
	clientId: "cinaauth-oidc-demo-staging",
} as const;

describe("OIDC demo deployment profile", () => {
	it("preserves the explicit production contract", () => {
		const profile = resolveOidcDemoProfile(OIDC_DEMO_PRODUCTION_PROFILE_INPUT);

		expect(profile).toMatchObject({
			environment: "production",
			applicationOrigin: OIDC_DEMO_ORIGIN,
			issuer: OIDC_DEMO_ISSUER,
			clientId: OIDC_DEMO_CLIENT_ID,
			redirectUri: `${OIDC_DEMO_ORIGIN}/callback`,
			postLogoutRedirectUri: OIDC_DEMO_ORIGIN,
			scope: "openid profile email",
		});
	});

	it("derives callback URIs from an explicit staging profile", () => {
		expect(resolveOidcDemoProfile(stagingProfile)).toMatchObject({
			...stagingProfile,
			redirectUri: "https://oidc-demo-staging.example.com/callback",
			postLogoutRedirectUri: "https://oidc-demo-staging.example.com",
		});
	});

	it("fails closed when required profile fields are missing", () => {
		for (const key of Object.keys(stagingProfile)) {
			const incomplete = { ...stagingProfile } as Record<string, unknown>;
			delete incomplete[key];
			expect(() => resolveOidcDemoProfile(incomplete)).toThrow(key);
		}
	});

	it("requires exact canonical HTTPS origins", () => {
		for (const applicationOrigin of [
			"http://oidc-demo-staging.example.com",
			"https://oidc-demo-staging.example.com/",
			"https://OIDC-DEMO-staging.example.com",
			"https://oidc-demo-staging.example.com:443",
			"https://oidc-demo-staging.example.com/path",
			" https://oidc-demo-staging.example.com",
		]) {
			expect(() =>
				resolveOidcDemoProfile({ ...stagingProfile, applicationOrigin }),
			).toThrow(/applicationOrigin/);
		}
	});

	it("requires role-distinct origins", () => {
		expect(() =>
			resolveOidcDemoProfile({
				...stagingProfile,
				accountOrigin: stagingProfile.issuer,
			}),
		).toThrow(/distinct/);
	});

	it("never accepts production hosts or the production client in staging", () => {
		for (const override of [
			{ issuer: OIDC_DEMO_ISSUER },
			{ applicationOrigin: OIDC_DEMO_ORIGIN },
			{ accountOrigin: "https://accounts.cinaseek.ai" },
			{ clientId: OIDC_DEMO_CLIENT_ID },
		]) {
			expect(() =>
				resolveOidcDemoProfile({ ...stagingProfile, ...override }),
			).toThrow(/staging/i);
		}
	});

	it("rejects a production label paired with non-production values", () => {
		expect(() =>
			resolveOidcDemoProfile({
				...stagingProfile,
				environment: "production",
			}),
		).toThrow(/production/);
	});
});
