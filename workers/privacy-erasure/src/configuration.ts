import type { ErasureTarget } from "./protocol";
import {
	parseTargets,
	readBoundedBody,
	signBody,
	verifyBodySignature,
} from "./protocol";

export type ConfigFailure = Error & {
	code: string;
	status: number;
};

export type ConfigMutationInput = {
	expectedVersion: number;
	idempotencyKey: string;
};

export type StageConfigInput = ConfigMutationInput & {
	targets: ErasureTarget[];
};

export type ConfigSlotStatus = {
	version: number;
	targetIds: string[];
	targetCount: number;
	configured: true;
	validated: boolean;
	createdAt: string;
	testedAt: string | null;
	activatedAt: string | null;
};

export type ErasureConfigurationStatus = {
	revision: number;
	structuralReady: boolean;
	operationalReady: boolean;
	source: "dynamic" | "legacy" | "none";
	active: ConfigSlotStatus | null;
	next: ConfigSlotStatus | null;
	previous: ConfigSlotStatus | null;
};

export type EncryptedPayload = {
	salt: string;
	iv: string;
	ciphertext: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const ENCRYPTION_PURPOSE = "cinaauth.privacy.erasure.config.v1";
const IDEMPOTENCY_PURPOSE = `${ENCRYPTION_PURPOSE}.idempotency.v1`;
const TARGET_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 8_192;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;

const configFailure = (
	code: string,
	status: number,
	message: string,
): ConfigFailure => Object.assign(new Error(message), { code, status });

export const isConfigFailure = (value: unknown): value is ConfigFailure =>
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

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
};

const toBase64Url = (bytes: Uint8Array) =>
	toBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

export const createIdempotencyDigest = async (
	kek: string,
	action: string,
	payload: string,
) => {
	if (kek.length < 32 || kek.length > 1_024) {
		throw configFailure(
			"CONFIG_KEY_INVALID",
			503,
			"Privacy configuration encryption key is unavailable",
		);
	}
	const material = await crypto.subtle.importKey(
		"raw",
		encoder.encode(kek),
		"HKDF",
		false,
		["deriveKey"],
	);
	const key = await crypto.subtle.deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: encoder.encode(`${IDEMPOTENCY_PURPOSE}.salt`),
			info: encoder.encode(`${IDEMPOTENCY_PURPOSE}.key`),
		},
		material,
		{ name: "HMAC", hash: "SHA-256", length: 256 },
		false,
		["sign"],
	);
	const digest = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(`${IDEMPOTENCY_PURPOSE}\n${action}\n${payload}`),
	);
	return toBase64Url(new Uint8Array(digest));
};

export const validateMutationInput = ({
	expectedVersion,
	idempotencyKey,
}: ConfigMutationInput) => {
	if (
		!Number.isSafeInteger(expectedVersion) ||
		expectedVersion < 0 ||
		!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)
	) {
		throw configFailure(
			"INVALID_CONFIG_REQUEST",
			400,
			"Invalid configuration mutation metadata",
		);
	}
};

const parseAllowedHosts = (value: string | undefined) => {
	const hosts = new Set<string>();
	for (const raw of (value ?? "").split(/[\s,]+/)) {
		const host = raw.trim().toLowerCase().replace(/\.$/, "");
		if (!host) continue;
		if (
			host.length > 253 ||
			!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
				host,
			)
		) {
			throw configFailure(
				"INVALID_ALLOWED_HOSTS",
				503,
				"Static erasure target allow-list is invalid",
			);
		}
		hosts.add(host);
	}
	return hosts;
};

export const validateTargetsForHosts = (
	targets: ErasureTarget[],
	allowedHostsValue: string | undefined,
) => {
	let normalized: ErasureTarget[];
	try {
		normalized = parseTargets(JSON.stringify(targets));
	} catch {
		throw configFailure("INVALID_TARGET", 400, "Invalid erasure target");
	}
	const allowedHosts = parseAllowedHosts(allowedHostsValue);
	if (allowedHosts.size === 0) {
		throw configFailure(
			"TARGET_HOST_NOT_ALLOWED",
			400,
			"No erasure target host is allowed by deployment policy",
		);
	}
	for (const target of normalized) {
		const url = new URL(target.url);
		const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
		if (!allowedHosts.has(hostname)) {
			throw configFailure(
				"TARGET_HOST_NOT_ALLOWED",
				400,
				`Erasure target ${target.id} is not allowed by deployment policy`,
			);
		}
	}
	if (normalized.length === 0) {
		throw configFailure(
			"TARGETS_EMPTY",
			400,
			"At least one erasure target is required",
		);
	}
	return normalized;
};

const encryptionAad = (version: number) =>
	encoder.encode(`${ENCRYPTION_PURPOSE}\n${version}`);

