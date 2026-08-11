import { describe, expect, it, vi } from "vitest";
import {
	getWebhookSecretReadiness,
	resolveErasureWebhookSecret,
} from "../src/secrets-store-readiness";

describe("active Privacy Erasure Secrets Store authentication", () => {
	it("uses a strong V2 binding without returning the value in readiness", async () => {
		const value = `erasure-${"x".repeat(48)}`;
		const get = vi.fn(async () => value);
		const env = {
			CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2: { get },
			CINAAUTH_ERASURE_WEBHOOK_SECRET: `legacy-${"l".repeat(48)}`,
		};

		await expect(resolveErasureWebhookSecret(env)).resolves.toEqual({
			value,
			source: "secrets-store-v2",
		});
		const readiness = await getWebhookSecretReadiness(env);
		expect(readiness).toEqual({
			active: true,
			ok: true,
			source: "secrets-store-v2",
			issues: [],
		});
		expect(JSON.stringify(readiness)).not.toContain(value);
	});

	it("fails closed instead of falling back when the V2 value is weak", async () => {
		const env = {
			CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2: {
				get: vi.fn(async () => "short"),
			},
			CINAAUTH_ERASURE_WEBHOOK_SECRET: `legacy-${"l".repeat(48)}`,
		};

		await expect(resolveErasureWebhookSecret(env)).rejects.toMatchObject({
			code: "ERASURE_WEBHOOK_SECRET_UNAVAILABLE",
			status: 503,
			issue: "erasure_webhook_secret_store_v2_weak",
		});
		await expect(getWebhookSecretReadiness(env)).resolves.toEqual({
			active: true,
			ok: false,
			source: "secrets-store-v2",
			issues: ["erasure_webhook_secret_store_v2_weak"],
		});
	});

	it("uses V1 only when no V2 binding exists", async () => {
		const value = `legacy-${"l".repeat(48)}`;
		await expect(
			resolveErasureWebhookSecret({
				CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2: undefined,
				CINAAUTH_ERASURE_WEBHOOK_SECRET: value,
			}),
		).resolves.toEqual({ value, source: "worker-secret-v1" });
	});
});
