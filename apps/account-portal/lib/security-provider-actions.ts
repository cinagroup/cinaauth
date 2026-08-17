import type { SocialProviderCatalogId } from "@cinaauth/auth-web-contract";
import type { SecurityOAuthProvider } from "./security-center";

const SECURITY_PROVIDER_LINK_CALLBACK_URL = "/dashboard/security";
const SECURITY_PROVIDER_LINK_ERROR_CALLBACK_URL =
	"/dashboard/security?link=failed";

type ProviderLinkResult = {
	data?: { url?: string | null } | null;
	error?: unknown;
};

type SecurityProviderLinkClient = {
	linkSocial: (input: {
		provider: SocialProviderCatalogId;
		callbackURL: string;
		errorCallbackURL: string;
		disableRedirect: boolean;
	}) => Promise<ProviderLinkResult>;
	oauth2: {
		link: (input: {
			providerId: string;
			callbackURL: string;
			errorCallbackURL: string;
		}) => Promise<ProviderLinkResult>;
	};
};

/** Start account linking with the endpoint that owns the advertised provider. */
export const getSecurityProviderLinkURL = async (
	client: SecurityProviderLinkClient,
	provider: SecurityOAuthProvider,
) => {
	const result =
		provider.type === "social"
			? await client.linkSocial({
					provider: provider.id,
					callbackURL: SECURITY_PROVIDER_LINK_CALLBACK_URL,
					errorCallbackURL: SECURITY_PROVIDER_LINK_ERROR_CALLBACK_URL,
					disableRedirect: true,
				})
			: await client.oauth2.link({
					providerId: provider.id,
					callbackURL: SECURITY_PROVIDER_LINK_CALLBACK_URL,
					errorCallbackURL: SECURITY_PROVIDER_LINK_ERROR_CALLBACK_URL,
				});

	if (result.error) throw result.error;
	if (!result.data?.url) {
		throw new Error("Provider did not return a link URL");
	}
	return result.data.url;
};
