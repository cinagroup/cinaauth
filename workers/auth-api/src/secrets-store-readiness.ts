import { isValidAdminOidcClientSecret } from "@cinaauth/auth-web-contract";
import type { CloudflareBindings } from "./env";

type StagedSecretsStoreEnv = Pick<
	CloudflareBindings,
	| "CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2"
	| "CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2"
	| "CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2"
	| "CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2"
>;

type StagedSecretsStoreIssue =
	| "delivery_webhook_secret_store_v2_unavailable"
	| "delivery_webhook_secret_store_v2_weak"
	| "erasure_webhook_secret_store_v2_unavailable"
	| "erasure_webhook_secret_store_v2_weak"
	| "admin_oidc_client_secret_store_v2_unavailable"
	| "admin_oidc_client_secret_store_v2_weak"
	| "admin_oidc_bridge_secret_store_v2_unavailable"
	| "admin_oidc_bridge_secret_store_v2_weak";

type SecretStoreBinding = Pick<SecretsStoreSecret, "get"> | undefined;

const probeSecret = async (
	binding: SecretStoreBinding,
	isValid: (value: string) => boolean,
	unavailableIssue: StagedSecretsStoreIssue,
	weakIssue: StagedSecretsStoreIssue,
): Promise<StagedSecretsStoreIssue | undefined> => {
	try {
		if (!binding || typeof binding.get !== "function") return unavailableIssue;
		const value = await binding.get();
		return isValid(value) ? undefined : weakIssue;
	} catch {
		return unavailableIssue;
	}
};

const isStrongSecret = (value: string) => value.length >= 32;

/**
 * Probes active V2 account-secret bindings without exposing their values.
 */
export const getActiveSecretsStoreReadiness = async (
	env: StagedSecretsStoreEnv,
) => {
	const results = await Promise.all([
		probeSecret(
			env.CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2,
			isStrongSecret,
			"delivery_webhook_secret_store_v2_unavailable",
			"delivery_webhook_secret_store_v2_weak",
		),
		probeSecret(
			env.CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2,
			isStrongSecret,
			"erasure_webhook_secret_store_v2_unavailable",
			"erasure_webhook_secret_store_v2_weak",
		),
		probeSecret(
			env.CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2,
			isValidAdminOidcClientSecret,
			"admin_oidc_client_secret_store_v2_unavailable",
			"admin_oidc_client_secret_store_v2_weak",
		),
		probeSecret(
			env.CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2,
			isStrongSecret,
			"admin_oidc_bridge_secret_store_v2_unavailable",
			"admin_oidc_bridge_secret_store_v2_weak",
		),
	]);
	const issues = results.filter(
		(issue): issue is StagedSecretsStoreIssue => issue !== undefined,
	);
	return {
		active: true as const,
		source: "secrets-store-v2" as const,
		ok: issues.length === 0,
		issues,
	};
};
