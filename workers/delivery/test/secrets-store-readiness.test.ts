import { describe, expect, it, vi } from "vitest";
import { getStagedSecretsStoreReadiness } from "../src/secrets-store-readiness";

describe("staged Delivery Secrets Store readiness", () => {
	it("accepts a strong V2 binding without returning the value", async () => {
		const value = `delivery-${"x".repeat(48)}`;
		const get = vi.fn(async () => value);

		const readiness = await getStagedSecretsStoreReadiness({
			CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: { get },
		});

		expect(readiness).toEqual({ staged: true, ok: true, issues: [] });
		expect(JSON.stringify(readiness)).not.toContain(value);
		expect(get).toHaveBeenCalledOnce();
	});

	it("fails closed when the V2 binding cannot be read", async () => {
		const readiness = await getStagedSecretsStoreReadiness({
			CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: {
				get: vi.fn(async () => {
					throw new Error("unavailable");
				}),
			},
		});

		expect(readiness).toEqual({
			staged: true,
			ok: false,
			issues: ["delivery_webhook_secret_store_v2_unavailable"],
		});
	});
});
