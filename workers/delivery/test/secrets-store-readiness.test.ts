import { describe, expect, it, vi } from "vitest";
import {
	getActiveSecretsStoreReadiness,
	resolveDeliveryWebhookSecret,
} from "../src/secrets-store-readiness";

describe("active Delivery Secrets Store readiness", () => {
	it("accepts a strong V2 binding without returning the value", async () => {
		const value = `delivery-${"x".repeat(48)}`;
		const get = vi.fn(async () => value);

		const readiness = await getActiveSecretsStoreReadiness({
			CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: { get },
		});

		expect(readiness).toEqual({ active: true, ok: true, issues: [] });
		expect(JSON.stringify(readiness)).not.toContain(value);
		expect(get).toHaveBeenCalledOnce();
	});

	it("fails closed when the V2 binding cannot be read", async () => {
		const readiness = await getActiveSecretsStoreReadiness({
			CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: {
				get: vi.fn(async () => {
					throw new Error("unavailable");
				}),
			},
		});

		expect(readiness).toEqual({
			active: true,
			ok: false,
			issues: ["delivery_webhook_secret_store_v2_unavailable"],
		});
	});
});

describe("active Delivery webhook secret resolution", () => {
	it("prefers Store V2 over a different legacy rollback value", async () => {
		const active = `active-${"a".repeat(40)}`;
		await expect(
			resolveDeliveryWebhookSecret({
				CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: {
					get: vi.fn(async () => active),
				},
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: `legacy-${"l".repeat(40)}`,
			}),
		).resolves.toEqual({
			ok: true,
			source: "secrets_store_v2",
			value: active,
		});
	});

	it("fails closed on a Store read failure even when legacy is healthy", async () => {
		await expect(
			resolveDeliveryWebhookSecret({
				CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: {
					get: vi.fn(async () => {
						throw new Error("unavailable");
					}),
				},
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: `legacy-${"l".repeat(40)}`,
			}),
		).resolves.toEqual({
			ok: false,
			issue: "delivery_webhook_secret_store_v2_unavailable",
		});
	});

	it("uses legacy only when the Store binding is absent", async () => {
		const legacy = `legacy-${"l".repeat(40)}`;
		await expect(
			resolveDeliveryWebhookSecret({
				CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: undefined,
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: legacy,
			}),
		).resolves.toEqual({
			ok: true,
			source: "legacy_worker_secret",
			value: legacy,
		});
	});
});
