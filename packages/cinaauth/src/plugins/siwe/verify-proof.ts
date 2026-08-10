import type { GenericEndpointContext } from "@cinaauth/core";
import { APIError } from "../../api";
import { toChecksumAddress } from "../../utils/hashing";
import { normalizeSiweDomain, parseSiweMessage } from "./parse-message";
import type { SIWEVerifyMessageArgs } from "./types";

interface SIWEProofInput {
	message: string;
	signature: string;
	walletAddress: string;
	chainId: number;
}

interface SIWEProofOptions {
	domain: string;
	verifyMessage: (args: SIWEVerifyMessageArgs) => Promise<boolean>;
}

/**
 * Consume and verify a server-issued ERC-4361 proof.
 *
 * This function deliberately performs no user lookup or session mutation so
 * login and authenticated wallet-link flows share the same proof boundary.
 */
export async function verifySiweProof(
	ctx: GenericEndpointContext,
	input: SIWEProofInput,
	options: SIWEProofOptions,
): Promise<string> {
	const walletAddress = toChecksumAddress(input.walletAddress);
	const verification =
		await ctx.context.internalAdapter.consumeVerificationValue(
			`siwe:${walletAddress}:${input.chainId}`,
		);

	if (!verification) {
		throw APIError.fromStatus("UNAUTHORIZED", {
			message: "Unauthorized: Invalid or expired nonce",
			status: 401,
			code: "UNAUTHORIZED_INVALID_OR_EXPIRED_NONCE",
		});
	}

	const parsedMessage = parseSiweMessage(input.message);
	const nonceMatches = parsedMessage.nonce === verification.value;
	const addressMatches =
		!!parsedMessage.address &&
		parsedMessage.address.toLowerCase() === walletAddress.toLowerCase();
	const chainMatches = parsedMessage.chainId === input.chainId;
	const domainMatches =
		!!parsedMessage.domain &&
		normalizeSiweDomain(parsedMessage.domain) ===
			normalizeSiweDomain(options.domain);

	if (!nonceMatches || !addressMatches || !chainMatches || !domainMatches) {
		throw APIError.fromStatus("UNAUTHORIZED", {
			message:
				"Unauthorized: SIWE message does not match the expected nonce, domain, address, or chain ID",
			status: 401,
			code: "UNAUTHORIZED_SIWE_MESSAGE_MISMATCH",
		});
	}

	const now = Date.now();
	if (parsedMessage.expirationTime) {
		const expiresAt = Date.parse(parsedMessage.expirationTime);
		if (!Number.isNaN(expiresAt) && now >= expiresAt) {
			throw APIError.fromStatus("UNAUTHORIZED", {
				message: "Unauthorized: SIWE message has expired",
				status: 401,
				code: "UNAUTHORIZED_SIWE_MESSAGE_EXPIRED",
			});
		}
	}
	if (parsedMessage.notBefore) {
		const notBefore = Date.parse(parsedMessage.notBefore);
		if (!Number.isNaN(notBefore) && now < notBefore) {
			throw APIError.fromStatus("UNAUTHORIZED", {
				message: "Unauthorized: SIWE message is not yet valid",
				status: 401,
				code: "UNAUTHORIZED_SIWE_MESSAGE_NOT_YET_VALID",
			});
		}
	}

	const verified = await options.verifyMessage({
		message: input.message,
		signature: input.signature,
		address: walletAddress,
		chainId: input.chainId,
		cacao: {
			h: { t: "caip122" },
			p: {
				domain: options.domain,
				aud: options.domain,
				nonce: verification.value,
				iss: options.domain,
				version: "1",
			},
			s: { t: "eip191", s: input.signature },
		},
	});

	if (!verified) {
		throw APIError.fromStatus("UNAUTHORIZED", {
			message: "Unauthorized: Invalid SIWE signature",
			status: 401,
		});
	}

	return walletAddress;
}
