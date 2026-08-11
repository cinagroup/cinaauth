import type { DeliveryWorkerEnv } from "./env";

type StagedSecretsStoreEnv = Pick<
	DeliveryWorkerEnv,
	"CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2"
>;

type StagedSecretsStoreIssue =
	| "delivery_webhook_secret_store_v2_unavailable"
	| "delivery_webhook_secret_store_v2_weak";

/** Probes the staged V2 binding without exposing or activating its value. */
export const getStagedSecretsStoreReadiness = async (
	env: StagedSecretsStoreEnv,
) => {
	let issue: StagedSecretsStoreIssue | undefined;
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
	return { staged: true as const, ok: issues.length === 0, issues };
};
