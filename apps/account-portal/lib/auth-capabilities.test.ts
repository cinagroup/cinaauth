import { describe, expect, it, vi } from "vitest";
import {
	CORE_AUTH_CAPABILITIES,
	fetchAuthCapabilities,
	formatOAuthProviderName,
	getCaptchaRequestHeaders,
	isAuthCapabilitiesSnapshot,
	isCaptchaEndpointProtected,
} from "./auth-capabilities";

describe("auth capability discovery", () => {
	it("loads the public capability endpoint without credentials leakage", async () => {
		const response = {
			...CORE_AUTH_CAPABILITIES,
			methods: {
				...CORE_AUTH_CAPABILITIES.methods,
				emailPassword: true,
				emailOtp: true,
				magicLink: true,
				phoneOtp: false,
				username: true,
			},
			oneTap: true,
			oneTapClientId: "google-client-id",
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
		expect(capabilities.methods.emailPassword).toBe(true);
		expect(capabilities.methods.emailOtp).toBe(true);
		expect(capabilities.methods.magicLink).toBe(false);
		expect(capabilities.methods.phoneOtp).toBe(false);
		expect(capabilities.methods.username).toBe(false);
		expect(capabilities.oneTap).toBe(true);
		expect(capabilities.oneTapClientId).toBe("google-client-id");
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

	it("accepts the runtime social provider catalog from the Auth Worker", async () => {
		const capabilities = await fetchAuthCapabilities(async () =>
			Response.json({
				...CORE_AUTH_CAPABILITIES,
				oauthProviders: [
					{ id: "google", type: "social" },
					{ id: "apple", type: "social" },
					{ id: "discord", type: "social" },
					{ id: "microsoft-entra-id", type: "social" },
					{ id: "facebook", type: "social" },
					{ id: "twitter", type: "social" },
					{ id: "github", type: "social" },
				],
			}),
		);

		expect(capabilities.oauthProviders).toHaveLength(7);
	});

	it("falls back to core methods while hiding optional providers", async () => {
		const capabilities = await fetchAuthCapabilities(async () =>
			Response.json({ error: "unavailable" }, { status: 503 }),
		);

		expect(capabilities.methods.emailPassword).toBe(false);
		expect(capabilities.methods.passkey).toBe(false);
		expect(capabilities.methods.emailOtp).toBe(false);
		expect(capabilities.methods.magicLink).toBe(false);
		expect(capabilities.methods.phoneOtp).toBe(false);
		expect(capabilities.methods.username).toBe(false);
		expect(capabilities.methods.siwe).toBe(false);
		expect(capabilities.oauthProviders).toEqual([]);
		expect(capabilities.oneTap).toBe(false);
		expect(capabilities.captcha.enabled).toBe(false);
	});

	it("honors runtime password and passkey switches while keeping retired methods closed", async () => {
		const capabilities = await fetchAuthCapabilities(async () =>
			Response.json({
				...CORE_AUTH_CAPABILITIES,
				methods: {
					...CORE_AUTH_CAPABILITIES.methods,
					emailPassword: true,
					emailOtp: true,
					magicLink: true,
					username: true,
					passkey: true,
				},
			}),
		);

		expect(capabilities.methods).toMatchObject({
			emailPassword: true,
			emailOtp: true,
			magicLink: false,
			username: false,
			passkey: true,
		});
	});

	it("enables wallet authentication only from an authoritative capability snapshot", async () => {
		const disabled = await fetchAuthCapabilities(async () =>
			Response.json({
				...CORE_AUTH_CAPABILITIES,
				methods: { ...CORE_AUTH_CAPABILITIES.methods, siwe: false },
			}),
		);
		const enabled = await fetchAuthCapabilities(async () =>
			Response.json({
				...CORE_AUTH_CAPABILITIES,
				methods: { ...CORE_AUTH_CAPABILITIES.methods, siwe: true },
			}),
		);

		expect(disabled.methods.siwe).toBe(false);
		expect(enabled.methods.siwe).toBe(true);
	});

	it("keeps wallet authentication closed for malformed and failed responses", async () => {
		const malformed = await fetchAuthCapabilities(async () =>
			Response.json({
				...CORE_AUTH_CAPABILITIES,
				methods: { ...CORE_AUTH_CAPABILITIES.methods, siwe: "true" },
			}),
		);
		const failed = await fetchAuthCapabilities(async () => {
			throw new Error("offline");
		});

		expect(malformed.methods.siwe).toBe(false);
		expect(failed.methods.siwe).toBe(false);
	});

	it("rejects incomplete captcha capability payloads", async () => {
		const incomplete = {
			...CORE_AUTH_CAPABILITIES,
			captcha: {
				enabled: true,
				provider: "cloudflare-turnstile" as const,
				siteKey: "turnstile-site-key",
				action: "cinaauth",
				protectedEndpoints: [],
			},
		};
		const capabilities = await fetchAuthCapabilities(async () =>
			Response.json(incomplete),
		);

		expect(capabilities.captcha).toEqual(CORE_AUTH_CAPABILITIES.captcha);
		expect(isAuthCapabilitiesSnapshot(incomplete)).toBe(false);
	});

	it("creates the captcha header only for a completed challenge", () => {
		expect(getCaptchaRequestHeaders(null)).toBeUndefined();
		expect(getCaptchaRequestHeaders("turnstile-token")).toEqual({
			"x-captcha-response": "turnstile-token",
		});
	});

	it("requires Turnstile only for endpoints named by the server capability", () => {
		const capabilities = {
			...CORE_AUTH_CAPABILITIES,
			captcha: {
				enabled: true as const,
				provider: "cloudflare-turnstile" as const,
				siteKey: "turnstile-site-key",
				action: "cinaauth",
				protectedEndpoints: ["/phone-number/send-otp"],
			},
		};

		expect(
			isCaptchaEndpointProtected(capabilities, "/phone-number/send-otp"),
		).toBe(true);
		expect(
			isCaptchaEndpointProtected(
				capabilities,
				"/email-otp/send-verification-otp",
			),
		).toBe(false);
		expect(
			isCaptchaEndpointProtected(undefined, "/phone-number/send-otp"),
		).toBe(false);
	});

	it("formats provider identifiers for safe text-only buttons", () => {
		expect(formatOAuthProviderName("github-enterprise")).toBe(
			"Github Enterprise",
		);
		expect(formatOAuthProviderName("microsoft_entra-id")).toBe(
			"Microsoft Entra Id",
		);
	});

	it("enables One Tap only for an authoritative Google provider and client id", async () => {
		const missingClient = await fetchAuthCapabilities(async () =>
			Response.json({ ...CORE_AUTH_CAPABILITIES, oneTap: true }),
		);
		const missingProvider = await fetchAuthCapabilities(async () =>
			Response.json({
				...CORE_AUTH_CAPABILITIES,
				oneTap: true,
				oneTapClientId: "google-client-id",
			}),
		);
		const enabled = await fetchAuthCapabilities(async () =>
			Response.json({
				...CORE_AUTH_CAPABILITIES,
				oneTap: true,
				oneTapClientId: "google-client-id",
				oauthProviders: [{ id: "google", type: "social" }],
			}),
		);

		expect(missingClient.oneTap).toBe(false);
		expect(missingProvider.oneTap).toBe(false);
		expect(enabled.oneTap).toBe(true);
		expect(enabled.oneTapClientId).toBe("google-client-id");
	});
});
