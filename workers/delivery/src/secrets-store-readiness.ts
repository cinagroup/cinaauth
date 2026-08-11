import type { DeliveryWorkerEnv } from "./env";

type ActiveSecretsStoreEnv = Pick<
	DeliveryWorkerEnv,
	"CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2"
>;

type ActiveSecretsStoreIssue =
	| "delivery_webhook_secret_store_v2_unavailable"
	| "delivery_webhook_secret_store_v2_weak";

export type DeliveryWebhookSecretResolution =
	| {
			ok: true;
			source: "secrets_store_v2" | "legacy_worker_secret";
			value: string;
	  }
	| {
			ok: false;
			issue: ActiveSecretsStoreIssue | "delivery_webhook_secret_missing";
	  };

/**
 * Resolve the active webhook secret without exposing it. A configured Store
 * binding always wins and fails closed; legacy Worker secrets are used only
 * when the binding is absent (for coordinated rollback and local bootstrap).
 */
export const resolveDeliveryWebhookSecret = async (
	env: Pick<
		DeliveryWorkerEnv,
		| "CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2"
		| "CINAAUTH_DELIVERY_WEBHOOK_SECRET"
	>,
): Promise<DeliveryWebhookSecretResolution> => {
	const binding = env.CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2;
	if (binding !== undefined) {
		if (typeof binding.get !== "function") {
			return {
				ok: false,
				issue: "delivery_webhook_secret_store_v2_unavailable",
			};
		}
		try {
			const value = await binding.get();
			if (value.length < 32) {
				return {
					ok: false,
					issue: "delivery_webhook_secret_store_v2_weak",
				};
			}
			return { ok: true, source: "secrets_store_v2", value };
		} catch {
			return {
				ok: false,
				issue: "delivery_webhook_secret_store_v2_unavailable",
			};
		}
	}

	const legacy = env.CINAAUTH_DELIVERY_WEBHOOK_SECRET;
	if (typeof legacy === "string" && legacy.length >= 32) {
		return { ok: true, source: "legacy_worker_secret", value: legacy };
	}
	return { ok: false, issue: "delivery_webhook_secret_missing" };
};

/** Probes the preferred V2 binding without exposing its active value. */
export const getActiveSecretsStoreReadiness = async (
	env: ActiveSecretsStoreEnv,
) => {
	let issue: ActiveSecretsStoreIssue | undefined;
	try {
		const binding = env.CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2;
		if (!binding || typeof binding.get !== "function") {
			issue = "delivery_webhook_secret_store_v2_unavailable";
		} else if ((await binding.get()).length < 32) {
			issue = "delivery_webhook_secret_store_v2_weak";
		}
	} catch {
		issue = "delivery_webhook_secret_store_v2_unavailable";
	}
	const issues = issue ? [issue] : [];
	return { active: true as const, ok: issues.length === 0, issues };
};
