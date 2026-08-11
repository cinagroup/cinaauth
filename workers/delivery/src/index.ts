import type { DeliveryWorkerEnv } from "./env";
import type {
	DeliveryProviderKind,
	EmailProviderConfig,
	ProviderConfigResult,
	ProviderMutationValue,
	SmsProviderConfig,
} from "./provider-config";
import {
	getActiveSecretsStoreReadiness,
	resolveDeliveryWebhookSecret,
} from "./secrets-store-readiness";

export { DeliveryProviderConfig } from "./provider-config";

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

type DeliveryHttpError = {
	code: string;
	message: string;
	status: number;
};

type VersionMetadataSnapshot = {
	id: string | null;
	tag: string | null;
	timestamp: string | null;
};

type ProviderRequest = {
	body: BodyInit;
	headers: HeadersInit;
	method: "POST";
	url: string;
};

type RuntimeConfigIssue =
	| "missing_delivery_webhook_secret"
	| "weak_delivery_webhook_secret"
	| "missing_replay_kv"
	| "missing_version_metadata"
	| "missing_resend_api_key"
	| "missing_resend_email_from"
	| "missing_twilio_account_sid"
	| "missing_twilio_auth_token"
	| "missing_twilio_from_number";

type ResolvedProvider =
	| {
			state: "configured";
			source: "dynamic" | "legacy";
			config: EmailProviderConfig | SmsProviderConfig;
	  }
	| { state: "disabled" }
	| { state: "unavailable" };

type DeliveryConfigurationOperation =
	| "stage"
	| "test"
	| "activate"
	| "rollback";

type DeliveryConfigurationStatus = {
	structuralReady: boolean;
	operationalState: "disabled" | "degraded" | "ready";
	revision: number;
	validated: boolean;
	updatedAt: string | null;
	capabilities: { email: boolean; sms: boolean };
	channels: {
		email: {
			provider: "resend";
			configured: boolean;
			validated: boolean;
			activeVersion: number | null;
			nextVersion: number | null;
			previousVersion: number | null;
			updatedAt: string | null;
			lastTestedAt: string | null;
		};
		sms: {
			provider: "twilio";
			configured: boolean;
			validated: boolean;
			activeVersion: number | null;
			nextVersion: number | null;
			previousVersion: number | null;
			updatedAt: string | null;
			lastTestedAt: string | null;
		};
	};
};

const MAX_BODY_BYTES = 32_768;
const DEFAULT_ALLOWED_SKEW_SECONDS = 300;
const DEFAULT_REPLAY_TTL_SECONDS = 86_400;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const jsonHeaders = {
	"Content-Type": "application/json; charset=utf-8",
	"Cache-Control": "no-store",
	Pragma: "no-cache",
	"X-Content-Type-Options": "nosniff",
};

const raise = (status: number, code: string, message: string): never => {
	throw { code, message, status } satisfies DeliveryHttpError;
};

const isDeliveryHttpError = (error: unknown): error is DeliveryHttpError => {
	const value = error as DeliveryHttpError | undefined;
	return (
		typeof value?.code === "string" &&
		typeof value.message === "string" &&
		typeof value.status === "number"
	);
};

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: jsonHeaders,
	});

