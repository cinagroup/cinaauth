export interface EthereumProvider {
	request(args: {
		method: string;
		params?: readonly unknown[] | Record<string, unknown>;
	}): Promise<unknown>;
}

export type EthereumWalletIdentity = {
	address: string;
	chainId: number;
};

const ETHEREUM_ADDRESS = /^0[xX][a-fA-F0-9]{40}$/;

export const getInjectedEthereumProvider = (
	windowLike: unknown,
): EthereumProvider | null => {
	if (!windowLike || typeof windowLike !== "object") return null;
	const ethereum = (windowLike as { ethereum?: unknown }).ethereum;
	if (!ethereum || typeof ethereum !== "object") return null;
	const request = (ethereum as { request?: unknown }).request;
	return typeof request === "function" ? (ethereum as EthereumProvider) : null;
};

export const parseEthereumChainId = (value: unknown): number => {
	const chainId =
		typeof value === "number"
			? value
			: typeof value === "string" && /^0x[0-9a-f]+$/i.test(value)
				? Number.parseInt(value.slice(2), 16)
				: typeof value === "string" && /^\d+$/.test(value)
					? Number.parseInt(value, 10)
					: Number.NaN;
	if (!Number.isSafeInteger(chainId) || chainId <= 0) {
		throw new Error("The wallet returned an invalid chain ID");
	}
	return chainId;
};

export const requestEthereumWalletIdentity = async (
	provider: EthereumProvider,
): Promise<EthereumWalletIdentity> => {
	const [accounts, rawChainId] = await Promise.all([
		provider.request({ method: "eth_requestAccounts" }),
		provider.request({ method: "eth_chainId" }),
	]);
	const address = Array.isArray(accounts) ? accounts[0] : null;
	if (typeof address !== "string" || !ETHEREUM_ADDRESS.test(address)) {
		throw new Error("The wallet did not return a valid Ethereum account");
	}
	return { address, chainId: parseEthereumChainId(rawChainId) };
};

export const buildSiweMessage = (input: {
	domain: string;
	uri: string;
	address: string;
	chainId: number;
	nonce: string;
	issuedAt?: Date;
}) =>
	`${input.domain} wants you to sign in with your Ethereum account:\n${
		input.address
	}\n\nLink this wallet to your CinaAuth account.\n\nURI: ${
		input.uri
	}\nVersion: 1\nChain ID: ${input.chainId}\nNonce: ${
		input.nonce
	}\nIssued At: ${(input.issuedAt ?? new Date()).toISOString()}`;

export const signSiweMessage = async (
	provider: EthereumProvider,
	message: string,
	address: string,
): Promise<string> => {
	const signature = await provider.request({
		method: "personal_sign",
		params: [message, address],
	});
	if (typeof signature !== "string" || signature.length === 0) {
		throw new Error("The wallet did not return a signature");
	}
	return signature;
};
