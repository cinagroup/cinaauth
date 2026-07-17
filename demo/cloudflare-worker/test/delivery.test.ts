import { afterEach, describe, expect, it, vi } from "vitest";
import {
	deliverToWebhook,
	enqueueDelivery,
	handleDeliveryBatch,
	type DeliveryMessage,
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
		const calls: Array<{ input: string | URL | Request; init?: RequestInit }> =
			[];
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
				calls.push({ input, init });
				return new Response(null, { status: 204 });
			}),
		);

		await deliverToWebhook(
			{
				CINAAUTH_DELIVERY_WEBHOOK_URL:
					"https://delivery.example.com/cinaauth",
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
		expect(call.input).toBe("https://delivery.example.com/cinaauth");
		expect(call.init?.method).toBe("POST");
		expect(call.init?.signal).toBeInstanceOf(AbortSignal);
		const body = call.init?.body as string;
		expect(JSON.parse(body)).toEqual(message);

		const headers = new Headers(call.init?.headers);
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

	it("prefers Queue delivery when the binding is available", async () => {
		const send = vi.fn(async () => undefined);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(null, { status: 204 })),
		);

		await enqueueDelivery(
			{
				CINAAUTH_DELIVERY_QUEUE: { send } as unknown as Queue<DeliveryMessage>,
				CINAAUTH_DELIVERY_WEBHOOK_URL:
					"https://delivery.example.com/cinaauth",
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: "delivery-secret-".repeat(3),
			},
			message,
		);

		expect(send).toHaveBeenCalledWith(message);
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe("delivery queue consumer", () => {
	it("acks successful messages and retries failed webhook attempts", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
				const headers = new Headers(init?.headers);
				return new Response(null, {
					status:
						headers.get("X-CinaAuth-Delivery-Id") === "delivery-ok"
							? 204
							: 503,
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
			} as unknown as MessageBatch<DeliveryMessage>,
			{
				CINAAUTH_DELIVERY_WEBHOOK_URL:
					"https://delivery.example.com/cinaauth",
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: "delivery-secret-".repeat(3),
			},
		);

		expect(first.ack).toHaveBeenCalledOnce();
		expect(first.retry).not.toHaveBeenCalled();
		expect(second.ack).not.toHaveBeenCalled();
		expect(second.retry).toHaveBeenCalledWith({ delaySeconds: 20 });
	});
});