const parsePositiveInt = (value: string | undefined, fallback: number) => {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
	delivery: DeliveryMessage | undefined,
	extra: Record<string, unknown> = {},
) => {
	const payload = JSON.stringify({
		level,
		message,
		kind: delivery?.kind,
		target: delivery ? deliveryTarget(delivery) : undefined,
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

const readLimitedStream = async (
	stream: ReadableStream<Uint8Array> | null,
	maxBytes: number,
) => {
	if (!stream) return "";
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > maxBytes) {
			raise(413, "payload_too_large", "Delivery payload is too large");
		}
		chunks.push(value);
	}

	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return textDecoder.decode(bytes);
};

const readResponseSnippet = async (response: Response) => {
	const body = await readLimitedStream(response.body, 2_048).catch(() => "");
	return body.slice(0, 512);
};

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

const sha256 = async (value: string) =>
	new Uint8Array(
		await crypto.subtle.digest("SHA-256", textEncoder.encode(value)),
	);

export const secureEqual = async (
	actual: string | undefined,
	expected: string | undefined,
) => {
	if (!actual || !expected) return false;
	const [actualHash, expectedHash] = await Promise.all([
		sha256(actual),
		sha256(expected),
	]);
	let diff = actualHash.length ^ expectedHash.length;
	for (let i = 0; i < actualHash.length; i++) {
		diff |= actualHash[i]! ^ expectedHash[i]!;
	}
	return diff === 0;
};

const parseBearerToken = (authorization: string | null) => {
	if (!authorization) return undefined;
	return /^Bearer\s+(.+)$/i.exec(authorization.trim())?.[1];
};

const isVersionMetadata = (value: unknown): value is WorkerVersionMetadata => {
	const metadata = value as WorkerVersionMetadata | undefined;
	return typeof metadata?.id === "string" && typeof metadata.tag === "string";
};

export const getVersionMetadata = (
	env: DeliveryWorkerEnv,
): VersionMetadataSnapshot => {
	if (!isVersionMetadata(env.VERSION_METADATA)) {
		return {
			id: null,
			tag: null,
			timestamp: null,
		};
	}

	return {
		id: env.VERSION_METADATA.id,
		tag: env.VERSION_METADATA.tag,
		timestamp: env.VERSION_METADATA.timestamp
			? String(env.VERSION_METADATA.timestamp)
			: null,
	};
};

const isKVNamespace = (value: unknown): value is KVNamespace =>
	typeof (value as KVNamespace | undefined)?.get === "function" &&
	typeof (value as KVNamespace | undefined)?.put === "function";

export const getRuntimeConfigIssues = (
	env: DeliveryWorkerEnv,
): RuntimeConfigIssue[] => {
	const issues: RuntimeConfigIssue[] = [];
	const hasStoreWebhookSecret =
		typeof env.CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2?.get === "function";
	const webhookSecret =
		typeof env.CINAAUTH_DELIVERY_WEBHOOK_SECRET === "string"
			? env.CINAAUTH_DELIVERY_WEBHOOK_SECRET
			: "";

	if (!hasStoreWebhookSecret && !webhookSecret) {
		issues.push("missing_delivery_webhook_secret");
	} else if (!hasStoreWebhookSecret && webhookSecret.length < 32) {
		issues.push("weak_delivery_webhook_secret");
	}

	if (!isKVNamespace(env.CINAAUTH_DELIVERY_REPLAY_KV)) {
		issues.push("missing_replay_kv");
	}

	if (!isVersionMetadata(env.VERSION_METADATA)) {
		issues.push("missing_version_metadata");
	}

	if (!env.RESEND_API_KEY) issues.push("missing_resend_api_key");
	if (!env.RESEND_EMAIL_FROM) issues.push("missing_resend_email_from");
	if (!env.TWILIO_ACCOUNT_SID) issues.push("missing_twilio_account_sid");
	if (!env.TWILIO_AUTH_TOKEN) issues.push("missing_twilio_auth_token");
	if (!env.TWILIO_FROM_NUMBER) issues.push("missing_twilio_from_number");

	return issues;
};

const isEmailOtpMessage = (
	value: DeliveryMessage,
): value is Extract<DeliveryMessage, { kind: "email-otp" }> =>
	value.kind === "email-otp";

const isMagicLinkMessage = (
	value: DeliveryMessage,
): value is Extract<DeliveryMessage, { kind: "magic-link" }> =>
	value.kind === "magic-link";

const isPasswordResetMessage = (
	value: DeliveryMessage,
): value is Extract<DeliveryMessage, { kind: "password-reset" }> =>
	value.kind === "password-reset";

const isPhoneMessage = (
	value: DeliveryMessage,
): value is Extract<
	DeliveryMessage,
	{ kind: "phone-otp" | "phone-reset-otp" }
> => value.kind === "phone-otp" || value.kind === "phone-reset-otp";

const isStringRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const parseDeliveryMessage = (rawBody: string): DeliveryMessage => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawBody);
	} catch {
		return raise(400, "invalid_json", "Delivery payload must be valid JSON");
	}

	if (!isStringRecord(parsed)) {
		return raise(400, "invalid_payload", "Delivery payload shape is invalid");
	}
	const payloadValue = parsed.payload;
	if (!isStringRecord(payloadValue)) {
		return raise(400, "invalid_payload", "Delivery payload shape is invalid");
	}

	const kind = parsed.kind;
	const payload = payloadValue;
	if (
		kind === "email-otp" &&
		typeof payload.email === "string" &&
		typeof payload.otp === "string" &&
		(payload.type === undefined || typeof payload.type === "string")
	) {
		return {
			kind,
			payload: {
				email: payload.email,
				otp: payload.otp,
				type: payload.type,
			},
		};
	}

	if (
		(kind === "magic-link" || kind === "password-reset") &&
		typeof payload.email === "string" &&
		typeof payload.url === "string"
	) {
		return {
			kind,
			payload: {
				email: payload.email,
				url: payload.url,
			},
		};
	}

	if (
		(kind === "phone-otp" || kind === "phone-reset-otp") &&
		typeof payload.phoneNumber === "string" &&
		typeof payload.code === "string"
	) {
		return {
			kind,
			payload: {
				phoneNumber: payload.phoneNumber,
				code: payload.code,
			},
		};
	}

	return raise(400, "invalid_payload", "Delivery payload kind is unsupported");
};

