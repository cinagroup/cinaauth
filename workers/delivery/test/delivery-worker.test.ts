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
const stagedStrongSecret = "delivery-v2-secret-".repeat(3);

const createSecretsStoreSecret = (
	get: () => Promise<string> = async () => stagedStrongSecret,
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
	return {
		CINAAUTH_DELIVERY_WEBHOOK_SECRET: strongSecret,
		CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: createSecretsStoreSecret(),
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
	const timestamp = Math.floor(
		(options.now?.getTime() ?? Date.now()) / 1000,
	).toString();
	const signature = await hmacSha256Hex(
		env.CINAAUTH_DELIVERY_WEBHOOK_SECRET,
		`${timestamp}.${deliveryId}.${body}`,
	);
	return new Request(
		"https://cinaauth-delivery.cinagroup.com/cinaauth/delivery",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.CINAAUTH_DELIVERY_WEBHOOK_SECRET}`,
				"Content-Type": "application/json",
				"X-CinaAuth-Delivery-Id": deliveryId,
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

	it("reports a healthy staged Secrets Store binding to authorized operators", async () => {
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
			runtimeConfig: { ok: true, issues: [] },
			secretsStore: { staged: true, ok: true, issues: [] },
		});
	});

	it("fails authorized readiness when the staged Store read throws while V1 remains healthy", async () => {
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
			runtimeConfig: { ok: true, issues: [] },
			secretsStore: {
				staged: true,
				ok: false,
				issues: ["delivery_webhook_secret_store_v2_unavailable"],
			},
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
			runtimeConfig: { issues: string[] };
		};
		expect(body.runtimeConfig.issues).toContain("missing_resend_api_key");
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
