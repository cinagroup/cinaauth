import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	evaluateDeliveryCapabilityParity,
	evaluateRuntimeCapabilities,
} from "./check-runtime-capabilities.mjs";

const configured = (...names) => new Set(names);
const runtimeCapabilities = ({ methods = {}, ...overrides } = {}) => ({
	version: 5,
	oneTap: false,
	oneTapClientId: null,
	oauthProviders: [],
	captcha: { enabled: false },
	billing: false,
	methods: { siwe: false, ...methods },
	...overrides,
});

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
				capabilities: runtimeCapabilities({
					oauthProviders: [
						{ id: "google", type: "social" },
						{ id: "github", type: "social" },
						{ id: "enterprise", type: "generic-oauth" },
					],
					captcha: { enabled: true },
					billing: true,
				}),
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
			capabilities: runtimeCapabilities({
				oauthProviders: [],
				captcha: { enabled: false },
				billing: false,
			}),
		});
		assert.equal(failures.length, 2);
		assert.match(failures.join("\n"), /Turnstile/);
		assert.match(failures.join("\n"), /Stripe billing/);
	});

	it("rejects One Tap without an enabled Google provider and client id", () => {
		const failures = evaluateRuntimeCapabilities({
			configuredInputs: configured("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
			capabilities: runtimeCapabilities({
				oneTap: true,
				oauthProviders: [{ id: "google", type: "social" }],
			}),
		});

		assert.deepEqual(failures, [
			"Live One Tap capability requires an enabled Google provider and public client id",
		]);
	});

	it("accepts a complete runtime-enabled Google One Tap capability", () => {
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured(),
				capabilities: runtimeCapabilities({
					oneTap: true,
					oneTapClientId: "google-client-id",
					oauthProviders: [{ id: "google", type: "social" }],
				}),
			}),
			[],
		);
	});

	it("does not treat Stripe secrets without a Price as configured billing", () => {
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured(
					"STRIPE_SECRET_KEY",
					"STRIPE_WEBHOOK_SECRET",
				),
				capabilities: runtimeCapabilities(),
			}),
			[],
		);
	});

	it("does not require optional capabilities without their secret groups", () => {
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured(),
				capabilities: runtimeCapabilities(),
			}),
			[],
		);
	});

	it("lets the runtime switch narrow SIWE but never override the deployment kill switch", () => {
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured("CINAAUTH_SIWE_ENABLED"),
				configuredValues: { CINAAUTH_SIWE_ENABLED: "false" },
				capabilities: runtimeCapabilities({ methods: { siwe: false } }),
			}),
			[],
		);
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured("CINAAUTH_SIWE_ENABLED"),
				configuredValues: { CINAAUTH_SIWE_ENABLED: "true" },
				capabilities: runtimeCapabilities({ methods: { siwe: true } }),
			}),
			[],
		);
		assert.match(
			evaluateRuntimeCapabilities({
				configuredInputs: configured("CINAAUTH_SIWE_ENABLED"),
				configuredValues: { CINAAUTH_SIWE_ENABLED: "false" },
				capabilities: runtimeCapabilities({ methods: { siwe: true } }),
			})[0],
			/kill switch/,
		);
		assert.deepEqual(
			evaluateRuntimeCapabilities({
				configuredInputs: configured("CINAAUTH_SIWE_ENABLED"),
				configuredValues: { CINAAUTH_SIWE_ENABLED: "true" },
				capabilities: runtimeCapabilities({ methods: { siwe: false } }),
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
		assert.equal(failures.length, 4);
		assert.match(failures.join("\n"), /Email OTP/);
		assert.match(failures.join("\n"), /magic-link/);
		assert.match(failures.join("\n"), /phone OTP/);
		assert.match(failures.join("\n"), /username-password/);
	});

	it("allows the runtime setting to disable Email OTP", () => {
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
		assert.deepEqual(failures, []);
	});
});