export const verifyCinaAuthRequest = async (
	request: Request,
	env: DeliveryWorkerEnv,
	rawBody: string,
	now = Date.now(),
) => {
	const secretResolution = await resolveDeliveryWebhookSecret(env);
	if (secretResolution.ok === false) {
		return raise(
			503,
			"delivery_secret_unavailable",
			"Delivery secret is unavailable",
		);
	}
	const webhookSecret = secretResolution.value;

	const providedBearer = parseBearerToken(request.headers.get("authorization"));
	if (!(await secureEqual(providedBearer, webhookSecret))) {
		return raise(401, "unauthorized", "Delivery authorization is invalid");
	}

	const deliveryId = request.headers.get("x-cinaauth-delivery-id");
	const timestamp = request.headers.get("x-cinaauth-delivery-timestamp");
	const signature = request.headers.get("x-cinaauth-delivery-signature");
	if (!deliveryId || !timestamp || !signature || !signature.startsWith("v1=")) {
		return raise(
			400,
			"missing_signature",
			"Delivery signature headers are required",
		);
	}

	const timestampSeconds = Number.parseInt(timestamp, 10);
	if (!Number.isFinite(timestampSeconds)) {
		return raise(400, "invalid_timestamp", "Delivery timestamp is invalid");
	}

	const allowedSkewSeconds = parsePositiveInt(
		env.DELIVERY_ALLOWED_SKEW_SECONDS,
		DEFAULT_ALLOWED_SKEW_SECONDS,
	);
	const nowSeconds = Math.floor(now / 1000);
	if (Math.abs(nowSeconds - timestampSeconds) > allowedSkewSeconds) {
		return raise(
			401,
			"stale_signature",
			"Delivery signature timestamp is stale",
		);
	}

	const expected = await hmacSha256(
		webhookSecret,
		`${timestamp}.${deliveryId}.${rawBody}`,
	);
	if (!(await secureEqual(signature.slice(3), expected))) {
		return raise(401, "invalid_signature", "Delivery signature is invalid");
	}

	return { deliveryId, timestampSeconds };
};

const escapeHtml = (value: string) =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

const requireEmailProvider = (env: DeliveryWorkerEnv): EmailProviderConfig => {
	if (!env.RESEND_API_KEY || !env.RESEND_EMAIL_FROM) {
		return raise(
			503,
			"email_provider_missing",
			"Resend email provider is missing",
		);
	}
	return {
		apiKey: env.RESEND_API_KEY,
		from: env.RESEND_EMAIL_FROM,
	};
};

const requireSmsProvider = (env: DeliveryWorkerEnv): SmsProviderConfig => {
	const accountSid = env.TWILIO_ACCOUNT_SID;
	const authToken = env.TWILIO_AUTH_TOKEN;
	const from = env.TWILIO_FROM_NUMBER;
	if (!accountSid || !authToken || !from) {
		return raise(503, "sms_provider_missing", "Twilio SMS provider is missing");
	}
	return {
		accountSid,
		authToken,
		from,
	};
};

export const createProviderRequestForConfig = (
	message: DeliveryMessage,
	config: EmailProviderConfig | SmsProviderConfig,
): ProviderRequest => {
	if (isEmailOtpMessage(message)) {
		if (!("apiKey" in config)) {
			return raise(
				503,
				"email_provider_missing",
				"Email provider is unavailable",
			);
		}
		const provider = config;
		const subject =
			message.payload.type === "email-verification"
				? "Verify your CinaSeek email"
				: "Your CinaSeek verification code";
		const text = `Your CinaSeek verification code is ${message.payload.otp}.`;
		return {
			method: "POST",
			url: "https://api.resend.com/emails",
			headers: {
				Authorization: `Bearer ${provider.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: provider.from,
				to: [message.payload.email],
				subject,
				text,
				html: `<p>${escapeHtml(text)}</p>`,
			}),
		};
	}

	if (isMagicLinkMessage(message)) {
		if (!("apiKey" in config)) {
			return raise(
				503,
				"email_provider_missing",
				"Email provider is unavailable",
			);
		}
		const provider = config;
		const text = `Sign in to CinaSeek: ${message.payload.url}`;
		return {
			method: "POST",
			url: "https://api.resend.com/emails",
			headers: {
				Authorization: `Bearer ${provider.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: provider.from,
				to: [message.payload.email],
				subject: "Your CinaSeek sign-in link",
				text,
				html: `<p><a href="${escapeHtml(message.payload.url)}">Sign in to CinaSeek</a></p>`,
			}),
		};
	}

	if (isPasswordResetMessage(message)) {
		if (!("apiKey" in config)) {
			return raise(
				503,
				"email_provider_missing",
				"Email provider is unavailable",
			);
		}
		const provider = config;
		const text = `Reset your CinaSeek password: ${message.payload.url}`;
		return {
			method: "POST",
			url: "https://api.resend.com/emails",
			headers: {
				Authorization: `Bearer ${provider.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: provider.from,
				to: [message.payload.email],
				subject: "Reset your CinaSeek password",
				text,
				html: `<p><a href="${escapeHtml(message.payload.url)}">Reset your CinaSeek password</a></p>`,
			}),
		};
	}

	if (isPhoneMessage(message)) {
		if (!("accountSid" in config)) {
			return raise(503, "sms_provider_missing", "SMS provider is unavailable");
		}
		const provider = config;
		const body = new URLSearchParams({
			From: provider.from,
			To: message.payload.phoneNumber,
			Body: `Your CinaSeek verification code is ${message.payload.code}.`,
		});
		return {
			method: "POST",
			url: `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
				provider.accountSid,
			)}/Messages.json`,
			headers: {
				Authorization: `Basic ${btoa(
					`${provider.accountSid}:${provider.authToken}`,
				)}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body,
		};
	}

	return raise(400, "invalid_payload", "Delivery payload kind is unsupported");
};

