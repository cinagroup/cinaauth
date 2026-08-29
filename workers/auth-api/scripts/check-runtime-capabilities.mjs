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
	const googleConfigured = hasAll(configuredInputs, [
		"GOOGLE_CLIENT_ID",
		"GOOGLE_CLIENT_SECRET",
	]);
	const githubConfigured = hasAll(configuredInputs, [
		"GITHUB_CLIENT_ID",
		"GITHUB_CLIENT_SECRET",
	]);
	if (
		capabilities.oneTap === true &&
		(!googleConfigured ||
			!hasProvider("google", "social") ||
			typeof capabilities.oneTapClientId !== "string" ||
			capabilities.oneTapClientId.trim().length === 0)
	) {
		failures.push(
			"Live One Tap requires configured Google credentials, an advertised Google provider, and a public client id",
		);
	}
	if (hasProvider("google", "social") && !googleConfigured) {
		failures.push(
			"The live Google social capability is advertised without configured credentials",
		);
	}
	if (hasProvider("github", "social") && !githubConfigured) {
		failures.push(
			"The live GitHub social capability is advertised without configured credentials",
		);
	}
	if (
		!hasAll(configuredInputs, ["GENERIC_OAUTH_CONFIG"]) &&
		Array.isArray(capabilities.oauthProviders) &&
		capabilities.oauthProviders.some(
			(provider) => provider?.type === "generic-oauth",
		)
	) {
		failures.push(
			"The live generic OAuth capability is advertised without GENERIC_OAUTH_CONFIG",
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
	if (
		configuredValues.CINAAUTH_SIWE_ENABLED === "false" &&
		capabilities.methods?.siwe === true
	) {
		failures.push(
			"Live SIWE capability exceeds the tracked SIWE deployment kill switch",
		);
	}
	return failures;
};

export const evaluateDeliveryCapabilityParity = ({
	capabilities,
	providers,
}) => {
	const failures = [];
	if (typeof capabilities.methods?.emailOtp !== "boolean") {
		failures.push("Live Email OTP capability must be an explicit boolean");
	} else if (capabilities.methods.emailOtp && providers.email !== true) {
		failures.push(
			"Live Email OTP cannot be enabled without an active Delivery Worker email provider",
		);
	}
	if (typeof capabilities.methods?.emailPassword !== "boolean") {
		failures.push("Live email-password capability must be an explicit boolean");
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
