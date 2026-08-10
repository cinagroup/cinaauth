import { describe, expect, it } from "vitest";
import type { OidcClientConfig } from "./config";
import type { OidcSession } from "./storage";
import {
	loadOidcSession,
	saveAuthorizationTransaction,
	saveOidcSession,
	takeAuthorizationTransaction,
} from "./storage";

const createStorage = (): Storage => {
	const values = new Map<string, string>();
	return {
		get length() {
			return values.size;
		},
		clear: () => values.clear(),
		getItem: (key) => values.get(key) ?? null,
		key: (index) => [...values.keys()][index] ?? null,
		removeItem: (key) => values.delete(key),
		setItem: (key, value) => values.set(key, value),
	};
};

const config: OidcClientConfig = {
	issuer: "https://auth.cinaseek.ai",
	clientId: "cinaauth-oidc-demo",
	redirectUri: "https://oidc-demo.cinaseek.ai/callback",
	postLogoutRedirectUri: "https://oidc-demo.cinaseek.ai",
	scope: "openid profile email",
};

describe("OIDC browser storage", () => {
	it("consumes a valid authorization transaction exactly once", () => {
		const storage = createStorage();
		saveAuthorizationTransaction(storage, {
			codeVerifier: "verifier",
			state: "state",
			nonce: "nonce",
			redirectUri: config.redirectUri,
			createdAt: 1_000,
		});

		expect(takeAuthorizationTransaction(storage, 2_000)?.state).toBe("state");
		expect(takeAuthorizationTransaction(storage, 2_000)).toBeUndefined();
	});

	it("rejects expired transactions and expired or cross-client sessions", () => {
		const storage = createStorage();
		saveAuthorizationTransaction(storage, {
			codeVerifier: "verifier",
			state: "state",
			nonce: "nonce",
			redirectUri: config.redirectUri,
			createdAt: 1_000,
		});
		expect(
			takeAuthorizationTransaction(storage, 11 * 60 * 1000),
		).toBeUndefined();

		const session: OidcSession = {
			accessToken: "access-token",
			idToken: "id-token",
			tokenType: "bearer",
			expiresAt: 5_000,
			issuer: config.issuer,
			clientId: config.clientId,
			user: { sub: "user-id" },
		};
		saveOidcSession(storage, session);
		expect(loadOidcSession(storage, config, 5_000)).toBeUndefined();
		saveOidcSession(storage, { ...session, expiresAt: 10_000 });
		expect(
			loadOidcSession(storage, { ...config, clientId: "other" }, 5_000),
		).toBeUndefined();
	});
});
