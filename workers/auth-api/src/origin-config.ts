import type { OidcDemoProfile } from "@cinaauth/auth-web-contract";
import { resolveOidcDemoProfile } from "@cinaauth/auth-web-contract";

export type AuthOriginEnv = {
	CINAAUTH_URL?: string;
	CINAAUTH_ACCOUNT_ORIGIN?: string;
	CINAAUTH_ADMIN_ORIGIN?: string;
	CINAAUTH_CINATOKEN_ORIGIN?: string;
	CINAAUTH_CINATOKEN_CLIENT_ID?: string;
	CINAAUTH_PASSKEY_RP_ID?: string;
	CINAAUTH_LEGACY_ACCOUNT_ORIGIN?: string;
	CINAAUTH_OIDC_DEMO_ENVIRONMENT?: string;
	CINAAUTH_OIDC_DEMO_ORIGIN?: string;
	CINAAUTH_OIDC_DEMO_CLIENT_ID?: string;
	CINAAUTH_SIWE_ENABLED?: string;
	CINAAUTH_SIWE_RP_DOMAIN?: string;
	CINAAUTH_SIWE_RP_URI?: string;
};

export type AuthOriginConfigIssue =
	| "missing_cinaauth_url"
	| "invalid_cinaauth_url"
	| "missing_cinaauth_account_origin"
	| "invalid_cinaauth_account_origin"
	| "missing_cinaauth_admin_origin"
	| "invalid_cinaauth_admin_origin"
	| "missing_cinaauth_passkey_rp_id"
	| "invalid_cinaauth_passkey_rp_id"
	| "invalid_cinaauth_legacy_account_origin"
	| "invalid_cinaauth_oidc_demo_profile"
	| "invalid_cinaauth_cinatoken_profile"
	| "duplicate_cinaauth_origins"
	| "invalid_cinaauth_siwe_rp_origin";

export type AuthOriginConfig = {
	authOrigin: string;
	accountOrigin: string;
	adminOrigin: string;
	passkeyRpId: string;
	legacyAccountOrigin: string | null;
	oidcDemoProfile: OidcDemoProfile | null;
	cinatokenProfile: { applicationOrigin: string; clientId: string } | null;
	trustedOrigins: string[];
	trustedHostnames: string[];
};

export type AuthOriginConfigResult =
	| { ok: true; value: AuthOriginConfig }
	| { ok: false; issues: AuthOriginConfigIssue[] };

type ParsedOrigin = {
	origin: string;
	hostname: string;
};

const parseCanonicalHttpsOrigin = (
	value: string | undefined,
): ParsedOrigin | null => {
	if (!value || value !== value.trim()) return null;
	try {
		const url = new URL(value);
		if (
			url.protocol !== "https:" ||
			url.username !== "" ||
			url.password !== "" ||
			url.port !== "" ||
			url.pathname !== "/" ||
			url.search !== "" ||
			url.hash !== "" ||
			value !== url.origin
		) {
			return null;
		}
		return { origin: url.origin, hostname: url.hostname };
	} catch {
		return null;
	}
};

const isCanonicalDomain = (value: string) =>
	value === value.trim().toLowerCase() &&
	/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
		value,
	);

const isPasskeyRpForAccount = (rpId: string, accountHostname: string) =>
	isCanonicalDomain(rpId) &&
	(accountHostname === rpId || accountHostname.endsWith(`.${rpId}`));

/**
 * Parses every non-secret origin used by the Auth Worker. Required values and
 * explicitly provided optional values fail closed unless they are canonical,
 * exact HTTPS origins. No production fallback is applied.
 */
