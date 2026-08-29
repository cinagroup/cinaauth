import {
	ADMIN_OIDC_CLIENT_ID,
	ADMIN_OIDC_ORIGIN,
} from "@cinaauth/auth-web-contract";

export interface OAuthConsentScope {
	scope: string;
	label: string;
	description?: string;
}

type OAuthConsentScopeMetadata = Omit<OAuthConsentScope, "scope">;

export type OAuthConsentSearchParams = Record<
	string,
	string | string[] | undefined
>;

const oauthConsentScopeMetadata = {
	openid: {
		label: "Verify your identity",
		description: "Access your unique CinaSeek account identifier.",
	},
	profile: {
		label: "Read your profile",
		description: "Read your name and profile picture.",
	},
	email: {
		label: "Read your email address",
		description: "Read your email address and whether it is verified.",
	},
	offline_access: {
		label: "Maintain access",
		description:
			"Access your authorized data when you are not actively using the application.",
	},
	"read:organization": {
		label: "Read your organization",
		description: "Read information about your active CinaSeek organization.",
	},
} satisfies Readonly<Record<string, OAuthConsentScopeMetadata>>;

function readOAuthConsentScopeMetadata(
	scope: string,
): OAuthConsentScopeMetadata | undefined {
	if (!Object.hasOwn(oauthConsentScopeMetadata, scope)) {
		return undefined;
	}

	return oauthConsentScopeMetadata[
		scope as keyof typeof oauthConsentScopeMetadata
	];
}

/**
 * Resolves every requested OAuth scope into user-visible consent metadata.
 * Unknown scopes remain visible using their original token as the label.
 */
export function resolveOAuthConsentScopes(
	value: string | null | undefined,
): OAuthConsentScope[] {
	const scopes = Array.from(
		new Set((value ?? "").split(/\s+/).filter(Boolean)),
	);

	return scopes.map((scope) => {
		const metadata = readOAuthConsentScopeMetadata(scope);

		return metadata ? { scope, ...metadata } : { scope, label: scope };
	});
}

/** Preserves the complete Worker-issued consent query across reauthentication. */
export function buildOAuthConsentSignInPath(
	searchParams: OAuthConsentSearchParams,
) {
	const params = new URLSearchParams();
	for (const [name, value] of Object.entries(searchParams)) {
		if (Array.isArray(value)) {
			for (const entry of value) params.append(name, entry);
		} else if (value !== undefined) {
			params.append(name, value);
		}
	}
	return `/sign-in?${params.toString()}`;
}

/** Produces a local, non-network client mark for the consent screen. */
export function getOAuthClientMonogram(clientName: string) {
	return Array.from(clientName.trim())[0]?.toLocaleUpperCase() ?? "A";
}

/** Identifies first-party clients whose ownership is defined by the shared Auth contract. */
export function isOfficialCinaSeekOAuthClient(clientId: string) {
	return clientId === ADMIN_OIDC_CLIENT_ID;
}

/** Returns a trusted return host for contract-defined first-party clients. */
export function getOfficialCinaSeekOAuthClientReturnHost(clientId: string) {
	if (clientId !== ADMIN_OIDC_CLIENT_ID) return undefined;
	return new URL(ADMIN_OIDC_ORIGIN).host;
}