export const createProviderRequest = (
	env: DeliveryWorkerEnv,
	message: DeliveryMessage,
): ProviderRequest =>
	createProviderRequestForConfig(
		message,
		isPhoneMessage(message)
			? requireSmsProvider(env)
			: requireEmailProvider(env),
	);

const isDeliveryConfigNamespace = (
	value: unknown,
): value is DeliveryWorkerEnv["DELIVERY_CONFIG"] =>
	typeof (value as DeliveryWorkerEnv["DELIVERY_CONFIG"] | undefined)
		?.getByName === "function";

const getDeliveryConfigStub = (env: DeliveryWorkerEnv) =>
	env.DELIVERY_CONFIG.getByName("delivery-provider-config-v1");

const getLegacyProvider = (
	env: DeliveryWorkerEnv,
	provider: DeliveryProviderKind,
): ResolvedProvider => {
	if (provider === "email") {
		return env.RESEND_API_KEY && env.RESEND_EMAIL_FROM
			? {
					state: "configured",
					source: "legacy",
					config: {
						apiKey: env.RESEND_API_KEY,
						from: env.RESEND_EMAIL_FROM,
					},
				}
			: { state: "disabled" };
	}
	return env.TWILIO_ACCOUNT_SID &&
		env.TWILIO_AUTH_TOKEN &&
		env.TWILIO_FROM_NUMBER
		? {
				state: "configured",
				source: "legacy",
				config: {
					accountSid: env.TWILIO_ACCOUNT_SID,
					authToken: env.TWILIO_AUTH_TOKEN,
					from: env.TWILIO_FROM_NUMBER,
				},
			}
		: { state: "disabled" };
};

export const resolveDeliveryProvider = async (
	env: DeliveryWorkerEnv,
	provider: DeliveryProviderKind,
): Promise<ResolvedProvider> => {
	if (!isDeliveryConfigNamespace(env.DELIVERY_CONFIG)) {
		return getLegacyProvider(env, provider);
	}
	try {
		const active = await getDeliveryConfigStub(env).getActive(provider);
		if (!active.configured) return getLegacyProvider(env, provider);
		if (
			(provider === "email" && !("apiKey" in active.config)) ||
			(provider === "sms" && !("accountSid" in active.config))
		) {
			return { state: "unavailable" };
		}
		return {
			state: "configured",
			source: "dynamic",
			config: active.config,
		};
	} catch {
		// A present dynamic binding fails closed so legacy values cannot silently
		// bypass corrupt ciphertext, KEK loss, or a repository outage.
		return { state: "unavailable" };
	}
};

