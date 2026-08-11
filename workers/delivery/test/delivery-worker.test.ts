import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeliveryWorkerEnv } from "../src/env";
import type { DeliveryMessage } from "../src/index";
import {
	createProviderRequest,
	getRuntimeConfigIssues,
	parseDeliveryMessage,
	secureEqual,
	verifyCinaAuthRequest,
} from "../src/index";

const encoder = new TextEncoder();
const strongSecret = "delivery-secret-".repeat(3);

const createSecretsStoreSecret = (
	get: () => Promise<string> = async () => strongSecret,
) =>
	({
		get: vi.fn(get),
	}) as unknown as SecretsStoreSecret;

const hmacSha256Hex = async (secret: string, payload: string) => {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(payload),
	);
	return [...new Uint8Array(signature)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
};

const createKv = () => {
	const store = new Map<string, string>();
	const get = vi.fn(async (key: string) => store.get(key) ?? null);
	const put = vi.fn(
		async (key: string, value: string, _options?: KVNamespacePutOptions) => {
			store.set(key, value);
		},
	);

	return {
		store,
		get,
		put,
		kv: {
			get,
			put,
		} as unknown as KVNamespace,
	};
};

const makeEnv = (
	overrides: Partial<DeliveryWorkerEnv> = {},
): DeliveryWorkerEnv => {
	const kv = createKv();
	const providerStatus = {
		revision: 0,
		updatedAt: null,
		channels: {
			email: {
				activeVersion: null,
				nextVersion: null,
				previousVersion: null,
				validated: false,
				updatedAt: null,
				lastTestedAt: null,
			},
			sms: {
				activeVersion: null,
				nextVersion: null,
				previousVersion: null,
				validated: false,
				updatedAt: null,
				lastTestedAt: null,
			},
		},
	};
	const configStub = {
		status: vi.fn(async () => providerStatus),
		getActive: vi.fn(async () => ({ configured: false as const })),
		checkEncryptionKey: vi.fn(async () => undefined),
	};
	return {
		CINAAUTH_DELIVERY_WEBHOOK_SECRET: strongSecret,
		CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: createSecretsStoreSecret(),
		CINAAUTH_DELIVERY_CONFIG_KEK_STORE: createSecretsStoreSecret(
			async () => `delivery-config-kek-${"k".repeat(48)}`,
		),
		DELIVERY_CONFIG: {
			getByName: vi.fn(() => configStub),
		} as unknown as DeliveryWorkerEnv["DELIVERY_CONFIG"],
		CINAAUTH_DELIVERY_REPLAY_KV: kv.kv,
		VERSION_METADATA: {
			id: "version-id",
			tag: "version-tag",
			timestamp: "2026-07-14T00:00:00.000Z",
		} as WorkerVersionMetadata,
		DELIVERY_ALLOWED_SKEW_SECONDS: "300",
		DELIVERY_REPLAY_TTL_SECONDS: "86400",
		RESEND_API_KEY: "resend-key",
		RESEND_EMAIL_FROM: "CinaSeek <no-reply@cinagroup.com>",
		TWILIO_ACCOUNT_SID: "AC123",
		TWILIO_AUTH_TOKEN: "twilio-token",
		TWILIO_FROM_NUMBER: "+15555550123",
		...overrides,
	} as DeliveryWorkerEnv;
};

const message: DeliveryMessage = {
	kind: "email-otp",
	payload: {
		email: "user@example.com",
		otp: "123456",
		type: "sign-in",
	},
};

const fetchWorker = async (request: Request, env: DeliveryWorkerEnv) => {
	const { default: deliveryWorker } = await import("../src/index");
	const fetch = deliveryWorker.fetch as unknown as (
		request: Request,
		env: DeliveryWorkerEnv,
	) => Promise<Response>;
	return fetch(request, env);
};

