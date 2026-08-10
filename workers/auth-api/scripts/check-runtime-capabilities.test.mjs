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
});

describe("live delivery capability checks", () => {
	it("accepts capabilities that match per-channel delivery readiness", () => {
		assert.deepEqual(
			evaluateDeliveryCapabilityParity({
				capabilities: {
					methods: { emailOtp: true, magicLink: true, phoneOtp: false },
				},
				providers: { email: true, sms: false },
			}),
			[],
		);
	});

	it("rejects every half-enabled delivery capability", () => {
		const failures = evaluateDeliveryCapabilityParity({
			capabilities: {
				methods: { emailOtp: true, magicLink: false, phoneOtp: true },
			},
			providers: { email: false, sms: false },
		});
		assert.equal(failures.length, 2);
		assert.match(failures.join("\n"), /Email OTP/);
		assert.match(failures.join("\n"), /phone OTP/);
	});
});
