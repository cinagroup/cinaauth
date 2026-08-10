import type {
	PrivacyDeletionProcessor,
	PrivacyProcessorErasureResult,
} from "cinaauth/plugins/privacy-center";
import type { CloudflareBindings } from "./env";

type PrivacyDeletionFetcher = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

const MAX_PROCESSOR_RESPONSE_BYTES = 16_384;
const PROCESSOR_ID = "controller-erasure-orchestrator";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isHttpsUrl = (value: string | undefined) => {
	if (!value) return false;
	try {
		const url = new URL(value);
		return url.protocol === "https:" && !url.username && !url.password;
	} catch {
		return false;
	}
};

const toBase64 = (bytes: Uint8Array) => {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
};

const signBody = async (body: string, secret: string) => {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return toBase64(
		new Uint8Array(
			await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
		),
	);
};

const retryAfterSeconds = (response: Response) => {
	const value = Number(response.headers.get("retry-after"));
	return Number.isInteger(value) && value >= 1 && value <= 86_400
		? value
		: undefined;
};

const parseResult = (value: unknown): PrivacyProcessorErasureResult => {
	if (!isRecord(value) || typeof value.status !== "string") {
		throw new Error("Privacy processor returned invalid erasure evidence");
	}
	if (value.status === "pending") {
		const retryAfter = value.retryAfterSeconds;
		if (
			retryAfter !== undefined &&
			(typeof retryAfter !== "number" ||
				!Number.isInteger(retryAfter) ||
				retryAfter < 1 ||
				retryAfter > 86_400)
		) {
			throw new Error("Privacy processor returned invalid erasure evidence");
		}
		return {
			status: "pending",
			...(retryAfter ? { retryAfterSeconds: retryAfter } : {}),
		};
	}
	if (
		(value.status !== "completed" && value.status !== "not-applicable") ||
		typeof value.completedAt !== "string" ||
		value.completedAt.length > 64 ||
		Number.isNaN(Date.parse(value.completedAt)) ||
		typeof value.evidenceId !== "string" ||
		value.evidenceId.length < 1 ||
		value.evidenceId.length > 512
	) {
		throw new Error("Privacy processor returned invalid erasure evidence");
	}
	return {
		status: value.status,
		completedAt: new Date(value.completedAt).toISOString(),
		evidenceId: value.evidenceId,
	};
};

const readResult = async (response: Response) => {
	const declaredLength = Number(response.headers.get("content-length"));
	if (
		Number.isFinite(declaredLength) &&
		declaredLength > MAX_PROCESSOR_RESPONSE_BYTES
	) {
		throw new Error("Privacy processor response is too large");
	}
	const body = await response.text();
	if (body.length > MAX_PROCESSOR_RESPONSE_BYTES) {
		throw new Error("Privacy processor response is too large");
	}
	try {
		return JSON.parse(body) as unknown;
	} catch {
		throw new Error("Privacy processor returned invalid erasure evidence");
	}
};

export const hasPrivacyDeletionProcessorRuntime = (env: CloudflareBindings) =>
	isHttpsUrl(env.CINAAUTH_ERASURE_WEBHOOK_URL) &&
	typeof env.CINAAUTH_ERASURE_WEBHOOK_SECRET === "string" &&
	env.CINAAUTH_ERASURE_WEBHOOK_SECRET.length >= 32;

export const createWebhookPrivacyDeletionProcessor = (
	env: CloudflareBindings,
	fetcher: PrivacyDeletionFetcher = fetch,
): PrivacyDeletionProcessor => {
	if (!hasPrivacyDeletionProcessorRuntime(env)) {
		throw new Error("Privacy deletion processor runtime is incomplete");
	}
	const url = env.CINAAUTH_ERASURE_WEBHOOK_URL!;
	const secret = env.CINAAUTH_ERASURE_WEBHOOK_SECRET!;
	return {
		id: PROCESSOR_ID,
		eraseSubject: async ({ operationId, subject }) => {
			const body = JSON.stringify({
				schemaVersion: 1,
				action: "erase-subject",
				operationId,
				subject,
			});
			const response = await fetcher(url, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					"X-CinaAuth-Operation-Id": operationId,
					"X-CinaAuth-Signature": `v1=${await signBody(body, secret)}`,
				},
				body,
				redirect: "error",
				signal: AbortSignal.timeout(10_000),
			});
			if (response.status === 202) {
				const retryAfter = retryAfterSeconds(response);
				return {
					status: "pending",
					...(retryAfter ? { retryAfterSeconds: retryAfter } : {}),
				};
			}
			if (!response.ok) {
				throw new Error(
					`Privacy deletion processor returned HTTP ${response.status}`,
				);
			}
			return parseResult(await readResult(response));
		},
	};
};

/**
 * Always register the controller processor so missing runtime configuration
 * pauses account deletion instead of silently falling back to local-only erasure.
 */
export const createRequiredPrivacyDeletionProcessor = (
	env: CloudflareBindings,
): PrivacyDeletionProcessor => {
	if (hasPrivacyDeletionProcessorRuntime(env)) {
		return createWebhookPrivacyDeletionProcessor(env);
	}
	return {
		id: PROCESSOR_ID,
		eraseSubject: async () => {
			throw new Error("Privacy deletion processor runtime is incomplete");
		},
	};
};