const deriveEncryptionKey = async (
	kek: string,
	salt: Uint8Array<ArrayBuffer>,
	usage: KeyUsage[],
) => {
	if (kek.length < 32 || kek.length > 1_024) {
		throw configFailure(
			"CONFIG_KEY_INVALID",
			503,
			"Privacy configuration encryption key is unavailable",
		);
	}
	const material = await crypto.subtle.importKey(
		"raw",
		encoder.encode(kek),
		"HKDF",
		false,
		["deriveKey"],
	);
	return crypto.subtle.deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt,
			info: encoder.encode(ENCRYPTION_PURPOSE),
		},
		material,
		{ name: "AES-GCM", length: 256 },
		false,
		usage,
	);
};

export const encryptTargets = async (
	targets: ErasureTarget[],
	version: number,
	kek: string,
): Promise<EncryptedPayload> => {
	const salt = crypto.getRandomValues(new Uint8Array(32));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveEncryptionKey(kek, salt, ["encrypt"]);
	const ciphertext = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv,
			additionalData: encryptionAad(version),
			tagLength: 128,
		},
		key,
		encoder.encode(JSON.stringify(targets)),
	);
	return {
		salt: toBase64(salt),
		iv: toBase64(iv),
		ciphertext: toBase64(new Uint8Array(ciphertext)),
	};
};

export const decryptTargets = async (
	payload: EncryptedPayload,
	version: number,
	kek: string,
) => {
	try {
		const salt = fromBase64(payload.salt);
		const iv = fromBase64(payload.iv);
		if (salt.byteLength !== 32 || iv.byteLength !== 12) throw new Error();
		const key = await deriveEncryptionKey(kek, salt, ["decrypt"]);
		const plaintext = await crypto.subtle.decrypt(
			{
				name: "AES-GCM",
				iv,
				additionalData: encryptionAad(version),
				tagLength: 128,
			},
			key,
			fromBase64(payload.ciphertext),
		);
		return parseTargets(decoder.decode(plaintext));
	} catch (error) {
		if (isConfigFailure(error)) throw error;
		throw configFailure(
			"CONFIG_DECRYPTION_FAILED",
			503,
			"Privacy configuration could not be decrypted",
		);
	}
};

const hasExactKeys = (value: Record<string, unknown>, keys: string[]) =>
	Object.keys(value).sort().join("\n") === [...keys].sort().join("\n");

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const testTargetReadiness = async (target: ErasureTarget) => {
	const now = Date.now();
	const challengeId = crypto.randomUUID();
	const body = JSON.stringify({
		schemaVersion: 1,
		action: "verify-erasure-target",
		challengeId,
		targetId: target.id,
		issuedAt: new Date(now).toISOString(),
		expiresAt: new Date(now + 60_000).toISOString(),
	});
	let response: Response;
	try {
		response = await fetch(target.url, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				"X-CinaAuth-Target-Id": target.id,
				"X-CinaAuth-Challenge-Id": challengeId,
				"X-CinaAuth-Signature": `v1=${await signBody(body, target.secret)}`,
			},
			body,
			redirect: "error",
			signal: AbortSignal.timeout(TARGET_TIMEOUT_MS),
		});
	} catch {
		throw configFailure(
			"TARGET_VALIDATION_FAILED",
			503,
			`Erasure target ${target.id} did not complete the readiness handshake`,
		);
	}
	if (
		!response.ok ||
		!response.headers.get("content-type")?.startsWith("application/json")
	) {
		throw configFailure(
			"TARGET_VALIDATION_FAILED",
			503,
			`Erasure target ${target.id} did not complete the readiness handshake`,
		);
	}
	let responseBody: string;
	try {
		responseBody = await readBoundedBody(response, MAX_RESPONSE_BYTES);
	} catch {
		throw configFailure(
			"TARGET_VALIDATION_FAILED",
			503,
			`Erasure target ${target.id} returned an invalid readiness response`,
		);
	}
	if (
		!(await verifyBodySignature(
			responseBody,
			response.headers.get("x-cinaauth-signature"),
			target.secret,
		))
	) {
		throw configFailure(
			"TARGET_VALIDATION_FAILED",
			503,
			`Erasure target ${target.id} returned an unsigned readiness response`,
		);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(responseBody) as unknown;
	} catch {
		throw configFailure(
			"TARGET_VALIDATION_FAILED",
			503,
			`Erasure target ${target.id} returned an invalid readiness response`,
		);
	}
	const respondedAt =
		isRecord(parsed) && typeof parsed.respondedAt === "string"
			? Date.parse(parsed.respondedAt)
			: Number.NaN;
	if (
		!isRecord(parsed) ||
		!hasExactKeys(parsed, [
			"schemaVersion",
			"action",
			"challengeId",
			"targetId",
			"ready",
			"respondedAt",
		]) ||
		parsed.schemaVersion !== 1 ||
		parsed.action !== "erasure-target-ready" ||
		parsed.challengeId !== challengeId ||
		parsed.targetId !== target.id ||
		parsed.ready !== true ||
		Number.isNaN(respondedAt) ||
		respondedAt < now - 60_000 ||
		respondedAt > now + 60_000
	) {
		throw configFailure(
			"TARGET_VALIDATION_FAILED",
			503,
			`Erasure target ${target.id} returned a mismatched readiness response`,
		);
	}
};

export const createConfigFailure = configFailure;