export const dispatchDelivery = async (
	env: DeliveryWorkerEnv,
	message: DeliveryMessage,
) => {
	const provider = await resolveDeliveryProvider(
		env,
		isPhoneMessage(message) ? "sms" : "email",
	);
	if (provider.state === "disabled") {
		return raise(
			503,
			isPhoneMessage(message)
				? "sms_provider_missing"
				: "email_provider_missing",
			"Delivery provider is not configured",
		);
	}
	if (provider.state === "unavailable") {
		return raise(
			503,
			"provider_configuration_unavailable",
			"Delivery provider configuration is unavailable",
		);
	}
	const providerRequest = createProviderRequestForConfig(
		message,
		provider.config,
	);
	const response = await fetch(providerRequest.url, {
		method: providerRequest.method,
		headers: providerRequest.headers,
		body: providerRequest.body,
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) {
		const snippet = await readResponseSnippet(response);
		raise(
			502,
			"provider_failed",
			`Delivery provider returned HTTP ${response.status}${snippet ? `: ${snippet}` : ""}`,
		);
	}
};

const replayKey = (deliveryId: string) => `cinaauth-delivery:${deliveryId}`;

const isDuplicateDelivery = async (
	env: DeliveryWorkerEnv,
	deliveryId: string,
) => {
	if (!isKVNamespace(env.CINAAUTH_DELIVERY_REPLAY_KV)) {
		raise(503, "replay_kv_missing", "Replay KV binding is missing");
	}
	return Boolean(
		await env.CINAAUTH_DELIVERY_REPLAY_KV.get(replayKey(deliveryId)),
	);
};

const markDelivered = async (env: DeliveryWorkerEnv, deliveryId: string) => {
	const ttl = parsePositiveInt(
		env.DELIVERY_REPLAY_TTL_SECONDS,
		DEFAULT_REPLAY_TTL_SECONDS,
	);
	await env.CINAAUTH_DELIVERY_REPLAY_KV.put(
		replayKey(deliveryId),
		"delivered",
		{
			expirationTtl: ttl,
		},
	);
};

const handleDelivery = async (request: Request, env: DeliveryWorkerEnv) => {
	if (request.method !== "POST") {
		raise(405, "method_not_allowed", "Use POST for delivery requests");
	}

	const rawBody = await readLimitedStream(request.body, MAX_BODY_BYTES);
	const { deliveryId } = await verifyCinaAuthRequest(request, env, rawBody);
	const message = parseDeliveryMessage(rawBody);
	if (await isDuplicateDelivery(env, deliveryId)) {
		logDelivery("info", "cinaauth.delivery.duplicate", message, { deliveryId });
		return json({ success: true, duplicate: true });
	}

	await dispatchDelivery(env, message);
	await markDelivered(env, deliveryId);
	logDelivery("info", "cinaauth.delivery.sent", message, { deliveryId });
	return json({ success: true, duplicate: false });
};

const isAuthorizedReadinessRequest = async (
	request: Request,
	env: DeliveryWorkerEnv,
) => {
	const resolution = await resolveDeliveryWebhookSecret(env);
	if (!resolution.ok) return false;
	return secureEqual(
		parseBearerToken(request.headers.get("authorization")),
		resolution.value,
	);
};

const hasExactKeys = (
	value: Record<string, unknown>,
	keys: readonly string[],
) => {
	const actual = Object.keys(value).sort();
	const expected = [...keys].sort();
	return (
		actual.length === expected.length &&
		actual.every((key, index) => key === expected[index])
	);
};

const isRevision = (value: unknown): value is number =>
	typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const isIdempotencyKey = (value: unknown): value is string =>
	typeof value === "string" &&
	value.length >= 16 &&
	value.length <= 128 &&
	/^[A-Za-z0-9._:-]+$/.test(value);

const isEmail = (value: unknown): value is string =>
	typeof value === "string" &&
	value.length >= 3 &&
	value.length <= 320 &&
	!/\r|\n/.test(value) &&
	/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isEmailFrom = (value: unknown): value is string => {
	if (typeof value !== "string" || /\r|\n/.test(value) || value.length > 384) {
		return false;
	}
	const match = value.match(/^(?:[^<>]{1,64}\s*<)?([^<>\s]+@[^<>\s]+)>?$/);
	return Boolean(match?.[1] && isEmail(match[1]));
};

const isE164 = (value: unknown): value is string =>
	typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value);

type DeliveryStageInput =
	| {
			expectedVersion: number;
			idempotencyKey: string;
			channel: "email";
			config: { provider: "resend"; apiKey: string; from: string };
	  }
	| {
			expectedVersion: number;
			idempotencyKey: string;
			channel: "sms";
			config: {
				provider: "twilio";
				accountSid: string;
				authToken: string;
				fromNumber: string;
			};
	  };

type DeliveryTestInput = {
	expectedVersion: number;
	idempotencyKey: string;
	channel: DeliveryProviderKind;
	recipient: string;
};

type DeliveryConfirmationInput = {
	expectedVersion: number;
	idempotencyKey: string;
	channel: DeliveryProviderKind;
	confirmation: "ACTIVATE" | "ROLLBACK";
};

const parseBaseMutation = (value: Record<string, unknown>) =>
	isRevision(value.expectedVersion) && isIdempotencyKey(value.idempotencyKey);

