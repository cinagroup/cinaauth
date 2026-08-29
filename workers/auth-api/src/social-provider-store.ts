import type { AuthCapabilities } from "@cinaauth/auth-web-contract";
import type { GenericOAuthConfig } from "cinaauth/plugins/generic-oauth";
import { createDatabase } from "./database";
import type { CloudflareBindings } from "./env";
import {
	genericOAuthRedirectURI,
	isValidGenericOAuthProvider,
	parseProductionGenericOAuthConfig,
} from "./oauth-config";
import {
	buildSocialProviderOption,
	getProductionSocialProviders,
	isSocialCatalogId,
	RESERVED_SOCIAL_PROVIDER_CONFIG,
	SOCIAL_PROVIDER_CATALOG,
} from "./social-provider-catalog";
import { MAX_SOCIAL_PROVIDER_LIMIT } from "./social-sign-in-invariant";

const SOCIAL_CONFIG_CACHE_TTL_MS = 5_000;
const MAX_GENERIC_PROVIDERS = 20;

/** One row of the runtime social provider configuration table. */
export type SocialProviderRow = {
	providerId: string;
	kind: "social" | "generic";
	clientId: string;
	clientSecret: string;
	enabled: boolean;
	config: Record<string, unknown> | null;
};

export type SocialSignInSettings = {
	socialProviderLimit: number;
	emailOtpLoginEnabled: boolean;
	emailPasswordLoginEnabled: boolean;
	passkeyLoginEnabled: boolean;
	siweLoginEnabled: boolean;
	googleOneTapEnabled: boolean;
};

/** Defaults preserve the current public sign-in experience after migration. */
export const DEFAULT_SOCIAL_SIGN_IN_SETTINGS: SocialSignInSettings = {
	socialProviderLimit: MAX_SOCIAL_PROVIDER_LIMIT,
	emailOtpLoginEnabled: true,
	emailPasswordLoginEnabled: false,
	passkeyLoginEnabled: false,
	siweLoginEnabled: true,
	googleOneTapEnabled: false,
};

/** Resolved runtime configuration consumed by the auth instance and capabilities. */
export type SocialSignInRuntimeConfig = {
	socialProviders: ReturnType<typeof getProductionSocialProviders> &
		Record<string, unknown>;
	genericProviders: GenericOAuthConfig[];
	capabilitiesProviders: AuthCapabilities["oauthProviders"];
	socialProviderLimit: number;
	emailOtpLoginEnabled: boolean;
	emailPasswordLoginEnabled: boolean;
	passkeyLoginEnabled: boolean;
	siweLoginEnabled: boolean;
	googleOneTapEnabled: boolean;
	googleOneTapClientId: string | null;
	rows: SocialProviderRow[];
	databaseReady: boolean;
};

type SocialProviderQueryRow = {
	providerId: string;
	kind: "social" | "generic";
	clientId: string;
	clientSecret: string;
	enabled: boolean;
	config: Record<string, unknown> | null;
};

type SocialSettingsQueryRow = {
	socialProviderLimit: number | null;
	emailOtpLoginEnabled: boolean | null;
	emailPasswordLoginEnabled: boolean | null;
	passkeyLoginEnabled: boolean | null;
	siweLoginEnabled: boolean | null;
	googleOneTapEnabled: boolean | null;
};

let socialConfigCache:
	| {
			env: CloudflareBindings;
			accountOrigin: string;
			value: SocialSignInRuntimeConfig;
			checkedAt: number;
	  }
	| undefined;

const warnInvalidRow = (providerId: string, reason: string) => {
	console.warn(
		JSON.stringify({
			level: "warn",
			message: "cinaauth.social_provider.row_rejected",
			providerId,
			reason,
		}),
	);
};

