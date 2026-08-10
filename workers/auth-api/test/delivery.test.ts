import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeliveryMessage } from "../src/delivery";
import {
	deliverToWebhook,
	enqueueDelivery,
	getDeliveryProviderCapabilities,
	getRequiredDeliveryProvider,
	handleDeliveryBatch,
} from "../src/delivery";

const encoder = new TextEncoder();

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

const message: DeliveryMessage = {
	kind: "email-otp",
	payload: {
		email: "user@example.com",
		otp: "123456",
		type: "sign-in",
	},
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("delivery webhook", () => {
	it("sends signed delivery requests without leaking raw secrets into logs", async () => {
		const webhookSecret = "delivery-secret-".repeat(3);
		// The signature timestamp is the send time, not the (older) enqueue time
		// passed in metadata — so aged retries can't fall outside the delivery
		// worker's staleness window. Send at 00:05 while metadata says 00:00.
		vi.spyOn(Date, "now").mockReturnValue(
			new Date("2026-07-14T00:05:00.000Z").getTime(),
		);
		const calls: Request[] = [];
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
				calls.push(input instanceof Request ? input : new Request(input, init));
				return new Response(null, { status: 204 });
			}),
		);

		await deliverToWebhook(
			{
				CINAAUTH_DELIVERY_WEBHOOK_URL: "https://delivery.example.com/cinaauth",
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: webhookSecret,
			},
			message,
			{
				id: "delivery-1",
				timestamp: new Date("2026-07-14T00:00:00.000Z"),
			},
		);

		expect(calls).toHaveLength(1);
		const call = calls[0]!;
		expect(call.url).toBe("https://delivery.example.com/cinaauth");
		expect(call.method).toBe("POST");
		expect(call.signal).toBeInstanceOf(AbortSignal);
		const body = await call.text();
		expect(JSON.parse(body)).toEqual(message);

		const headers = call.headers;
		expect(headers.get("Authorization")).toBe(`Bearer ${webhookSecret}`);
		expect(headers.get("X-CinaAuth-Delivery-Id")).toBe("delivery-1");
		expect(headers.get("X-CinaAuth-Delivery-Timestamp")).toBe("1783987500");
		const expectedSignature = await hmacSha256Hex(
			webhookSecret,
			`1783987500.delivery-1.${body}`,
		);
		expect(headers.get("X-CinaAuth-Delivery-Signature")).toBe(
			`v1=${expectedSignature}`,
		);
	});

	it("requires provider readiness before Queue delivery", async () => {
		const send = vi.fn(async () => undefined);
		const serviceFetch = vi.fn(
			async (_input: RequestInfo | URL, _init?: RequestInit) =>
				Response.json({ providers: { email: true, sms: false } }),
		);

		await enqueueDelivery(
			{
				CINAAUTH_DELIVERY_QUEUE: { send },
				CINAAUTH_DELIVERY_SERVICE: { fetch: serviceFetch },
				CINAAUTH_DELIVERY_WEBHOOK_URL: "https://delivery.example.com/cinaauth",
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: "delivery-secret-".repeat(3),
			},
			message,
		);

		expect(send).toHaveBeenCalledWith(message);
		expect(serviceFetch).toHaveBeenCalledOnce();
	});

	it("does not enqueue when the required provider is unavailable", async () => {
		const send = vi.fn(async () => undefined);
		const serviceFetch = vi.fn(
			async (_input: RequestInfo | URL, _init?: RequestInit) =>
				Response.json(
					{ providers: { email: false, sms: true } },
					{ status: 503 },
				),
		);

		await expect(
			enqueueDelivery(
				{
					CINAAUTH_DELIVERY_QUEUE: { send },
					CINAAUTH_DELIVERY_SERVICE: { fetch: serviceFetch },
					CINAAUTH_DELIVERY_WEBHOOK_SECRET: "delivery-secret-".repeat(3),
				},
				message,
			),
		).rejects.toThrow("email-otp delivery provider is not ready");
		expect(send).not.toHaveBeenCalled();
	});

	it("uses the Service Binding for delivery when available", async () => {
		const serviceFetch = vi.fn(
			async (_input: RequestInfo | URL, _init?: RequestInit) =>
				new Response(null, { status: 204 }),
		);
		vi.stubGlobal("fetch", vi.fn());

		await deliverToWebhook(
			{
				CINAAUTH_DELIVERY_SERVICE: { fetch: serviceFetch },
				CINAAUTH_DELIVERY_WEBHOOK_URL: "https://delivery.example.com/cinaauth",
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: "delivery-secret-".repeat(3),
			},
			message,
		);

		expect(serviceFetch).toHaveBeenCalledOnce();
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe("delivery readiness", () => {
	it("maps every delivery-producing endpoint to its required provider", () => {
		expect(
			getRequiredDeliveryProvider("/api/auth/email-otp/send-verification-otp"),
		).toBe("email");
		expect(getRequiredDeliveryProvider("/api/auth/two-factor/send-otp")).toBe(
			"email",
		);
		expect(getRequiredDeliveryProvider("/api/auth/phone-number/send-otp")).toBe(
			"sms",
		);
		expect(getRequiredDeliveryProvider("/api/auth/sign-in/email")).toBe(
			undefined,
		);
	});

	it("accepts authenticated per-channel readiness from a 503 response", async () => {
		const secret = "delivery-secret-".repeat(3);
		const serviceFetch = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const request =
					input instanceof Request ? input : new Request(input, init);
				expect(request.url).toBe("https://cinaauth-delivery.internal/ready");
				expect(request.headers.get("authorization")).toBe(`Bearer ${secret}`);
				return Response.json(
					{ providers: { email: true, sms: false } },
					{ status: 503 },
				);
			},
		);

		await expect(
			getDeliveryProviderCapabilities({
				CINAAUTH_DELIVERY_SERVICE: { fetch: serviceFetch },
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: secret,
			}),
		).resolves.toEqual({ email: true, sms: false });
	});

	it("fails closed for missing, malformed, or unavailable readiness", async () => {
		await expect(getDeliveryProviderCapabilities({})).resolves.toEqual({
			email: false,
			sms: false,
		});

		const malformedFetch = vi.fn(
			async (_input: RequestInfo | URL, _init?: RequestInit) =>
				Response.json({ success: true }),
		);
		await expect(
			getDeliveryProviderCapabilities({
				CINAAUTH_DELIVERY_SERVICE: { fetch: malformedFetch },
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: "delivery-secret-".repeat(3),
			}),
		).resolves.toEqual({ email: false, sms: false });
	});
});

