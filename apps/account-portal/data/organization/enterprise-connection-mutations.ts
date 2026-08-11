import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { organizationKeys } from "./keys";

export type SSODomainVerificationRecord = {
	name: string;
	value: string;
};

export type GenerateSCIMTokenParams = {
	providerId: string;
	organizationId: string;
};

type OIDCTokenEndpointAuthentication =
	| "client_secret_basic"
	| "client_secret_post";

type OIDCProviderFields = {
	providerId: string;
	issuer: string;
	domain: string;
	clientId: string;
	clientSecret: string;
	discoveryEndpoint: string;
	authorizationEndpoint: string;
	tokenEndpoint: string;
	jwksEndpoint: string;
	userInfoEndpoint: string;
	scopes: string[];
	pkce: boolean;
	tokenEndpointAuthentication: OIDCTokenEndpointAuthentication;
};

export type RegisterOIDCSSOProviderParams = OIDCProviderFields & {
	organizationId: string;
	skipDiscovery: boolean;
};

export type UpdateOIDCSSOProviderParams = OIDCProviderFields;

type SAMLProviderFields = {
	providerId: string;
	issuer: string;
	domain: string;
	entryPoint: string;
	certificate: string;
	idpMetadataXml: string;
	callbackUrl: string;
	idpInitiatedCallbackUrl: string;
	audience: string;
	wantAssertionsSigned: boolean;
	authnRequestsSigned?: boolean;
};

export type RegisterSAMLSSOProviderParams = SAMLProviderFields & {
	organizationId: string;
};

export type UpdateSAMLSSOProviderParams = SAMLProviderFields;

const getErrorMessage = (error: unknown, fallback: string) => {
	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof error.message === "string" &&
		error.message
	) {
		return error.message;
	}
	return fallback;
};

const getStringField = (value: unknown, field: string): string | null => {
	if (typeof value !== "object" || value === null) return null;
	const record = value as Record<string, unknown>;
	if (typeof record[field] === "string") return record[field];
	return null;
};

const getBooleanField = (value: unknown, field: string): boolean | null => {
	if (typeof value !== "object" || value === null) return null;
	const record = value as Record<string, unknown>;
	if (typeof record[field] === "boolean") return record[field];
	return null;
};

const optionalString = (value: string): string | undefined => {
	const normalized = value.trim();
	return normalized || undefined;
};

const getOIDCConfig = (
	params: OIDCProviderFields,
	options?: { includeRequiredCredentials?: boolean; skipDiscovery?: boolean },
) => ({
	...(options?.includeRequiredCredentials || params.clientId.trim()
		? { clientId: params.clientId.trim() }
		: {}),
	...(options?.includeRequiredCredentials || params.clientSecret
		? { clientSecret: params.clientSecret }
		: {}),
	...(optionalString(params.discoveryEndpoint)
		? { discoveryEndpoint: params.discoveryEndpoint.trim() }
		: {}),
	...(optionalString(params.authorizationEndpoint)
		? { authorizationEndpoint: params.authorizationEndpoint.trim() }
		: {}),
	...(optionalString(params.tokenEndpoint)
		? { tokenEndpoint: params.tokenEndpoint.trim() }
		: {}),
	...(optionalString(params.jwksEndpoint)
		? { jwksEndpoint: params.jwksEndpoint.trim() }
		: {}),
	...(optionalString(params.userInfoEndpoint)
		? { userInfoEndpoint: params.userInfoEndpoint.trim() }
		: {}),
	...(options?.skipDiscovery !== undefined
		? { skipDiscovery: options.skipDiscovery }
		: {}),
	scopes: params.scopes,
	pkce: params.pkce,
	tokenEndpointAuthentication: params.tokenEndpointAuthentication,
});

