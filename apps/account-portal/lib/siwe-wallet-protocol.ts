export type WalletProofPurpose = "sign-in" | "link-wallet";

export type WalletProofChallenge = {
	challengeId: string;
	nonce: string;
	message: string;
	expiresAt: string;
	purpose: WalletProofPurpose;
	walletAddress: string;
	chainId: number;
};

export type WalletProofRequest = {
	purpose: WalletProofPurpose;
	walletAddress: string;
	chainId: number;
};

export type WalletProofSubmission = WalletProofRequest & {
	challengeId: string;
	message: string;
	signature: string;
};

export interface SiweWalletProtocolClient {
	requestChallenge(input: WalletProofRequest): Promise<WalletProofChallenge>;
	submitProof(input: WalletProofSubmission): Promise<void>;
}

type SiweProtocolPath =
	| "/siwe/challenge"
	| "/siwe/verify"
	| "/siwe/link-wallet";

export interface SiweProtocolTransport {
	post(path: SiweProtocolPath, body: Record<string, unknown>): Promise<unknown>;
}

const ETHEREUM_ADDRESS = /^0[xX][a-fA-F0-9]{40}$/;
const CHALLENGE_TOKEN = /^[A-Za-z0-9]{32}$/;
const MAX_CHALLENGE_MESSAGE_LENGTH = 16_384;
const MAX_CHALLENGE_TTL_MS = 20 * 60 * 1000;

const isPurpose = (value: unknown): value is WalletProofPurpose =>
	value === "sign-in" || value === "link-wallet";

const parseWalletChallenge = (
	value: unknown,
	request: WalletProofRequest,
): WalletProofChallenge => {
	if (!value || typeof value !== "object") {
		throw new Error("CinaSeek returned an invalid wallet challenge");
	}
	const candidate = value as Record<string, unknown>;
	const expiresAtInput =
		typeof candidate.expiresAt === "string"
			? candidate.expiresAt
			: candidate.expiresAt instanceof Date &&
					Number.isFinite(candidate.expiresAt.getTime())
				? candidate.expiresAt.toISOString()
				: null;
	const expiresAt = expiresAtInput ? Date.parse(expiresAtInput) : Number.NaN;
	const now = Date.now();
	const matchesRequest =
		candidate.purpose === request.purpose &&
		candidate.chainId === request.chainId &&
		typeof candidate.walletAddress === "string" &&
		candidate.walletAddress.toLowerCase() ===
			request.walletAddress.toLowerCase();
	if (
		typeof candidate.challengeId !== "string" ||
		!CHALLENGE_TOKEN.test(candidate.challengeId) ||
		typeof candidate.nonce !== "string" ||
		!CHALLENGE_TOKEN.test(candidate.nonce) ||
		typeof candidate.message !== "string" ||
		candidate.message.length === 0 ||
		candidate.message.length > MAX_CHALLENGE_MESSAGE_LENGTH ||
		!isPurpose(candidate.purpose) ||
		typeof candidate.walletAddress !== "string" ||
		!ETHEREUM_ADDRESS.test(candidate.walletAddress) ||
		!Number.isSafeInteger(candidate.chainId) ||
		(candidate.chainId as number) <= 0 ||
		expiresAtInput === null ||
		!Number.isFinite(expiresAt) ||
		expiresAt <= now ||
		expiresAt > now + MAX_CHALLENGE_TTL_MS ||
		!matchesRequest
	) {
		throw new Error("CinaSeek returned an invalid wallet challenge");
	}

	return {
		challengeId: candidate.challengeId,
		nonce: candidate.nonce,
		message: candidate.message,
		expiresAt: new Date(expiresAt).toISOString(),
		purpose: candidate.purpose,
		walletAddress: candidate.walletAddress,
		chainId: candidate.chainId as number,
	};
};

/** Adapts the stable Accounts wallet contract to the active CinaAuth transport. */
export const createCinaAuthSiweProtocolClient = (
	transport: SiweProtocolTransport,
): SiweWalletProtocolClient => ({
	async requestChallenge(input) {
		if (
			!ETHEREUM_ADDRESS.test(input.walletAddress) ||
			!Number.isSafeInteger(input.chainId) ||
			input.chainId <= 0
		) {
			throw new Error("The wallet returned an invalid account");
		}
		const value = await transport.post("/siwe/challenge", {
			walletAddress: input.walletAddress,
			chainId: input.chainId,
			purpose: input.purpose,
		});
		return parseWalletChallenge(value, input);
	},
	async submitProof(input) {
		const path =
			input.purpose === "sign-in" ? "/siwe/verify" : "/siwe/link-wallet";
		await transport.post(path, {
			message: input.message,
			signature: input.signature,
			walletAddress: input.walletAddress,
			chainId: input.chainId,
			challengeId: input.challengeId,
		});
	},
});

/** Runs one proof without ever constructing or mutating the server SIWE message. */
export const completeWalletProof = async (input: {
	client: SiweWalletProtocolClient;
	signMessage: (message: string) => Promise<string>;
	purpose: WalletProofPurpose;
	walletAddress: string;
	chainId: number;
}) => {
	const challenge = await input.client.requestChallenge({
		purpose: input.purpose,
		walletAddress: input.walletAddress,
		chainId: input.chainId,
	});
	const signature = await input.signMessage(challenge.message);
	if (!signature) throw new Error("The wallet did not return a signature");
	await input.client.submitProof({
		purpose: input.purpose,
		walletAddress: challenge.walletAddress,
		chainId: challenge.chainId,
		challengeId: challenge.challengeId,
		message: challenge.message,
		signature,
	});
	return challenge;
};
