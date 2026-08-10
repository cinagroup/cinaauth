export type DeliveryMessage =
	| {
			kind: "email-otp";
			payload: {
				email: string;
				otp: string;
				type?: string;
			};
	  }
	| {
			kind: "magic-link";
			payload: {
				email: string;
				url: string;
			};
	  }
	| {
			kind: "password-reset";
			payload: {
				email: string;
				url: string;
			};
	  }
	| {
			kind: "phone-otp" | "phone-reset-otp";
			payload: {
				phoneNumber: string;
				code: string;
			};
	  };

type DeliveryRuntimeEnv = {
	CINAAUTH_DELIVERY_QUEUE?: Pick<Queue<DeliveryMessage>, "send">;
	CINAAUTH_DELIVERY_SERVICE?: Pick<
		Cloudflare.Env["CINAAUTH_DELIVERY_SERVICE"],
		"fetch"
	>;
	CINAAUTH_DELIVERY_WEBHOOK_URL?: string;
	CINAAUTH_DELIVERY_WEBHOOK_SECRET?: string;
};

export type DeliveryProviderCapabilities = {
	email: boolean;
	sms: boolean;
};

export type DeliveryProvider = keyof DeliveryProviderCapabilities;

const EMAIL_DELIVERY_PATHS = new Set([
	"/email-otp/request-email-change",
	"/email-otp/request-password-reset",
	"/email-otp/send-verification-otp",
	"/forget-password/email-otp",
	"/request-password-reset",
	"/send-verification-email",
	"/sign-in/magic-link",
	"/two-factor/send-otp",
]);

const SMS_DELIVERY_PATHS = new Set([
	"/phone-number/request-password-reset",
	"/phone-number/send-otp",
]);

const UNAVAILABLE_PROVIDERS: DeliveryProviderCapabilities = {
	email: false,
	sms: false,
};

const DELIVERY_READINESS_URL = "https://cinaauth-delivery.internal/ready";

/** Returns the provider required before a delivery-producing endpoint runs. */
export const getRequiredDeliveryProvider = (
	pathname: string,
): DeliveryProvider | undefined => {
	const authPath = pathname.startsWith("/api/auth")
		? pathname.slice("/api/auth".length)
		: pathname;
	if (EMAIL_DELIVERY_PATHS.has(authPath)) return "email";
	if (SMS_DELIVERY_PATHS.has(authPath)) return "sms";
	return undefined;
};

type DeliveryMetadata = {
	id?: string;
	timestamp?: Date;
};

const maskEmail = (email: string) => email.replace(/(^.).*(@.*$)/, "$1***$2");

const maskPhoneNumber = (phoneNumber: string) =>
	phoneNumber.replace(/\d(?=\d{2})/g, "*");

const deliveryTarget = (message: DeliveryMessage) => {
	if ("email" in message.payload) {
		return maskEmail(message.payload.email);
	}
	return maskPhoneNumber(message.payload.phoneNumber);
};

const logDelivery = (
	level: "info" | "warn" | "error",
	message: string,
	delivery: DeliveryMessage,
	extra: Record<string, unknown> = {},
) => {
	const payload = JSON.stringify({
		level,
		message,
		kind: delivery.kind,
		target: deliveryTarget(delivery),
		...extra,
	});

	if (level === "error") {
		console.error(payload);
		return;
	}
	if (level === "warn") {
		console.warn(payload);
		return;
	}
	console.info(payload);
};

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Resolves the currently configured delivery channels through the internal
 * Delivery Worker binding. Invalid, missing, or unavailable readiness data is
 * deliberately treated as no provider being ready.
 */
