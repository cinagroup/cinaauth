import { describe, expect, it, vi } from "vitest";
import type { EthereumProvider } from "./ethereum-wallet";
import {
	buildSiweMessage,
	getInjectedEthereumProvider,
	parseEthereumChainId,
	requestEthereumWalletIdentity,
	signSiweMessage,
} from "./ethereum-wallet";

describe("Ethereum wallet helpers", () => {
	it("discovers only EIP-1193-like providers", () => {
		const provider = { request: vi.fn() };
		expect(getInjectedEthereumProvider({ ethereum: provider })).toBe(provider);
		expect(getInjectedEthereumProvider({ ethereum: {} })).toBeNull();
		expect(getInjectedEthereumProvider(null)).toBeNull();
	});

	it("parses hexadecimal and decimal chain IDs defensively", () => {
		expect(parseEthereumChainId("0x2105")).toBe(8453);
		expect(parseEthereumChainId("137")).toBe(137);
		expect(() => parseEthereumChainId("invalid")).toThrow("invalid chain ID");
	});

	it("requests identity, creates an ERC-4361 message, and signs it", async () => {
		const address = "0x000000000000000000000000000000000000dEaD";
		const request = vi.fn(async ({ method }: { method: string }) => {
			if (method === "eth_requestAccounts") return [address];
			if (method === "eth_chainId") return "0x1";
			if (method === "personal_sign") return "0xsigned";
			return null;
		});
		const provider: EthereumProvider = { request };
		const identity = await requestEthereumWalletIdentity(provider);
		const message = buildSiweMessage({
			domain: "auth.cinaseek.ai",
			uri: "https://auth.cinaseek.ai",
			...identity,
			nonce: "A1b2C3d4E5f6G7h8J",
			issuedAt: new Date("2026-08-09T00:00:00.000Z"),
		});
		expect(message).toContain(
			"auth.cinaseek.ai wants you to sign in with your Ethereum account",
		);
		expect(message).toContain("Chain ID: 1");
		expect(message).toContain("Nonce: A1b2C3d4E5f6G7h8J");
		expect(await signSiweMessage(provider, message, address)).toBe("0xsigned");
		expect(request).toHaveBeenLastCalledWith({
			method: "personal_sign",
			params: [message, address],
		});
	});
});
