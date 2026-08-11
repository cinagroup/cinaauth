import { describe, expect, it } from "vitest";
import type { AdminOidcTransaction } from "@/lib/cinaauth/oidc-transaction";
import {
	ADMIN_OIDC_RECENT_AUTH_COOKIE,
	getAdminOidcTransactionMode,
	openOidcTransaction,
	openRecentAuthenticationProof,
	sanitizeAdminCallbackPath,
	sealOidcTransaction,
	sealRecentAuthenticationProof,
} from "@/lib/cinaauth/oidc-transaction";

const SIGNING_SECRET = "transaction-secret-with-at-least-32-characters";
const NOW = Date.UTC(2026, 7, 10, 12, 0, 0);
const TRANSACTION: AdminOidcTransaction = {
	state: "state-value",
	nonce: "nonce-value",
	codeVerifier: "verifier-value",
	callbackPath: "/users?status=active",
	createdAt: NOW,
	mode: "step-up",
};

describe("Admin OIDC transaction cookie", () => {
	it("round-trips an unexpired signed transaction", async () => {
		const value = await sealOidcTransaction(TRANSACTION, SIGNING_SECRET);
		await expect(
			openOidcTransaction(value, SIGNING_SECRET, NOW + 60_000),
		).resolves.toEqual(TRANSACTION);
	});

	it("rejects tampering, expiration, and weak secrets", async () => {
		const value = await sealOidcTransaction(TRANSACTION, SIGNING_SECRET);
		const tampered = `${value.slice(0, -1)}${value.endsWith("a") ? "b" : "a"}`;

		await expect(
			openOidcTransaction(tampered, SIGNING_SECRET, NOW + 60_000),
		).resolves.toBeNull();
		await expect(
			openOidcTransaction(value, SIGNING_SECRET, NOW + 11 * 60_000),
		).resolves.toBeNull();
		await expect(sealOidcTransaction(TRANSACTION, "short")).rejects.toThrow(
			/at least 32/i,
		);
	});

	it("keeps only same-origin relative callback paths", () => {
		expect(sanitizeAdminCallbackPath("/users?status=active")).toBe(
			"/users?status=active",
		);
		expect(sanitizeAdminCallbackPath("https://attacker.example/")).toBe(
			"/dashboard",
		);
		expect(sanitizeAdminCallbackPath("//attacker.example/")).toBe("/dashboard");
		expect(sanitizeAdminCallbackPath("login")).toBe("/dashboard");
	});

	it("normalizes only the controlled step-up mode", async () => {
		expect(getAdminOidcTransactionMode("step-up")).toBe("step-up");
		expect(getAdminOidcTransactionMode("STEP-UP")).toBe("login");
		expect(getAdminOidcTransactionMode("admin")).toBe("login");
		expect(getAdminOidcTransactionMode(null)).toBe("login");
		const regular = await sealOidcTransaction(
			{ ...TRANSACTION, mode: "login" },
			SIGNING_SECRET,
		);
		await expect(
			openOidcTransaction(regular, SIGNING_SECRET, NOW + 60_000),
		).resolves.toMatchObject({ mode: "login" });
	});

	it("seals a short-lived recent-auth proof bound to the OIDC subject", async () => {
		const authenticationTime = Math.floor(NOW / 1000);
		const value = await sealRecentAuthenticationProof(
			"admin-user",
			authenticationTime,
			SIGNING_SECRET,
		);

		expect(ADMIN_OIDC_RECENT_AUTH_COOKIE).toBe(
			"__Host-cinaadmin_recent_auth",
		);
		await expect(
			openRecentAuthenticationProof(
				value,
				SIGNING_SECRET,
				"admin-user",
				NOW + 60_000,
			),
		).resolves.toEqual({ subject: "admin-user", authenticationTime });
		await expect(
			openRecentAuthenticationProof(
				value,
				SIGNING_SECRET,
				"another-admin",
				NOW + 60_000,
			),
		).resolves.toBeNull();
		await expect(
			openRecentAuthenticationProof(
				value,
				SIGNING_SECRET,
				"admin-user",
				NOW + 6 * 60_000,
			),
		).resolves.toBeNull();
	});
});
