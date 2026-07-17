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
	CINAAUTH_DELIVERY_QUEUE?: Queue<DeliveryMessage>;
	CINAAUTH_DELIVERY_WEBHOOK_URL?: string;
	CINAAUTH_DELIVERY_WEBHOOK_SECRET?: string;
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
	return hex(await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload)));
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
		throw new Error(`${message.kind} delivery webhook secret is not configured`);
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

	const response = await fetch(env.CINAAUTH_DELIVERY_WEBHOOK_URL, {
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

	if (!response.ok) {
		throw new Error(`Delivery webhook failed with HTTP ${response.status}`);
	}
};

export const enqueueDelivery = async (
	env: DeliveryRuntimeEnv,
	message: DeliveryMessage,
) => {
	if (env.CINAAUTH_DELIVERY_QUEUE) {
		await env.CINAAUTH_DELIVERY_QUEUE.send(message);
		return;
	}

	await deliverToWebhook(env, message);
};

const handleDeliveryMessage = async (
	message: Message<DeliveryMessage>,
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
	batch: MessageBatch<DeliveryMessage>,
	env: DeliveryRuntimeEnv,
) => {
	await Promise.all(
		batch.messages.map((message) => handleDeliveryMessage(message, env)),
	);
};
