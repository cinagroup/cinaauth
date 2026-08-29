export const TURNSTILE_ACTION = "cinaauth";

export const TURNSTILE_PROTECTED_ENDPOINTS = [
	"/sign-in/email",
	"/phone-number/send-otp",
	"/phone-number/request-password-reset",
] as const;

type TurnstileEnv = {
	CLOUDFLARE_TURNSTILE_SITE_KEY?: string;
	CLOUDFLARE_TURNSTILE_SECRET_KEY?: string;
};

const nonEmpty = (value: string | undefined) => value?.trim() || undefined;

/**
 * Returns the public Turnstile settings only when both halves of the
 * configuration are present. This keeps auth usable during rolling deploys
 * where the site key and secret may not arrive at exactly the same time.
 */
export const getTurnstileConfig = (env: TurnstileEnv) => {
	const siteKey = nonEmpty(env.CLOUDFLARE_TURNSTILE_SITE_KEY);
	const secretKey = nonEmpty(env.CLOUDFLARE_TURNSTILE_SECRET_KEY);
	if (!siteKey || !secretKey) {
		return {
			enabled: false as const,
			siteKey: null,
			secretKey: null,
			action: null,
			protectedEndpoints: [],
		};
	}

	return {
		enabled: true as const,
		siteKey,
		secretKey,
		action: TURNSTILE_ACTION,
		protectedEndpoints: [...TURNSTILE_PROTECTED_ENDPOINTS],
	};
};
