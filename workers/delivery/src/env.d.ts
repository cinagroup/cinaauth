import type { DeliveryProviderConfig } from "./provider-config";

export interface DeliveryWorkerEnv extends Cloudflare.Env {
	/** Shared HMAC secret used by the CinaAuth API Worker delivery client. */
	CINAAUTH_DELIVERY_WEBHOOK_SECRET?: string;
	/** Preferred shared HMAC secret from the account Secrets Store. */
	CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2?: SecretsStoreSecret;
	/** KEK used only to derive per-version provider configuration keys. */
	CINAAUTH_DELIVERY_CONFIG_KEK_STORE: SecretsStoreSecret;
	/** Strongly consistent encrypted provider configuration repository. */
	DELIVERY_CONFIG: DurableObjectNamespace<DeliveryProviderConfig>;
	/** Short-lived delivery-id replay cache. */
	CINAAUTH_DELIVERY_REPLAY_KV: KVNamespace;
	/** Worker version metadata for readiness and logs. */
	VERSION_METADATA: WorkerVersionMetadata;
	/** Maximum accepted signature age in seconds. Defaults to 300. */
	DELIVERY_ALLOWED_SKEW_SECONDS?: string;
	/** How long successful delivery ids stay in replay cache. Defaults to 86400. */
	DELIVERY_REPLAY_TTL_SECONDS?: string;
	/** Resend API key for email OTP and magic-link delivery. */
	RESEND_API_KEY?: string;
	/** Email sender address accepted by Resend. */
	RESEND_EMAIL_FROM?: string;
	/** Twilio account SID for SMS delivery. */
	TWILIO_ACCOUNT_SID?: string;
	/** Twilio auth token for SMS delivery. */
	TWILIO_AUTH_TOKEN?: string;
	/** Twilio sender number for SMS delivery. */
	TWILIO_FROM_NUMBER?: string;
}
