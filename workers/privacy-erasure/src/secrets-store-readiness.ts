type WebhookSecretEnv = {
	CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2?: SecretsStoreSecret;
	CINAAUTH_ERASURE_WEBHOOK_SECRET?: string;
};

type WebhookSecretIssue =
	| "erasure_webhook_secret_store_v2_unavailable"
	| "erasure_webhook_secret_store_v2_weak"
	| "erasure_webhook_secret_v1_missing_or_weak";

const secretFailure = (issue: WebhookSecretIssue) =>
	Object.assign(new Error("Privacy erasure webhook secret is unavailable"), {
		code: "ERASURE_WEBHOOK_SECRET_UNAVAILABLE",
		status: 503,
		issue,
	});

/**
 * Resolves the active webhook HMAC key. A declared Secrets Store V2 binding is
 * authoritative: read failures never fall back to V1. V1 is only a migration
 * fallback for deployments where the V2 binding is absent.
 */
export const resolveErasureWebhookSecret = async (env: WebhookSecretEnv) => {
	const binding: SecretsStoreSecret | undefined =
		env.CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2;
	if (binding) {
		if (typeof binding.get !== "function") {
			throw secretFailure("erasure_webhook_secret_store_v2_unavailable");
		}
		let value: string;
		try {
			value = await binding.get();
		} catch {
			throw secretFailure("erasure_webhook_secret_store_v2_unavailable");
		}
		if (value.length < 32) {
			throw secretFailure("erasure_webhook_secret_store_v2_weak");
		}
		return { value, source: "secrets-store-v2" as const };
	}

	const value = env.CINAAUTH_ERASURE_WEBHOOK_SECRET;
	if (!value || value.length < 32) {
		throw secretFailure("erasure_webhook_secret_v1_missing_or_weak");
	}
	return { value, source: "worker-secret-v1" as const };
};

/** Probes the active source without returning the secret value. */
export const getWebhookSecretReadiness = async (env: WebhookSecretEnv) => {
	try {
		const resolved = await resolveErasureWebhookSecret(env);
		return {
			active: true as const,
			ok: true,
			source: resolved.source,
			issues: [] as WebhookSecretIssue[],
		};
	} catch (error) {
		const issue =
			error instanceof Error &&
			"issue" in error &&
			typeof error.issue === "string"
				? (error.issue as WebhookSecretIssue)
				: "erasure_webhook_secret_store_v2_unavailable";
		return {
			active: true as const,
			ok: false,
			source: env.CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2
				? ("secrets-store-v2" as const)
				: ("worker-secret-v1" as const),
			issues: [issue],
		};
	}
};