describe("delivery queue consumer", () => {
	it("acks successful messages and retries failed webhook attempts", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
				const request =
					input instanceof Request ? input : new Request(input, init);
				const headers = request.headers;
				return new Response(null, {
					status:
						headers.get("X-CinaAuth-Delivery-Id") === "delivery-ok" ? 204 : 503,
				});
			}),
		);
		const first = {
			body: message,
			id: "delivery-ok",
			timestamp: new Date("2026-07-14T00:00:00.000Z"),
			attempts: 1,
			ack: vi.fn(),
			retry: vi.fn(),
		};
		const second = {
			body: {
				kind: "phone-otp",
				payload: { phoneNumber: "+15555550100", code: "888888" },
			} satisfies DeliveryMessage,
			id: "delivery-fail",
			timestamp: new Date("2026-07-14T00:00:01.000Z"),
			attempts: 2,
			ack: vi.fn(),
			retry: vi.fn(),
		};

		await handleDeliveryBatch(
			{
				messages: [first, second],
			},
			{
				CINAAUTH_DELIVERY_WEBHOOK_URL: "https://delivery.example.com/cinaauth",
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: "delivery-secret-".repeat(3),
			},
		);

		expect(first.ack).toHaveBeenCalledOnce();
		expect(first.retry).not.toHaveBeenCalled();
		expect(second.ack).not.toHaveBeenCalled();
		expect(second.retry).toHaveBeenCalledWith({ delaySeconds: 20 });
	});
});