export const readSocialProviderRows = async (
	database: ReturnType<typeof createDatabase>,
): Promise<SocialProviderRow[]> => {
	const result = await database.query<SocialProviderQueryRow>(
		`SELECT "provider_id" AS "providerId", "kind", "client_id" AS "clientId",
			"client_secret" AS "clientSecret", "enabled", "config"
		FROM "cinaauth_social_provider"
		ORDER BY "provider_id"`,
	);
	return result.rows.map((row) => ({
		providerId: row.providerId,
		kind: row.kind,
		clientId: row.clientId,
		clientSecret: row.clientSecret,
		enabled: row.enabled === true,
		config:
			row.config && typeof row.config === "object" && !Array.isArray(row.config)
				? row.config
				: null,
	}));
};

export const readSocialSignInSettings = async (
	database: ReturnType<typeof createDatabase>,
): Promise<SocialSignInSettings> => {
	const result = await database.query<SocialSettingsQueryRow>(
		`SELECT "social_provider_limit" AS "socialProviderLimit",
			"email_otp_login_enabled" AS "emailOtpLoginEnabled",
			"email_password_login_enabled" AS "emailPasswordLoginEnabled",
			"passkey_login_enabled" AS "passkeyLoginEnabled",
			"siwe_login_enabled" AS "siweLoginEnabled",
			"google_one_tap_enabled" AS "googleOneTapEnabled"
		FROM "cinaauth_sign_in_settings"
		WHERE "singleton" = TRUE`,
	);
	const limit = result.rows[0]?.socialProviderLimit;
	return {
		socialProviderLimit:
			typeof limit === "number" &&
			Number.isSafeInteger(limit) &&
			limit >= 0 &&
			limit <= MAX_SOCIAL_PROVIDER_LIMIT
				? limit
				: MAX_SOCIAL_PROVIDER_LIMIT,
		emailOtpLoginEnabled: result.rows[0]?.emailOtpLoginEnabled !== false,
		emailPasswordLoginEnabled:
			result.rows[0]?.emailPasswordLoginEnabled === true,
		passkeyLoginEnabled: result.rows[0]?.passkeyLoginEnabled === true,
		siweLoginEnabled: result.rows[0]?.siweLoginEnabled !== false,
		googleOneTapEnabled: result.rows[0]?.googleOneTapEnabled === true,
	};
};

/** Drop the cached runtime configuration after an admin mutation. */
export const invalidateSocialSignInCache = () => {
	socialConfigCache = undefined;
};

const buildGenericProviderConfig = (
	row: SocialProviderRow,
	accountOrigin: string,
): GenericOAuthConfig | null => {
	const candidate = {
		providerId: row.providerId,
		clientId: row.clientId,
		clientSecret: row.clientSecret,
		redirectURI: genericOAuthRedirectURI(row.providerId, accountOrigin),
		...(row.config ?? {}),
	} as Record<string, unknown>;
	if (!isValidGenericOAuthProvider(candidate, accountOrigin)) {
		warnInvalidRow(row.providerId, "invalid_generic_config");
		return null;
	}
	return candidate as unknown as GenericOAuthConfig;
};

/**
 * Build the effective runtime configuration from database rows and the
 * deploy-time environment. Rows overlay environment credentials; when the
 * configuration store is unreadable the environment keeps serving sign-in
 * exactly as before.
 */