const signedRequest = async (
	body: string,
	env: DeliveryWorkerEnv,
	options: {
		deliveryId?: string;
		now?: Date;
	} = {},
) => {
	const deliveryId = options.deliveryId || "delivery-1";
	const secret =
		(await env.CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2?.get()) ??
		env.CINAAUTH_DELIVERY_WEBHOOK_SECRET;
	if (!secret) throw new Error("test delivery secret is unavailable");
	const timestamp = Math.floor(
		(options.now?.getTime() ?? Date.now()) / 1000,
	).toString();
	const signature = await hmacSha256Hex(
		secret,
		`${timestamp}.${deliveryId}.${body}`,
	);
	return new Request(
		"https://cinaauth-delivery.cinagroup.com/cinaauth/delivery",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${secret}`,
				"Content-Type": "application/json",
				"X-CinaAuth-Delivery-Id": deliveryId,
				"X-CinaAuth-Delivery-Timestamp": timestamp,
				"X-CinaAuth-Delivery-Signature": `v1=${signature}`,
			},
			body,
		},
	);
};

const signedConfigRequest = async (
	path: "status" | "stage" | "test" | "activate" | "rollback",
	body: string,
	env: DeliveryWorkerEnv,
	idempotencyKey: string,
) => {
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const storeSecret =
		await env.CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2?.get();
	if (!storeSecret) throw new Error("test Store secret is unavailable");
	const signature = await hmacSha256Hex(
		storeSecret,
		`${timestamp}.${idempotencyKey}.${body}`,
	);
	return new Request(
		`https://cinaauth-delivery.cinagroup.com/cinaauth/delivery/config/${path}`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${storeSecret}`,
				"Content-Type": "application/json",
				"X-CinaAuth-Delivery-Id": idempotencyKey,
				"X-CinaAuth-Delivery-Timestamp": timestamp,
				"X-CinaAuth-Delivery-Signature": `v1=${signature}`,
			},
			body,
		},
	);
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("delivery webhook security", () => {
	it("verifies signed CinaAuth delivery requests", async () => {
		const env = makeEnv();
		const body = JSON.stringify(message);
		const now = new Date("2026-07-14T00:00:00.000Z");
		const request = await signedRequest(body, env, { now });

		await expect(
			verifyCinaAuthRequest(request, env, body, now.getTime()),
		).resolves.toEqual({
			deliveryId: "delivery-1",
			timestampSeconds: 1783987200,
		});
	});

	it("rejects stale signatures", async () => {
		const env = makeEnv();
		const body = JSON.stringify(message);
		const signedAt = new Date("2026-07-14T00:00:00.000Z");
		const checkedAt = new Date("2026-07-14T00:10:01.000Z");
		const request = await signedRequest(body, env, { now: signedAt });

		await expect(
			verifyCinaAuthRequest(request, env, body, checkedAt.getTime()),
		).rejects.toMatchObject({
			code: "stale_signature",
			status: 401,
		});
	});

	it("compares secrets without direct string equality", async () => {
		await expect(secureEqual("same-token", "same-token")).resolves.toBe(true);
		await expect(secureEqual("same-token", "different-token")).resolves.toBe(
			false,
		);
		await expect(secureEqual(undefined, "same-token")).resolves.toBe(false);
	});
});

