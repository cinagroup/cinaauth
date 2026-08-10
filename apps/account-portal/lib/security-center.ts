export const SECURITY_FRESH_AGE_SECONDS = 15 * 60;

const securityDateFormatter = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});

/** Format security-event timestamps identically during SSR and hydration. */
export const formatSecurityDate = (value: string) =>
	`${securityDateFormatter.format(new Date(value))} UTC`;

export type SecuritySession = {
	id: string;
	token: string;
	createdAt: string;
	expiresAt: string;
	ipAddress: string | null;
	userAgent: string | null;
	isCurrent: boolean;
};

export type SecurityAccount = {
	id: string;
	accountId: string;
	providerId: string;
	createdAt: string;
};

export type SecurityPasskey = {
	id: string;
	name: string | null;
	createdAt: string;
};

export type SecurityApiKey = {
	id: string;
	name: string;
	start: string | null;
	enabled: boolean;
	rateLimitEnabled: boolean;
	rateLimitTimeWindow: number | null;
	rateLimitMax: number | null;
	requestCount: number;
	lastRequest: string | null;
	expiresAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type SecurityWallet = {
	id: string;
	address: string;
	chainId: number;
	isPrimary: boolean;
	createdAt: string;
};

export type SecurityPosture = {
	completed: number;
	total: number;
	level: "baseline" | "good" | "strong";
};

export const getSecurityPosture = (input: {
	emailVerified: boolean;
	twoFactorEnabled: boolean;
	passkeyCount: number;
	activeSessionCount: number;
}): SecurityPosture => {
	const completed = [
		input.emailVerified,
		input.twoFactorEnabled,
		input.passkeyCount > 0,
		input.activeSessionCount > 0,
	].filter(Boolean).length;

	return {
		completed,
		total: 4,
		level: completed === 4 ? "strong" : completed >= 2 ? "good" : "baseline",
	};
};

export const canUnlinkAccount = (accountCount: number) => accountCount > 1;

export const requiresPasswordForDeletion = (accounts: SecurityAccount[]) =>
	accounts.some((account) => account.providerId === "credential");

export const isSessionRecent = (
	createdAt: string,
	now = Date.now(),
	freshAgeSeconds = SECURITY_FRESH_AGE_SECONDS,
) => {
	const createdAtMs = Date.parse(createdAt);
	const age = now - createdAtMs;
	return (
		Number.isFinite(createdAtMs) && age >= 0 && age < freshAgeSeconds * 1000
	);
};

export const formatApiKeyIdentifier = (start: string | null) =>
	start ? `${start}...` : "Hidden identifier";

export const formatWalletAddress = (address: string) =>
	address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;

const WALLET_CHAIN_NAMES: Record<number, string> = {
	1: "Ethereum",
	10: "Optimism",
	56: "BNB Smart Chain",
	137: "Polygon",
	42161: "Arbitrum",
	8453: "Base",
};

export const formatWalletChain = (chainId: number) =>
	WALLET_CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;

export const isApiKeyExpired = (expiresAt: string | null, now = Date.now()) =>
	expiresAt !== null && Date.parse(expiresAt) <= now;

export const summarizeUserAgent = (userAgent: string | null) => {
	if (!userAgent) return "Unknown device";
	const browser = /Edg\//.test(userAgent)
		? "Edge"
		: /Chrome\//.test(userAgent)
			? "Chrome"
			: /Firefox\//.test(userAgent)
				? "Firefox"
				: /Safari\//.test(userAgent)
					? "Safari"
					: "Browser";
	const platform = /iPhone|iPad/.test(userAgent)
		? "iOS"
		: /Android/.test(userAgent)
			? "Android"
			: /Windows/.test(userAgent)
				? "Windows"
				: /Macintosh|Mac OS X/.test(userAgent)
					? "macOS"
					: /Linux/.test(userAgent)
						? "Linux"
						: "Unknown OS";
	return `${browser} on ${platform}`;
};
