import type { GenericOAuthConfig } from "cinaauth/plugins/generic-oauth";

const ACCOUNT_ORIGIN = "https://accounts.cinaseek.ai";
const PROVIDER_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const MAX_PROVIDERS = 20;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
	typeof value === "string" && value.trim().length > 0;

const isOptionalBoolean = (value: unknown) =>
	value === undefined || typeof value === "boolean";

const isOptionalStringRecord = (value: unknown) =>
	value === undefined ||
	(isRecord(value) && Object.values(value).every(isNonEmptyString));

const isHttpsUrl = (value: unknown) => {
	if (!isNonEmptyString(value)) return false;
	try {
		const url = new URL(value);
		return url.protocol === "https:" && !url.username && !url.password;
	} catch {
		return false;
	}
};

export const genericOAuthRedirectURI = (providerId: string) =>
	`${ACCOUNT_ORIGIN}/api/auth/oauth2/callback/${providerId}`;

const isValidProvider = (provider: Record<string, unknown>) => {
	const providerId = provider.providerId;
	if (
		!isNonEmptyString(providerId) ||
		!PROVIDER_ID_PATTERN.test(providerId) ||
		!isNonEmptyString(provider.clientId) ||
		provider.redirectURI !== genericOAuthRedirectURI(providerId)
	) {
		return false;
	}
	if (
		provider.clientSecret !== undefined &&
		!isNonEmptyString(provider.clientSecret)
	) {
		return false;
	}
	if (
		provider.scopes !== undefined &&
		(!Array.isArray(provider.scopes) ||
			!provider.scopes.every(isNonEmptyString) ||
			new Set(provider.scopes).size !== provider.scopes.length)
	) {
		return false;
	}
	if (provider.issuer !== undefined && !isHttpsUrl(provider.issuer))
		return false;
	if (!isOptionalBoolean(provider.requireIssuerValidation)) return false;
	if (!isOptionalBoolean(provider.pkce)) return false;
	if (!isOptionalBoolean(provider.disableImplicitSignUp)) return false;
	if (!isOptionalBoolean(provider.disableSignUp)) return false;
	if (!isOptionalBoolean(provider.overrideUserInfo)) return false;
	if (provider.responseType !== undefined && provider.responseType !== "code") {
		return false;
	}
	if (
		provider.responseMode !== undefined &&
		provider.responseMode !== "query" &&
		provider.responseMode !== "form_post"
	) {
		return false;
	}
	if (
		provider.authentication !== undefined &&
		provider.authentication !== "basic" &&
		provider.authentication !== "post"
	) {
		return false;
	}
	if (
		provider.accessType !== undefined &&
		!isNonEmptyString(provider.accessType)
	) {
		return false;
	}
	if (
		provider.accessTokenExpiresIn !== undefined &&
		(!Number.isSafeInteger(provider.accessTokenExpiresIn) ||
			(provider.accessTokenExpiresIn as number) <= 0)
	) {
		return false;
	}
	if (
		!isOptionalStringRecord(provider.authorizationUrlParams) ||
		!isOptionalStringRecord(provider.tokenUrlParams) ||
		!isOptionalStringRecord(provider.discoveryHeaders) ||
		!isOptionalStringRecord(provider.authorizationHeaders)
	) {
		return false;
	}
	const prompts = new Set([
		"none",
		"login",
		"create",
		"consent",
		"select_account",
		"select_account consent",
		"login consent",
	]);
	if (
		provider.prompt !== undefined &&
		!prompts.has(provider.prompt as string)
	) {
		return false;
	}

	const hasDiscovery = isHttpsUrl(provider.discoveryUrl);
	const hasExplicitEndpoints =
		isHttpsUrl(provider.authorizationUrl) &&
		isHttpsUrl(provider.tokenUrl) &&
		isHttpsUrl(provider.userInfoUrl);
	if (!hasDiscovery && !hasExplicitEndpoints) return false;
	if (
		provider.requireIssuerValidation === true &&
		provider.issuer === undefined &&
		!hasDiscovery
	) {
		return false;
	}
	return isNonEmptyString(provider.clientSecret) || provider.pkce === true;
};

/**
 * Parse the production Generic OAuth configuration without leaking its client
 * secrets. Every callback is pinned to the account portal so state and session
 * cookies remain on the relying-party origin when requests use Service Binding.
 */
export const parseProductionGenericOAuthConfig = (
	raw: string | undefined,
): GenericOAuthConfig[] => {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (
			!Array.isArray(parsed) ||
			parsed.length === 0 ||
			parsed.length > MAX_PROVIDERS
		) {
			return [];
		}
		const ids = new Set<string>();
		for (const value of parsed) {
			if (!isRecord(value) || !isValidProvider(value)) return [];
			const providerId = value.providerId as string;
			if (ids.has(providerId)) return [];
			ids.add(providerId);
		}
		return parsed as GenericOAuthConfig[];
	} catch {
		return [];
	}
};

export const getPublicGenericOAuthProviders = (raw: string | undefined) =>
	parseProductionGenericOAuthConfig(raw).map(({ providerId }) => ({
		id: providerId,
		type: "generic-oauth" as const,
	}));
