import { describe, expect, it, vi } from "vitest";
import type { CloudflareBindings } from "../src/env";
import {
	createRequiredPrivacyDeletionProcessor,
	createWebhookPrivacyDeletionProcessor,
	hasPrivacyDeletionProcessorRuntime,
} from "../src/privacy-deletion";

const strongSecret = `privacy-deletion-${"x".repeat(40)}`;

const makeEnv = (
	overrides: Partial<CloudflareBindings> = {},
): CloudflareBindings =>
	({
		CINAAUTH_ERASURE_WEBHOOK_URL:
			"https://privacy-controller.example.com/erase",
		CINAAUTH_ERASURE_WEBHOOK_SECRET: strongSecret,
		...overrides,
	}) as CloudflareBindings;

describe("privacy deletion processor webhook", () => {
	it("requires a complete HTTPS runtime pair", () => {
		expect(hasPrivacyDeletionProcessorRuntime(makeEnv())).toBe(true);
		expect(
			hasPrivacyDeletionProcessorRuntime(
				makeEnv({ CINAAUTH_ERASURE_WEBHOOK_SECRET: undefined }),
			),
		).toBe(false);
		expect(
			hasPrivacyDeletionProcessorRuntime(
				makeEnv({
					CINAAUTH_ERASURE_WEBHOOK_URL:
						"https://user:password@privacy-controller.example.com/erase",
				}),
			),
		).toBe(false);
		expect(
			hasPrivacyDeletionProcessorRuntime(
				makeEnv({
					CINAAUTH_ERASURE_WEBHOOK_URL:
						"http://privacy-controller.example.com/erase",
				}),
			),
		).toBe(false);
	});

	it("keeps deletion fail-closed when the processor runtime is absent", async () => {
		const processor = createRequiredPrivacyDeletionProcessor(
			makeEnv({
				CINAAUTH_ERASURE_WEBHOOK_URL: undefined,
				CINAAUTH_ERASURE_WEBHOOK_SECRET: undefined,
			}),
		);

		expect(processor.id).toBe("controller-erasure-orchestrator");
		await expect(
			processor.eraseSubject({
				operationId: "operation-with-missing-runtime",
				subject: { id: "user-123", email: "qa@example.com" },
			}),
		).rejects.toThrow("runtime is incomplete");
	});

	it("signs a stable idempotent request and accepts structured evidence", async () => {
		const fetcher = vi.fn(
			async (_input: RequestInfo | URL, init?: RequestInit) =>
				Response.json({
					status: "completed",
					completedAt: "2026-08-09T12:00:00.000Z",
					evidenceId: "processor-evidence-123",
				}),
		);
		const processor = createWebhookPrivacyDeletionProcessor(makeEnv(), fetcher);
		const input = {
			operationId: "stable-operation-id",
			subject: { id: "user-123", email: "qa@example.com" },
		};

		await expect(processor.eraseSubject(input)).resolves.toEqual({
			status: "completed",
			completedAt: "2026-08-09T12:00:00.000Z",
			evidenceId: "processor-evidence-123",
		});
		await processor.eraseSubject(input);

		expect(fetcher).toHaveBeenCalledTimes(2);
		const first = fetcher.mock.calls[0];
		const second = fetcher.mock.calls[1];
		expect(first?.[0]).toBe("https://privacy-controller.example.com/erase");
		expect(first?.[1]?.method).toBe("POST");
		expect(first?.[1]?.body).toBe(second?.[1]?.body);
		expect(
			new Headers(first?.[1]?.headers).get("x-cinaauth-signature"),
		).toMatch(/^v1=[A-Za-z0-9+/=]+$/);
		expect(
			new Headers(first?.[1]?.headers).get("x-cinaauth-operation-id"),
		).toBe("stable-operation-id");
		expect(JSON.parse(String(first?.[1]?.body))).toEqual({
			schemaVersion: 1,
			action: "erase-subject",
			operationId: "stable-operation-id",
			subject: { id: "user-123", email: "qa@example.com" },
		});
	});

	it("turns accepted work into an explicit retryable pending result", async () => {
		const processor = createWebhookPrivacyDeletionProcessor(
			makeEnv(),
			async () =>
				new Response(null, {
					status: 202,
					headers: { "retry-after": "45" },
				}),
		);

		await expect(
			processor.eraseSubject({
				operationId: "operation-pending",
				subject: { id: "user-pending", email: "pending@example.com" },
			}),
		).resolves.toEqual({ status: "pending", retryAfterSeconds: 45 });
	});

	it("fails closed on malformed or unsuccessful processor responses", async () => {
		const malformed = createWebhookPrivacyDeletionProcessor(
			makeEnv(),
			async () => Response.json({ status: "completed" }),
		);
		await expect(
			malformed.eraseSubject({
				operationId: "operation-malformed",
				subject: { id: "user-malformed", email: "bad@example.com" },
			}),
		).rejects.toThrow("invalid erasure evidence");

		const unavailable = createWebhookPrivacyDeletionProcessor(
			makeEnv(),
			async () => new Response(null, { status: 503 }),
		);
		await expect(
			unavailable.eraseSubject({
				operationId: "operation-unavailable",
				subject: { id: "user-unavailable", email: "down@example.com" },
			}),
		).rejects.toThrow("HTTP 503");

		const oversized = createWebhookPrivacyDeletionProcessor(
			makeEnv(),
			async () => new Response("x".repeat(16_385)),
		);
		await expect(
			oversized.eraseSubject({
				operationId: "operation-oversized",
				subject: { id: "user-oversized", email: "large@example.com" },
			}),
		).rejects.toThrow("response is too large");
	});
});
