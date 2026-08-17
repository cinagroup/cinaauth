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
					oneTap: true,
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

	it("fails when configured secrets produce disabled runtime capabilities", () => {
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
		assert.equal(failures.length, 6);
		assert.match(failures.join("\n"), /GOOGLE_CLIENT_ID/);
		assert.match(failures.join("\n"), /GENERIC_OAUTH_CONFIG/);
		assert.match(failures.join("\n"), /Google social/);
		assert.match(failures.join("\n"), /GitHub social/);
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

	it("enforces SIWE kill-switch parity with the live capability", () => {
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured("CINAAUTH_SIWE_ENABLED"),
				configuredValues: { CINAAUTH_SIWE_ENABLED: "false" },
				capabilities: { methods: { siwe: false } },
			}),
			[],
		);
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured("CINAAUTH_SIWE_ENABLED"),
				configuredValues: { CINAAUTH_SIWE_ENABLED: "true" },
				capabilities: { methods: { siwe: true } },
			}),
			[],
		);
		assert.match(
			evaluateRuntimeCapabilities({
				configuredInputs: configured("CINAAUTH_SIWE_ENABLED"),
				configuredValues: { CINAAUTH_SIWE_ENABLED: "false" },
				capabilities: { methods: { siwe: true } },
			})[0],
			/SIWE kill switch/,
		);
		assert.match(
			evaluateRuntimeCapabilities({
				configuredInputs: configured("CINAAUTH_SIWE_ENABLED"),
				configuredValues: { CINAAUTH_SIWE_ENABLED: "true" },
				capabilities: { methods: { siwe: false } },
			})[0],
			/SIWE kill switch/,
		);
	});
});

describe("live delivery capability checks", () => {
	it("accepts capabilities that match per-channel delivery readiness", () => {
		assert.deepEqual(
			evaluateDeliveryCapabilityParity({
				capabilities: {
					methods: {
						emailOtp: true,
						emailPassword: false,
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

	it("rejects every half-enabled delivery capability", () => {
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
		assert.equal(failures.length, 5);
		assert.match(failures.join("\n"), /Email OTP/);
		assert.match(failures.join("\n"), /email-password/);
		assert.match(failures.join("\n"), /magic-link/);
		assert.match(failures.join("\n"), /phone OTP/);
		assert.match(failures.join("\n"), /username-password/);
	});

	it("requires an active email provider and enabled Email OTP after Auth deploy", () => {
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
			providers: { email: false, sms: false },
		});
		assert.equal(failures.length, 1);
		assert.match(failures[0], /active Delivery Worker email provider/);
	});
});
