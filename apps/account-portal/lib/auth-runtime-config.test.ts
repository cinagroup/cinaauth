import { afterEach, describe, expect, it, vi } from "vitest";
import {
	AUTH_SERVICE_UNAVAILABLE_BODY,
	DEFAULT_CINAAUTH_API_URL,
	isPublicAuthFallbackAllowed,
	resolveAuthClientRuntimeBaseURL,
	resolveAuthRuntimeConfiguration,
	UNAVAILABLE_CINAAUTH_API_URL,
} from "./auth-runtime-config";

describe("Account Auth runtime configuration", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("allows public fallback only for an exact false policy", () => {
		expect(isPublicAuthFallbackAllowed("false")).toBe(true);
		for (const value of [undefined, "true", "TRUE", " false ", "0", ""]) {
			expect(isPublicAuthFallbackAllowed(value)).toBe(false);
		}
	});

	it("requires a configured HTTPS origin in required mode", () => {
		expect(resolveAuthRuntimeConfiguration(undefined, "true")).toEqual({
			baseURL: null,
			failure: "missing-auth-url",
			publicFallbackAllowed: false,
		});
		expect(
			resolveAuthRuntimeConfiguration(
				"https://auth.siwe-staging.cinaseek.ai/path",
				"true",
			),
		).toEqual({
			baseURL: null,
			failure: "invalid-auth-url",
			publicFallbackAllowed: false,
		});
		for (const origin of [
			"https://auth.siwe-staging.cinaseek.ai:443",
			"https://auth.siwe-staging.cinaseek.ai:8443",
		]) {
			expect(resolveAuthRuntimeConfiguration(origin, "true")).toEqual({
				baseURL: null,
				failure: "invalid-auth-url",
				publicFallbackAllowed: false,
			});
		}
		expect(
			resolveAuthRuntimeConfiguration(
				"https://auth.siwe-staging.cinaseek.ai/",
				"true",
			),
		).toEqual({
			baseURL: "https://auth.siwe-staging.cinaseek.ai",
			failure: null,
			publicFallbackAllowed: false,
		});
	});

	it("keeps the legacy default only for explicit local fallback", () => {
		expect(resolveAuthRuntimeConfiguration(undefined, "false")).toEqual({
			baseURL: DEFAULT_CINAAUTH_API_URL,
			failure: null,
			publicFallbackAllowed: true,
		});
		expect(
			resolveAuthRuntimeConfiguration("http://localhost:8787", "false"),
		).toEqual({
			baseURL: "http://localhost:8787",
			failure: null,
			publicFallbackAllowed: true,
		});
		expect(
			resolveAuthClientRuntimeBaseURL(
				"http://localhost:3000",
				undefined,
				"false",
			),
		).toBe("http://localhost:3000");
	});

	it("never supplies the production default to server-side client code in required mode", () => {
		expect(resolveAuthClientRuntimeBaseURL(undefined, undefined, "true")).toBe(
			UNAVAILABLE_CINAAUTH_API_URL,
		);
		expect(
			resolveAuthClientRuntimeBaseURL(
				"https://accounts.siwe-staging.cinaseek.ai",
				undefined,
				"true",
			),
		).toBe("https://accounts.siwe-staging.cinaseek.ai");
		expect(resolveAuthClientRuntimeBaseURL(undefined, undefined, "false")).toBe(
			DEFAULT_CINAAUTH_API_URL,
		);
	});

	it("returns a stable no-store service-unavailable response", async () => {
		const { createAuthServiceUnavailableResponse } = await import(
			"./auth-runtime-config"
		);
		const response = createAuthServiceUnavailableResponse();
		expect(response.status).toBe(503);
		expect(response.headers.get("cache-control")).toBe("no-store");
		await expect(response.json()).resolves.toEqual(
			AUTH_SERVICE_UNAVAILABLE_BODY,
		);
	});
});
