import { ADMIN_OIDC_STEP_UP_MAX_AGE_SECONDS } from "@cinaauth/auth-web-contract";

const TRANSACTION_MAX_AGE_MS = 10 * 60 * 1000;
const MINIMUM_SECRET_LENGTH = 32;
const RECENT_AUTH_SIGNATURE_CONTEXT = "cinaadmin:recent-auth:v1:";
export const ADMIN_OIDC_TRANSACTION_COOKIE = "__Host-cinaadmin_oidc_tx";
export const ADMIN_OIDC_RECENT_AUTH_COOKIE =
	"__Host-cinaadmin_recent_auth";

export type AdminOidcTransactionMode = "login" | "step-up";

export type AdminOidcTransaction = {
	state: string;
	nonce: string;
	codeVerifier: string;
	callbackPath: string;
	createdAt: number;
	mode: AdminOidcTransactionMode;
};

const bytesToBase64Url = (bytes: Uint8Array) => {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/u, "");
};

const base64UrlToBytes = (value: string) => {
	const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
	const padded = normalized.padEnd(
		normalized.length + ((4 - (normalized.length % 4)) % 4),
		"=",
	);
	const binary = atob(padded);
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const assertStrongSecret = (secret: string) => {
	if (secret.length < MINIMUM_SECRET_LENGTH) {
		throw new Error(
			"OIDC transaction secret must contain at least 32 characters",
		);
	}
};

const importSigningKey = (secret: string) => {
	assertStrongSecret(secret);
	return crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
};

type StoredAdminOidcTransaction = Omit<AdminOidcTransaction, "mode"> & {
	mode?: AdminOidcTransactionMode;
};

type AdminRecentAuthenticationProof = {
	subject: string;
	authenticationTime: number;
};

const isTransaction = (value: unknown): value is StoredAdminOidcTransaction => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.state === "string" &&
		typeof candidate.nonce === "string" &&
		typeof candidate.codeVerifier === "string" &&
		typeof candidate.callbackPath === "string" &&
		typeof candidate.createdAt === "number" &&
		(candidate.mode === undefined ||
			candidate.mode === "login" ||
			candidate.mode === "step-up")
	);
};

/** Normalizes the only elevated OIDC mode; all other input is ordinary login. */
export const getAdminOidcTransactionMode = (
	value: string | null | undefined,
): AdminOidcTransactionMode => (value === "step-up" ? "step-up" : "login");

/** Keeps post-login navigation on the Admin Console origin. */
export const sanitizeAdminCallbackPath = (value: string | null | undefined) => {
	if (!value?.startsWith("/") || value.startsWith("//")) return "/dashboard";
	try {
		const url = new URL(value, "https://admin.cinaseek.ai");
		if (url.origin !== "https://admin.cinaseek.ai") return "/dashboard";
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return "/dashboard";
	}
};

/** Signs the short-lived PKCE transaction stored in an HttpOnly cookie. */
export const sealOidcTransaction = async (
	transaction: AdminOidcTransaction,
	secret: string,
) => {
	const payload = new TextEncoder().encode(JSON.stringify(transaction));
	const encodedPayload = bytesToBase64Url(payload);
	const key = await importSigningKey(secret);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(encodedPayload),
	);
	return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
};

/** Signs a short-lived, subject-bound proof created from a validated auth_time. */
export const sealRecentAuthenticationProof = async (
	subject: string,
	authenticationTime: number,
	secret: string,
) => {
	if (!subject || !Number.isInteger(authenticationTime)) {
		throw new Error("Recent authentication proof is invalid");
	}
	const payload = new TextEncoder().encode(
		JSON.stringify({ subject, authenticationTime }),
	);
	const encodedPayload = bytesToBase64Url(payload);
	const key = await importSigningKey(secret);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(`${RECENT_AUTH_SIGNATURE_CONTEXT}${encodedPayload}`),
	);
	return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
};

/** Verifies a recent-auth proof for the currently authenticated Admin subject. */
export const openRecentAuthenticationProof = async (
	value: string,
	secret: string,
	expectedSubject: string,
	now = Date.now(),
): Promise<AdminRecentAuthenticationProof | null> => {
	try {
		const [encodedPayload, encodedSignature, extra] = value.split(".");
		if (!encodedPayload || !encodedSignature || extra) return null;
		const key = await importSigningKey(secret);
		const valid = await crypto.subtle.verify(
			"HMAC",
			key,
			base64UrlToBytes(encodedSignature),
			new TextEncoder().encode(
				`${RECENT_AUTH_SIGNATURE_CONTEXT}${encodedPayload}`,
			),
		);
		if (!valid) return null;
		const parsed: unknown = JSON.parse(
			new TextDecoder().decode(base64UrlToBytes(encodedPayload)),
		);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			return null;
		}
		const candidate = parsed as Record<string, unknown>;
		if (
			candidate.subject !== expectedSubject ||
			typeof candidate.authenticationTime !== "number" ||
			!Number.isInteger(candidate.authenticationTime)
		) {
			return null;
		}
		const age = now - candidate.authenticationTime * 1000;
		if (
			age < 0 ||
			age > ADMIN_OIDC_STEP_UP_MAX_AGE_SECONDS * 1000
		) {
			return null;
		}
		return {
			subject: expectedSubject,
			authenticationTime: candidate.authenticationTime,
		};
	} catch {
		return null;
	}
};

/** Verifies and decodes an Admin OIDC transaction cookie. */
export const openOidcTransaction = async (
	value: string,
	secret: string,
	now = Date.now(),
) => {
	try {
		const [encodedPayload, encodedSignature, extra] = value.split(".");
		if (!encodedPayload || !encodedSignature || extra) return null;
		const key = await importSigningKey(secret);
		const valid = await crypto.subtle.verify(
			"HMAC",
			key,
			base64UrlToBytes(encodedSignature),
			new TextEncoder().encode(encodedPayload),
		);
		if (!valid) return null;
		const parsed: unknown = JSON.parse(
			new TextDecoder().decode(base64UrlToBytes(encodedPayload)),
		);
		if (!isTransaction(parsed)) return null;
		const age = now - parsed.createdAt;
		if (age < 0 || age > TRANSACTION_MAX_AGE_MS) return null;
		return {
			...parsed,
			callbackPath: sanitizeAdminCallbackPath(parsed.callbackPath),
			mode: getAdminOidcTransactionMode(parsed.mode),
		};
	} catch {
		return null;
	}
};
