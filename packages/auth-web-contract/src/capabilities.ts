/**
 * Native social providers the Auth Worker can configure at runtime through the
 * Admin social-provider control plane. Login surfaces mirror this catalog to
 * decide which well-known social identifiers they accept.
 */
export const SOCIAL_PROVIDER_CATALOG_IDS = [
	"google",
	"github",
	"apple",
	"discord",
	"microsoft-entra-id",
	"facebook",
	"twitter",
] as const;

export type SocialProviderCatalogId =
	(typeof SOCIAL_PROVIDER_CATALOG_IDS)[number];

/** Public, secret-free runtime capabilities advertised by the Auth Worker. */
export type AuthCapabilities = {
	version: 5;
	methods: {
		emailPassword: boolean;
		emailOtp: boolean;
		magicLink: boolean;
		phoneOtp: boolean;
		username: boolean;
		passkey: boolean;
		anonymous: boolean;
		twoFactor: boolean;
		siwe: boolean;
		sso: boolean;
	};
	oauthProviders: Array<
		| {
				id: string;
				type: "generic-oauth";
		  }
		| {
				id: SocialProviderCatalogId;
				type: "social";
		  }
	>;
	oneTap: boolean;
	/** Public Google OAuth client id used only to initialize Google Identity Services. */
	oneTapClientId: string | null;
	captcha: {
		enabled: boolean;
		provider: "cloudflare-turnstile" | null;
		siteKey: string | null;
		action: string | null;
		protectedEndpoints: string[];
	};
	billing: boolean;
};