describe("provider requests", () => {
	it("creates Resend requests for email delivery", () => {
		const request = createProviderRequest(makeEnv(), message);
		expect(request.url).toBe("https://api.resend.com/emails");
		expect(request.method).toBe("POST");
		const headers = new Headers(request.headers);
		expect(headers.get("Authorization")).toBe("Bearer resend-key");
		expect(JSON.parse(request.body as string)).toMatchObject({
			from: "CinaSeek <no-reply@cinagroup.com>",
			to: ["user@example.com"],
			subject: "Your CinaSeek verification code",
		});
	});

	it("uses CinaSeek branding in every provider-visible email and SMS field", () => {
		const emailMessages: DeliveryMessage[] = [
			message,
			{
				kind: "email-otp",
				payload: {
					email: "user@example.com",
					otp: "123456",
					type: "email-verification",
				},
			},
			{
				kind: "magic-link",
				payload: {
					email: "user@example.com",
					url: "https://accounts.cinaseek.ai/sign-in/magic-link",
				},
			},
			{
				kind: "password-reset",
				payload: {
					email: "user@example.com",
					url: "https://accounts.cinaseek.ai/reset-password",
				},
			},
		];

		for (const emailMessage of emailMessages) {
			const request = createProviderRequest(makeEnv(), emailMessage);
			const payload = JSON.parse(request.body as string) as {
				from: string;
				html: string;
				subject: string;
				text: string;
			};
			for (const providerVisibleCopy of [
				payload.from,
				payload.subject,
				payload.text,
				payload.html,
			]) {
				expect(providerVisibleCopy).toContain("CinaSeek");
				expect(providerVisibleCopy).not.toContain("CinaAuth");
			}
		}

		for (const kind of ["phone-otp", "phone-reset-otp"] as const) {
			const request = createProviderRequest(makeEnv(), {
				kind,
				payload: { phoneNumber: "+15555550100", code: "654321" },
			});
			expect(request.body).toBeInstanceOf(URLSearchParams);
			const body = (request.body as URLSearchParams).get("Body");
			expect(body).toBe("Your CinaSeek verification code is 654321.");
			expect(body).not.toContain("CinaAuth");
		}
	});

	it("creates Twilio requests for phone delivery", () => {
		const request = createProviderRequest(makeEnv(), {
			kind: "phone-otp",
			payload: {
				phoneNumber: "+15555550100",
				code: "654321",
			},
		});
		expect(request.url).toBe(
			"https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json",
		);
		const headers = new Headers(request.headers);
		expect(headers.get("Authorization")).toMatch(/^Basic /);
		expect(request.body).toBeInstanceOf(URLSearchParams);
		expect((request.body as URLSearchParams).get("To")).toBe("+15555550100");
	});
});

