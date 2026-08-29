import { describe, expect, it } from "vitest";
import { getSiweRuntimeConfig } from "../src/siwe-runtime-config";

const enabledConfiguration = {
	CINAAUTH_ACCOUNT_ORIGIN: "https://accounts.cinaseek.ai",
	CINAAUTH_SIWE_ENABLED: "true",
	CINAAUTH_SIWE_ALLOWED_CHAIN_IDS: "1,11155111",
	CINAAUTH_SIWE_RP_DOMAIN: "accounts.cinaseek.ai",
	CINAAUTH_SIWE_RP_URI: "https://accounts.cinaseek.ai",
	CINAAUTH_SIWE_ALLOW_LEGACY: "false",
	CINAAUTH_SIWE_AUTO_SIGNUP: "false",
} as const;

describe("SIWE runtime configuration", () => {
	it("fails closed when the explicit enable switch is absent or invalid", () => {
		expect(getSiweRuntimeConfig({})).toEqual({ enabled: false });
		expect(
			getSiweRuntimeConfig({
				...enabledConfiguration,
				CINAAUTH_SIWE_ENABLED: "TRUE",
			}),
		).toEqual({ enabled: false });
	});

	it("keeps an explicitly disabled integration off without partial parsing", () => {
		expect(
			getSiweRuntimeConfig({
				CINAAUTH_SIWE_ENABLED: "false",
				CINAAUTH_SIWE_ALLOWED_CHAIN_IDS: "not-a-chain",
			}),
		).toEqual({ enabled: false });
	});

	it("accepts a strict link-first EOA-only configuration", () => {
		expect(getSiweRuntimeConfig(enabledConfiguration)).toEqual({
			enabled: true,
			rpDomain: "accounts.cinaseek.ai",
			rpUri: "https://accounts.cinaseek.ai",
			allowedChainIds: [1, 11155111],
			allowLegacy: false,
			autoSignup: false,
			walletType: "eoa-only",
		});
	});

	it("allows the explicit stage-two wallet account-creation policy", () => {
		expect(
			getSiweRuntimeConfig({
				...enabledConfiguration,
				CINAAUTH_SIWE_AUTO_SIGNUP: "true",
			}),
		).toEqual({
			enabled: true,
			rpDomain: "accounts.cinaseek.ai",
			rpUri: "https://accounts.cinaseek.ai",
			allowedChainIds: [1, 11155111],
			allowLegacy: false,
			autoSignup: true,
			walletType: "eoa-only",
		});
	});

	it.each([
		["empty chain allowlist", { CINAAUTH_SIWE_ALLOWED_CHAIN_IDS: "" }],
		["empty chain element", { CINAAUTH_SIWE_ALLOWED_CHAIN_IDS: "1,,10" }],
		["duplicate chain", { CINAAUTH_SIWE_ALLOWED_CHAIN_IDS: "1,1" }],
		["zero chain", { CINAAUTH_SIWE_ALLOWED_CHAIN_IDS: "0" }],
		["fractional chain", { CINAAUTH_SIWE_ALLOWED_CHAIN_IDS: "1.5" }],
		[
			"unsafe integer chain",
			{ CINAAUTH_SIWE_ALLOWED_CHAIN_IDS: "9007199254740992" },
		],
		[
			"domain with a scheme",
			{ CINAAUTH_SIWE_RP_DOMAIN: "https://accounts.cinaseek.ai" },
		],
		[
			"domain with a port",
			{ CINAAUTH_SIWE_RP_DOMAIN: "accounts.cinaseek.ai:443" },
		],
		["non-HTTPS URI", { CINAAUTH_SIWE_RP_URI: "http://accounts.cinaseek.ai" }],
		["URI host mismatch", { CINAAUTH_SIWE_RP_URI: "https://auth.cinaseek.ai" }],
		[
			"URI with a path",
			{ CINAAUTH_SIWE_RP_URI: "https://accounts.cinaseek.ai/dashboard" },
		],
		[
			"Accounts origin mismatch",
			{ CINAAUTH_ACCOUNT_ORIGIN: "https://other.cinaseek.ai" },
		],
		["legacy mode", { CINAAUTH_SIWE_ALLOW_LEGACY: "true" }],
		["invalid signup switch", { CINAAUTH_SIWE_AUTO_SIGNUP: "TRUE" }],
		["missing legacy switch", { CINAAUTH_SIWE_ALLOW_LEGACY: undefined }],
		["missing signup switch", { CINAAUTH_SIWE_AUTO_SIGNUP: undefined }],
	] as const)("fails closed for %s", (_name, override) => {
		expect(
			getSiweRuntimeConfig({
				...enabledConfiguration,
				...override,
			}),
		).toEqual({ enabled: false });
	});
});
