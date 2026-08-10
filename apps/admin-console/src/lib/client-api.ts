interface ApiErrorBody {
	message?: string;
	error?: string | { message?: string };
}

export class AdminApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "AdminApiError";
	}
}

function errorMessage(payload: unknown, fallback: string): string {
	if (!payload || typeof payload !== "object") return fallback;
	const body = payload as ApiErrorBody;
	if (typeof body.error === "string") return body.error;
	return body.error?.message ?? body.message ?? fallback;
}

/** Fetch a JSON admin endpoint and reject both HTTP and `{ ok: false }` failures. */
export async function fetchAdminJson<T>(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<T> {
	const response = await fetch(input, init);
	const payload = (await response.json().catch(() => null)) as
		| (T & { ok?: boolean })
		| null;

	if (!response.ok || payload?.ok === false) {
		throw new AdminApiError(
			errorMessage(payload, `Request failed (${response.status})`),
			response.status,
		);
	}
	if (payload == null) {
		throw new AdminApiError("The server returned an invalid response", response.status);
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
		if (target.protocol !== "https:" && target.protocol !== "http:") return false;
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