export const getDeliveryProviderCapabilities = async (
	env: DeliveryRuntimeEnv,
): Promise<DeliveryProviderCapabilities> => {
	if (
		!env.CINAAUTH_DELIVERY_SERVICE ||
		!env.CINAAUTH_DELIVERY_WEBHOOK_SECRET ||
		env.CINAAUTH_DELIVERY_WEBHOOK_SECRET.length < 32
	) {
		return UNAVAILABLE_PROVIDERS;
	}

	try {
		const response = await env.CINAAUTH_DELIVERY_SERVICE.fetch(
			new Request(DELIVERY_READINESS_URL, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${env.CINAAUTH_DELIVERY_WEBHOOK_SECRET}`,
				},
				signal: AbortSignal.timeout(3_000),
			}),
		);
		if (response.status !== 200 && response.status !== 503) {
			return UNAVAILABLE_PROVIDERS;
		}
		const body: unknown = await response.json();
		if (!isRecord(body) || !isRecord(body.providers)) {
			return UNAVAILABLE_PROVIDERS;
		}
		return {
			email: body.providers.email === true,
			sms: body.providers.sms === true,
		};
	} catch {
		return UNAVAILABLE_PROVIDERS;
	}
};

const textEncoder = new TextEncoder();

const hex = (bytes: ArrayBuffer) =>
	[...new Uint8Array(bytes)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");

const hmacSha256 = async (secret: string, payload: string) => {
	const key = await crypto.subtle.importKey(
		"raw",
		textEncoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return hex(
		await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload)),
	);
};

export const deliverToWebhook = async (
	env: DeliveryRuntimeEnv,
	message: DeliveryMessage,
	metadata: DeliveryMetadata = {},
) => {
	if (!env.CINAAUTH_DELIVERY_WEBHOOK_URL) {
		logDelivery("warn", "cinaauth.delivery.not_configured", message);
		throw new Error(`${message.kind} delivery webhook is not configured`);
	}
	if (!env.CINAAUTH_DELIVERY_WEBHOOK_SECRET) {
		logDelivery("warn", "cinaauth.delivery.secret_not_configured", message);
		throw new Error(
			`${message.kind} delivery webhook secret is not configured`,
		);
	}

	const body = JSON.stringify(message);
	const deliveryId = metadata.id || crypto.randomUUID();
	// Sign with the current attempt time, not the original enqueue time. The
	// delivery worker rejects signatures older than its 300s skew window, so
	// signing with the enqueue timestamp makes aged retries (and any backlog
	// older than 5 min) fail permanently. Replay is still prevented by the KV
	// dedupe on deliveryId in the delivery worker.
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const signature = await hmacSha256(
		env.CINAAUTH_DELIVERY_WEBHOOK_SECRET,
		`${timestamp}.${deliveryId}.${body}`,
	);

	const request = new Request(env.CINAAUTH_DELIVERY_WEBHOOK_URL, {
		method: "POST",
		signal: AbortSignal.timeout(10_000),
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${env.CINAAUTH_DELIVERY_WEBHOOK_SECRET}`,
			"X-CinaAuth-Delivery-Id": deliveryId,
			"X-CinaAuth-Delivery-Timestamp": timestamp,
			"X-CinaAuth-Delivery-Signature": `v1=${signature}`,
		},
		body,
	});
	const response = env.CINAAUTH_DELIVERY_SERVICE
		? await env.CINAAUTH_DELIVERY_SERVICE.fetch(request)
		: await fetch(request);

	if (!response.ok) {
		throw new Error(`Delivery webhook failed with HTTP ${response.status}`);
	}
};

export const enqueueDelivery = async (
	env: DeliveryRuntimeEnv,
	message: DeliveryMessage,
) => {
	if (env.CINAAUTH_DELIVERY_QUEUE) {
		const providers = await getDeliveryProviderCapabilities(env);
		const providerReady = message.kind.startsWith("phone-")
			? providers.sms
			: providers.email;
		if (!providerReady) {
			logDelivery("warn", "cinaauth.delivery.provider_not_ready", message);
			throw new Error(`${message.kind} delivery provider is not ready`);
		}
		await env.CINAAUTH_DELIVERY_QUEUE.send(message);
		return;
	}

	await deliverToWebhook(env, message);
};

type DeliveryQueueMessage = Pick<
	Message<DeliveryMessage>,
	"ack" | "attempts" | "body" | "id" | "retry" | "timestamp"
>;

const handleDeliveryMessage = async (
	message: DeliveryQueueMessage,
	env: DeliveryRuntimeEnv,
) => {
	try {
		await deliverToWebhook(env, message.body, {
			id: message.id,
			timestamp: message.timestamp,
		});
		message.ack();
	} catch (error) {
		logDelivery("error", "cinaauth.delivery.failed", message.body, {
			attempts: message.attempts,
			deliveryId: message.id,
			error: errorMessage(error),
		});
		message.retry({
			delaySeconds: Math.min(300, 2 ** message.attempts * 5),
		});
	}
};

export const handleDeliveryBatch = async (
	batch: Pick<MessageBatch<DeliveryMessage>, "messages">,
	env: DeliveryRuntimeEnv,
) => {
	await Promise.all(
		batch.messages.map((message) => handleDeliveryMessage(message, env)),
	);
};
