import { describe, expect, it, vi } from "vitest";
import {
	CORE_AUTH_CAPABILITIES,
	fetchAuthCapabilities,
	formatOAuthProviderName,
	getCaptchaRequestHeaders,
	isOneTapClientReady,
} from "./auth-capabilities";

describe("auth capability discovery", () => {
	it("loads the public capability endpoint without credentials leakage", async () => {
		const response = {
			...CORE_AUTH_CAPABILITIES,
			methods: {
				...CORE_AUTH_CAPABILITIES.methods,
				emailOtp: true,
				magicLink: true,
				phoneOtp: false,
			},
			oauthProviders: [
				{ id: "google", type: "social" },
				{ id: "github", type: "social" },
				{ id: "github-enterprise", type: "generic-oauth" },
			],
			captcha: {
				enabled: true,
				provider: "cloudflare-turnstile",
				siteKey: "turnstile-site-key",
				action: "cinaauth",
				protectedEndpoints: ["/sign-in/email"],
			},
		};
		const fetcher = vi.fn(async () => Response.json(response));

		const capabilities = await fetchAuthCapabilities(
			fetcher,
			"https://accounts.cinaseek.ai",
		);

		expect(capabilities.oauthProviders).toEqual(response.oauthProviders);
		expect(capabilities.captcha).toEqual(response.captcha);
		expect(capabilities.methods.emailOtp).toBe(true);
		expect(capabilities.methods.magicLink).toBe(true);
		expect(capabilities.methods.phoneOtp).toBe(false);
		expect(fetcher).toHaveBeenCalledWith(
			"https://accounts.cinaseek.ai/api/auth/capabilities",
			expect.objectContaining({ credentials: "include" }),
		);
	});

	it("drops unknown social providers from an untrusted capability payload", async () => {
		const capabilities = await fetchAuthCapabilities(async () =>
			Response.json({
				...CORE_AUTH_CAPABILITIES,
				oauthProviders: [
					{ id: "google", type: "social" },
					{ id: "untrusted", type: "social" },
				],
			}),
		);

		expect(capabilities.oauthProviders).toEqual([
			{ id: "google", type: "social" },
		]);
	});

	it("falls back to core methods while hiding optional providers", async () => {
		const capabilities = await fetchAuthCapabilities(async () =>
			Response.json({ error: "unavailable" }, { status: 503 }),
		);

		expect(capabilities.methods.emailPassword).toBe(true);
		expect(capabilities.methods.passkey).toBe(true);
		expect(capabilities.methods.emailOtp).toBe(false);
		expect(capabilities.methods.magicLink).toBe(false);
		expect(capabilities.methods.phoneOtp).toBe(false);
		expect(capabilities.oauthProviders).toEqual([]);
		expect(capabilities.oneTap).toBe(false);
		expect(capabilities.captcha.enabled).toBe(false);
	});

	it("rejects incomplete captcha capability payloads", async () => {
		const capabilities = await fetchAuthCapabilities(async () =>
			Response.json({
				...CORE_AUTH_CAPABILITIES,
				captcha: {
					enabled: true,
					provider: "cloudflare-turnstile",
					siteKey: "turnstile-site-key",
					action: "cinaauth",
					protectedEndpoints: [],
				},
			}),
		);

		expect(capabilities.captcha).toEqual(CORE_AUTH_CAPABILITIES.captcha);
	});

	it("creates the captcha header only for a completed challenge", () => {
		expect(getCaptchaRequestHeaders(null)).toBeUndefined();
		expect(getCaptchaRequestHeaders("turnstile-token")).toEqual({
			"x-captcha-response": "turnstile-token",
		});
	});

	it("formats provider identifiers for safe text-only buttons", () => {
		expect(formatOAuthProviderName("github-enterprise")).toBe(
			"Github Enterprise",
		);
		expect(formatOAuthProviderName("microsoft_entra-id")).toBe(
			"Microsoft Entra Id",
		);
	});

	it("shows One Tap only when the server and client build both enable it", () => {
		expect(
			isOneTapClientReady(
				{ ...CORE_AUTH_CAPABILITIES, oneTap: true },
				"google-client-id",
			),
		).toBe(true);
		expect(
			isOneTapClientReady(
				{ ...CORE_AUTH_CAPABILITIES, oneTap: false },
				"google-client-id",
			),
		).toBe(false);
		expect(
			isOneTapClientReady(
				{ ...CORE_AUTH_CAPABILITIES, oneTap: true },
				undefined,
			),
		).toBe(false);
	});
});