const buildSocialSignInRuntimeConfig = (
	env: CloudflareBindings,
	accountOrigin: string,
	rows: SocialProviderRow[],
	settings: SocialSignInSettings,
	databaseReady: boolean,
): SocialSignInRuntimeConfig => {
	const socialProviders: Record<string, unknown> = {
		...getProductionSocialProviders(env, accountOrigin),
	};
	const socialRowsById = new Map<string, SocialProviderRow>();
	for (const row of rows) {
		if (row.kind !== "social") continue;
		if (!isSocialCatalogId(row.providerId)) {
			warnInvalidRow(row.providerId, "unknown_social_catalog_id");
			continue;
		}
		socialRowsById.set(row.providerId, row);
		const entry = SOCIAL_PROVIDER_CATALOG.find(
			(candidate) => candidate.id === row.providerId,
		);
		if (!entry) continue;
		socialProviders[entry.optionKey] =
			row.enabled && row.clientId && row.clientSecret
				? buildSocialProviderOption(
						row.providerId,
						row.clientId,
						row.clientSecret,
						accountOrigin,
					)
				: RESERVED_SOCIAL_PROVIDER_CONFIG;
	}

	const envGeneric = parseProductionGenericOAuthConfig(
		env.GENERIC_OAUTH_CONFIG,
		accountOrigin,
	);
	const genericById = new Map(
		envGeneric.map((provider) => [provider.providerId, provider]),
	);
	for (const row of rows) {
		if (row.kind !== "generic" || !row.enabled) continue;
		const provider = buildGenericProviderConfig(row, accountOrigin);
		if (!provider) continue;
		genericById.set(row.providerId, provider);
	}
	const genericProviders = [...genericById.values()].slice(
		0,
		MAX_GENERIC_PROVIDERS,
	);

	const capabilitiesProviders: AuthCapabilities["oauthProviders"] = [];
	let googleOneTapClientId: string | null = null;
	for (const entry of SOCIAL_PROVIDER_CATALOG) {
		const row = socialRowsById.get(entry.id);
		const option = socialProviders[entry.optionKey];
		const active =
			row !== undefined
				? row.enabled && Boolean(row.clientId) && Boolean(row.clientSecret)
				: option !== undefined && option !== RESERVED_SOCIAL_PROVIDER_CONFIG;
		if (active) {
			capabilitiesProviders.push({ id: entry.id, type: "social" });
			if (entry.id === "google") {
				googleOneTapClientId = row?.clientId ?? env.GOOGLE_CLIENT_ID ?? null;
			}
		}
	}
	const listedIds = new Set(
		capabilitiesProviders.map((provider) => provider.id),
	);
	for (const provider of genericProviders) {
		if (!listedIds.has(provider.providerId)) {
			capabilitiesProviders.push({
				id: provider.providerId,
				type: "generic-oauth",
			});
		}
	}
	capabilitiesProviders.splice(settings.socialProviderLimit);
	if (
		!capabilitiesProviders.some(
			(provider) => provider.type === "social" && provider.id === "google",
		)
	) {
		// The provider limit is part of the public sign-in policy. Do not leave a
		// callable One Tap endpoint behind when Google is hidden by that policy.
		googleOneTapClientId = null;
	}

	return {
		socialProviders:
			socialProviders as SocialSignInRuntimeConfig["socialProviders"],
		genericProviders,
		capabilitiesProviders,
		socialProviderLimit: settings.socialProviderLimit,
		emailOtpLoginEnabled: settings.emailOtpLoginEnabled,
		emailPasswordLoginEnabled: settings.emailPasswordLoginEnabled,
		passkeyLoginEnabled: settings.passkeyLoginEnabled,
		siweLoginEnabled: settings.siweLoginEnabled,
		googleOneTapEnabled: settings.googleOneTapEnabled,
		googleOneTapClientId,
		rows,
		databaseReady,
	};
};

/** Cached resolver used by request paths; falls back to the environment on failure. */
export const resolveSocialSignInConfig = async (
	env: CloudflareBindings,
	accountOrigin: string,
): Promise<SocialSignInRuntimeConfig> => {
	if (
		socialConfigCache &&
		socialConfigCache.env === env &&
		socialConfigCache.accountOrigin === accountOrigin &&
		Date.now() - socialConfigCache.checkedAt < SOCIAL_CONFIG_CACHE_TTL_MS
	) {
		return socialConfigCache.value;
	}

	let rows: SocialProviderRow[] = [];
	let settings: SocialSignInSettings = DEFAULT_SOCIAL_SIGN_IN_SETTINGS;
	let databaseReady = true;
	try {
		const database = createDatabase(env);
		try {
			[rows, settings] = await Promise.all([
				readSocialProviderRows(database),
				readSocialSignInSettings(database),
			]);
		} finally {
			await database.end().catch(() => undefined);
		}
	} catch {
		databaseReady = false;
	}

	const value = buildSocialSignInRuntimeConfig(
		env,
		accountOrigin,
		rows,
		settings,
		databaseReady,
	);
	socialConfigCache = { env, accountOrigin, value, checkedAt: Date.now() };
	return value;
};
