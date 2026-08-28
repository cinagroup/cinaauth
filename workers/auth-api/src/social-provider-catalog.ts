import type { SocialProviderCatalogId } from "@cinaauth/auth-web-contract";

export type SocialCatalogEntry = {
	/** Public provider id used in capabilities and the namespace registry. */
	id: SocialProviderCatalogId;
	/** cinaauth `socialProviders` option key for this provider. */
	optionKey: string;
	displayName: string;
};

/**
 * Well-known social providers the Admin console can configure at runtime with
 * just a Client ID and Client Secret. `google` and `github` also exist as
 * deploy-time Worker secrets; database rows take precedence over those.
 */
export const SOCIAL_PROVIDER_CATALOG: readonly SocialCatalogEntry[] = [
	{ id: "google", optionKey: "google", displayName: "Google" },
	{ id: "github", optionKey: "github", displayName: "GitHub" },
	{ id: "apple", optionKey: "apple", displayName: "Apple" },
	{ id: "discord", optionKey: "discord", displayName: "Discord" },
	{
		id: "microsoft-entra-id",
		optionKey: "microsoft",
		displayName: "Microsoft Entra ID",
	},
	{ id: "facebook", optionKey: "facebook", displayName: "Facebook" },
	{ id: "twitter", optionKey: "twitter", displayName: "X (Twitter)" },
];

const CATALOG_BY_ID = new Map(
	SOCIAL_PROVIDER_CATALOG.map((entry) => [entry.id, entry]),
);

export const isSocialCatalogId = (id: string): id is SocialProviderCatalogId =>
	CATALOG_BY_ID.has(id as SocialProviderCatalogId);

const CLIENT_CREDENTIAL_MAX_LENGTH = 512;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export const isSocialClientId = (value: unknown): value is string =>
	typeof value === "string" &&
	value.trim().length > 0 &&
	value.length <= CLIENT_CREDENTIAL_MAX_LENGTH &&
	!CONTROL_CHARACTER_PATTERN.test(value);

export const isSocialClientSecret = (value: unknown): value is string =>
	typeof value === "string" &&
	value.trim().length > 0 &&
	value.length <= CLIENT_CREDENTIAL_MAX_LENGTH &&
	!CONTROL_CHARACTER_PATTERN.test(value);

/**
 * Build the cinaauth socialProviders entry for a catalog provider. All catalog
 * providers accept the minimal client credential pair; the callback stays
 * pinned to the account portal origin.
 */
export const buildSocialProviderOption = (
	id: SocialProviderCatalogId,
	clientId: string,
	clientSecret: string,
	accountOrigin: string,
) => ({
	clientId,
	clientSecret,
	// The Accounts UI has one "continue" entry point. A provider callback may
	// therefore create a verified first-time user instead of requiring a
	// separate registration route.
	disableImplicitSignUp: false,
	disableSignUp: false,
	redirectURI: `${accountOrigin}/api/auth/callback/${id}`,
});

type SocialProviderEnv = {
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
	GITHUB_CLIENT_ID?: string;
	GITHUB_CLIENT_SECRET?: string;
};

const hasCredential = (value: string | undefined) =>
	typeof value === "string" && value.trim().length > 0;

/** Builds only fully configured social providers; partial credentials fail closed. */
export const getConfiguredSocialProviders = (
	env: SocialProviderEnv,
	accountOrigin: string,
) => ({
	...(hasCredential(env.GOOGLE_CLIENT_ID) &&
	hasCredential(env.GOOGLE_CLIENT_SECRET)
		? {
				google: buildSocialProviderOption(
					"google",
					env.GOOGLE_CLIENT_ID!,
					env.GOOGLE_CLIENT_SECRET!,
					accountOrigin,
				),
			}
		: {}),
	...(hasCredential(env.GITHUB_CLIENT_ID) &&
	hasCredential(env.GITHUB_CLIENT_SECRET)
		? {
				github: buildSocialProviderOption(
					"github",
					env.GITHUB_CLIENT_ID!,
					env.GITHUB_CLIENT_SECRET!,
					accountOrigin,
				),
			}
		: {}),
});

export const RESERVED_SOCIAL_PROVIDER_CONFIG = {
	clientId: "provider-id-reservation-only",
	clientSecret: "provider-id-reservation-only",
	enabled: false,
} as const;

/**
 * Preserves the production provider-id namespace across credential outages.
 * Disabled placeholders are not usable providers, but their raw option keys
 * keep SSO and SCIM from claiming the well-known Google/GitHub identifiers.
 */
export const getProductionSocialProviders = (
	env: SocialProviderEnv,
	accountOrigin: string,
) => {
	const configured = getConfiguredSocialProviders(env, accountOrigin);
	return {
		google: configured.google ?? RESERVED_SOCIAL_PROVIDER_CONFIG,
		github: configured.github ?? RESERVED_SOCIAL_PROVIDER_CONFIG,
	};
};
