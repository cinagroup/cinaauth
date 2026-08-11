/** Secret values are provisioned with Wrangler and intentionally absent from config. */
export interface PrivacyErasureEnv extends Cloudflare.Env {
	/** HMAC secret shared with the authoritative CinaAuth Worker. */
	CINAAUTH_ERASURE_WEBHOOK_SECRET?: string;
	/** Stable HMAC key for subject and evidence digests stored in the coordinator. */
	CINAAUTH_ERASURE_STORAGE_SECRET: string;
	/** Legacy JSON configuration used only until a dynamic ACTIVE version exists. */
	CINAAUTH_ERASURE_TARGETS?: string;
	/** Exact, comma/space-separated hostnames permitted by deployment policy. */
	CINAAUTH_ERASURE_ALLOWED_HOSTS: string;
	/** Secrets Store key-encryption-key binding for encrypted target configuration. */
	CINAAUTH_ERASURE_CONFIG_KEK_STORE: SecretsStoreSecret;
	/** Singleton encrypted target configuration Durable Object namespace. */
	ERASURE_CONFIG: DurableObjectNamespace<
		import("./configuration-do").ErasureConfigDurableObject
	>;
}