export async function registerOIDCSSOProvider(
	params: RegisterOIDCSSOProviderParams,
): Promise<void> {
	const { error } = await authClient.$fetch("/sso/register", {
		method: "POST",
		body: {
			providerId: params.providerId,
			issuer: params.issuer,
			domain: params.domain,
			organizationId: params.organizationId,
			oidcConfig: getOIDCConfig(params, {
				includeRequiredCredentials: true,
				skipDiscovery: params.skipDiscovery,
			}),
		},
	});
	if (error) {
		throw new Error(getErrorMessage(error, "Unable to register OIDC provider"));
	}
}

export async function updateOIDCSSOProvider(
	params: UpdateOIDCSSOProviderParams,
): Promise<void> {
	const { error } = await authClient.$fetch("/sso/update-provider", {
		method: "POST",
		body: {
			providerId: params.providerId,
			issuer: params.issuer,
			domain: params.domain,
			oidcConfig: getOIDCConfig(params),
		},
	});
	if (error) {
		throw new Error(getErrorMessage(error, "Unable to update OIDC provider"));
	}
}

const getSAMLConfig = (
	params: SAMLProviderFields,
	options?: { includeSPMetadata?: boolean },
) => ({
	...(optionalString(params.entryPoint)
		? { entryPoint: params.entryPoint.trim() }
		: options?.includeSPMetadata
			? { entryPoint: "" }
			: {}),
	...(params.certificate.trim()
		? { cert: params.certificate.trim() }
		: options?.includeSPMetadata
			? { cert: "" }
			: {}),
	callbackUrl: params.callbackUrl,
	...(optionalString(params.idpInitiatedCallbackUrl)
		? { idpInitiatedCallbackUrl: params.idpInitiatedCallbackUrl.trim() }
		: {}),
	...(optionalString(params.audience)
		? { audience: params.audience.trim() }
		: {}),
	...(params.idpMetadataXml.trim()
		? { idpMetadata: { metadata: params.idpMetadataXml.trim() } }
		: {}),
	...(options?.includeSPMetadata ? { spMetadata: {} } : {}),
	wantAssertionsSigned: params.wantAssertionsSigned,
	authnRequestsSigned: params.authnRequestsSigned ?? false,
});

export async function registerSAMLSSOProvider(
	params: RegisterSAMLSSOProviderParams,
): Promise<void> {
	const { error } = await authClient.$fetch("/sso/register", {
		method: "POST",
		body: {
			providerId: params.providerId,
			issuer: params.issuer,
			domain: params.domain,
			organizationId: params.organizationId,
			samlConfig: getSAMLConfig(params, { includeSPMetadata: true }),
		},
	});
	if (error) {
		throw new Error(getErrorMessage(error, "Unable to register SAML provider"));
	}
}

export async function updateSAMLSSOProvider(
	params: UpdateSAMLSSOProviderParams,
): Promise<void> {
	const { error } = await authClient.$fetch("/sso/update-provider", {
		method: "POST",
		body: {
			providerId: params.providerId,
			issuer: params.issuer,
			domain: params.domain,
			samlConfig: getSAMLConfig(params),
		},
	});
	if (error) {
		throw new Error(getErrorMessage(error, "Unable to update SAML provider"));
	}
}

export async function deleteSSOProvider(providerId: string): Promise<void> {
	const { data, error } = await authClient.$fetch("/sso/delete-provider", {
		method: "POST",
		body: { providerId },
	});
	if (error) {
		throw new Error(getErrorMessage(error, "Unable to delete SSO provider"));
	}
	if (getBooleanField(data, "success") !== true) {
		throw new Error(
			"CinaSeek identity service did not confirm SSO provider deletion",
		);
	}
}

export function getSSODomainVerificationRecords(
	providerId: string,
	domainList: string,
	token: string,
): SSODomainVerificationRecord[] {
	const identifier = `_cinaauth-token-${providerId}`;
	const domains = [
		...new Set(
			domainList
				.split(",")
				.map((domain) => {
					const candidate = domain.trim();
					if (!candidate) return null;
					try {
						const url = new URL(
							candidate.includes("://") ? candidate : `https://${candidate}`,
						);
						return url.hostname.toLowerCase() || null;
					} catch {
						return null;
					}
				})
				.filter((domain): domain is string => domain !== null),
		),
	];

	return domains.map((domain) => ({
		name: `${identifier}.${domain}`,
		value: `${identifier}=${token}`,
	}));
}

