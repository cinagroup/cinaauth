import type { AuthCapabilities } from "@cinaauth/auth-web-contract";
import { SOCIAL_PROVIDER_CATALOG_IDS } from "@cinaauth/auth-web-contract";
import { resolveAuthClientBaseURL } from "./auth-api";

export const AUTH_CAPABILITIES_QUERY_KEY = ["auth-capabilities"] as const;

const SOCIAL_PROVIDER_ID_ALLOWLIST = new Set<string>(
	SOCIAL_PROVIDER_CATALOG_IDS,
);

export const CORE_AUTH_CAPABILITIES: AuthCapabilities = {
	version: 4,
	methods: {
		emailPassword: false,
		emailOtp: false,
		magicLink: false,
		phoneOtp: false,
		username: false,
		passkey: true,
		anonymous: true,
		twoFactor: true,
		siwe: false,
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
		return (
			typeof provider.id === "string" &&
			SOCIAL_PROVIDER_ID_ALLOWLIST.has(provider.id)
		);
	}
	return (
		provider.type === "generic-oauth" &&
		typeof provider.id === "string" &&
		/^[a-zA-Z0-9._-]{1,64}$/.test(provider.id)
	);
};

const AUTH_METHOD_KEYS = [
	"emailPassword",
	"emailOtp",
	"magicLink",
	"phoneOtp",
	"username",
	"passkey",
	"anonymous",
	"twoFactor",
	"siwe",
	"sso",
] as const;

/** Rejects incomplete transport payloads before they can relax client controls. */
export const isAuthCapabilitiesSnapshot = (
	value: unknown,
): value is AuthCapabilities => {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Record<string, unknown>;
	if (candidate.version !== 4 || typeof candidate.billing !== "boolean") {
		return false;
	}
	if (typeof candidate.oneTap !== "boolean") return false;
	if (
		!Array.isArray(candidate.oauthProviders) ||
		!candidate.oauthProviders.every(isPublicProvider)
	) {
		return false;
	}

	if (!candidate.methods || typeof candidate.methods !== "object") return false;
	const methods = candidate.methods as Record<string, unknown>;
	if (!AUTH_METHOD_KEYS.every((key) => typeof methods[key] === "boolean")) {
		return false;
	}

	if (!candidate.captcha || typeof candidate.captcha !== "object") return false;
	const captcha = candidate.captcha as Record<string, unknown>;
	if (
		typeof captcha.enabled !== "boolean" ||
		!(
			captcha.provider === null || captcha.provider === "cloudflare-turnstile"
		) ||
		!(captcha.siteKey === null || typeof captcha.siteKey === "string") ||
		!(captcha.action === null || typeof captcha.action === "string") ||
		!Array.isArray(captcha.protectedEndpoints) ||
		!captcha.protectedEndpoints.every(
			(path) =>
				typeof path === "string" && path.startsWith("/") && path.length <= 128,
		)
	) {
		return false;
	}
	return (
		captcha.enabled === false ||
		(captcha.provider === "cloudflare-turnstile" &&
			typeof captcha.siteKey === "string" &&
			captcha.siteKey.trim().length > 0 &&
			captcha.siteKey.length <= 256 &&
			typeof captcha.action === "string" &&
			/^[a-zA-Z0-9_-]{1,32}$/.test(captcha.action) &&
			captcha.protectedEndpoints.length > 0)
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
			emailPassword: false,
			emailOtp: methods.emailOtp === true,
			magicLink: false,
			phoneOtp: methods.phoneOtp === true,
			username: false,
			siwe: methods.siwe === true,
		},
		oauthProviders: providers,
		oneTap: false,
		captcha: normalizeCaptcha(candidate.captcha),
		billing: candidate.billing === true,
	};
};

export const getCaptchaRequestHeaders = (token: string | null) =>
	token ? { "x-captcha-response": token } : undefined;

export const isCaptchaEndpointProtected = (
	capabilities: AuthCapabilities | undefined,
	endpoint: string,
) =>
	capabilities?.captcha.enabled === true &&
	capabilities.captcha.protectedEndpoints.includes(endpoint);

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
