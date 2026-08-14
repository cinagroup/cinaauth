import type { Env, MiddlewareHandler } from "hono";

export const SIWE_LEGACY_NONCE_REQUEST_BODY_LIMIT_BYTES = 2 * 1024;
export const SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES = 18 * 1024;
export const SIWE_PROOF_REQUEST_BODY_LIMIT_BYTES = 20 * 1024;

const SIWE_LEGACY_NONCE_PATHS = new Set([
	"/api/auth/siwe/nonce",
	"/api/auth/siwe/get-nonce",
]);

const SIWE_CHALLENGE_PATH = "/api/auth/siwe/challenge";

const SIWE_PROOF_PATHS = new Set([
	"/api/auth/siwe/verify",
	"/api/auth/siwe/link-wallet",
]);

const BODY_LIMIT_REASON = "Request body exceeds the configured limit";

const canonicalizePathname = (pathname: string) =>
	pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname;

/** Returns the raw-byte limit for a protected SIWE request, if applicable. */
export const getSiweRequestBodyLimit = (
	pathname: string,
	method: string,
): number | undefined => {
	if (method.toUpperCase() !== "POST") return undefined;
	const canonicalPathname = canonicalizePathname(pathname);
	if (SIWE_LEGACY_NONCE_PATHS.has(canonicalPathname)) {
		return SIWE_LEGACY_NONCE_REQUEST_BODY_LIMIT_BYTES;
	}
	if (canonicalPathname === SIWE_CHALLENGE_PATH) {
		return SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES;
	}
	if (SIWE_PROOF_PATHS.has(canonicalPathname)) {
		return SIWE_PROOF_REQUEST_BODY_LIMIT_BYTES;
	}
	return undefined;
};

const cancelBody = async (
	body: ReadableStream<Uint8Array> | null,
	reason: string,
) => {
	try {
		await body?.cancel(reason);
	} catch {
		// The response is already final; cancellation is best-effort cleanup.
	}
};

const declaredBodyExceedsLimit = (request: Request, limitBytes: number) => {
	const header = request.headers.get("content-length");
	if (header === null || !/^\d+$/.test(header.trim())) return false;
	return Number(header) > limitBytes;
};

export type SiweRequestBodyInspection = "allowed" | "too-large" | "unreadable";

/**
 * Stops at the first chunk that raises a cloned SIWE stream above its limit.
 * The original request remains untouched for the Auth handler when accepted.
 */
export const inspectSiweRequestBody = async (
	request: Request,
	limitBytes: number,
): Promise<SiweRequestBodyInspection> => {
	if (declaredBodyExceedsLimit(request, limitBytes)) {
		await cancelBody(request.body, BODY_LIMIT_REASON);
		return "too-large";
	}
	if (!request.body) return "allowed";

	let inspectionBody: ReadableStream<Uint8Array> | null;
	try {
		inspectionBody = request.clone().body;
	} catch {
		return "unreadable";
	}
	if (!inspectionBody) return "allowed";

	const reader = inspectionBody.getReader();
	let bytesRead = 0;
	try {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) return "allowed";
			bytesRead += chunk.value.byteLength;
			if (bytesRead > limitBytes) {
				const inspectionCancellation = reader
					.cancel(BODY_LIMIT_REASON)
					.catch(() => undefined);
				await cancelBody(request.body, BODY_LIMIT_REASON);
				await inspectionCancellation;
				return "too-large";
			}
		}
	} catch {
		const inspectionCancellation = reader
			.cancel("Request body could not be read")
			.catch(() => undefined);
		await cancelBody(request.body, "Request body could not be read");
		await inspectionCancellation;
		return "unreadable";
	} finally {
		reader.releaseLock();
	}
};

/** Enforces SIWE body limits before any concrete Auth route or catch-all. */
export const createSiweRequestBodyLimitMiddleware =
	<E extends Env>(): MiddlewareHandler<E> =>
	async (context, next) => {
		const limitBytes = getSiweRequestBodyLimit(
			new URL(context.req.url).pathname,
			context.req.method,
		);
		if (limitBytes === undefined) {
			await next();
			return;
		}

		const inspection = await inspectSiweRequestBody(
			context.req.raw,
			limitBytes,
		);
		if (inspection === "allowed") {
			await next();
			return;
		}

		const response =
			inspection === "too-large"
				? context.json(
						{
							code: "REQUEST_BODY_TOO_LARGE",
							message: BODY_LIMIT_REASON,
						},
						413,
					)
				: context.json(
						{
							code: "REQUEST_BODY_UNREADABLE",
							message: "Request body could not be read",
						},
						400,
					);
		response.headers.set("Cache-Control", "no-store");
		return response;
	};