describe("delivery worker", () => {
	it("identifies the public health endpoint as CinaSeek Delivery Worker", async () => {
		const response = await fetchWorker(
			new Request("https://delivery.cinaseek.ai/"),
			makeEnv(),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			name: "CinaSeek Delivery Worker",
			status: "running",
		});
	});

	it("dispatches valid deliveries and deduplicates successful delivery ids", async () => {
		const env = makeEnv();
		const body = JSON.stringify(message);
		const request = await signedRequest(body, env);
		const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
		vi.stubGlobal("fetch", fetchMock);

		const first = await fetchWorker(request, env);
		expect(first.status).toBe(200);
		expect(await first.json()).toEqual({ success: true, duplicate: false });
		expect(fetchMock).toHaveBeenCalledOnce();

		const duplicate = await fetchWorker(await signedRequest(body, env), env);
		expect(duplicate.status).toBe(200);
		expect(await duplicate.json()).toEqual({ success: true, duplicate: true });
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it("reports missing provider inputs in readiness without exposing secrets", async () => {
		const env = makeEnv({
			RESEND_API_KEY: undefined,
			TWILIO_AUTH_TOKEN: undefined,
		});
		const issues = getRuntimeConfigIssues(env);
		expect(issues).toContain("missing_resend_api_key");
		expect(issues).toContain("missing_twilio_auth_token");
		expect(JSON.stringify(issues)).not.toContain(strongSecret);
	});

	it("reports a healthy active Secrets Store binding to authorized operators", async () => {
		const env = makeEnv();

		const response = await fetchWorker(
			new Request("https://cinaauth-delivery.cinagroup.com/ready", {
				headers: {
					Authorization: `Bearer ${env.CINAAUTH_DELIVERY_WEBHOOK_SECRET}`,
				},
			}),
			env,
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			success: true,
			runtimeConfig: { ok: true, operationalState: "ready" },
			secretsStore: { active: true, ok: true, issues: [] },
		});
	});

	it("fails readiness closed when the preferred Store read throws", async () => {
		const get = async () => {
			throw new Error("Secrets Store unavailable");
		};
		const env = makeEnv({
			CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: createSecretsStoreSecret(get),
		});

		const response = await fetchWorker(
			new Request("https://cinaauth-delivery.cinagroup.com/ready", {
				headers: {
					Authorization: `Bearer ${env.CINAAUTH_DELIVERY_WEBHOOK_SECRET}`,
				},
			}),
			env,
		);
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({
			success: false,
			runtimeConfig: { ok: false },
		});
	});

	it("hides readiness details unless the shared delivery secret is provided", async () => {
		const env = makeEnv({
			RESEND_API_KEY: undefined,
			TWILIO_AUTH_TOKEN: undefined,
		});

		const response = await fetchWorker(
			new Request("https://cinaauth-delivery.cinagroup.com/ready"),
			env,
		);
		expect(response.status).toBe(503);
		const body = (await response.json()) as {
			runtimeConfig: { issues: string[] };
		};
		expect(JSON.stringify(body)).not.toContain("missing_resend_api_key");
	});

	it("returns detailed readiness to authorized operators", async () => {
		const env = makeEnv({
			RESEND_API_KEY: undefined,
			TWILIO_AUTH_TOKEN: undefined,
		});

		const response = await fetchWorker(
			new Request("https://cinaauth-delivery.cinagroup.com/ready", {
				headers: {
					Authorization: `Bearer ${env.CINAAUTH_DELIVERY_WEBHOOK_SECRET}`,
				},
			}),
			env,
		);
		expect(response.status).toBe(503);
		const body = (await response.json()) as {
			providers: { email: boolean; sms: boolean };
			runtimeConfig: { operationalState: string };
		};
		expect(body.runtimeConfig.operationalState).toBe("disabled");
		expect(body.providers).toEqual({ email: false, sms: false });
		expect(JSON.stringify(body)).not.toContain(strongSecret);
	});

	it("parses delivery payloads without accepting unsupported kinds", () => {
		expect(parseDeliveryMessage(JSON.stringify(message))).toEqual(message);
		expect(() =>
			parseDeliveryMessage(
				JSON.stringify({
					kind: "unknown",
					payload: {},
				}),
			),
		).toThrow();
	});
});

