import { describe, expect, it, vi } from "vitest";
import { getStagedSecretsStoreReadiness } from "../src/secrets-store-readiness";

describe("staged Privacy Erasure Secrets Store readiness", () => {
	it("accepts a strong V2 binding without returning the value", async () => {
		const value = `erasure-${"x".repeat(48)}`;
		const get = vi.fn(async () => value);

		const readiness = await getStagedSecretsStoreReadiness({
			CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2: { get },
		});

		expect(readiness).toEqual({ staged: true, ok: true, issues: [] });
		expect(JSON.stringify(readiness)).not.toContain(value);
		expect(get).toHaveBeenCalledOnce();
	});

	it("fails closed when the V2 value is weak", async () => {
		const readiness = await getStagedSecretsStoreReadiness({
			CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2: {
				get: vi.fn(async () => "short"),
			},
		});

		expect(readiness).toEqual({
			staged: true,
			ok: false,
			issues: ["erasure_webhook_secret_store_v2_weak"],
		});
	});
});
