import type { SCIMProviderConnection, SSOProviderSummary } from "./auth";

export type ProviderEditorMode = "create" | "edit";
export type SAMLConfigurationMode = "keep" | "metadata" | "manual";

export type ProviderDraft = {
	type: "oidc" | "saml";
	providerId: string;
	issuer: string;
	domain: string;
	clientId: string;
	clientSecret: string;
	discoveryEndpoint: string;
	manualOIDC: boolean;
	authorizationEndpoint: string;
	tokenEndpoint: string;
	jwksEndpoint: string;
	userInfoEndpoint: string;
	scopes: string;
	pkce: boolean;
	tokenEndpointAuthentication: "client_secret_basic" | "client_secret_post";
	samlMode: SAMLConfigurationMode;
	entryPoint: string;
	certificate: string;
	idpMetadataXml: string;
	idpInitiatedCallbackUrl: string;
	audience: string;
	wantAssertionsSigned: boolean;
	authnRequestsSigned: boolean;
};

const AUTH_BASE_URL = "https://auth.cinaseek.ai/api/auth";
const MAX_SAML_METADATA_BYTES = 100 * 1024;
const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export const createEmptySSOProviderDraft = (): ProviderDraft => ({
	type: "oidc",
	providerId: "",
	issuer: "",
	domain: "",
	clientId: "",
	clientSecret: "",
	discoveryEndpoint: "",
	manualOIDC: false,
	authorizationEndpoint: "",
	tokenEndpoint: "",
	jwksEndpoint: "",
	userInfoEndpoint: "",
	scopes: "openid profile email",
	pkce: true,
	tokenEndpointAuthentication: "client_secret_basic",
	samlMode: "metadata",
	entryPoint: "",
	certificate: "",
	idpMetadataXml: "",
	idpInitiatedCallbackUrl: "/dashboard",
	audience: "",
	wantAssertionsSigned: true,
	authnRequestsSigned: false,
});

export const createEditSSOProviderDraft = (
	provider: SSOProviderSummary,
): ProviderDraft => ({
	...createEmptySSOProviderDraft(),
	type: provider.type,
	providerId: provider.providerId,
	issuer: provider.issuer,
	domain: provider.domain,
	discoveryEndpoint: provider.oidcConfig?.discoveryEndpoint ?? "",
	manualOIDC: false,
	authorizationEndpoint: provider.oidcConfig?.authorizationEndpoint ?? "",
	tokenEndpoint: provider.oidcConfig?.tokenEndpoint ?? "",
	jwksEndpoint: provider.oidcConfig?.jwksEndpoint ?? "",
	userInfoEndpoint: provider.oidcConfig?.userInfoEndpoint ?? "",
	scopes: (provider.oidcConfig?.scopes ?? ["openid", "profile", "email"]).join(
		" ",
	),
	pkce: provider.oidcConfig?.pkce ?? true,
	tokenEndpointAuthentication:
		provider.oidcConfig?.tokenEndpointAuthentication ?? "client_secret_basic",
	samlMode: "keep",
	entryPoint: provider.samlConfig?.entryPoint ?? "",
	idpInitiatedCallbackUrl:
		provider.samlConfig?.idpInitiatedCallbackUrl ?? "/dashboard",
	audience: provider.samlConfig?.audience ?? "",
	wantAssertionsSigned: provider.samlConfig?.wantAssertionsSigned ?? true,
	authnRequestsSigned: provider.samlConfig?.authnRequestsSigned ?? false,
});

const isSecureURL = (value: string): boolean => {
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
};

export const parseSSOScopes = (value: string): string[] => [
	...new Set(
		value
			.split(/[\s,]+/)
			.map((scope) => scope.trim())
			.filter(Boolean),
	),
];

const domainsAreValid = (value: string): boolean => {
	const domains = value
		.split(",")
		.map((domain) => domain.trim().toLowerCase())
		.filter(Boolean);
	return (
		domains.length > 0 &&
		domains.every(
			(domain) =>
				/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain) &&
				!domain.includes(".."),
		)
	);
};

