const hasAll = (configuredInputs, names) =>
	names.every((name) => configuredInputs.has(name));

export const evaluateRuntimeCapabilities = ({
	configuredInputs,
	capabilities,
}) => {
	const failures = [];
	const hasProvider = (id, type) =>
		Array.isArray(capabilities.oauthProviders) &&
		capabilities.oauthProviders.some(
			(provider) => provider?.id === id && provider?.type === type,
		);
	if (
		hasAll(configuredInputs, ["GOOGLE_CLIENT_ID"]) &&
		capabilities.oneTap !== true
	) {
		failures.push(
			"GOOGLE_CLIENT_ID is configured but the live capabilities endpoint does not enable One Tap",
		);
	}
	if (
		hasAll(configuredInputs, ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]) &&
		!hasProvider("google", "social")
	) {
		failures.push(
			"Google social credentials are configured but the live capability is disabled",
		);
	}
	if (
		hasAll(configuredInputs, ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"]) &&
		!hasProvider("github", "social")
	) {
		failures.push(
			"GitHub social credentials are configured but the live capability is disabled",
		);
	}
	if (
		hasAll(configuredInputs, ["GENERIC_OAUTH_CONFIG"]) &&
		(!Array.isArray(capabilities.oauthProviders) ||
			!capabilities.oauthProviders.some(
				(provider) => provider?.type === "generic-oauth",
			))
	) {
		failures.push(
			"GENERIC_OAUTH_CONFIG is configured but the live capabilities endpoint exposes no valid providers",
		);
	}
	if (
		hasAll(configuredInputs, [
			"CLOUDFLARE_TURNSTILE_SITE_KEY",
			"CLOUDFLARE_TURNSTILE_SECRET_KEY",
		]) &&
		capabilities.captcha?.enabled !== true
	) {
		failures.push(
			"Turnstile secrets are configured but the live captcha capability is disabled",
		);
	}
	if (
		hasAll(configuredInputs, [
			"STRIPE_SECRET_KEY",
			"STRIPE_WEBHOOK_SECRET",
			"STRIPE_DEFAULT_PRICE_ID",
			"CINAAUTH_ENTITLEMENT_CONFIG",
		]) &&
		capabilities.billing !== true
	) {
		failures.push(
			"Stripe billing inputs are configured but the live billing capability is disabled",
		);
	}
	return failures;
};

export const evaluateDeliveryCapabilityParity = ({
	capabilities,
	providers,
}) => {
	const failures = [];
	if (capabilities.methods?.emailOtp !== providers.email) {
		failures.push(
			"Live Email OTP capability does not match Delivery Worker readiness",
		);
	}
	if (capabilities.methods?.magicLink !== providers.email) {
		failures.push(
			"Live magic-link capability does not match Delivery Worker readiness",
		);
	}
	if (capabilities.methods?.phoneOtp !== providers.sms) {
		failures.push(
			"Live phone OTP capability does not match Delivery Worker readiness",
		);
	}
	return failures;
};
