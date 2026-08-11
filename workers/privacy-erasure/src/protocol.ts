export type ErasureSubject = {
	id: string;
	email: string;
};

export type ErasureOperation = {
	schemaVersion: 1;
	action: "erase-subject";
	operationId: string;
	subject: ErasureSubject;
};

export type ErasureTarget = {
	id: string;
	url: string;
	secret: string;
};

export type CompletedTargetResult = {
	status: "completed" | "not-applicable";
	completedAt: string;
	evidenceId: string;
};

export type TargetErasureResult =
	| CompletedTargetResult
	| {
			status: "pending";
			retryAfterSeconds?: number;
	  };

export type RuntimeAssessment =
	| { ok: true; issues: []; targetIds: string[] }
	| { ok: false; issues: string[]; targetIds: string[] };

export type ProtocolFailure = Error & {
	code: string;
	status: number;
};

type RuntimeInput = {
	webhookSecret: string | undefined;
	storageSecret: string | undefined;
	targetsJson: string | undefined;
};

type BodySource = {
	body: ReadableStream<Uint8Array> | null;
	headers: Headers;
};

const MAX_BODY_BYTES = 16_384;
const MAX_TARGETS = 20;
const TARGET_TIMEOUT_MS = 8_000;
const OPERATION_ID_PATTERN = /^[A-Za-z0-9_-]{43,64}$/;
const TARGET_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const encoder = new TextEncoder();
const subtleCrypto: SubtleCrypto & {
	timingSafeEqual?: (
		left: ArrayBuffer | ArrayBufferView,
		right: ArrayBuffer | ArrayBufferView,
	) => boolean;
} = crypto.subtle;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: string[]) =>
	Object.keys(value).sort().join("\n") === [...keys].sort().join("\n");

const protocolFailure = (
	code: string,
	status: number,
	message: string,
): ProtocolFailure => Object.assign(new Error(message), { code, status });

export const isProtocolFailure = (value: unknown): value is ProtocolFailure =>
	value instanceof Error &&
	"code" in value &&
	typeof value.code === "string" &&
	"status" in value &&
	typeof value.status === "number";

const toBase64 = (bytes: Uint8Array) => {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
};

const toBase64Url = (bytes: Uint8Array) =>
	toBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

const importHmacKey = (secret: string) =>
	crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

const signBytes = async (value: string, secret: string) => {
	const key = await importHmacKey(secret);
	return new Uint8Array(
		await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
	);
};

export const signBody = async (body: string, secret: string) =>
	toBase64(await signBytes(body, secret));

export const hmacDigest = async (
	domain: string,
	value: string,
	secret: string,
) =>
	`hmac-sha256:${toBase64Url(await signBytes(`${domain}\n${value}`, secret))}`;

const constantTimeBytesEqual = (left: Uint8Array, right: Uint8Array) => {
	if (typeof subtleCrypto.timingSafeEqual === "function") {
		return subtleCrypto.timingSafeEqual(left, right);
	}
	let difference = left.length ^ right.length;
	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index++) {
		difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
	}
	return difference === 0;
};

const constantTimeTextEqual = async (left: string, right: string) => {
	const [leftHash, rightHash] = await Promise.all([
		crypto.subtle.digest("SHA-256", encoder.encode(left)),
		crypto.subtle.digest("SHA-256", encoder.encode(right)),
	]);
	return constantTimeBytesEqual(
		new Uint8Array(leftHash),
		new Uint8Array(rightHash),
	);
};

export const verifyBodySignature = async (
	body: string,
	signature: string | null,
	secret: string,
) => {
	if (!signature?.startsWith("v1=")) return false;
	const supplied = signature.slice(3);
	if (!/^[A-Za-z0-9+/]{43}=$/.test(supplied)) return false;
	return constantTimeTextEqual(supplied, await signBody(body, secret));
};

export const verifyBearerToken = async (
	authorization: string | null,
	secret: string,
) => {
	if (!authorization?.startsWith("Bearer ")) return false;
	return constantTimeTextEqual(authorization.slice(7), secret);
};

export const readBoundedBody = async (
	source: BodySource,
	maximumBytes = MAX_BODY_BYTES,
) => {
	const declaredLength = Number(source.headers.get("content-length"));
	if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
		throw protocolFailure(
			"PAYLOAD_TOO_LARGE",
			413,
			"Request or response body is too large",
		);
	}
	if (!source.body) return "";

	const reader = source.body.getReader();
	const chunks: Uint8Array[] = [];
	let length = 0;
	while (true) {
		const item = await reader.read();
		if (item.done) break;
		length += item.value.byteLength;
		if (length > maximumBytes) {
			await reader.cancel();
			throw protocolFailure(
				"PAYLOAD_TOO_LARGE",
				413,
				"Request or response body is too large",
			);
		}
		chunks.push(item.value);
	}

	const bytes = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		throw protocolFailure(
			"INVALID_BODY_ENCODING",
			400,
			"Body must be valid UTF-8",
		);
	}
};