export const getSSOProviderDraftError = ({
	draft,
	mode,
	providers,
	scimProviders,
}: {
	draft: ProviderDraft;
	mode: ProviderEditorMode;
	providers: SSOProviderSummary[];
	scimProviders: SCIMProviderConnection[];
}): string | null => {
	const providerId = draft.providerId.trim().toLowerCase();
	if (!providerId) return "Enter a stable provider ID.";
	if (providerId.length > 64)
		return "Provider ID must be 64 characters or less.";
	if (!PROVIDER_ID_PATTERN.test(providerId)) {
		return "Provider ID may contain lowercase letters, numbers, hyphens, and underscores.";
	}
	if (
		mode === "create" &&
		(providers.some((provider) => provider.providerId === providerId) ||
			scimProviders.some((provider) => provider.providerId === providerId))
	) {
		return "That provider ID is already in use.";
	}
	if (!isSecureURL(draft.issuer.trim())) return "Issuer must be an HTTPS URL.";
	if (!domainsAreValid(draft.domain)) {
		return "Enter one or more email domains separated by commas, without paths or schemes.";
	}

	if (draft.type === "oidc") {
		if (mode === "create" && !draft.clientId.trim()) {
			return "OIDC client ID is required.";
		}
		if (mode === "create" && !draft.clientSecret) {
			return "OIDC client secret is required.";
		}
		if (
			mode === "edit" &&
			Boolean(draft.clientId.trim()) !== Boolean(draft.clientSecret)
		) {
			return "Enter both replacement client ID and client secret, or leave both blank.";
		}
		const scopes = parseSSOScopes(draft.scopes);
		if (!scopes.includes("openid")) return "OIDC scopes must include openid.";
		for (const optionalURL of [
			draft.discoveryEndpoint,
			draft.authorizationEndpoint,
			draft.tokenEndpoint,
			draft.jwksEndpoint,
			draft.userInfoEndpoint,
		]) {
			if (optionalURL.trim() && !isSecureURL(optionalURL.trim())) {
				return "All configured OIDC endpoints must use HTTPS.";
			}
		}
		if (
			draft.manualOIDC &&
			(!draft.authorizationEndpoint.trim() ||
				!draft.tokenEndpoint.trim() ||
				!draft.jwksEndpoint.trim())
		) {
			return "Manual OIDC configuration requires authorization, token, and JWKS endpoints.";
		}
		return null;
	}

	if (draft.samlMode === "metadata") {
		if (!draft.idpMetadataXml.trim()) return "Paste the IdP metadata XML.";
		if (
			new TextEncoder().encode(draft.idpMetadataXml).length >
			MAX_SAML_METADATA_BYTES
		) {
			return "IdP metadata must not exceed 100 KiB.";
		}
	}
	if (draft.samlMode === "manual") {
		if (!isSecureURL(draft.entryPoint.trim())) {
			return "SAML entry point must be an HTTPS URL.";
		}
		if (!draft.certificate.trim()) return "Paste the IdP signing certificate.";
	}
	if (
		draft.idpInitiatedCallbackUrl.trim() &&
		!draft.idpInitiatedCallbackUrl.startsWith("/") &&
		!isSecureURL(draft.idpInitiatedCallbackUrl.trim())
	) {
		return "IdP-initiated fallback must be a same-origin path or HTTPS URL.";
	}
	return null;
};

export const getOIDCCallbackURL = (providerId: string) =>
	`${AUTH_BASE_URL}/sso/callback/${encodeURIComponent(providerId)}`;

export const getSAMLCallbackURL = (providerId: string) =>
	`${AUTH_BASE_URL}/sso/saml2/sp/acs/${encodeURIComponent(providerId)}`;

export const getSAMLMetadataURL = (providerId: string) =>
	`${AUTH_BASE_URL}/sso/saml2/sp/metadata?providerId=${encodeURIComponent(providerId)}`;
