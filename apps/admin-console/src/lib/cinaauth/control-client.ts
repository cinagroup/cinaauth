import type { StandardResponse } from "@cinaauth/auth-web-contract";
import { cinaauthConfig } from "./config";
import { fetchAuthRequest } from "./fetcher";

const CONTROL_PATH =
	/^\/api\/admin\/configuration\/(delivery|erasure)\/(status|stage|test|activate|rollback)$/;
const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]{0,95}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readError = (
	value: unknown,
): { code: string; message: string } | null => {
	if (!isRecord(value)) return null;
	const error = isRecord(value.error) ? value.error : value;
	if (
		typeof error.code !== "string" ||
		!SAFE_ERROR_CODE.test(error.code) ||
		typeof error.message !== "string" ||
		error.message.length > 512
	) {
		return null;
	}
	return { code: error.code, message: error.message };
};

/**
 * Call a root-mounted Auth management endpoint through the production Service
 * Binding. Unlike Better Auth plugin calls, these paths are never mounted
 * beneath `/api/auth`.
 */
export const cinaauthControlFetch = async <T>(
	path: string,
	options: { cookie: string; body?: unknown },
): Promise<StandardResponse<T>> => {
	if (!CONTROL_PATH.test(path)) {
		return {
			ok: false,
			error: {
				code: "CINAUTH_CONTROL_PATH_REJECTED",
				message: "Invalid identity control path",
				status: 500,
			},
		};
	}

	try {
		const response = await fetchAuthRequest(
			new Request(new URL(path, cinaauthConfig.baseUrl), {
				method: "POST",
				headers: {
					"content-type": "application/json",
					cookie: options.cookie,
					origin: cinaauthConfig.requestOrigin,
				},
				body: JSON.stringify(options.body ?? {}),
				cache: "no-store",
			}),
		);
		const payload: unknown = await response.json().catch(() => null);
		if (!response.ok) {
			const error = readError(payload);
			return {
				ok: false,
				error: {
					code: error?.code ?? `CINAUTH_${response.status}`,
					message: error?.message ?? "CinaSeek Identity request failed",
					status: response.status,
				},
			};
		}
		if (payload === null) {
			return {
				ok: false,
				error: {
					code: "CINAUTH_INVALID_RESPONSE",
					message: "CinaSeek Identity returned an invalid response",
					status: 502,
				},
			};
		}
		const data =
			isRecord(payload) && payload.ok === true ? payload.data : payload;
		return { ok: true, data: data as T };
	} catch {
		return {
			ok: false,
			error: {
				code: "CINAUTH_UNREACHABLE",
				message: "CinaSeek Identity is unavailable",
				status: 503,
			},
		};
	}
};