const parseOperation = (value: unknown): ErasureOperation => {
	if (
		!isRecord(value) ||
		!hasExactKeys(value, [
			"schemaVersion",
			"action",
			"operationId",
			"subject",
		]) ||
		value.schemaVersion !== 1 ||
		value.action !== "erase-subject" ||
		typeof value.operationId !== "string" ||
		!OPERATION_ID_PATTERN.test(value.operationId) ||
		!isRecord(value.subject) ||
		!hasExactKeys(value.subject, ["id", "email"]) ||
		typeof value.subject.id !== "string" ||
		value.subject.id.length < 1 ||
		value.subject.id.length > 512 ||
		typeof value.subject.email !== "string" ||
		value.subject.email.length < 3 ||
		value.subject.email.length > 320 ||
		!/^[^\s@]+@[^\s@]+$/.test(value.subject.email)
	) {
		throw protocolFailure(
			"INVALID_ERASURE_REQUEST",
			400,
			"Invalid erasure request",
		);
	}
	return {
		schemaVersion: 1,
		action: "erase-subject",
		operationId: value.operationId,
		subject: {
			id: value.subject.id,
			email: value.subject.email,
		},
	};
};

export const readAuthenticatedOperation = async (
	request: Request,
	secret: string,
) => {
	if (!request.headers.get("content-type")?.startsWith("application/json")) {
		throw protocolFailure(
			"UNSUPPORTED_CONTENT_TYPE",
			415,
			"Content-Type must be application/json",
		);
	}
	const body = await readBoundedBody(request);
	if (
		!(await verifyBodySignature(
			body,
			request.headers.get("x-cinaauth-signature"),
			secret,
		))
	) {
		throw protocolFailure(
			"INVALID_SIGNATURE",
			401,
			"Invalid request signature",
		);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(body) as unknown;
	} catch {
		throw protocolFailure(
			"INVALID_ERASURE_REQUEST",
			400,
			"Invalid erasure request",
		);
	}
	const operation = parseOperation(parsed);
	if (
		request.headers.get("x-cinaauth-operation-id") !== operation.operationId
	) {
		throw protocolFailure(
			"OPERATION_ID_MISMATCH",
			400,
			"Operation ID header does not match the body",
		);
	}
	return operation;
};

const parseHttpsUrl = (value: unknown) => {
	if (typeof value !== "string" || value.length > 2_048) return undefined;
	try {
		const url = new URL(value);
		const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
		const isIpLiteral =
			hostname.includes(":") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
		if (
			url.protocol !== "https:" ||
			url.username ||
			url.password ||
			url.hash ||
			(url.port && url.port !== "443") ||
			isIpLiteral ||
			hostname === "localhost" ||
			hostname.endsWith(".localhost") ||
			hostname.endsWith(".local") ||
			hostname.endsWith(".internal") ||
			hostname.endsWith(".lan") ||
			hostname.endsWith(".home")
		) {
			return undefined;
		}
		return url.toString();
	} catch {
		return undefined;
	}
};

export const parseTargets = (targetsJson: string): ErasureTarget[] => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(targetsJson) as unknown;
	} catch {
		throw new Error("Privacy erasure target configuration is invalid JSON");
	}
	if (!Array.isArray(parsed) || parsed.length > MAX_TARGETS) {
		throw new Error("Privacy erasure target configuration is invalid");
	}
	const seen = new Set<string>();
	const targets = parsed.map((value) => {
		if (
			!isRecord(value) ||
			!hasExactKeys(value, ["id", "url", "secret"]) ||
			typeof value.id !== "string" ||
			!TARGET_ID_PATTERN.test(value.id) ||
			typeof value.secret !== "string" ||
			value.secret.length < 32 ||
			value.secret.length > 512
		) {
			throw new Error("Privacy erasure target configuration is invalid");
		}
		const url = parseHttpsUrl(value.url);
		if (!url) {
			throw new Error("Privacy erasure target configuration is invalid");
		}
		if (seen.has(value.id)) {
			throw new Error(
				`Privacy erasure configuration has duplicate target id ${value.id}`,
			);
		}
		seen.add(value.id);
		return { id: value.id, url, secret: value.secret };
	});
	return targets.sort((left, right) => left.id.localeCompare(right.id));
};

