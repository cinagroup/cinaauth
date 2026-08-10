import type { AuthCapabilities } from "@cinaauth/auth-web-contract";
import { resolveAuthClientBaseURL } from "./auth-api";

export const CORE_AUTH_CAPABILITIES: AuthCapabilities = {
	version: 4,
	methods: {
		emailPassword: true,
		emailOtp: false,
		magicLink: false,
		phoneOtp: false,
		username: true,
		passkey: true,
		anonymous: true,
		twoFactor: true,
		siwe: true,
		sso: true,
	},
	oauthProviders: [],
	oneTap: false,
	captcha: {
		enabled: false,
		provider: null,
		siteKey: null,
		action: null,
		protectedEndpoints: [],
	},
	billing: false,
};

type CapabilityFetcher = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

const isPublicProvider = (
	value: unknown,
): value is AuthCapabilities["oauthProviders"][number] => {
	if (!value || typeof value !== "object") return false;
	const provider = value as Record<string, unknown>;
	if (provider.type === "social") {
		return provider.id === "google" || provider.id === "github";
	}
	return (
		provider.type === "generic-oauth" &&
		typeof provider.id === "string" &&
		/^[a-zA-Z0-9._-]{1,64}$/.test(provider.id)
	);
};

const normalizeCaptcha = (value: unknown): AuthCapabilities["captcha"] => {
	if (!value || typeof value !== "object") {
		return CORE_AUTH_CAPABILITIES.captcha;
	}
	const candidate = value as Record<string, unknown>;
	const siteKey =
		typeof candidate.siteKey === "string" &&
		candidate.siteKey.trim().length > 0 &&
		candidate.siteKey.length <= 256
			? candidate.siteKey.trim()
			: null;
	const action =
		typeof candidate.action === "string" &&
		/^[a-zA-Z0-9_-]{1,32}$/.test(candidate.action)
			? candidate.action
			: null;
	const protectedEndpoints = Array.isArray(candidate.protectedEndpoints)
		? candidate.protectedEndpoints.filter(
				(value): value is string =>
					typeof value === "string" &&
					value.startsWith("/") &&
					value.length <= 128,
			)
		: [];
	const enabled =
		candidate.enabled === true &&
		candidate.provider === "cloudflare-turnstile" &&
		Boolean(siteKey && action && protectedEndpoints.length > 0);

	return enabled
		? {
				enabled: true,
				provider: "cloudflare-turnstile",
				siteKey,
				action,
				protectedEndpoints,
			}
		: CORE_AUTH_CAPABILITIES.captcha;
};

const normalizeCapabilities = (value: unknown): AuthCapabilities => {
	if (!value || typeof value !== "object") return CORE_AUTH_CAPABILITIES;
	const candidate = value as Record<string, unknown>;
	const providers = Array.isArray(candidate.oauthProviders)
		? candidate.oauthProviders.filter(isPublicProvider)
		: [];
	const methods =
		candidate.methods && typeof candidate.methods === "object"
			? (candidate.methods as Record<string, unknown>)
			: {};
	return {
		...CORE_AUTH_CAPABILITIES,
		methods: {
			...CORE_AUTH_CAPABILITIES.methods,
			emailOtp: methods.emailOtp === true,
			magicLink: methods.magicLink === true,
			phoneOtp: methods.phoneOtp === true,
		},
		oauthProviders: providers,
		oneTap: candidate.oneTap === true,
		captcha: normalizeCaptcha(candidate.captcha),
		billing: candidate.billing === true,
	};
};

export const getCaptchaRequestHeaders = (token: string | null) =>
	token ? { "x-captcha-response": token } : undefined;

export const isOneTapClientReady = (
	capabilities: AuthCapabilities | undefined,
	clientId: string | undefined,
) =>
	capabilities?.oneTap === true &&
	typeof clientId === "string" &&
	clientId.trim().length > 0 &&
	clientId.length <= 512;

export const fetchAuthCapabilities = async (
	fetcher: CapabilityFetcher = fetch,
	baseURL = resolveAuthClientBaseURL(
		typeof window === "undefined" ? undefined : window.location.origin,
	),
): Promise<AuthCapabilities> => {
	try {
		const url = new URL("/api/auth/capabilities", baseURL);
		const response = await fetcher(url.toString(), {
			method: "GET",
			credentials: "include",
			cache: "no-store",
			headers: { Accept: "application/json" },
		});
		if (!response.ok) return CORE_AUTH_CAPABILITIES;
		return normalizeCapabilities(await response.json());
	} catch {
		return CORE_AUTH_CAPABILITIES;
	}
};

export const formatOAuthProviderName = (providerId: string) =>
	providerId
		.split(/[-_.]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
