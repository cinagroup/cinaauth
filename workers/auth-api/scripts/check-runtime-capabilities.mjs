const hasAll = (configuredInputs, names) =>
	names.every((name) => configuredInputs.has(name));

export const evaluateRuntimeCapabilities = ({
	configuredInputs,
	configuredValues = {},
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
	if (Object.hasOwn(configuredValues, "CINAAUTH_SIWE_ENABLED")) {
		const expectedSiwe = configuredValues.CINAAUTH_SIWE_ENABLED === "true";
		if (capabilities.methods?.siwe !== expectedSiwe) {
			failures.push(
				"Live SIWE capability does not match the tracked SIWE kill switch",
			);
		}
	}
	return failures;
};

export const evaluateDeliveryCapabilityParity = ({
	capabilities,
	providers,
}) => {
	const failures = [];
	if (providers.email !== true || capabilities.methods?.emailOtp !== true) {
		failures.push(
			"Production Email OTP requires an active Delivery Worker email provider and methods.emailOtp=true",
		);
	}
	if (capabilities.methods?.emailPassword !== false) {
		failures.push(
			"Live email-password capability must remain disabled for passwordless email authentication",
		);
	}
	if (capabilities.methods?.magicLink !== false) {
		failures.push(
			"Live magic-link capability must remain disabled for OTP-only email authentication",
		);
	}
	if (capabilities.methods?.phoneOtp !== providers.sms) {
		failures.push(
			"Live phone OTP capability does not match Delivery Worker readiness",
		);
	}
	if (capabilities.methods?.username !== false) {
		failures.push(
			"Live username-password capability must remain disabled for passwordless email authentication",
		);
	}
	return failures;
};
