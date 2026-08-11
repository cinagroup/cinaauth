import type { DeliveryWorkerEnv } from "./env";

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

const MAX_BODY_BYTES = 32_768;
const DEFAULT_ALLOWED_SKEW_SECONDS = 300;
const DEFAULT_REPLAY_TTL_SECONDS = 86_400;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const jsonHeaders = {
	"Content-Type": "application/json",
	"Cache-Control": "no-store",
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

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

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
	const webhookSecret =
		typeof env.CINAAUTH_DELIVERY_WEBHOOK_SECRET === "string"
			? env.CINAAUTH_DELIVERY_WEBHOOK_SECRET
			: "";

	if (!webhookSecret) {
		issues.push("missing_delivery_webhook_secret");
	} else if (webhookSecret.length < 32) {
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
	if (!env.CINAAUTH_DELIVERY_WEBHOOK_SECRET) {
		raise(503, "delivery_secret_missing", "Delivery secret is not configured");
	}

	const providedBearer = parseBearerToken(request.headers.get("authorization"));
	if (
		!(await secureEqual(providedBearer, env.CINAAUTH_DELIVERY_WEBHOOK_SECRET))
	) {
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
		env.CINAAUTH_DELIVERY_WEBHOOK_SECRET,
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

const requireEmailProvider = (
	env: DeliveryWorkerEnv,
): { apiKey: string; from: string } => {
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

const requireSmsProvider = (
	env: DeliveryWorkerEnv,
): { accountSid: string; authToken: string; from: string } => {
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

export const createProviderRequest = (
	env: DeliveryWorkerEnv,
	message: DeliveryMessage,
): ProviderRequest => {
	if (isEmailOtpMessage(message)) {
		const provider = requireEmailProvider(env);
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
		const provider = requireEmailProvider(env);
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
		const provider = requireEmailProvider(env);
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
		const provider = requireSmsProvider(env);
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

export const dispatchDelivery = async (
	env: DeliveryWorkerEnv,
	message: DeliveryMessage,
) => {
	const providerRequest = createProviderRequest(env, message);
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
	if (!env.CINAAUTH_DELIVERY_WEBHOOK_SECRET) return false;
	return secureEqual(
		parseBearerToken(request.headers.get("authorization")),
		env.CINAAUTH_DELIVERY_WEBHOOK_SECRET,
	);
};

const handleReady = async (request: Request, env: DeliveryWorkerEnv) => {
	const issues = getRuntimeConfigIssues(env);
	const ok = issues.length === 0;
	const authorized = await isAuthorizedReadinessRequest(request, env);
	if (!authorized) {
		return json(
			{
				success: ok,
				version: getVersionMetadata(env),
				runtimeConfig: {
					ok,
				},
			},
			ok ? 200 : 503,
		);
	}

	return json(
		{
			success: ok,
			version: getVersionMetadata(env),
			runtimeConfig: {
				ok,
				issues,
			},
			providers: {
				email: Boolean(env.RESEND_API_KEY && env.RESEND_EMAIL_FROM),
				sms: Boolean(
					env.TWILIO_ACCOUNT_SID &&
						env.TWILIO_AUTH_TOKEN &&
						env.TWILIO_FROM_NUMBER,
				),
			},
			replay: {
				kv: isKVNamespace(env.CINAAUTH_DELIVERY_REPLAY_KV),
			},
		},
		ok ? 200 : 503,
	);
};

const handleFetch = async (request: Request, env: DeliveryWorkerEnv) => {
	const url = new URL(request.url);
	if (url.pathname === "/" && request.method === "GET") {
		return json({
			name: "CinaSeek Delivery Worker",
			status: "running",
			version: getVersionMetadata(env),
		});
	}
	if (url.pathname === "/ready" && request.method === "GET") {
		return handleReady(request, env);
	}
	if (url.pathname === "/cinaauth/delivery") {
		return handleDelivery(request, env);
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
					error: isDeliveryHttpError(error) ? undefined : errorMessage(error),
					version: getVersionMetadata(env),
				}),
			);
			return json({ error: message, code }, status);
		}
	},
} satisfies ExportedHandler<DeliveryWorkerEnv>;
