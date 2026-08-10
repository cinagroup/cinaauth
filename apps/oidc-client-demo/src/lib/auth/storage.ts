import type { OidcClientConfig } from "./config";

const TRANSACTION_KEY = "cinaauth:oidc-demo:transaction:v1";
const SESSION_KEY = "cinaauth:oidc-demo:session:v1";
const TRANSACTION_MAX_AGE_MS = 10 * 60 * 1000;

export type AuthorizationTransaction = {
	codeVerifier: string;
	state: string;
	nonce: string;
	redirectUri: string;
	createdAt: number;
};

export type OidcSession = {
	accessToken: string;
	idToken: string;
	tokenType: string;
	expiresAt: number;
	issuer: string;
	clientId: string;
	user: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const saveAuthorizationTransaction = (
	storage: Storage,
	transaction: AuthorizationTransaction,
) => storage.setItem(TRANSACTION_KEY, JSON.stringify(transaction));

export const takeAuthorizationTransaction = (
	storage: Storage,
	now = Date.now(),
): AuthorizationTransaction | undefined => {
	const serialized = storage.getItem(TRANSACTION_KEY);
	storage.removeItem(TRANSACTION_KEY);
	if (!serialized) return undefined;
	try {
		const value: unknown = JSON.parse(serialized);
		if (
			!isRecord(value) ||
			typeof value.codeVerifier !== "string" ||
			typeof value.state !== "string" ||
			typeof value.nonce !== "string" ||
			typeof value.redirectUri !== "string" ||
			typeof value.createdAt !== "number" ||
			now - value.createdAt < 0 ||
			now - value.createdAt > TRANSACTION_MAX_AGE_MS
		) {
			return undefined;
		}
		return value as AuthorizationTransaction;
	} catch {
		return undefined;
	}
};

export const saveOidcSession = (storage: Storage, session: OidcSession) =>
	storage.setItem(SESSION_KEY, JSON.stringify(session));

export const loadOidcSession = (
	storage: Storage,
	config: OidcClientConfig,
	now = Date.now(),
): OidcSession | undefined => {
	const serialized = storage.getItem(SESSION_KEY);
	if (!serialized) return undefined;
	try {
		const value: unknown = JSON.parse(serialized);
		if (
			!isRecord(value) ||
			typeof value.accessToken !== "string" ||
			typeof value.idToken !== "string" ||
			typeof value.tokenType !== "string" ||
			typeof value.expiresAt !== "number" ||
			typeof value.issuer !== "string" ||
			typeof value.clientId !== "string" ||
			!isRecord(value.user) ||
			value.expiresAt <= now ||
			value.issuer !== config.issuer ||
			value.clientId !== config.clientId
		) {
			storage.removeItem(SESSION_KEY);
			return undefined;
		}
		return value as OidcSession;
	} catch {
		storage.removeItem(SESSION_KEY);
		return undefined;
	}
};

export const clearOidcSession = (storage: Storage) =>
	storage.removeItem(SESSION_KEY);
