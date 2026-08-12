import { cinaauthConfig } from "./config";
import { fetchAuthRequest } from "./fetcher";
import { splitSetCookieHeader } from "./proxy-cookie";
import type { StandardResponse } from "./types";

type CinaauthFetchOptions = {
	method?: "GET" | "POST" | "PATCH" | "DELETE";
	body?: unknown;
	cookie?: string;
	headers?: Record<string, string>;
};

export type CinaauthFetchWithResponseResult<T> = {
	result: StandardResponse<T>;
	response: Response | null;
};

/** Read every Set-Cookie value from a Worker or standard Fetch response. */
export const getCinaauthSetCookies = (response: Response | null): string[] => {
	if (!response) return [];
	const values = response.headers.getSetCookie?.() ?? [];
	if (values.length > 0) return values;
	const raw = response.headers.get("set-cookie");
	return raw ? splitSetCookieHeader(raw) : [];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const EXPOSED_UPSTREAM_ERROR_CODES = new Set([
	"SESSION_NOT_FRESH",
	"UNAUTHORIZED",
]);

const readUpstreamError = (
	value: unknown,
): { code: string; message: string } | null => {
	if (!isRecord(value)) return null;
	const candidate = isRecord(value.error) ? value.error : value;
	if (
		typeof candidate.code !== "string" ||
		candidate.code.length === 0 ||
		!EXPOSED_UPSTREAM_ERROR_CODES.has(candidate.code) ||
		typeof candidate.message !== "string" ||
		candidate.message.length === 0
	) {
		return null;
	}
	return { code: candidate.code, message: candidate.message };
};

const readCinaauthResponse = async <T>(
	res: Response,
): Promise<StandardResponse<T>> => {
	if (res.ok && res.status === 204) {
		return { ok: true };
	}
	const data: unknown = await res.json().catch(() => null);
	if (!res.ok) {
		const upstreamError = readUpstreamError(data);
		return {
			ok: false,
			error: {
				code: upstreamError?.code ?? `CINAUTH_${res.status}`,
				message: upstreamError?.message ?? "CinaSeek Identity request failed",
				status: res.status,
			},
		};
	}
	if (data === null) {
		return {
			ok: false,
			error: {
				code: "CINAUTH_INVALID_RESPONSE",
				message: "CinaSeek Identity returned an invalid response",
				status: 502,
			},
		};
	}
	return { ok: true, data: data as T };
};

/**
 * Call CinaAuth while retaining the upstream response for narrowly scoped
 * proxies that must forward session-switching Set-Cookie headers.
 */
export async function cinaauthFetchWithResponse<T>(
	path: string,
	opts: CinaauthFetchOptions = {},
): Promise<CinaauthFetchWithResponseResult<T>> {
	const headers: Record<string, string> = {};
	if (opts.cookie) headers.cookie = opts.cookie;
	if (opts.body !== undefined) headers["content-type"] = "application/json";
	// Forward the admin console's origin so cinaauth's CSRF check passes.
	// Without this, POST/PUT/DELETE requests return MISSING_OR_NULL_ORIGIN.
	if (opts.method && opts.method !== "GET") {
		headers.origin = cinaauthConfig.requestOrigin;
	}
	if (opts.headers) Object.assign(headers, opts.headers);

	// Ensure the path is mounted under the Better Auth handler ("/api/auth").
	const mountPath = path.startsWith("/api/auth") ? path : `/api/auth${path}`;

	try {
		const res = await fetchAuthRequest(
			new Request(`${cinaauthConfig.baseUrl}${mountPath}`, {
				method: opts.method ?? "GET",
				headers,
				body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
				cache: "no-store",
			}),
		);
		return { result: await readCinaauthResponse<T>(res), response: res };
	} catch {
		return {
			result: {
				ok: false,
				error: {
					code: "CINAUTH_UNREACHABLE",
					message: "CinaSeek Identity is unavailable",
				},
			},
			response: null,
		};
	}
}

export async function cinaauthFetch<T>(
	path: string,
	opts: CinaauthFetchOptions = {},
): Promise<StandardResponse<T>> {
	return (await cinaauthFetchWithResponse<T>(path, opts)).result;
}
