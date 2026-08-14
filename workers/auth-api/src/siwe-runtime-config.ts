export type SiweRuntimeEnv = {
	CINAAUTH_ACCOUNT_ORIGIN?: string;
	CINAAUTH_SIWE_ENABLED?: string;
	CINAAUTH_SIWE_ALLOWED_CHAIN_IDS?: string;
	CINAAUTH_SIWE_RP_DOMAIN?: string;
	CINAAUTH_SIWE_RP_URI?: string;
	CINAAUTH_SIWE_ALLOW_LEGACY?: string;
	CINAAUTH_SIWE_AUTO_SIGNUP?: string;
};

export type SiweRuntimeConfig =
	| { enabled: false }
	| {
			enabled: true;
			rpDomain: string;
			rpUri: string;
			allowedChainIds: number[];
			allowLegacy: false;
			autoSignup: false;
			walletType: "eoa-only";
	  };

const DISABLED_SIWE_CONFIG = { enabled: false } as const;

const isCanonicalDomain = (value: string) =>
	value === value.trim().toLowerCase() &&
	/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
		value,
	);

const parseAllowedChainIds = (value: string | undefined): number[] | null => {
	if (!value || value !== value.trim()) return null;
	const rawChainIds = value.split(",");
	if (
		rawChainIds.length === 0 ||
		rawChainIds.some((chainId) => !/^[1-9]\d*$/.test(chainId))
	) {
		return null;
	}

	const chainIds = rawChainIds.map(Number);
	if (
		chainIds.some((chainId) => !Number.isSafeInteger(chainId)) ||
		new Set(chainIds).size !== chainIds.length
	) {
		return null;
	}
	return chainIds;
};

const isCanonicalRpUri = (value: string, domain: string) => {
	try {
		const url = new URL(value);
		return (
			url.protocol === "https:" &&
			url.hostname === domain &&
			url.port === "" &&
			url.username === "" &&
			url.password === "" &&
			url.pathname === "/" &&
			url.search === "" &&
			url.hash === "" &&
			value === url.origin
		);
	} catch {
		return false;
	}
};

/**
 * Parses the non-secret SIWE rollout controls. Every production input is
 * explicit so a missing, malformed, legacy, or auto-signup configuration keeps
 * both the plugin and its public capability disabled.
 */
export const getSiweRuntimeConfig = (
	env: SiweRuntimeEnv,
): SiweRuntimeConfig => {
	if (env.CINAAUTH_SIWE_ENABLED !== "true") return DISABLED_SIWE_CONFIG;

	const rpDomain = env.CINAAUTH_SIWE_RP_DOMAIN;
	const rpUri = env.CINAAUTH_SIWE_RP_URI;
	const allowedChainIds = parseAllowedChainIds(
		env.CINAAUTH_SIWE_ALLOWED_CHAIN_IDS,
	);
	if (
		!rpDomain ||
		!isCanonicalDomain(rpDomain) ||
		!rpUri ||
		!isCanonicalRpUri(rpUri, rpDomain) ||
		env.CINAAUTH_ACCOUNT_ORIGIN !== rpUri ||
		!allowedChainIds ||
		env.CINAAUTH_SIWE_ALLOW_LEGACY !== "false" ||
		env.CINAAUTH_SIWE_AUTO_SIGNUP !== "false"
	) {
		return DISABLED_SIWE_CONFIG;
	}

	return {
		enabled: true,
		rpDomain,
		rpUri,
		allowedChainIds,
		allowLegacy: false,
		autoSignup: false,
		walletType: "eoa-only",
	};
};
