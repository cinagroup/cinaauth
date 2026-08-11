interface ApiErrorBody {
	code?: string;
	message?: string;
	error?: string | { code?: string; message?: string };
}

type AdminStepUpNavigation = Pick<Location, "pathname" | "search" | "assign">;

const SESSION_NOT_FRESH = "SESSION_NOT_FRESH";
let stepUpRedirectStarted = false;

export class AdminApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: string,
	) {
		super(message);
		this.name = "AdminApiError";
	}
}

function errorCode(payload: unknown): string | undefined {
	if (!payload || typeof payload !== "object") return undefined;
	const body = payload as ApiErrorBody;
	if (typeof body.error === "object" && body.error !== null) {
		return body.error.code;
	}
	return body.code;
}

function errorMessage(payload: unknown, fallback: string): string {
	if (!payload || typeof payload !== "object") return fallback;
	const body = payload as ApiErrorBody;
	if (typeof body.error === "string") return body.error;
	return body.error?.message ?? body.message ?? fallback;
}

/**
 * Starts one OIDC step-up using only the browser's current same-origin path.
 * Response-provided redirect fields are intentionally ignored.
 */
export function handleAdminStepUpError(
	status: number,
	payload: unknown,
	navigation?: AdminStepUpNavigation,
): string | undefined {
	const code = errorCode(payload);
	if (status !== 403 || code !== SESSION_NOT_FRESH) return code;
	if (stepUpRedirectStarted) return code;
	const target =
		navigation ?? (typeof window === "undefined" ? undefined : window.location);
	if (!target) return code;

	stepUpRedirectStarted = true;
	const callbackURL = `${target.pathname}${target.search}`;
	const params = new URLSearchParams({
		mode: "step-up",
		callbackURL,
	});
	target.assign(`/api/auth/oidc/login?${params.toString()}`);
	return code;
}

/** Fetch an Admin endpoint and centrally start OIDC step-up when required. */
export async function fetchAdminResponse(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const response = await fetch(input, init);
	if (response.status === 403) {
		const payload: unknown = await response
			.clone()
			.json()
			.catch(() => null);
		handleAdminStepUpError(response.status, payload);
	}
	return response;
}

/** Fetch a protected CSV through the step-up-aware client and download it. */
export async function downloadAdminCsv(
	input: RequestInfo | URL,
	filename: string,
): Promise<boolean> {
	const response = await fetchAdminResponse(input);
	if (!response.ok) return false;

	const objectUrl = URL.createObjectURL(await response.blob());
	try {
		const link = document.createElement("a");
		link.href = objectUrl;
		link.download = filename;
		link.rel = "noopener noreferrer";
		link.click();
		return true;
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

/** Fetch a JSON admin endpoint and reject both HTTP and `{ ok: false }` failures. */
export async function fetchAdminJson<T>(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<T> {
	const response = await fetchAdminResponse(input, init);
	const payload = (await response.json().catch(() => null)) as
		| (T & { ok?: boolean })
		| null;

	if (!response.ok || payload?.ok === false) {
		throw new AdminApiError(
			errorMessage(payload, `Request failed (${response.status})`),
			response.status,
			errorCode(payload),
		);
	}
	if (payload == null) {
		throw new AdminApiError(
			"The server returned an invalid response",
			response.status,
		);
	}
	return payload;
}

/** Clipboard writes can fail due to browser permissions or an insecure origin. */
export async function copyText(text: string): Promise<boolean> {
	try {
		if (!navigator.clipboard?.writeText) return false;
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

/** Open an API-provided HTTP(S) URL without granting opener access. */
export function openExternal(url: string): boolean {
	try {
		const target = new URL(url, window.location.origin);
		if (target.protocol !== "https:" && target.protocol !== "http:")
			return false;
		const link = document.createElement("a");
		link.href = target.href;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.click();
		return true;
	} catch {
		return false;
	}
}
