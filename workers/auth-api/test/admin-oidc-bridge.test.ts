import { ADMIN_OIDC_CLIENT_ID } from "@cinaauth/auth-web-contract";
import { describe, expect, it } from "vitest";
import {
	ADMIN_OIDC_BRIDGE_RATE_LIMIT,
	extractBearerToken,
	hasAuthorizedAdminRole,
	isAdminAccessToken,
	resolveAdminAuthenticationTime,
	verifyBridgeSecret,
} from "../src/admin-oidc-bridge";

describe("Admin OIDC session bridge policy", () => {
	it("uses a per-subject Durable Object bridge limit", () => {
		expect(ADMIN_OIDC_BRIDGE_RATE_LIMIT).toEqual({ window: 60, max: 10 });
	});

	it("accepts only a Bearer authorization header", () => {
		expect(extractBearerToken("Bearer signed-token")).toBe("signed-token");
		expect(extractBearerToken("Basic signed-token")).toBeNull();
		expect(extractBearerToken(null)).toBeNull();
	});

	it("requires both the Admin audience and authorized party", () => {
		expect(
			isAdminAccessToken(
				{ aud: "https://admin.cinaseek.ai", azp: ADMIN_OIDC_CLIENT_ID },
				"https://admin.cinaseek.ai",
			),
		).toBe(true);
		expect(
			isAdminAccessToken(
				{ aud: "https://other.example", azp: ADMIN_OIDC_CLIENT_ID },
				"https://admin.cinaseek.ai",
			),
		).toBe(false);
		expect(
			isAdminAccessToken(
				{ aud: "https://admin.cinaseek.ai", azp: "other-client" },
				"https://admin.cinaseek.ai",
			),
		).toBe(false);
	});

	it("supports comma-separated roles but no non-admin role", () => {
		expect(hasAuthorizedAdminRole("super_admin")).toBe(true);
		expect(hasAuthorizedAdminRole("user,security_admin")).toBe(true);
		expect(hasAuthorizedAdminRole("user, security_admin")).toBe(false);
		expect(hasAuthorizedAdminRole("user")).toBe(false);
		expect(hasAuthorizedAdminRole(undefined)).toBe(false);
	});

	it("compares the service bridge secret without accepting weak config", async () => {
		const secret = "bridge-secret-with-at-least-32-characters";
		await expect(verifyBridgeSecret(secret, secret)).resolves.toBe(true);
		await expect(verifyBridgeSecret("wrong", secret)).resolves.toBe(false);
		await expect(verifyBridgeSecret("short", "short")).resolves.toBe(false);
	});

	it("derives Worker freshness from verified OIDC auth_time, never bridge time", () => {
		const now = Date.parse("2026-08-11T08:00:00.000Z");
		expect(resolveAdminAuthenticationTime("1786434900", now)).toEqual(
			new Date("2026-08-11T07:55:00.000Z"),
		);
		expect(resolveAdminAuthenticationTime(null, now)).toEqual(new Date(0));
		expect(resolveAdminAuthenticationTime("not-a-time", now)).toEqual(
			new Date(0),
		);
		expect(resolveAdminAuthenticationTime("1786435201", now)).toEqual(
			new Date(0),
		);
	});
});