export const assessRuntime = ({
	webhookSecret,
	storageSecret,
	targetsJson,
}: RuntimeInput): RuntimeAssessment => {
	const issues: string[] = [];
	if (!webhookSecret || webhookSecret.length < 32) {
		issues.push("webhook_secret_missing_or_weak");
	}
	if (!storageSecret || storageSecret.length < 32) {
		issues.push("storage_secret_missing_or_weak");
	}
	let targets: ErasureTarget[] = [];
	if (!targetsJson) {
		issues.push("targets_missing");
	} else {
		try {
			targets = parseTargets(targetsJson);
			if (targets.length === 0) issues.push("targets_empty");
		} catch {
			issues.push("targets_invalid");
		}
	}
	const targetIds = targets.map(({ id }) => id);
	return issues.length === 0
		? { ok: true, issues: [], targetIds }
		: { ok: false, issues, targetIds };
};

const retryAfterSeconds = (response: Response) => {
	const value = Number(response.headers.get("retry-after"));
	return Number.isInteger(value) && value >= 1 && value <= 86_400
		? value
		: undefined;
};

const parseTargetResult = async (
	response: Response,
): Promise<TargetErasureResult> => {
	if (response.status === 202) {
		const retryAfter = retryAfterSeconds(response);
		return {
			status: "pending",
			...(retryAfter ? { retryAfterSeconds: retryAfter } : {}),
		};
	}
	if (!response.ok) {
		throw protocolFailure(
			"ERASURE_TARGET_UNAVAILABLE",
			503,
			"A required erasure target is unavailable",
		);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(await readBoundedBody(response)) as unknown;
	} catch (error) {
		if (isProtocolFailure(error)) throw error;
		throw protocolFailure(
			"ERASURE_TARGET_INVALID_RESPONSE",
			503,
			"A required erasure target returned invalid evidence",
		);
	}
	if (!isRecord(parsed) || typeof parsed.status !== "string") {
		throw protocolFailure(
			"ERASURE_TARGET_INVALID_RESPONSE",
			503,
			"A required erasure target returned invalid evidence",
		);
	}
	if (parsed.status === "pending") {
		const retryAfter = parsed.retryAfterSeconds;
		if (
			retryAfter !== undefined &&
			(typeof retryAfter !== "number" ||
				!Number.isInteger(retryAfter) ||
				retryAfter < 1 ||
				retryAfter > 86_400)
		) {
			throw protocolFailure(
				"ERASURE_TARGET_INVALID_RESPONSE",
				503,
				"A required erasure target returned invalid evidence",
			);
		}
		return {
			status: "pending",
			...(typeof retryAfter === "number"
				? { retryAfterSeconds: retryAfter }
				: {}),
		};
	}
	const completedAt =
		typeof parsed.completedAt === "string"
			? Date.parse(parsed.completedAt)
			: Number.NaN;
	if (
		(parsed.status !== "completed" && parsed.status !== "not-applicable") ||
		typeof parsed.completedAt !== "string" ||
		parsed.completedAt.length > 64 ||
		Number.isNaN(completedAt) ||
		completedAt > Date.now() + 5 * 60 * 1_000 ||
		typeof parsed.evidenceId !== "string" ||
		!parsed.evidenceId.trim() ||
		parsed.evidenceId.length > 512
	) {
		throw protocolFailure(
			"ERASURE_TARGET_INVALID_RESPONSE",
			503,
			"A required erasure target returned invalid evidence",
		);
	}
	return {
		status: parsed.status,
		completedAt: new Date(completedAt).toISOString(),
		evidenceId: parsed.evidenceId,
	};
};

export const eraseTarget = async (
	operation: ErasureOperation,
	target: ErasureTarget,
) => {
	const body = JSON.stringify(operation);
	let response: Response;
	try {
		response = await fetch(target.url, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				"X-CinaAuth-Operation-Id": operation.operationId,
				"X-CinaAuth-Target-Id": target.id,
				"X-CinaAuth-Signature": `v1=${await signBody(body, target.secret)}`,
			},
			body,
			redirect: "error",
			signal: AbortSignal.timeout(TARGET_TIMEOUT_MS),
		});
	} catch {
		throw protocolFailure(
			"ERASURE_TARGET_UNAVAILABLE",
			503,
			"A required erasure target is unavailable",
		);
	}
	return parseTargetResult(response);
};