export async function requestSSODomainVerification(
	providerId: string,
): Promise<string> {
	const { data, error } = await authClient.$fetch(
		"/sso/request-domain-verification",
		{
			method: "POST",
			body: { providerId },
		},
	);
	if (error) {
		throw new Error(
			getErrorMessage(error, "Unable to request domain verification"),
		);
	}
	const token = getStringField(data, "domainVerificationToken");
	if (!token) {
		throw new Error(
			"CinaSeek identity service did not return domain verification material",
		);
	}
	return token;
}

export async function verifySSODomain(providerId: string): Promise<void> {
	const { error } = await authClient.$fetch("/sso/verify-domain", {
		method: "POST",
		body: { providerId },
	});
	if (error) {
		throw new Error(getErrorMessage(error, "Unable to verify the SSO domain"));
	}
}

export async function generateSCIMToken({
	providerId,
	organizationId,
}: GenerateSCIMTokenParams): Promise<string> {
	const { data, error } = await authClient.$fetch("/scim/generate-token", {
		method: "POST",
		body: { providerId, organizationId },
	});
	if (error) {
		throw new Error(getErrorMessage(error, "Unable to generate a SCIM token"));
	}
	const token = getStringField(data, "scimToken");
	if (!token) {
		throw new Error(
			"CinaSeek identity service did not return the one-time SCIM token",
		);
	}
	return token;
}

export async function revokeSCIMProvider(providerId: string): Promise<void> {
	const { data, error } = await authClient.$fetch(
		"/scim/delete-provider-connection",
		{
			method: "POST",
			body: { providerId },
		},
	);
	if (error) {
		throw new Error(getErrorMessage(error, "Unable to revoke the SCIM token"));
	}
	if (getBooleanField(data, "success") !== true) {
		throw new Error(
			"CinaSeek identity service did not confirm SCIM token revocation",
		);
	}
}

const useEnterpriseMutation = <TVariables, TData>(
	mutationFn: (variables: TVariables) => Promise<TData>,
	fallbackError: string,
) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: organizationKeys.all() });
		},
		onError: (error) => {
			toast.error(error.message || fallbackError);
		},
	});
};

export const useSSODomainVerificationRequestMutation = () =>
	useEnterpriseMutation(
		requestSSODomainVerification,
		"Unable to prepare DNS proof",
	);

export const useSSODomainVerificationMutation = () =>
	useEnterpriseMutation(verifySSODomain, "Unable to verify the SSO domain");

export const useSCIMTokenGenerateMutation = () =>
	useEnterpriseMutation(generateSCIMToken, "Unable to generate a SCIM token");

export const useSCIMProviderRevokeMutation = () =>
	useEnterpriseMutation(revokeSCIMProvider, "Unable to revoke the SCIM token");

export const useOIDCSSOProviderRegisterMutation = () =>
	useEnterpriseMutation(
		registerOIDCSSOProvider,
		"Unable to register OIDC provider",
	);

export const useOIDCSSOProviderUpdateMutation = () =>
	useEnterpriseMutation(
		updateOIDCSSOProvider,
		"Unable to update OIDC provider",
	);

export const useSAMLSSOProviderRegisterMutation = () =>
	useEnterpriseMutation(
		registerSAMLSSOProvider,
		"Unable to register SAML provider",
	);

export const useSAMLSSOProviderUpdateMutation = () =>
	useEnterpriseMutation(
		updateSAMLSSOProvider,
		"Unable to update SAML provider",
	);

export const useSSOProviderDeleteMutation = () =>
	useEnterpriseMutation(deleteSSOProvider, "Unable to delete SSO provider");
