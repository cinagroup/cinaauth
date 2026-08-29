import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	evaluateDeliveryCapabilityParity,
	evaluateRuntimeCapabilities,
} from "./check-runtime-capabilities.mjs";

const configured = (...names) => new Set(names);

describe("live optional capability checks", () => {
	it("accepts configured plugins that are enabled at runtime", () => {
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured(
					"GOOGLE_CLIENT_ID",
					"GOOGLE_CLIENT_SECRET",
					"GITHUB_CLIENT_ID",
					"GITHUB_CLIENT_SECRET",
					"GENERIC_OAUTH_CONFIG",
					"CLOUDFLARE_TURNSTILE_SITE_KEY",
					"CLOUDFLARE_TURNSTILE_SECRET_KEY",
					"STRIPE_SECRET_KEY",
					"STRIPE_WEBHOOK_SECRET",
					"STRIPE_DEFAULT_PRICE_ID",
					"CINAAUTH_ENTITLEMENT_CONFIG",
				),
				capabilities: {
					oneTap: false,
					oauthProviders: [
						{ id: "google", type: "social" },
						{ id: "github", type: "social" },
						{ id: "enterprise", type: "generic-oauth" },
					],
					captcha: { enabled: true },
					billing: true,
				},
			}),
			[],
		);
	});

	it("allows administrators to disable configured sign-in providers", () => {
		const failures = evaluateRuntimeCapabilities({
			configuredInputs: configured(
				"GOOGLE_CLIENT_ID",
				"GOOGLE_CLIENT_SECRET",
				"GITHUB_CLIENT_ID",
				"GITHUB_CLIENT_SECRET",
				"GENERIC_OAUTH_CONFIG",
				"CLOUDFLARE_TURNSTILE_SITE_KEY",
				"CLOUDFLARE_TURNSTILE_SECRET_KEY",
				"STRIPE_SECRET_KEY",
				"STRIPE_WEBHOOK_SECRET",
				"STRIPE_DEFAULT_PRICE_ID",
				"CINAAUTH_ENTITLEMENT_CONFIG",
			),
			capabilities: {
				oneTap: false,
				oauthProviders: [],
				captcha: { enabled: false },
				billing: false,
			},
		});
		assert.equal(failures.length, 2);
		assert.match(failures.join("\n"), /Turnstile/);
		assert.match(failures.join("\n"), /Stripe/);
	});

	it("accepts administrator-enabled Google One Tap when its public client is complete", () => {
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured(
					"GOOGLE_CLIENT_ID",
					"GOOGLE_CLIENT_SECRET",
				),
				capabilities: {
					oneTap: true,
					oneTapClientId: "google-client-id",
					oauthProviders: [{ id: "google", type: "social" }],
					captcha: { enabled: false },
					billing: false,
				},
			}),
			[],
		);
	});

	it("rejects One Tap without a configured Google provider and public client id", () => {
		const failures = evaluateRuntimeCapabilities({
			configuredInputs: configured(),
			capabilities: {
				oneTap: true,
				oneTapClientId: null,
				oauthProviders: [],
				captcha: { enabled: false },
				billing: false,
			},
		});

		assert.equal(failures.length, 1);
		assert.match(failures.join("\n"), /One Tap/);
	});

	it("rejects an advertised social provider without its deployment credentials", () => {
		const failures = evaluateRuntimeCapabilities({
			configuredInputs: configured(),
			capabilities: {
				oneTap: false,
				oauthProviders: [{ id: "google", type: "social" }],
				captcha: { enabled: false },
				billing: false,
			},
		});

		assert.equal(failures.length, 1);
		assert.match(failures[0], /Google social/);
	});

	it("does not treat Stripe secrets without a Price as configured billing", () => {
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured(
					"STRIPE_SECRET_KEY",
					"STRIPE_WEBHOOK_SECRET",
				),
				capabilities: {
					oneTap: false,
					oauthProviders: [],
					captcha: { enabled: false },
					billing: false,
				},
			}),
			[],
		);
	});

	it("does not require optional capabilities without their secret groups", () => {
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured(),
				capabilities: {
					oneTap: false,
					oauthProviders: [],
					captcha: { enabled: false },
					billing: false,
				},
			}),
			[],
		);
	});

	it("treats the SIWE environment switch as a deployment ceiling", () => {
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured("CINAAUTH_SIWE_ENABLED"),
				configuredValues: { CINAAUTH_SIWE_ENABLED: "false" },
				capabilities: { oneTap: false, methods: { siwe: false } },
			}),
			[],
		);
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured("CINAAUTH_SIWE_ENABLED"),
				configuredValues: { CINAAUTH_SIWE_ENABLED: "true" },
				capabilities: { oneTap: false, methods: { siwe: false } },
			}),
			[],
		);
		assert.match(
			evaluateRuntimeCapabilities({
				configuredInputs: configured("CINAAUTH_SIWE_ENABLED"),
				configuredValues: { CINAAUTH_SIWE_ENABLED: "false" },
				capabilities: { oneTap: false, methods: { siwe: true } },
			})[0],
			/SIWE deployment kill switch/,
		);
	});
});

describe("live delivery capability checks", () => {
	it("accepts administrator-selected email methods backed by delivery readiness", () => {
		assert.deepEqual(
			evaluateDeliveryCapabilityParity({
				capabilities: {
					methods: {
						emailOtp: false,
						emailPassword: true,
						magicLink: false,
						phoneOtp: false,
						username: false,
					},
				},
				providers: { email: true, sms: false },
			}),
			[],
		);
	});

	it("rejects delivery-dependent methods that lack an active provider", () => {
		const failures = evaluateDeliveryCapabilityParity({
			capabilities: {
				methods: {
					emailOtp: true,
					emailPassword: true,
					magicLink: true,
					phoneOtp: true,
					username: true,
				},
			},
			providers: { email: false, sms: false },
		});
		assert.equal(failures.length, 4);
		assert.match(failures.join("\n"), /Email OTP/);
		assert.match(failures.join("\n"), /magic-link/);
		assert.match(failures.join("\n"), /phone OTP/);
		assert.match(failures.join("\n"), /username-password/);
	});

	it("allows an administrator to disable Email OTP while delivery stays ready", () => {
		const failures = evaluateDeliveryCapabilityParity({
			capabilities: {
				methods: {
					emailOtp: false,
					emailPassword: false,
					magicLink: false,
					phoneOtp: false,
					username: false,
				},
			},
			providers: { email: true, sms: false },
		});
		assert.deepEqual(failures, []);
	});
});