const parseStageInput = (value: unknown): DeliveryStageInput => {
	if (
		!isStringRecord(value) ||
		!hasExactKeys(value, [
			"expectedVersion",
			"idempotencyKey",
			"channel",
			"config",
		]) ||
		!parseBaseMutation(value) ||
		!isStringRecord(value.config)
	) {
		return raise(
			400,
			"invalid_config_request",
			"Configuration request is invalid",
		);
	}
	if (
		value.channel === "email" &&
		hasExactKeys(value.config, ["provider", "apiKey", "from"]) &&
		value.config.provider === "resend" &&
		typeof value.config.apiKey === "string" &&
		value.config.apiKey.startsWith("re_") &&
		value.config.apiKey.length >= 16 &&
		value.config.apiKey.length <= 512 &&
		isEmailFrom(value.config.from)
	) {
		return {
			expectedVersion: value.expectedVersion as number,
			idempotencyKey: value.idempotencyKey as string,
			channel: "email",
			config: {
				provider: "resend",
				apiKey: value.config.apiKey,
				from: value.config.from,
			},
		};
	}
	if (
		value.channel === "sms" &&
		hasExactKeys(value.config, [
			"provider",
			"accountSid",
			"authToken",
			"fromNumber",
		]) &&
		value.config.provider === "twilio" &&
		typeof value.config.accountSid === "string" &&
		/^AC[0-9a-f]{32}$/i.test(value.config.accountSid) &&
		typeof value.config.authToken === "string" &&
		value.config.authToken.length >= 16 &&
		value.config.authToken.length <= 128 &&
		isE164(value.config.fromNumber)
	) {
		return {
			expectedVersion: value.expectedVersion as number,
			idempotencyKey: value.idempotencyKey as string,
			channel: "sms",
			config: {
				provider: "twilio",
				accountSid: value.config.accountSid,
				authToken: value.config.authToken,
				fromNumber: value.config.fromNumber,
			},
		};
	}
	return raise(
		400,
		"invalid_config_request",
		"Configuration request is invalid",
	);
};

const parseTestInput = (value: unknown): DeliveryTestInput => {
	if (
		!isStringRecord(value) ||
		!hasExactKeys(value, [
			"expectedVersion",
			"idempotencyKey",
			"channel",
			"recipient",
		]) ||
		!parseBaseMutation(value) ||
		!(
			(value.channel === "email" && isEmail(value.recipient)) ||
			(value.channel === "sms" && isE164(value.recipient))
		)
	) {
		return raise(
			400,
			"invalid_config_request",
			"Configuration request is invalid",
		);
	}
	return {
		expectedVersion: value.expectedVersion as number,
		idempotencyKey: value.idempotencyKey as string,
		channel: value.channel,
		recipient: value.recipient,
	};
};

const parseConfirmationInput = (
	value: unknown,
	confirmation: "ACTIVATE" | "ROLLBACK",
): DeliveryConfirmationInput => {
	if (
		!isStringRecord(value) ||
		!hasExactKeys(value, [
			"expectedVersion",
			"idempotencyKey",
			"channel",
			"confirmation",
		]) ||
		!parseBaseMutation(value) ||
		(value.channel !== "email" && value.channel !== "sms") ||
		value.confirmation !== confirmation
	) {
		return raise(
			400,
			"invalid_config_request",
			"Configuration request is invalid",
		);
	}
	return {
		expectedVersion: value.expectedVersion as number,
		idempotencyKey: value.idempotencyKey as string,
		channel: value.channel,
		confirmation,
	};
};

const parseJsonObject = (rawBody: string) => {
	let value: unknown;
	try {
		value = JSON.parse(rawBody);
	} catch {
		return raise(
			400,
			"invalid_json",
			"Configuration request must be valid JSON",
		);
	}
	if (!isStringRecord(value)) {
		return raise(
			400,
			"invalid_config_request",
			"Configuration request is invalid",
		);
	}
	return value;
};

const structuralReady = (env: DeliveryWorkerEnv) =>
	isKVNamespace(env.CINAAUTH_DELIVERY_REPLAY_KV) &&
	isVersionMetadata(env.VERSION_METADATA) &&
	isDeliveryConfigNamespace(env.DELIVERY_CONFIG) &&
	typeof env.CINAAUTH_DELIVERY_CONFIG_KEK_STORE?.get === "function" &&
	(typeof env.CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2?.get === "function" ||
		(typeof env.CINAAUTH_DELIVERY_WEBHOOK_SECRET === "string" &&
			env.CINAAUTH_DELIVERY_WEBHOOK_SECRET.length >= 32));

