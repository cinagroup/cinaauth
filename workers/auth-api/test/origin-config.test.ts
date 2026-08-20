import {
	OIDC_DEMO_CLIENT_ID,
	OIDC_DEMO_PRODUCTION_PROFILE_INPUT,
	resolveOidcDemoProfile,
} from "@cinaauth/auth-web-contract";
import { describe, expect, it } from "vitest";
import {
	isExactTrustedOrigin,
	parseAuthOriginConfig,
} from "../src/origin-config";

const productionEnv = {
	CINAAUTH_URL: "https://auth.cinaseek.ai",
	CINAAUTH_ACCOUNT_ORIGIN: "https://accounts.cinaseek.ai",
	CINAAUTH_ADMIN_ORIGIN: "https://admin.cinaseek.ai",
	CINAAUTH_CINATOKEN_ORIGIN: "https://cinatoken.com",
	CINAAUTH_CINATOKEN_CLIENT_ID: "cinatoken-admin",
	CINAAUTH_PASSKEY_RP_ID: "cinaseek.ai",
	CINAAUTH_LEGACY_ACCOUNT_ORIGIN: "https://demo-auth.cinagroup.com",
	CINAAUTH_OIDC_DEMO_ENVIRONMENT: "production",
	CINAAUTH_OIDC_DEMO_ORIGIN: "https://oidc-demo.cinaseek.ai",
	CINAAUTH_OIDC_DEMO_CLIENT_ID: OIDC_DEMO_CLIENT_ID,
};