describe("post-deploy delivery configuration API", () => {
	it("reports structural degradation when the configuration KEK is unavailable", async () => {
		const env = makeEnv({
			DELIVERY_CONFIG: {
				getByName: vi.fn(() => ({
					status: vi.fn(async () => ({
						revision: 0,
						updatedAt: null,
						channels: {
							email: {
								activeVersion: null,
								nextVersion: null,
								previousVersion: null,
								validated: false,
								updatedAt: null,
								lastTestedAt: null,
							},
							sms: {
								activeVersion: null,
								nextVersion: null,
								previousVersion: null,
								validated: false,
								updatedAt: null,
								lastTestedAt: null,
							},
						},
					})),
					getActive: vi.fn(async () => ({ configured: false as const })),
					checkEncryptionKey: vi.fn(async () => {
						throw new Error("Store unavailable");
					}),
				})),
			} as unknown as DeliveryWorkerEnv["DELIVERY_CONFIG"],
		});
		const body = "{}";
		const response = await fetchWorker(
			await signedConfigRequest("status", body, env, "delivery-status-0000"),
			env,
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			structuralReady: false,
			operationalState: "degraded",
		});
	});

	it("returns the exact read-safe per-channel status projection", async () => {
		const env = makeEnv();
		const body = "{}";
		const response = await fetchWorker(
			await signedConfigRequest("status", body, env, "delivery-status-0001"),
			env,
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			structuralReady: true,
			operationalState: "ready",
			revision: 0,
			validated: true,
			updatedAt: null,
			capabilities: { email: true, sms: true },
			channels: {
				email: {
					provider: "resend",
					configured: true,
					validated: true,
					activeVersion: null,
					nextVersion: null,
					previousVersion: null,
					updatedAt: null,
					lastTestedAt: null,
				},
				sms: {
					provider: "twilio",
					configured: true,
					validated: true,
					activeVersion: null,
					nextVersion: null,
					previousVersion: null,
					updatedAt: null,
					lastTestedAt: null,
				},
			},
		});
	});

	it("stages a write-only Resend NEXT and returns the exact safe mutation shape", async () => {
		const apiKey = `re_${"a".repeat(36)}`;
		const from = "CinaSeek <no-reply@cinaseek.ai>";
		const mutation = {
			operation: "stage" as const,
			revision: 1,
			version: 1,
			validated: false,
			updatedAt: "2026-08-11T14:00:00.000Z",
		};
		const stage = vi.fn(async () => ({ ok: true as const, value: mutation }));
		const env = makeEnv({
			DELIVERY_CONFIG: {
				getByName: vi.fn(() => ({ stage })),
			} as unknown as DeliveryWorkerEnv["DELIVERY_CONFIG"],
		});
		const body = JSON.stringify({
			expectedVersion: 0,
			idempotencyKey: "delivery-stage-email-0001",
			channel: "email",
			config: { provider: "resend", apiKey, from },
		});

		const response = await fetchWorker(
			await signedConfigRequest(
				"stage",
				body,
				env,
				"delivery-stage-email-0001",
			),
			env,
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(await response.json()).toEqual(mutation);
		expect(stage).toHaveBeenCalledWith({
			provider: "email",
			config: { apiKey, from },
			expectedVersion: 0,
			idempotencyKey: "delivery-stage-email-0001",
		});
		expect(JSON.stringify(mutation)).not.toContain(apiKey);
		expect(JSON.stringify(mutation)).not.toContain(from);
	});

	it("sends a real mockable provider test before marking NEXT validated", async () => {
		const providerConfig = {
			apiKey: `re_${"b".repeat(36)}`,
			from: "CinaSeek <no-reply@cinaseek.ai>",
		};
		const mutation = {
			operation: "test" as const,
			revision: 2,
			version: 1,
			validated: true,
			updatedAt: "2026-08-11T14:01:00.000Z",
		};
		const prepareTest = vi.fn(async () => ({
			ok: true as const,
			value: {
				kind: "ready" as const,
				provider: "email" as const,
				version: 1,
				config: providerConfig,
				operationToken: "operation-token",
			},
		}));
		const completeTest = vi.fn(async () => ({
			ok: true as const,
			value: mutation,
		}));
		const abortTest = vi.fn(async () => undefined);
		const env = makeEnv({
			DELIVERY_CONFIG: {
				getByName: vi.fn(() => ({ prepareTest, completeTest, abortTest })),
			} as unknown as DeliveryWorkerEnv["DELIVERY_CONFIG"],
		});
		const providerFetch = vi.fn(
			async (_input: RequestInfo | URL, _init?: RequestInit) =>
				new Response(null, { status: 202 }),
		);
		vi.stubGlobal("fetch", providerFetch);
		const body = JSON.stringify({
			expectedVersion: 1,
			idempotencyKey: "delivery-test-email-0001",
			channel: "email",
			recipient: "operator@example.test",
		});

		const response = await fetchWorker(
			await signedConfigRequest("test", body, env, "delivery-test-email-0001"),
			env,
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(mutation);
		expect(providerFetch).toHaveBeenCalledOnce();
		expect(String(providerFetch.mock.calls[0]?.[0])).toBe(
			"https://api.resend.com/emails",
		);
		expect(completeTest).toHaveBeenCalledOnce();
		expect(abortTest).not.toHaveBeenCalled();
	});

	it("rejects unknown stage fields before the repository sees credentials", async () => {
		const stage = vi.fn();
		const env = makeEnv({
			DELIVERY_CONFIG: {
				getByName: vi.fn(() => ({ stage })),
			} as unknown as DeliveryWorkerEnv["DELIVERY_CONFIG"],
		});
		const body = JSON.stringify({
			expectedVersion: 0,
			idempotencyKey: "delivery-stage-email-0002",
			channel: "email",
			config: {
				provider: "resend",
				apiKey: `re_${"c".repeat(36)}`,
				from: "CinaSeek <no-reply@cinaseek.ai>",
			},
			unexpected: true,
		});
		const response = await fetchWorker(
			await signedConfigRequest(
				"stage",
				body,
				env,
				"delivery-stage-email-0002",
			),
			env,
		);
		expect(response.status).toBe(400);
		expect(stage).not.toHaveBeenCalled();
	});

	it("activates the channel NEXT selected inside the DO with explicit confirmation", async () => {
		const mutation = {
			operation: "activate" as const,
			revision: 3,
			version: 1,
			validated: true,
			updatedAt: "2026-08-11T14:02:00.000Z",
		};
		const activate = vi.fn(async () => ({
			ok: true as const,
			value: mutation,
		}));
		const env = makeEnv({
			DELIVERY_CONFIG: {
				getByName: vi.fn(() => ({ activate })),
			} as unknown as DeliveryWorkerEnv["DELIVERY_CONFIG"],
		});
		const body = JSON.stringify({
			expectedVersion: 2,
			idempotencyKey: "delivery-activate-email-0001",
			channel: "email",
			confirmation: "ACTIVATE",
		});
		const response = await fetchWorker(
			await signedConfigRequest(
				"activate",
				body,
				env,
				"delivery-activate-email-0001",
			),
			env,
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(mutation);
		expect(activate).toHaveBeenCalledWith({
			provider: "email",
			expectedVersion: 2,
			idempotencyKey: "delivery-activate-email-0001",
		});
	});

	it("prefers a dynamic ACTIVE provider over complete legacy environment values", async () => {
		const dynamicConfig = {
			apiKey: `re_${"d".repeat(36)}`,
			from: "CinaSeek <dynamic@cinaseek.ai>",
		};
		const env = makeEnv({
			DELIVERY_CONFIG: {
				getByName: vi.fn(() => ({
					getActive: vi.fn(async () => ({
						configured: true as const,
						provider: "email" as const,
						version: 1,
						config: dynamicConfig,
					})),
				})),
			} as unknown as DeliveryWorkerEnv["DELIVERY_CONFIG"],
		});
		const providerFetch = vi.fn(
			async (_input: RequestInfo | URL, _init?: RequestInit) =>
				new Response(null, { status: 202 }),
		);
		vi.stubGlobal("fetch", providerFetch);
		const body = JSON.stringify(message);
		const response = await fetchWorker(await signedRequest(body, env), env);
		expect(response.status).toBe(200);
		const headers = new Headers(providerFetch.mock.calls[0]?.[1]?.headers);
		expect(headers.get("authorization")).toBe(`Bearer ${dynamicConfig.apiKey}`);
		expect(headers.get("authorization")).not.toContain("resend-key");
	});

	it("fails closed instead of using legacy values when dynamic ACTIVE lookup fails", async () => {
		const env = makeEnv({
			DELIVERY_CONFIG: {
				getByName: vi.fn(() => ({
					getActive: vi.fn(async () => {
						throw new Error("repository unavailable");
					}),
				})),
			} as unknown as DeliveryWorkerEnv["DELIVERY_CONFIG"],
		});
		const providerFetch = vi.fn();
		vi.stubGlobal("fetch", providerFetch);
		const response = await fetchWorker(
			await signedRequest(JSON.stringify(message), env),
			env,
		);
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({
			code: "provider_configuration_unavailable",
		});
		expect(providerFetch).not.toHaveBeenCalled();
	});
});
