import { isValidAdminOidcClientSecret } from "@cinaauth/auth-web-contract";
import type { CloudflareBindings } from "./env";

type SecretStoreBinding = Pick<SecretsStoreSecret, "get"> | undefined;

const isStrongSecret = (value: string) => value.length >= 32;

/**
 * Resolve one active secret. Once a Store binding exists it is authoritative:
 * lookup failures never fall back to a stale Worker secret.
 */
const resolveRuntimeSecret = async (
	binding: SecretStoreBinding,
	legacyValue: string | undefined,
	isValid: (value: string) => boolean,
) => {
	if (binding) {
		if (typeof binding.get !== "function") {
			throw new Error("Secrets Store binding is unavailable");
		}
		let value: string;
		try {
			value = await binding.get();
		} catch {
			throw new Error("Secrets Store binding is unavailable");
		}
		if (!isValid(value)) {
			throw new Error("Secrets Store value is invalid");
		}
		return value;
	}
	if (!legacyValue || !isValid(legacyValue)) {
		throw new Error("Runtime secret is missing or invalid");
	}
	return legacyValue;
};

/** Resolve a conventional 32-character minimum shared secret. */
export const resolveStrongRuntimeSecret = (
	binding: SecretStoreBinding,
	legacyValue: string | undefined,
) => resolveRuntimeSecret(binding, legacyValue, isStrongSecret);

/**
 * Materialize request-scoped active secrets for CinaAuth without mutating the
 * immutable Cloudflare environment object or exposing Store bindings downstream.
 */
export const resolveAuthRuntimeSecrets = async (
	env: CloudflareBindings,
): Promise<CloudflareBindings> => {
	const [delivery, erasure, oidcClient, oidcBridge, identityEvents] =
		await Promise.all([
			resolveStrongRuntimeSecret(
				env.CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2,
				env.CINAAUTH_DELIVERY_WEBHOOK_SECRET,
			),
			resolveStrongRuntimeSecret(
				env.CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2,
				env.CINAAUTH_ERASURE_WEBHOOK_SECRET,
			),
			resolveRuntimeSecret(
				env.CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2,
				env.CINAADMIN_OIDC_CLIENT_SECRET,
				isValidAdminOidcClientSecret,
			),
			resolveStrongRuntimeSecret(
				env.CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2,
				env.CINAADMIN_OIDC_BRIDGE_SECRET,
			),
			resolveStrongRuntimeSecret(
				env.CINATOKEN_IDENTITY_EVENTS_SECRET_STORE_V2,
				env.CINATOKEN_IDENTITY_EVENTS_SECRET,
			),
		]);

	return {
		...env,
		CINAAUTH_DELIVERY_WEBHOOK_SECRET: delivery,
		CINAAUTH_ERASURE_WEBHOOK_SECRET: erasure,
		CINAADMIN_OIDC_CLIENT_SECRET: oidcClient,
		CINAADMIN_OIDC_BRIDGE_SECRET: oidcBridge,
		CINATOKEN_IDENTITY_EVENTS_SECRET: identityEvents,
	};
};
