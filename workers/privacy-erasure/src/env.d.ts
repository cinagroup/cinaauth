/** Secret values are provisioned with Wrangler and intentionally absent from config. */
export interface PrivacyErasureEnv extends Cloudflare.Env {
	/** HMAC secret shared with the authoritative CinaAuth Worker. */
	CINAAUTH_ERASURE_WEBHOOK_SECRET: string;
	/** Stable HMAC key for subject and evidence digests stored in the coordinator. */
	CINAAUTH_ERASURE_STORAGE_SECRET: string;
	/** JSON array of downstream erasure targets and their per-target HMAC secrets. */
	CINAAUTH_ERASURE_TARGETS: string;
}
