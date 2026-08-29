import {
	ENTITLEMENT_FEATURES,
	ENTITLEMENT_LIMITS,
} from "@cinaauth/auth-web-contract";
import { describe, expect, it } from "vitest";
import { getAuthCapabilities } from "../src/capabilities";

const ACCOUNT_ORIGIN = "https://accounts.cinaseek.ai";

const entitlementConfig = () =>
	JSON.stringify({
		version: 1,
		defaultPlan: "default",
		plans: {
			default: {
				features: Object.fromEntries(
					ENTITLEMENT_FEATURES.map((feature) => [feature, true]),
				),
				limits: Object.fromEntries(
					ENTITLEMENT_LIMITS.map((limit) => [limit, null]),
				),
			},
		},
	});

describe("public auth capabilities", () => {
	it("does not advertise optional providers without complete configuration", () => {
		const capabilities = getAuthCapabilities({});

		expect(capabilities.version).toBe(5);
		expect(capabilities.methods.emailPassword).toBe(false);
		expect(capabilities.methods.emailOtp).toBe(false);
		expect(capabilities.methods.magicLink).toBe(false);
		expect(capabilities.methods.phoneOtp).toBe(false);
		expect(capabilities.methods.username).toBe(false);
		expect(capabilities.methods.passkey).toBe(false);
		expect(capabilities.methods.siwe).toBe(false);
		expect(capabilities.oauthProviders).toEqual([]);
		expect(capabilities.oneTap).toBe(false);
		expect(capabilities.oneTapClientId).toBeNull();
		expect(capabilities.captcha).toEqual({
			enabled: false,
			provider: null,
			siteKey: null,
			action: null,
			protectedEndpoints: [],
		});
		expect(capabilities.billing).toBe(false);
	});

	it("applies runtime login settings only when deployment prerequisites are ready", () => {
		const settings = {
			socialProviderLimit: 20,
			emailOtpLoginEnabled: true,
			emailPasswordLoginEnabled: true,
			passkeyLoginEnabled: true,
			siweLoginEnabled: true,
			googleOneTapEnabled: true,
		};
		const capabilities = getAuthCapabilities(
			{
				CINAAUTH_ACCOUNT_ORIGIN: ACCOUNT_ORIGIN,
				CINAAUTH_SIWE_ENABLED: "true",
				CINAAUTH_SIWE_ALLOWED_CHAIN_IDS: "1",
				CINAAUTH_SIWE_RP_DOMAIN: "accounts.cinaseek.ai",
				CINAAUTH_SIWE_RP_URI: ACCOUNT_ORIGIN,
				CINAAUTH_SIWE_ALLOW_LEGACY: "false",
				CINAAUTH_SIWE_AUTO_SIGNUP: "true",
			},
			{ email: true, sms: false },
			[{ id: "google", type: "social" }],
			settings,
			"dynamic-google-client-id",
		);

		expect(capabilities.methods).toMatchObject({
			emailPassword: true,
			emailOtp: true,
			passkey: true,
			siwe: true,
		});
		expect(capabilities.oneTap).toBe(true);
		expect(capabilities.oneTapClientId).toBe("dynamic-google-client-id");

		const unavailable = getAuthCapabilities(
			{},
			{ email: false, sms: false },
			[],
			settings,
			null,
		);
		expect(unavailable.methods.emailOtp).toBe(false);
		expect(unavailable.methods.siwe).toBe(false);
		expect(unavailable.oneTap).toBe(false);
		expect(unavailable.oneTapClientId).toBeNull();
	});

	it("advertises SIWE only for a complete strict EOA configuration", () => {
		expect(
			getAuthCapabilities({
				CINAAUTH_ACCOUNT_ORIGIN: ACCOUNT_ORIGIN,
				CINAAUTH_SIWE_ENABLED: "true",
				CINAAUTH_SIWE_ALLOWED_CHAIN_IDS: "1",
				CINAAUTH_SIWE_RP_DOMAIN: "accounts.cinaseek.ai",
				CINAAUTH_SIWE_RP_URI: "https://accounts.cinaseek.ai",
				CINAAUTH_SIWE_ALLOW_LEGACY: "false",
				CINAAUTH_SIWE_AUTO_SIGNUP: "false",
			}).methods.siwe,
		).toBe(true);
		expect(
			getAuthCapabilities({
				CINAAUTH_ACCOUNT_ORIGIN: ACCOUNT_ORIGIN,
				CINAAUTH_SIWE_ENABLED: "true",
				CINAAUTH_SIWE_ALLOWED_CHAIN_IDS: "1",
				CINAAUTH_SIWE_RP_DOMAIN: "accounts.cinaseek.ai",
				CINAAUTH_SIWE_RP_URI: "https://accounts.cinaseek.ai",
				CINAAUTH_SIWE_ALLOW_LEGACY: "true",
				CINAAUTH_SIWE_AUTO_SIGNUP: "false",
			}).methods.siwe,
		).toBe(false);
	});

	it("advertises social providers only with complete credential pairs", () => {
		expect(
			getAuthCapabilities({ GOOGLE_CLIENT_ID: "google-client-id" })
				.oauthProviders,
		).toEqual([]);
		expect(
			getAuthCapabilities({ GITHUB_CLIENT_SECRET: "github-secret" })
				.oauthProviders,
		).toEqual([]);
		expect(
			getAuthCapabilities({
				GOOGLE_CLIENT_ID: "google-client-id",
				GOOGLE_CLIENT_SECRET: "google-secret",
				GITHUB_CLIENT_ID: "github-client-id",
				GITHUB_CLIENT_SECRET: "github-secret",
			}).oauthProviders,
		).toEqual([
			{ id: "google", type: "social" },
			{ id: "github", type: "social" },
		]);
	});

	it("fails closed when only one Turnstile key is configured", () => {
		expect(
			getAuthCapabilities({
				CLOUDFLARE_TURNSTILE_SITE_KEY: "turnstile-site-key",
			}).captcha.enabled,
		).toBe(false);
		expect(
			getAuthCapabilities({
				CLOUDFLARE_TURNSTILE_SECRET_KEY: "turnstile-secret-key",
			}).captcha.enabled,
		).toBe(false);
	});

	it("exposes only provider identifiers and safe optional flags", () => {
		const capabilities = getAuthCapabilities(
			{
				CINAAUTH_ACCOUNT_ORIGIN: ACCOUNT_ORIGIN,
				GENERIC_OAUTH_CONFIG: JSON.stringify([
					{
						providerId: "github-enterprise",
						clientId: "client-id",
						clientSecret: "must-not-leak",
						discoveryUrl:
							"https://github.example/.well-known/openid-configuration",
						redirectURI:
							"https://accounts.cinaseek.ai/api/auth/oauth2/callback/github-enterprise",
					},
				]),
				GOOGLE_CLIENT_ID: "google-client-id",
				GOOGLE_CLIENT_SECRET: "google-secret-must-not-leak",
				GITHUB_CLIENT_ID: "github-client-id",
				GITHUB_CLIENT_SECRET: "github-secret-must-not-leak",
				CLOUDFLARE_TURNSTILE_SITE_KEY: "turnstile-site-key",
				CLOUDFLARE_TURNSTILE_SECRET_KEY: "turnstile-secret",
				STRIPE_SECRET_KEY: "stripe-secret",
				STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret",
				STRIPE_DEFAULT_PRICE_ID: "price_production",
				CINAAUTH_ENTITLEMENT_CONFIG: entitlementConfig(),
			},
			{ email: true, sms: true },
		);

		expect(capabilities.oauthProviders).toEqual([
			{ id: "google", type: "social" },
			{ id: "github", type: "social" },
			{ id: "github-enterprise", type: "generic-oauth" },
		]);
		expect(capabilities.oneTap).toBe(false);
		expect(capabilities.methods.emailOtp).toBe(true);
		expect(capabilities.methods.emailPassword).toBe(false);
		expect(capabilities.methods.magicLink).toBe(false);
		expect(capabilities.methods.phoneOtp).toBe(true);
		expect(capabilities.methods.username).toBe(false);
		expect(capabilities.captcha).toMatchObject({
			enabled: true,
			provider: "cloudflare-turnstile",
			siteKey: "turnstile-site-key",
			action: "cinaauth",
		});
		expect(capabilities.captcha.protectedEndpoints).not.toContain(
			"/email-otp/send-verification-otp",
		);
		expect(capabilities.captcha.protectedEndpoints).toContain(
			"/phone-number/send-otp",
		);
		expect(capabilities.captcha.protectedEndpoints).toContain("/sign-in/email");
		for (const retiredEndpoint of [
			"/sign-up/email",
			"/request-password-reset",
			"/sign-in/magic-link",
			"/email-otp/request-password-reset",
			"/forget-password/email-otp",
		]) {
			expect(capabilities.captcha.protectedEndpoints).not.toContain(
				retiredEndpoint,
			);
		}
		expect(capabilities.billing).toBe(true);
		expect(JSON.stringify(capabilities)).not.toContain("must-not-leak");
	});

	it("does not advertise billing without a configured Stripe Price and entitlement policy", () => {
		expect(
			getAuthCapabilities({
				STRIPE_SECRET_KEY: "stripe-secret",
				STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret",
			}),
		).toMatchObject({ billing: false });
		expect(
			getAuthCapabilities({
				STRIPE_SECRET_KEY: "stripe-secret",
				STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret",
				STRIPE_DEFAULT_PRICE_ID: "price_production",
			}),
		).toMatchObject({ billing: false });
	});

	it("fails closed for malformed or duplicate provider configuration", () => {
		expect(
			getAuthCapabilities({ GENERIC_OAUTH_CONFIG: "not-json" }).oauthProviders,
		).toEqual([]);
		expect(
			getAuthCapabilities({
				CINAAUTH_ACCOUNT_ORIGIN: ACCOUNT_ORIGIN,
				GENERIC_OAUTH_CONFIG: JSON.stringify([
					{
						providerId: "github",
						clientId: "one",
						clientSecret: "one-secret",
						discoveryUrl:
							"https://github.example/.well-known/openid-configuration",
						redirectURI:
							"https://accounts.cinaseek.ai/api/auth/oauth2/callback/github",
					},
					{
						providerId: "github",
						clientId: "two",
						clientSecret: "two-secret",
						discoveryUrl:
							"https://github.example/.well-known/openid-configuration",
						redirectURI:
							"https://accounts.cinaseek.ai/api/auth/oauth2/callback/github",
					},
				]),
			}).oauthProviders,
		).toEqual([]);
	});
});