export const parseAuthOriginConfig = (
	env: AuthOriginEnv,
): AuthOriginConfigResult => {
	const issues: AuthOriginConfigIssue[] = [];
	const authOrigin = parseCanonicalHttpsOrigin(env.CINAAUTH_URL);
	const accountOrigin = parseCanonicalHttpsOrigin(env.CINAAUTH_ACCOUNT_ORIGIN);
	const adminOrigin = parseCanonicalHttpsOrigin(env.CINAAUTH_ADMIN_ORIGIN);
	const legacyAccountOrigin =
		env.CINAAUTH_LEGACY_ACCOUNT_ORIGIN === undefined
			? null
			: parseCanonicalHttpsOrigin(env.CINAAUTH_LEGACY_ACCOUNT_ORIGIN);
	const oidcDemoValues = [
		env.CINAAUTH_OIDC_DEMO_ENVIRONMENT,
		env.CINAAUTH_OIDC_DEMO_ORIGIN,
		env.CINAAUTH_OIDC_DEMO_CLIENT_ID,
	];
	const hasOidcDemoProfile = oidcDemoValues.some(
		(value) => value !== undefined,
	);
	let oidcDemoProfile: OidcDemoProfile | null = null;
	let hasInvalidOidcDemoProfile = false;
	if (
		hasOidcDemoProfile &&
		oidcDemoValues.every((value) => value !== undefined)
	) {
		try {
			oidcDemoProfile = resolveOidcDemoProfile({
				environment: env.CINAAUTH_OIDC_DEMO_ENVIRONMENT,
				applicationOrigin: env.CINAAUTH_OIDC_DEMO_ORIGIN,
				issuer: env.CINAAUTH_URL,
				accountOrigin: env.CINAAUTH_ACCOUNT_ORIGIN,
				clientId: env.CINAAUTH_OIDC_DEMO_CLIENT_ID,
			});
		} catch {
			hasInvalidOidcDemoProfile = true;
		}
	} else if (hasOidcDemoProfile) {
		hasInvalidOidcDemoProfile = true;
	}
	const cinatokenOrigin = parseCanonicalHttpsOrigin(
		env.CINAAUTH_CINATOKEN_ORIGIN,
	);
	const cinatokenValues = [
		env.CINAAUTH_CINATOKEN_ORIGIN,
		env.CINAAUTH_CINATOKEN_CLIENT_ID,
	];
	const hasCinatokenProfile = cinatokenValues.some(
		(value) => value !== undefined,
	);
	const cinatokenProfile =
		hasCinatokenProfile &&
		cinatokenValues.every((value) => value !== undefined) &&
		cinatokenOrigin &&
		env.CINAAUTH_CINATOKEN_CLIENT_ID === "cinatoken-admin" &&
		/^[a-z0-9][a-z0-9._-]{2,127}$/u.test(env.CINAAUTH_CINATOKEN_CLIENT_ID ?? "")
			? {
					applicationOrigin: cinatokenOrigin.origin,
					clientId: env.CINAAUTH_CINATOKEN_CLIENT_ID!,
				}
			: null;

	if (env.CINAAUTH_URL === undefined) issues.push("missing_cinaauth_url");
	else if (!authOrigin) issues.push("invalid_cinaauth_url");
	if (env.CINAAUTH_ACCOUNT_ORIGIN === undefined) {
		issues.push("missing_cinaauth_account_origin");
	} else if (!accountOrigin) {
		issues.push("invalid_cinaauth_account_origin");
	}
	if (env.CINAAUTH_ADMIN_ORIGIN === undefined) {
		issues.push("missing_cinaauth_admin_origin");
	} else if (!adminOrigin) {
		issues.push("invalid_cinaauth_admin_origin");
	}
	if (env.CINAAUTH_PASSKEY_RP_ID === undefined) {
		issues.push("missing_cinaauth_passkey_rp_id");
	} else if (
		!accountOrigin ||
		!isPasskeyRpForAccount(env.CINAAUTH_PASSKEY_RP_ID, accountOrigin.hostname)
	) {
		issues.push("invalid_cinaauth_passkey_rp_id");
	}
	if (
		env.CINAAUTH_LEGACY_ACCOUNT_ORIGIN !== undefined &&
		!legacyAccountOrigin
	) {
		issues.push("invalid_cinaauth_legacy_account_origin");
	}
	if (hasInvalidOidcDemoProfile) {
		issues.push("invalid_cinaauth_oidc_demo_profile");
	}
	if (hasCinatokenProfile && !cinatokenProfile) {
		issues.push("invalid_cinaauth_cinatoken_profile");
	}
	const configuredOrigins = [
		authOrigin?.origin,
		accountOrigin?.origin,
		adminOrigin?.origin,
		legacyAccountOrigin?.origin,
		oidcDemoProfile?.applicationOrigin,
		cinatokenProfile?.applicationOrigin,
	].filter((origin): origin is string => origin !== undefined);
	if (new Set(configuredOrigins).size !== configuredOrigins.length) {
		issues.push("duplicate_cinaauth_origins");
	}
	if (
		env.CINAAUTH_SIWE_ENABLED === "true" &&
		accountOrigin &&
		(env.CINAAUTH_SIWE_RP_DOMAIN !== accountOrigin.hostname ||
			env.CINAAUTH_SIWE_RP_URI !== accountOrigin.origin)
	) {
		issues.push("invalid_cinaauth_siwe_rp_origin");
	}

	if (issues.length > 0 || !authOrigin || !accountOrigin || !adminOrigin) {
		return { ok: false, issues };
	}

	const trustedOrigins = [
		authOrigin.origin,
		accountOrigin.origin,
		adminOrigin.origin,
		...(legacyAccountOrigin ? [legacyAccountOrigin.origin] : []),
		...(oidcDemoProfile ? [oidcDemoProfile.applicationOrigin] : []),
		...(cinatokenProfile ? [cinatokenProfile.applicationOrigin] : []),
	];

	return {
		ok: true,
		value: {
			authOrigin: authOrigin.origin,
			accountOrigin: accountOrigin.origin,
			adminOrigin: adminOrigin.origin,
			passkeyRpId: env.CINAAUTH_PASSKEY_RP_ID!,
			legacyAccountOrigin: legacyAccountOrigin?.origin ?? null,
			oidcDemoProfile,
			cinatokenProfile,
			trustedOrigins: [...new Set(trustedOrigins)],
			trustedHostnames: [
				...new Set(trustedOrigins.map((origin) => new URL(origin).hostname)),
			],
		},
	};
};

/** Returns validated origins or throws a value-free configuration error. */
export const requireAuthOriginConfig = (
	env: AuthOriginEnv,
): AuthOriginConfig => {
	const result = parseAuthOriginConfig(env);
	if (!result.ok) {
		throw new Error("Invalid Auth Worker origin configuration");
	}
	return result.value;
};

/** Exact CORS/trusted-origin comparison, including scheme and port. */
export const isExactTrustedOrigin = (
	origin: string,
	config: AuthOriginConfig,
) => config.trustedOrigins.includes(origin);
