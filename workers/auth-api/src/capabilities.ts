import type { AuthCapabilities } from "@cinaauth/auth-web-contract";
import { getTurnstileConfig } from "./captcha-config";
import type { DeliveryProviderCapabilities } from "./delivery";
import { isBillingRuntimeReady } from "./entitlements";
import { getPublicGenericOAuthProviders } from "./oauth-config";
import type { SiweRuntimeEnv } from "./siwe-runtime-config";
import { getSiweRuntimeConfig } from "./siwe-runtime-config";
import type { SocialSignInSettings } from "./social-provider-store";
import { DEFAULT_SOCIAL_SIGN_IN_SETTINGS } from "./social-provider-store";

type CapabilitiesEnv = SiweRuntimeEnv & {
	CINAAUTH_ACCOUNT_ORIGIN?: string;
	GENERIC_OAUTH_CONFIG?: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
	GITHUB_CLIENT_ID?: string;
	GITHUB_CLIENT_SECRET?: string;
	CLOUDFLARE_TURNSTILE_SITE_KEY?: string;
	CLOUDFLARE_TURNSTILE_SECRET_KEY?: string;
	STRIPE_SECRET_KEY?: string;
	STRIPE_WEBHOOK_SECRET?: string;
	STRIPE_DEFAULT_PRICE_ID?: string;
	STRIPE_DEFAULT_PLAN_NAME?: string;
	CINAAUTH_ENTITLEMENT_CONFIG?: string;
};

const TURNSTILE_PROVIDER = "cloudflare-turnstile" as const;

const hasCredential = (value: string | undefined) =>
	typeof value === "string" && value.trim().length > 0;

const getPublicOAuthProviders = (
	env: CapabilitiesEnv,
): AuthCapabilities["oauthProviders"] => {
	const providers: AuthCapabilities["oauthProviders"] = [];
	if (
		hasCredential(env.GOOGLE_CLIENT_ID) &&
		hasCredential(env.GOOGLE_CLIENT_SECRET)
	) {
		providers.push({ id: "google", type: "social" });
	}
	if (
		hasCredential(env.GITHUB_CLIENT_ID) &&
		hasCredential(env.GITHUB_CLIENT_SECRET)
	) {
		providers.push({ id: "github", type: "social" });
	}
	const configuredIds = new Set(providers.map((provider) => provider.id));
	providers.push(
		...getPublicGenericOAuthProviders(
			env.GENERIC_OAUTH_CONFIG,
			env.CINAAUTH_ACCOUNT_ORIGIN ?? "",
		).filter((provider) => !configuredIds.has(provider.id)),
	);
	return providers;
};

/** Safe public capability snapshot used to render only configured auth paths. */
export const getAuthCapabilities = (
	env: CapabilitiesEnv,
	delivery: DeliveryProviderCapabilities = { email: false, sms: false },
	oauthProviders: AuthCapabilities["oauthProviders"] = getPublicOAuthProviders(
		env,
	),
	settings: SocialSignInSettings = DEFAULT_SOCIAL_SIGN_IN_SETTINGS,
	googleOneTapClientId: string | null = env.GOOGLE_CLIENT_ID ?? null,
): AuthCapabilities => {
	const turnstile = getTurnstileConfig(env);
	const siwe = getSiweRuntimeConfig(env);
	const googleConfigured = oauthProviders.some(
		(provider) => provider.type === "social" && provider.id === "google",
	);
	const oneTap =
		settings.googleOneTapEnabled &&
		googleConfigured &&
		hasCredential(googleOneTapClientId ?? undefined);

	return {
		version: 5,
		methods: {
			emailPassword: settings.emailPasswordLoginEnabled,
			emailOtp: settings.emailOtpLoginEnabled && delivery.email,
			magicLink: false,
			phoneOtp: delivery.sms,
			username: false,
			passkey: settings.passkeyLoginEnabled,
			anonymous: true,
			twoFactor: true,
			siwe: settings.siweLoginEnabled && siwe.enabled,
			sso: true,
		},
		oauthProviders,
		oneTap,
		oneTapClientId: oneTap ? googleOneTapClientId : null,
		captcha: {
			enabled: turnstile.enabled,
			provider: turnstile.enabled ? TURNSTILE_PROVIDER : null,
			siteKey: turnstile.siteKey,
			action: turnstile.action,
			protectedEndpoints: turnstile.protectedEndpoints,
		},
		billing: isBillingRuntimeReady(env),
	};
};