export const getDeliveryConfigurationStatus = async (
	env: DeliveryWorkerEnv,
): Promise<DeliveryConfigurationStatus> => {
	if (!isDeliveryConfigNamespace(env.DELIVERY_CONFIG)) {
		throw new Error("Delivery configuration repository is unavailable");
	}
	const [repository, email, sms, encryptionKeyReady] = await Promise.all([
		getDeliveryConfigStub(env).status(),
		resolveDeliveryProvider(env, "email"),
		resolveDeliveryProvider(env, "sms"),
		getDeliveryConfigStub(env)
			.checkEncryptionKey()
			.then(
				() => true,
				() => false,
			),
	]);
	const emailConfigured = email.state === "configured";
	const smsConfigured = sms.state === "configured";
	const emailValidated =
		emailConfigured &&
		(repository.channels.email.activeVersion !== null
			? repository.channels.email.validated
			: true);
	const smsValidated =
		smsConfigured &&
		(repository.channels.sms.activeVersion !== null
			? repository.channels.sms.validated
			: true);
	const structureOk = structuralReady(env) && encryptionKeyReady;
	const operationalState =
		!emailConfigured && !smsConfigured
			? "disabled"
			: structureOk &&
					emailConfigured &&
					smsConfigured &&
					emailValidated &&
					smsValidated
				? "ready"
				: "degraded";
	return {
		structuralReady: structureOk,
		operationalState,
		revision: repository.revision,
		validated: emailValidated && smsValidated,
		updatedAt: repository.updatedAt,
		capabilities: { email: emailConfigured, sms: smsConfigured },
		channels: {
			email: {
				provider: "resend",
				configured: emailConfigured,
				...repository.channels.email,
				validated: emailValidated,
			},
			sms: {
				provider: "twilio",
				configured: smsConfigured,
				...repository.channels.sms,
				validated: smsValidated,
			},
		},
	};
};

const providerFailureResponse = (
	result: Exclude<ProviderConfigResult<ProviderMutationValue>, { ok: true }>,
): never =>
	raise(
		result.code === "invalid_provider_config" ? 400 : 409,
		result.code,
		`Configuration mutation was rejected at revision ${result.currentVersion}`,
	);

const unwrapMutation = (result: ProviderConfigResult<ProviderMutationValue>) =>
	result.ok ? result.value : providerFailureResponse(result);

