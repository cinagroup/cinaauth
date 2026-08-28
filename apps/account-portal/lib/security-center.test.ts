import { describe, expect, it } from "vitest";
import {
	canUnlinkAccount,
	formatApiKeyIdentifier,
	formatSecurityDate,
	formatWalletAddress,
	formatWalletChain,
	getAvailableSecurityProviders,
	getSecurityPosture,
	getSecurityProviderLinkFailure,
	getTwoFactorPasswordBody,
	getWalletOverviewSummary,
	isApiKeyExpired,
	isSessionRecent,
	requiresPasswordForTwoFactor,
	summarizeUserAgent,
} from "./security-center";

describe("security center policy helpers", () => {
	it("formats SSR and browser timestamps in a fixed timezone", () => {
		expect(formatSecurityDate("2026-01-02T03:04:00.000Z")).toBe(
			"Jan 2, 2026, 3:04 AM UTC",
		);
	});

	it("requires multiple identities before allowing an unlink", () => {
		expect(canUnlinkAccount(1)).toBe(false);
		expect(canUnlinkAccount(2)).toBe(true);
	});

	it("preserves provider capability types while filtering linked identities", () => {
		expect(
			getAvailableSecurityProviders(
				[
					{ id: "google", type: "social" },
					{ id: "github-enterprise", type: "generic-oauth" },
				],
				[
					{
						id: "account-1",
						accountId: "google-subject",
						providerId: "google",
						createdAt: "2026-08-09T00:00:00.000Z",
					},
				],
			),
		).toEqual([{ id: "github-enterprise", type: "generic-oauth" }]);
	});

	it("recognizes only an explicit failed provider-link callback", () => {
		expect(getSecurityProviderLinkFailure("failed")).toBe(true);
		expect(getSecurityProviderLinkFailure(["failed"])).toBe(true);
		expect(getSecurityProviderLinkFailure("success")).toBe(false);
		expect(getSecurityProviderLinkFailure(undefined)).toBe(false);
	});

	it("requires a retained credential only when one exists or account data failed", () => {
		const credentialAccount = {
			id: "account-1",
			accountId: "user@example.com",
			providerId: "credential",
			createdAt: "2026-08-09T00:00:00.000Z",
		};

		expect(requiresPasswordForTwoFactor([credentialAccount])).toBe(true);
		expect(requiresPasswordForTwoFactor([])).toBe(false);
		expect(requiresPasswordForTwoFactor([], true)).toBe(true);
	});

	it("omits the password field for passwordless 2FA management", () => {
		expect(getTwoFactorPasswordBody(false, "not-sent")).toEqual({});
		expect(getTwoFactorPasswordBody(true, "legacy-secret")).toEqual({
			password: "legacy-secret",
		});
	});

	it("classifies the security posture from independent controls", () => {
		expect(
			getSecurityPosture({
				emailVerified: true,
				twoFactorEnabled: true,
				passkeyCount: 1,
				activeSessionCount: 1,
			}),
		).toEqual({ completed: 4, total: 4, level: "strong" });
		expect(
			getSecurityPosture({
				emailVerified: true,
				twoFactorEnabled: false,
				passkeyCount: 0,
				activeSessionCount: 1,
			}),
		).toEqual({ completed: 2, total: 4, level: "good" });
	});

	it("uses the configured recent-authentication window", () => {
		const now = Date.parse("2026-08-09T12:15:00.000Z");
		expect(isSessionRecent("2026-08-09T12:01:00.000Z", now)).toBe(true);
		expect(isSessionRecent("2026-08-09T12:00:00.000Z", now)).toBe(false);
		expect(isSessionRecent("2026-08-09T12:16:00.000Z", now)).toBe(false);
	});

	it("shows only a stored API key prefix and classifies expiration", () => {
		expect(formatApiKeyIdentifier("cina_sk_A1B2")).toBe("cina_sk_A1B2...");
		expect(formatApiKeyIdentifier(null)).toBe("Hidden identifier");
		const now = Date.parse("2026-08-09T12:00:00.000Z");
		expect(isApiKeyExpired("2026-08-09T11:59:59.000Z", now)).toBe(true);
		expect(isApiKeyExpired("2026-08-09T12:00:01.000Z", now)).toBe(false);
		expect(isApiKeyExpired(null, now)).toBe(false);
	});

	it("formats wallet identifiers without exposing an unwieldy address", () => {
		expect(
			formatWalletAddress("0x000000000000000000000000000000000000dEaD"),
		).toBe("0x0000...dEaD");
		expect(formatWalletChain(1)).toBe("Ethereum");
		expect(formatWalletChain(8453)).toBe("Base");
		expect(formatWalletChain(777)).toBe("Chain 777");
	});

	it("summarizes only the wallet details needed by the account overview", () => {
		const secondaryWallet = {
			address: "0x0000000000000000000000000000000000000001",
			chainId: 8453,
			isPrimary: false,
		};
		const primaryWallet = {
			address: "0x000000000000000000000000000000000000dEaD",
			chainId: 1,
			isPrimary: true,
		};

		expect(
			getWalletOverviewSummary([secondaryWallet, primaryWallet]),
		).toEqual({
			available: true,
			count: 2,
			wallet: primaryWallet,
		});
		expect(getWalletOverviewSummary([])).toEqual({
			available: true,
			count: 0,
			wallet: null,
		});
		expect(getWalletOverviewSummary([], true)).toEqual({
			available: false,
			count: 0,
			wallet: null,
		});
	});

	it("summarizes common user agents without exposing the full value", () => {
		expect(
			summarizeUserAgent(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
			),
		).toBe("Chrome on Windows");
		expect(summarizeUserAgent(null)).toBe("Unknown device");
	});
});
