import { describe, expect, it, vi } from "vitest";
import type { AdminConfigurationDependencies } from "../src/admin-configuration";
import {
	ADMIN_CONFIGURATION_RATE_LIMIT_RULE,
	createSignedConfigurationRequest,
	getAdminConfigurationRateLimitKey,
	handleAdminConfiguration,
} from "../src/admin-configuration";

const strongSecret = "s".repeat(48);

const signBase64 = async (value: string) => {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(strongSecret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = new Uint8Array(
		await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
	);
	let binary = "";
	for (const byte of signature) binary += String.fromCharCode(byte);
	return btoa(binary);
};

const status = {
	structuralReady: true,
	operationalState: "disabled",
	revision: 0,
	validated: false,
	updatedAt: null,
	capabilities: { email: false, sms: false },
	channels: {
		email: {
			provider: "resend",
			configured: false,
			validated: false,
			activeVersion: null,
			nextVersion: null,
			previousVersion: null,
			updatedAt: null,
			lastTestedAt: null,
		},
		sms: {
			provider: "twilio",
			configured: false,
			validated: false,
			activeVersion: null,
			nextVersion: null,
			previousVersion: null,
			updatedAt: null,
			lastTestedAt: null,
		},
	},
} as const;

const makeDependencies = (
	role: string | null = "super_admin",
	options: {
		createdAt?: Date | string;
		impersonatedBy?: string | null;
	} = {},
) => {
	const getSession = vi.fn(async () =>
		role === null
			? null
			: {
					user: { id: "admin-1", role },
					session: {
						createdAt: options.createdAt ?? new Date(),
						impersonatedBy: options.impersonatedBy ?? null,
					},
				},
	);
	const consumeRateLimit = vi.fn(async () => ({
		allowed: true,
		retryAfter: null,
	}));
	const resolveSecret = vi.fn(async () => strongSecret);
	const fetchService = vi.fn(
		async () =>
			new Response(JSON.stringify(status), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
	);
	const writeAudit = vi.fn(async () => undefined);
	const logEvent = vi.fn();
	const dependencies: AdminConfigurationDependencies = {
		getSession,
		consumeRateLimit,
		resolveSecret,
		fetchService,
		writeAudit,
		logEvent,
	};
	return {
		dependencies,
		getSession,
		consumeRateLimit,
		resolveSecret,
		fetchService,
		writeAudit,
		logEvent,
	};
};

const call = (
	dependencies: AdminConfigurationDependencies,
	input: {
		service?: "delivery" | "erasure";
		action?: "status" | "stage" | "test" | "activate" | "rollback";
		body?: unknown;
		origin?: string | null;
	} = {},
) =>
	handleAdminConfiguration({
		dependencies,
		service: input.service ?? "delivery",
		action: input.action ?? "status",
		origin:
			input.origin === undefined ? "https://admin.cinaseek.ai" : input.origin,
		allowedOrigin: "https://admin.cinaseek.ai",
		readBody: async () => ({ ok: true, value: input.body ?? {} }),
	});

describe("authoritative Admin configuration control plane", () => {
	it("permits read-only delivery status to security_admin without a fresh session", async () => {
		const { dependencies, fetchService, consumeRateLimit } = makeDependencies(
			"security_admin",
			{ createdAt: new Date(0) },
		);

		const result = await call(dependencies);

		expect(result).toMatchObject({ status: 200, body: { ok: true } });
		expect(fetchService).toHaveBeenCalledOnce();
		expect(consumeRateLimit).toHaveBeenCalledWith(
			getAdminConfigurationRateLimitKey("admin-1", "delivery", "status"),
			ADMIN_CONFIGURATION_RATE_LIMIT_RULE,
		);
	});

	it("fails closed when the status rate limiter is unavailable or rejects", async () => {
		const missing = makeDependencies("security_admin");
		missing.dependencies.consumeRateLimit = undefined;
		const readBody = vi.fn(async () => ({ ok: true as const, value: {} }));

		const missingResult = await handleAdminConfiguration({
			dependencies: missing.dependencies,
			service: "delivery",
			action: "status",
			origin: "https://admin.cinaseek.ai",
			allowedOrigin: "https://admin.cinaseek.ai",
			readBody,
		});
		expect(missingResult).toMatchObject({
			status: 503,
			body: { error: { code: "RATE_LIMIT_UNAVAILABLE" } },
		});
		expect(readBody).not.toHaveBeenCalled();
		expect(missing.fetchService).not.toHaveBeenCalled();

		const limited = makeDependencies("security_admin");
		limited.consumeRateLimit.mockResolvedValueOnce({
			allowed: false,
			retryAfter: 45,
		});
		const limitedResult = await call(limited.dependencies);
		expect(limitedResult).toMatchObject({
			status: 429,
			retryAfter: 45,
			body: { error: { code: "RATE_LIMITED" } },
		});
		expect(limited.fetchService).not.toHaveBeenCalled();

		const failed = makeDependencies("security_admin");
		failed.consumeRateLimit.mockRejectedValueOnce(new Error("limiter offline"));
		const failedResult = await call(failed.dependencies);
		expect(failedResult).toMatchObject({
			status: 503,
			body: { error: { code: "RATE_LIMIT_UNAVAILABLE" } },
		});
		expect(failed.logEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "cinaauth.admin_configuration.failed",
				code: "RATE_LIMIT_UNAVAILABLE",
			}),
		);
		expect(failed.fetchService).not.toHaveBeenCalled();
	});

	it("rejects unauthenticated requests before reading or forwarding configuration", async () => {
		const { dependencies, fetchService, resolveSecret } =
			makeDependencies(null);
		const readBody = vi.fn(async () => ({ ok: true as const, value: {} }));

		const result = await handleAdminConfiguration({
			dependencies,
			service: "delivery",
			action: "stage",
			origin: "https://admin.cinaseek.ai",
			allowedOrigin: "https://admin.cinaseek.ai",
			readBody,
		});

		expect(result).toMatchObject({
			status: 401,
			body: { error: { code: "UNAUTHORIZED" } },
		});
		expect(readBody).not.toHaveBeenCalled();
		expect(resolveSecret).not.toHaveBeenCalled();
		expect(fetchService).not.toHaveBeenCalled();
	});

	it("requires the dedicated manage permission and recent authentication", async () => {
		const readOnly = makeDependencies("security_admin");
		const forbidden = await call(readOnly.dependencies, {
			action: "stage",
			body: {
				expectedVersion: 0,
				idempotencyKey: "config-change-0001",
				channel: "email",
				config: {
					provider: "resend",
					apiKey: "re_example-secret-key",
					from: "CinaSeek <identity@example.com>",
				},
			},
		});
		expect(forbidden).toMatchObject({
			status: 403,
			body: { error: { code: "FORBIDDEN" } },
		});
		expect(readOnly.fetchService).not.toHaveBeenCalled();

		const stale = makeDependencies("super_admin", { createdAt: new Date(0) });
		const staleResult = await call(stale.dependencies, {
			action: "activate",
			body: {
				expectedVersion: 2,
				idempotencyKey: "config-change-0002",
				channel: "email",
				confirmation: "ACTIVATE",
			},
		});
		expect(staleResult).toMatchObject({
			status: 403,
			body: { error: { code: "SESSION_NOT_FRESH" } },
		});
		expect(stale.fetchService).not.toHaveBeenCalled();
	});

	it("rejects every configuration operation from an impersonated session", async () => {
		const { dependencies, fetchService } = makeDependencies("super_admin", {
			impersonatedBy: "admin-original",
		});
		const result = await call(dependencies);
		expect(result).toMatchObject({
			status: 403,
			body: { error: { code: "IMPERSONATION_NOT_ALLOWED" } },
		});
		expect(fetchService).not.toHaveBeenCalled();
	});

	it("rejects cross-origin browser requests and malformed write bodies", async () => {
		const crossOrigin = makeDependencies();
		const crossOriginResult = await call(crossOrigin.dependencies, {
			action: "stage",
			origin: "https://evil.example",
			body: {},
		});
		expect(crossOriginResult.status).toBe(403);
		expect(crossOrigin.fetchService).not.toHaveBeenCalled();

		const malformed = makeDependencies();
		const malformedResult = await call(malformed.dependencies, {
			action: "stage",
			body: {
				expectedVersion: 0,
				idempotencyKey: "config-change-0003",
				channel: "email",
				config: {
					provider: "resend",
					apiKey: "re_example-secret-key",
					from: "CinaSeek <identity@example.com>",
				},
				extra: "must-not-be-forwarded",
			},
		});
		expect(malformedResult).toMatchObject({
			status: 400,
			body: { error: { code: "INVALID_CONFIGURATION_REQUEST" } },
		});
		expect(malformed.fetchService).not.toHaveBeenCalled();
	});

	it("fails closed when the mutation rate limiter is unavailable or rejects", async () => {
		const missing = makeDependencies();
		missing.dependencies.consumeRateLimit = undefined;
		const missingResult = await call(missing.dependencies, {
			action: "rollback",
			body: {
				expectedVersion: 3,
				idempotencyKey: "config-change-0004",
				channel: "email",
				confirmation: "ROLLBACK",
			},
		});
		expect(missingResult).toMatchObject({
			status: 503,
			body: { error: { code: "RATE_LIMIT_UNAVAILABLE" } },
		});

		const limited = makeDependencies();
		limited.consumeRateLimit.mockResolvedValueOnce({
			allowed: false,
			retryAfter: 123,
		});
		const limitedResult = await call(limited.dependencies, {
			action: "rollback",
			body: {
				expectedVersion: 3,
				idempotencyKey: "config-change-0005",
				channel: "email",
				confirmation: "ROLLBACK",
			},
		});
		expect(limitedResult).toMatchObject({
			status: 429,
			retryAfter: 123,
			body: { error: { code: "RATE_LIMITED" } },
		});
		expect(limited.fetchService).not.toHaveBeenCalled();
	});

	it("writes an intent audit before forwarding and never includes submitted secrets", async () => {
		const { dependencies, fetchService, writeAudit } = makeDependencies();
		fetchService.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					operation: "stage",
					revision: 1,
					version: 1,
					validated: false,
					updatedAt: new Date().toISOString(),
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);
		const body = {
			expectedVersion: 0,
			idempotencyKey: "config-change-0006",
			channel: "email",
			config: {
				provider: "resend",
				apiKey: "re_do-not-log-this-key",
				from: "CinaSeek <identity@example.com>",
			},
		};

		const result = await call(dependencies, { action: "stage", body });

		expect(result.status).toBe(200);
		expect(writeAudit).toHaveBeenCalledTimes(2);
		expect(writeAudit.mock.invocationCallOrder[0]).toBeLessThan(
			fetchService.mock.invocationCallOrder[0]!,
		);
		const serializedAudit = JSON.stringify(writeAudit.mock.calls);
		expect(serializedAudit).not.toContain(body.config.apiKey);
		expect(serializedAudit).not.toContain(body.config.from);
	});

	it("forwards only the strictly parsed Delivery DTO to the fixed protocol", async () => {
		const { dependencies, fetchService } = makeDependencies();
		let forwarded: unknown;
		fetchService.mockImplementationOnce(async (_service, request) => {
			forwarded = JSON.parse(await request.clone().text()) as unknown;
			return new Response(
				JSON.stringify({
					operation: "stage",
					revision: 1,
					version: 1,
					validated: false,
					updatedAt: "2026-08-11T12:00:00.000Z",
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		});

		const result = await call(dependencies, {
			action: "stage",
			body: {
				expectedVersion: 0,
				idempotencyKey: "config-change-0010",
				channel: "sms",
				config: {
					provider: "twilio",
					accountSid: `AC${"a".repeat(32)}`,
					authToken: "twilio-auth-token-value",
					fromNumber: "+6591234567",
				},
			},
		});

		expect(result.status).toBe(200);
		expect(forwarded).toEqual({
			expectedVersion: 0,
			idempotencyKey: "config-change-0010",
			channel: "sms",
			config: {
				provider: "twilio",
				accountSid: `AC${"a".repeat(32)}`,
				authToken: "twilio-auth-token-value",
				fromNumber: "+6591234567",
			},
		});
	});

	it("projects write-only erasure targets and read-safe internal slot status", async () => {
		const stage = makeDependencies();
		let forwarded: unknown;
		stage.fetchService.mockImplementationOnce(async (_service, request) => {
			forwarded = JSON.parse(await request.clone().text()) as unknown;
			return new Response(
				JSON.stringify({
					operation: "stage",
					revision: 1,
					version: 1,
					validated: false,
					updatedAt: "2026-08-11T12:00:00.000Z",
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		});
		const staged = await call(stage.dependencies, {
			service: "erasure",
			action: "stage",
			body: {
				expectedVersion: 0,
				idempotencyKey: "config-change-0011",
				targets: [
					{
						id: "cinashop",
						url: "https://api.cinashop.example/privacy/erase",
						signingSecret: "target-secret-".repeat(3),
					},
				],
			},
		});
		expect(staged.status).toBe(200);
		expect(forwarded).toEqual({
			schemaVersion: 1,
			action: "stage",
			expectedVersion: 0,
			idempotencyKey: "config-change-0011",
			targets: [
				{
					id: "cinashop",
					url: "https://api.cinashop.example/privacy/erase",
					secret: "target-secret-".repeat(3),
				},
			],
		});

		const read = makeDependencies("security_admin");
		read.fetchService.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					revision: 1,
					structuralReady: true,
					operationalReady: false,
					source: "dynamic",
					active: null,
					next: {
						version: 1,
						targetIds: ["cinashop"],
						targetCount: 1,
						configured: true,
						validated: false,
						createdAt: "2026-08-11T12:00:00.000Z",
						testedAt: null,
						activatedAt: null,
					},
					previous: null,
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);
		const readResult = await call(read.dependencies, {
			service: "erasure",
		});
		expect(readResult).toMatchObject({
			status: 200,
			body: {
				ok: true,
				data: {
					operationalState: "degraded",
					capabilities: { execution: false, verification: true },
					slots: {
						next: {
							targetIds: ["cinashop"],
							lastTestedAt: null,
						},
					},
				},
			},
		});
		expect(JSON.stringify(readResult)).not.toContain("privacy/erase");
		expect(JSON.stringify(readResult)).not.toContain("target-secret");
	});

	it("preserves safe conflict and retry responses but rejects malformed success data", async () => {
		const conflict = makeDependencies();
		conflict.fetchService.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					code: "revision_conflict",
					message: "Configuration changed; refresh and retry",
				}),
				{ status: 409, headers: { "Content-Type": "application/json" } },
			),
		);
		const conflictResult = await call(conflict.dependencies, {
			action: "activate",
			body: {
				expectedVersion: 2,
				idempotencyKey: "config-change-0007",
				channel: "email",
				confirmation: "ACTIVATE",
			},
		});
		expect(conflictResult).toMatchObject({
			status: 409,
			body: { error: { code: "REVISION_CONFLICT" } },
		});

		const malformed = makeDependencies();
		malformed.fetchService.mockResolvedValueOnce(
			new Response(JSON.stringify({ apiKey: "re_leaked" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
		const malformedResult = await call(malformed.dependencies);
		expect(malformedResult).toMatchObject({
			status: 502,
			body: { error: { code: "CONFIGURATION_RESPONSE_INVALID" } },
		});
		expect(JSON.stringify(malformedResult)).not.toContain("re_leaked");
	});
});

describe("signed internal configuration requests", () => {
	it("signs Delivery requests without exposing the secret in URL or body", async () => {
		const request = await createSignedConfigurationRequest({
			service: "delivery",
			action: "stage",
			body: JSON.stringify({ expectedVersion: 0 }),
			idempotencyKey: "config-change-0008",
			secret: strongSecret,
			now: 1_800_000_000_000,
		});
		const timestamp = request.headers.get("x-cinaauth-delivery-timestamp");
		expect(request.url).toBe(
			"https://cinaauth-delivery.internal/cinaauth/delivery/config/stage",
		);
		expect(request.headers.get("authorization")).toBe(`Bearer ${strongSecret}`);
		expect(request.headers.get("x-cinaauth-delivery-id")).toBe(
			"config-change-0008",
		);
		expect(timestamp).toBe("1800000000");
		expect(request.headers.get("x-cinaauth-delivery-signature")).toMatch(
			/^v1=[a-f0-9]{64}$/,
		);
		expect(await request.clone().text()).not.toContain(strongSecret);
		expect(request.url).not.toContain(strongSecret);
	});

	it("uses a time-bound privacy signature and a fixed internal path", async () => {
		const nonce = "config-change-privacy-0001";
		const body = JSON.stringify({ schemaVersion: 1, action: "status" });
		const request = await createSignedConfigurationRequest({
			service: "erasure",
			action: "status",
			body,
			idempotencyKey: nonce,
			secret: strongSecret,
			now: 1_800_000_000_000,
		});
		expect(request.url).toBe(
			"https://cinaauth-erasure.internal/internal/config/erasure/status",
		);
		expect(request.headers.get("x-cinaauth-signature")).toBe(
			`v1=${await signBase64(`1800000000.${nonce}.${body}`)}`,
		);
		expect(request.headers.get("x-cinaauth-timestamp")).toBe("1800000000");
		expect(request.headers.get("x-cinaauth-nonce")).toBe(nonce);
		expect(request.headers.get("authorization")).toBeNull();
	});

	it("uses stable low-cardinality rate-limit buckets", () => {
		expect(
			getAdminConfigurationRateLimitKey(
				"admin/with spaces",
				"delivery",
				"activate",
			),
		).toBe("admin-configuration|admin%2Fwith%20spaces|delivery|activate");
		expect(ADMIN_CONFIGURATION_RATE_LIMIT_RULE).toEqual({
			window: 5 * 60,
			max: 10,
		});
	});
});