describe("Auth Worker origin configuration", () => {
	it("preserves the exact production origins and parent-domain Passkey RP", () => {
		expect(parseAuthOriginConfig(productionEnv)).toEqual({
			ok: true,
			value: {
				authOrigin: "https://auth.cinaseek.ai",
				accountOrigin: "https://accounts.cinaseek.ai",
				adminOrigin: "https://admin.cinaseek.ai",
				passkeyRpId: "cinaseek.ai",
				legacyAccountOrigin: "https://demo-auth.cinagroup.com",
				oidcDemoProfile: resolveOidcDemoProfile(
					OIDC_DEMO_PRODUCTION_PROFILE_INPUT,
				),
				cinatokenProfile: {
					applicationOrigin: "https://cinatoken.com",
					clientId: "cinatoken-admin",
				},
				trustedOrigins: [
					"https://auth.cinaseek.ai",
					"https://accounts.cinaseek.ai",
					"https://admin.cinaseek.ai",
					"https://demo-auth.cinagroup.com",
					"https://oidc-demo.cinaseek.ai",
					"https://cinatoken.com",
				],
				trustedHostnames: [
					"auth.cinaseek.ai",
					"accounts.cinaseek.ai",
					"admin.cinaseek.ai",
					"demo-auth.cinagroup.com",
					"oidc-demo.cinaseek.ai",
					"cinatoken.com",
				],
			},
		});
	});

	it("keeps omitted optional origins disabled in staging", () => {
		const result = parseAuthOriginConfig({
			CINAAUTH_URL: "https://auth-siwe-staging.cinaseek.ai",
			CINAAUTH_ACCOUNT_ORIGIN: "https://accounts-siwe-staging.cinaseek.ai",
			CINAAUTH_ADMIN_ORIGIN: "https://admin-siwe-staging.cinaseek.ai",
			CINAAUTH_PASSKEY_RP_ID: "accounts-siwe-staging.cinaseek.ai",
		});

		expect(result).toMatchObject({
			ok: true,
			value: {
				legacyAccountOrigin: null,
				oidcDemoProfile: null,
				trustedOrigins: [
					"https://auth-siwe-staging.cinaseek.ai",
					"https://accounts-siwe-staging.cinaseek.ai",
					"https://admin-siwe-staging.cinaseek.ai",
				],
			},
		});
	});

	it.each([
		[
			"missing Auth origin",
			{ CINAAUTH_URL: undefined },
			"missing_cinaauth_url",
		],
		[
			"missing Accounts origin",
			{ CINAAUTH_ACCOUNT_ORIGIN: undefined },
			"missing_cinaauth_account_origin",
		],
		[
			"missing Admin origin",
			{ CINAAUTH_ADMIN_ORIGIN: undefined },
			"missing_cinaauth_admin_origin",
		],
		[
			"missing Passkey RP ID",
			{ CINAAUTH_PASSKEY_RP_ID: undefined },
			"missing_cinaauth_passkey_rp_id",
		],
		[
			"empty Accounts origin",
			{ CINAAUTH_ACCOUNT_ORIGIN: "" },
			"invalid_cinaauth_account_origin",
		],
		[
			"non-canonical Auth origin",
			{ CINAAUTH_URL: "https://auth.cinaseek.ai/" },
			"invalid_cinaauth_url",
		],
		[
			"Auth origin with credentials",
			{ CINAAUTH_URL: "https://user:secret@auth.cinaseek.ai" },
			"invalid_cinaauth_url",
		],
		[
			"non-canonical uppercase Auth origin",
			{ CINAAUTH_URL: "https://AUTH.cinaseek.ai" },
			"invalid_cinaauth_url",
		],
		[
			"Accounts origin with an explicit port",
			{ CINAAUTH_ACCOUNT_ORIGIN: "https://accounts.cinaseek.ai:8443" },
			"invalid_cinaauth_account_origin",
		],
		[
			"Accounts origin with a query",
			{ CINAAUTH_ACCOUNT_ORIGIN: "https://accounts.cinaseek.ai?flow=sign-in" },
			"invalid_cinaauth_account_origin",
		],
		[
			"Admin origin with a path",
			{ CINAAUTH_ADMIN_ORIGIN: "https://admin.cinaseek.ai/login" },
			"invalid_cinaauth_admin_origin",
		],
		[
			"Admin origin with a fragment",
			{ CINAAUTH_ADMIN_ORIGIN: "https://admin.cinaseek.ai#settings" },
			"invalid_cinaauth_admin_origin",
		],
		[
			"empty optional legacy origin",
			{ CINAAUTH_LEGACY_ACCOUNT_ORIGIN: "" },
			"invalid_cinaauth_legacy_account_origin",
		],
		[
			"insecure optional OIDC demo origin",
			{ CINAAUTH_OIDC_DEMO_ORIGIN: "http://oidc-demo.cinaseek.ai" },
			"invalid_cinaauth_oidc_demo_profile",
		],
	] as const)("rejects %s", (_name, override, issue) => {
		const result = parseAuthOriginConfig({ ...productionEnv, ...override });

		expect(result).toMatchObject({ ok: false });
		if (result.ok) throw new Error("Expected invalid origin configuration");
		expect(result.issues).toContain(issue);
	});

	it("rejects a partially configured OIDC demo profile", () => {
		const result = parseAuthOriginConfig({
			...productionEnv,
			CINAAUTH_OIDC_DEMO_CLIENT_ID: undefined,
		});

		expect(result).toMatchObject({ ok: false });
		if (result.ok) throw new Error("Expected partial OIDC profile to fail");
		expect(result.issues).toContain("invalid_cinaauth_oidc_demo_profile");
	});

	it("rejects a partial or unexpected cinatoken client profile", () => {
		for (const override of [
			{ CINAAUTH_CINATOKEN_CLIENT_ID: undefined },
			{ CINAAUTH_CINATOKEN_CLIENT_ID: "untrusted-client" },
			{ CINAAUTH_CINATOKEN_ORIGIN: "http://cinatoken.com" },
		]) {
			const result = parseAuthOriginConfig({ ...productionEnv, ...override });
			expect(result).toMatchObject({ ok: false });
			if (result.ok) throw new Error("Expected invalid cinatoken profile");
			expect(result.issues).toContain("invalid_cinaauth_cinatoken_profile");
		}
	});

	it("resolves an isolated staging OIDC demo profile", () => {
		const stagingProfileInput = {
			environment: "staging",
			applicationOrigin: "https://oidc-demo-siwe-staging.cinaseek.ai",
			issuer: "https://auth-siwe-staging.cinaseek.ai",
			accountOrigin: "https://accounts-siwe-staging.cinaseek.ai",
			clientId: "cinaauth-oidc-demo-siwe-staging",
		} as const;
		const result = parseAuthOriginConfig({
			CINAAUTH_URL: stagingProfileInput.issuer,
			CINAAUTH_ACCOUNT_ORIGIN: stagingProfileInput.accountOrigin,
			CINAAUTH_ADMIN_ORIGIN: "https://admin-siwe-staging.cinaseek.ai",
			CINAAUTH_PASSKEY_RP_ID: "accounts-siwe-staging.cinaseek.ai",
			CINAAUTH_OIDC_DEMO_ENVIRONMENT: stagingProfileInput.environment,
			CINAAUTH_OIDC_DEMO_ORIGIN: stagingProfileInput.applicationOrigin,
			CINAAUTH_OIDC_DEMO_CLIENT_ID: stagingProfileInput.clientId,
		});

		expect(result).toMatchObject({
			ok: true,
			value: {
				oidcDemoProfile: resolveOidcDemoProfile(stagingProfileInput),
			},
		});
	});

	it("rejects a production client retained in a staging OIDC profile", () => {
		const result = parseAuthOriginConfig({
			CINAAUTH_URL: "https://auth-siwe-staging.cinaseek.ai",
			CINAAUTH_ACCOUNT_ORIGIN: "https://accounts-siwe-staging.cinaseek.ai",
			CINAAUTH_ADMIN_ORIGIN: "https://admin-siwe-staging.cinaseek.ai",
			CINAAUTH_PASSKEY_RP_ID: "accounts-siwe-staging.cinaseek.ai",
			CINAAUTH_OIDC_DEMO_ENVIRONMENT: "staging",
			CINAAUTH_OIDC_DEMO_ORIGIN: "https://oidc-demo-siwe-staging.cinaseek.ai",
			CINAAUTH_OIDC_DEMO_CLIENT_ID: OIDC_DEMO_CLIENT_ID,
		});

		expect(result).toMatchObject({ ok: false });
		if (result.ok) throw new Error("Expected mixed OIDC profile to fail");
		expect(result.issues).toContain("invalid_cinaauth_oidc_demo_profile");
	});

	it("rejects an unrelated or non-canonical Passkey RP ID", () => {
		for (const passkeyRpId of [
			"example.com",
			"https://cinaseek.ai",
			"CINASEEK.AI",
		]) {
			const result = parseAuthOriginConfig({
				...productionEnv,
				CINAAUTH_PASSKEY_RP_ID: passkeyRpId,
			});
			expect(result).toMatchObject({ ok: false });
			if (result.ok) throw new Error("Expected invalid Passkey RP ID");
			expect(result.issues).toContain("invalid_cinaauth_passkey_rp_id");
		}
	});

	it("rejects duplicate role origins instead of collapsing trust boundaries", () => {
		const result = parseAuthOriginConfig({
			...productionEnv,
			CINAAUTH_ADMIN_ORIGIN: productionEnv.CINAAUTH_ACCOUNT_ORIGIN,
		});

		expect(result).toMatchObject({ ok: false });
		if (result.ok) throw new Error("Expected duplicate origins to fail");
		expect(result.issues).toContain("duplicate_cinaauth_origins");
	});

	it("rejects enabled SIWE when its RP does not exactly match Accounts", () => {
		const result = parseAuthOriginConfig({
			...productionEnv,
			CINAAUTH_SIWE_ENABLED: "true",
			CINAAUTH_SIWE_RP_DOMAIN: "accounts.cinaseek.ai",
			CINAAUTH_SIWE_RP_URI: "https://other.cinaseek.ai",
		});

		expect(result).toMatchObject({ ok: false });
		if (result.ok) throw new Error("Expected invalid SIWE RP alignment");
		expect(result.issues).toContain("invalid_cinaauth_siwe_rp_origin");
	});

	it("matches CORS origins exactly, including scheme and port", () => {
		const result = parseAuthOriginConfig(productionEnv);
		if (!result.ok) throw new Error("Expected production origin configuration");

		expect(
			isExactTrustedOrigin("https://accounts.cinaseek.ai", result.value),
		).toBe(true);
		expect(
			isExactTrustedOrigin("https://accounts.cinaseek.ai:8443", result.value),
		).toBe(false);
		expect(
			isExactTrustedOrigin("http://accounts.cinaseek.ai", result.value),
		).toBe(false);
	});
});
