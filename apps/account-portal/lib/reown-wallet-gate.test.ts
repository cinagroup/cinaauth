import { describe, expect, it } from "vitest";
import { CORE_AUTH_CAPABILITIES } from "./auth-capabilities";
import {
	isReownWalletReady,
	isSiweWalletUiEnabled,
	normalizeReownProjectId,
} from "./reown-wallet-gate";

describe("Reown wallet UI gate", () => {
	it("requires both the live SIWE capability and a public project ID", () => {
		const enabled = {
			...CORE_AUTH_CAPABILITIES,
			methods: { ...CORE_AUTH_CAPABILITIES.methods, siwe: true },
		};
		const disabled = {
			...CORE_AUTH_CAPABILITIES,
			methods: { ...CORE_AUTH_CAPABILITIES.methods, siwe: false },
		};

		expect(
			isReownWalletReady(enabled, "0123456789abcdef0123456789abcdef", "true"),
		).toBe(true);
		expect(
			isReownWalletReady(disabled, "0123456789abcdef0123456789abcdef", "true"),
		).toBe(false);
		expect(isReownWalletReady(enabled, undefined, "true")).toBe(false);
		expect(
			isReownWalletReady(undefined, "0123456789abcdef0123456789abcdef", "true"),
		).toBe(false);
	});

	it("keeps wallet entry points hidden until the tracked rollout enables them", () => {
		const enabled = {
			...CORE_AUTH_CAPABILITIES,
			methods: { ...CORE_AUTH_CAPABILITIES.methods, siwe: true },
		};
		const projectId = "0123456789abcdef0123456789abcdef";

		expect(isSiweWalletUiEnabled("true")).toBe(true);
		expect(isSiweWalletUiEnabled("false")).toBe(false);
		expect(isSiweWalletUiEnabled(undefined)).toBe(false);
		expect(isReownWalletReady(enabled, projectId, "false")).toBe(false);
		expect(isReownWalletReady(enabled, projectId, undefined)).toBe(false);
	});

	it("rejects blank or malformed public project IDs", () => {
		expect(normalizeReownProjectId(undefined)).toBeNull();
		expect(normalizeReownProjectId("   ")).toBeNull();
		expect(normalizeReownProjectId("not a project id")).toBeNull();
		expect(normalizeReownProjectId(" 0123456789abcdef0123456789abcdef ")).toBe(
			"0123456789abcdef0123456789abcdef",
		);
	});
});