export const sendProviderConfigurationTest = async (
	provider: DeliveryProviderKind,
	config: EmailProviderConfig | SmsProviderConfig,
	recipient: string,
	fetcher: typeof fetch = fetch,
) => {
	const request =
		provider === "email"
			? createProviderRequestForConfig(
					{
						kind: "email-otp",
						payload: {
							email: recipient,
							otp: "CONFIGURED",
							type: "delivery-configuration-test",
						},
					},
					config,
				)
			: createProviderRequestForConfig(
					{
						kind: "phone-otp",
						payload: { phoneNumber: recipient, code: "CONFIGURED" },
					},
					config,
				);
	const response = await fetcher(request.url, {
		method: request.method,
		headers: request.headers,
		body: request.body,
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) {
		return raise(502, "provider_test_failed", "Delivery provider test failed");
	}
};

const handleConfigurationManagement = async (
	request: Request,
	env: DeliveryWorkerEnv,
	operation: "status" | DeliveryConfigurationOperation,
) => {
	if (request.method !== "POST") {
		return raise(
			405,
			"method_not_allowed",
			"Use POST for configuration requests",
		);
	}
	const rawBody = await readLimitedStream(request.body, MAX_BODY_BYTES);
	const { deliveryId } = await verifyCinaAuthRequest(request, env, rawBody);
	const value = parseJsonObject(rawBody);
	if (operation === "status") {
		if (!hasExactKeys(value, [])) {
			return raise(
				400,
				"invalid_config_request",
				"Configuration request is invalid",
			);
		}
		return json(await getDeliveryConfigurationStatus(env));
	}
	if (!isDeliveryConfigNamespace(env.DELIVERY_CONFIG)) {
		return raise(
			503,
			"config_repository_unavailable",
			"Configuration is unavailable",
		);
	}
	const repository = getDeliveryConfigStub(env);
	if (operation === "stage") {
		const input = parseStageInput(value);
		if (input.idempotencyKey !== deliveryId) {
			return raise(
				400,
				"idempotency_mismatch",
				"Configuration request is invalid",
			);
		}
		const result =
			input.channel === "email"
				? await repository.stage({
						provider: "email",
						config: {
							apiKey: input.config.apiKey,
							from: input.config.from,
						},
						expectedVersion: input.expectedVersion,
						idempotencyKey: input.idempotencyKey,
					})
				: await repository.stage({
						provider: "sms",
						config: {
							accountSid: input.config.accountSid,
							authToken: input.config.authToken,
							from: input.config.fromNumber,
						},
						expectedVersion: input.expectedVersion,
						idempotencyKey: input.idempotencyKey,
					});
		return json(unwrapMutation(result));
	}
	if (operation === "test") {
		const input = parseTestInput(value);
		if (input.idempotencyKey !== deliveryId) {
			return raise(
				400,
				"idempotency_mismatch",
				"Configuration request is invalid",
			);
		}
		const prepared = await repository.prepareTest({
			provider: input.channel,
			target: input.recipient,
			expectedVersion: input.expectedVersion,
			idempotencyKey: input.idempotencyKey,
		});
		if (!prepared.ok) return providerFailureResponse(prepared);
		if (prepared.value.kind === "completed") {
			return json(prepared.value.result);
		}
		try {
			await sendProviderConfigurationTest(
				input.channel,
				prepared.value.config,
				input.recipient,
			);
		} catch (error) {
			await repository.abortTest({
				idempotencyKey: input.idempotencyKey,
				operationToken: prepared.value.operationToken,
			});
			throw error;
		}
		return json(
			unwrapMutation(
				await repository.completeTest({
					provider: input.channel,
					version: prepared.value.version,
					idempotencyKey: input.idempotencyKey,
					operationToken: prepared.value.operationToken,
				}),
			),
		);
	}
	if (operation === "activate") {
		const input = parseConfirmationInput(value, "ACTIVATE");
		if (input.idempotencyKey !== deliveryId) {
			return raise(
				400,
				"idempotency_mismatch",
				"Configuration request is invalid",
			);
		}
		return json(
			unwrapMutation(
				await repository.activate({
					provider: input.channel,
					expectedVersion: input.expectedVersion,
					idempotencyKey: input.idempotencyKey,
				}),
			),
		);
	}
	const input = parseConfirmationInput(value, "ROLLBACK");
	if (input.idempotencyKey !== deliveryId) {
		return raise(
			400,
			"idempotency_mismatch",
			"Configuration request is invalid",
		);
	}
	return json(
		unwrapMutation(
			await repository.rollback({
				provider: input.channel,
				expectedVersion: input.expectedVersion,
				idempotencyKey: input.idempotencyKey,
			}),
		),
	);
};

const handleReady = async (request: Request, env: DeliveryWorkerEnv) => {
	const webhookSecret = await resolveDeliveryWebhookSecret(env);
	if (!webhookSecret.ok) {
		return json(
			{
				success: false,
				version: getVersionMetadata(env),
				runtimeConfig: { ok: false },
			},
			503,
		);
	}
	const authorized = await isAuthorizedReadinessRequest(request, env);
	let status: DeliveryConfigurationStatus;
	try {
		status = await getDeliveryConfigurationStatus(env);
	} catch {
		return json(
			{
				success: false,
				version: getVersionMetadata(env),
				runtimeConfig: { ok: false },
			},
			503,
		);
	}
	const ok = status.operationalState === "ready";
	if (!authorized) {
		return json(
			{
				success: ok,
				version: getVersionMetadata(env),
				runtimeConfig: {
					ok,
					operationalState: status.operationalState,
				},
			},
			ok ? 200 : 503,
		);
	}
	const secretsStore = await getActiveSecretsStoreReadiness(env);

	return json(
		{
			success: ok && secretsStore.ok,
			version: getVersionMetadata(env),
			runtimeConfig: {
				ok,
				operationalState: status.operationalState,
			},
			secretsStore,
			providers: status.capabilities,
			replay: {
				kv: isKVNamespace(env.CINAAUTH_DELIVERY_REPLAY_KV),
			},
		},
		ok && secretsStore.ok ? 200 : 503,
	);
};

const handleFetch = async (request: Request, env: DeliveryWorkerEnv) => {
	const url = new URL(request.url);
	if (url.pathname === "/" && request.method === "GET") {
		return json({
			name: "CinaSeek Delivery Worker",
			status: "running",
			structuralReady: structuralReady(env),
			version: getVersionMetadata(env),
		});
	}
	if (url.pathname === "/ready" && request.method === "GET") {
		return handleReady(request, env);
	}
	if (url.pathname === "/cinaauth/delivery") {
		return handleDelivery(request, env);
	}
	const configurationMatch =
		/^\/cinaauth\/delivery\/config\/(status|stage|test|activate|rollback)$/.exec(
			url.pathname,
		);
	if (configurationMatch?.[1]) {
		try {
			return await handleConfigurationManagement(
				request,
				env,
				configurationMatch[1] as "status" | DeliveryConfigurationOperation,
			);
		} catch (error) {
			if (isDeliveryHttpError(error)) throw error;
			return raise(
				503,
				"config_repository_unavailable",
				"Delivery configuration is unavailable",
			);
		}
	}
	return json({ error: "Not found" }, 404);
};

export default {
	fetch: async (request, env) => {
		try {
			return await handleFetch(request, env);
		} catch (error) {
			const status = isDeliveryHttpError(error) ? error.status : 500;
			const code = isDeliveryHttpError(error)
				? error.code
				: "internal_server_error";
			const message = isDeliveryHttpError(error)
				? error.message
				: "Internal server error";
			console.error(
				JSON.stringify({
					level: "error",
					message: "cinaauth.delivery.request_failed",
					code,
					status,
					version: getVersionMetadata(env),
				}),
			);
			return json({ error: message, code }, status);
		}
	},
} satisfies ExportedHandler<DeliveryWorkerEnv>;
