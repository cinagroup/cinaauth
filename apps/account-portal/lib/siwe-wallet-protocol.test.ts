import { verifyMessage } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it, vi } from "vitest";
import {
	completeWalletProof,
	createCinaAuthSiweProtocolClient,
} from "./siwe-wallet-protocol";

const challenge = {
	challengeId: "A".repeat(32),
	nonce: "B".repeat(32),
	message: "accounts.cinaseek.ai asks you to sign this server message",
	expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
	purpose: "link-wallet" as const,
	walletAddress: "0x000000000000000000000000000000000000dEaD",
	chainId: 1,
};

describe("CinaAuth SIWE protocol client", () => {
	it("signs only the canonical server challenge and submits its challenge ID", async () => {
		const post = vi
			.fn()
			.mockResolvedValueOnce(challenge)
			.mockResolvedValueOnce({ ok: true });
		const signMessage = vi.fn(async () => "0xsigned");
		const client = createCinaAuthSiweProtocolClient({ post });

		await completeWalletProof({
			client,
			signMessage,
			purpose: "link-wallet",
			walletAddress: challenge.walletAddress,
			chainId: challenge.chainId,
		});

		expect(post).toHaveBeenNthCalledWith(1, "/siwe/challenge", {
			walletAddress: challenge.walletAddress,
			chainId: challenge.chainId,
			purpose: "link-wallet",
		});
		expect(signMessage).toHaveBeenCalledWith(challenge.message);
		expect(post).toHaveBeenNthCalledWith(2, "/siwe/link-wallet", {
			message: challenge.message,
			signature: "0xsigned",
			walletAddress: challenge.walletAddress,
			chainId: challenge.chainId,
			challengeId: challenge.challengeId,
		});
	});

	it("routes public wallet sign-in through verify", async () => {
		const signInChallenge = { ...challenge, purpose: "sign-in" as const };
		const post = vi
			.fn()
			.mockResolvedValueOnce(signInChallenge)
			.mockResolvedValueOnce({ ok: true });
		const client = createCinaAuthSiweProtocolClient({ post });

		await completeWalletProof({
			client,
			signMessage: async () => "0xsigned",
			purpose: "sign-in",
			walletAddress: challenge.walletAddress,
			chainId: challenge.chainId,
		});

		expect(post).toHaveBeenNthCalledWith(
			2,
			"/siwe/verify",
			expect.objectContaining({ challengeId: challenge.challengeId }),
		);
	});

	it("preserves a real EIP-191 signature for the exact server message", async () => {
		const account = privateKeyToAccount(
			"0x0000000000000000000000000000000000000000000000000000000000000001",
		);
		const signedChallenge = {
			...challenge,
			message: "accounts.cinaseek.ai asks you to sign: 登录验证 🔐",
			walletAddress: account.address,
		};
		let submittedSignature: `0x${string}` | undefined;
		const client = createCinaAuthSiweProtocolClient({
			async post(path, body) {
				if (path === "/siwe/challenge") return signedChallenge;
				if (
					typeof body.signature !== "string" ||
					!body.signature.startsWith("0x")
				) {
					throw new Error("Expected a hex wallet signature");
				}
				submittedSignature = body.signature as `0x${string}`;
				return { ok: true };
			},
		});

		await completeWalletProof({
			client,
			signMessage: (message) => account.signMessage({ message }),
			purpose: "link-wallet",
			walletAddress: account.address,
			chainId: 1,
		});

		if (!submittedSignature) throw new Error("Expected a submitted signature");
		await expect(
			verifyMessage({
				address: account.address,
				message: signedChallenge.message,
				signature: submittedSignature,
			}),
		).resolves.toBe(true);
	});

	it("normalizes Date expirations decoded by the auth transport", async () => {
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
		const client = createCinaAuthSiweProtocolClient({
			post: vi.fn().mockResolvedValue({ ...challenge, expiresAt }),
		});

		const result = await client.requestChallenge({
			purpose: "link-wallet",
			walletAddress: challenge.walletAddress,
			chainId: 1,
		});

		expect(result.expiresAt).toBe(expiresAt.toISOString());
	});

	it("normalizes parseable string expirations to ISO", async () => {
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toUTCString();
		const client = createCinaAuthSiweProtocolClient({
			post: vi.fn().mockResolvedValue({ ...challenge, expiresAt }),
		});

		const result = await client.requestChallenge({
			purpose: "link-wallet",
			walletAddress: challenge.walletAddress,
			chainId: 1,
		});

		expect(result.expiresAt).toBe(new Date(expiresAt).toISOString());
	});

	it("fails closed when the challenge payload does not match the request", async () => {
		const post = vi.fn().mockResolvedValue({ ...challenge, chainId: 137 });
		const client = createCinaAuthSiweProtocolClient({ post });

		await expect(
			client.requestChallenge({
				purpose: "link-wallet",
				walletAddress: challenge.walletAddress,
				chainId: 1,
			}),
		).rejects.toThrow("invalid wallet challenge");
	});

	it("rejects malformed challenge tokens, oversized messages, and excessive TTLs", async () => {
		const invalidResponses = [
			{ ...challenge, challengeId: "A".repeat(31) },
			{ ...challenge, nonce: "B".repeat(33) },
			{ ...challenge, message: "m".repeat(16_385) },
			{
				...challenge,
				expiresAt: new Date(Date.now() + 21 * 60 * 1000).toISOString(),
			},
		];

		for (const response of invalidResponses) {
			const client = createCinaAuthSiweProtocolClient({
				post: vi.fn().mockResolvedValue(response),
			});
			await expect(
				client.requestChallenge({
					purpose: "link-wallet",
					walletAddress: challenge.walletAddress,
					chainId: 1,
				}),
			).rejects.toThrow("invalid wallet challenge");
		}
	});
});
