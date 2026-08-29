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
	if (capabilities.version !== 5) {
		failures.push(
			"Live authentication capabilities must use the runtime-configurable schema version 5",
		);
	}
	if (
		capabilities.oneTap !== false &&
		!(
			capabilities.oneTap === true &&
			typeof capabilities.oneTapClientId === "string" &&
			capabilities.oneTapClientId.trim().length > 0 &&
			hasProvider("google", "social")
		)
	) {
		failures.push(
			"Live One Tap capability requires an enabled Google provider and public client id",
		);
	}
	if (capabilities.oneTap === false && capabilities.oneTapClientId !== null) {
		failures.push(
			"Disabled One Tap capability must not expose a Google client id",
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
		const deploymentAllowsSiwe =
			configuredValues.CINAAUTH_SIWE_ENABLED === "true";
		if (!deploymentAllowsSiwe && capabilities.methods?.siwe === true) {
			failures.push(
				"Live SIWE capability must remain disabled while the deployment kill switch is off",
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
	if (
		capabilities.methods?.emailOtp !== false &&
		capabilities.methods?.emailOtp !== true
	) {
		failures.push("Live Email OTP capability must be a boolean");
	} else if (
		capabilities.methods.emailOtp === true &&
		providers.email !== true
	) {
		failures.push(
			"Live Email OTP cannot be enabled without an active Delivery Worker email provider",
		);
	}
	if (
		capabilities.methods?.emailPassword !== false &&
		capabilities.methods?.emailPassword !== true
	) {
		failures.push(
			"Live email-password capability must be a boolean runtime setting",
		);
	}
	if (capabilities.methods?.magicLink !== false) {
		failures.push(
			"Live magic-link capability must remain disabled because the method is not deployed",
		);
	}
	if (capabilities.methods?.phoneOtp !== providers.sms) {
		failures.push(
			"Live phone OTP capability does not match Delivery Worker readiness",
		);
	}
	if (capabilities.methods?.username !== false) {
		failures.push(
			"Live username-password capability must remain disabled because the method is not deployed",
		);
	}
	return failures;
};
