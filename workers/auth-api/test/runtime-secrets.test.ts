import { describe, expect, it, vi } from "vitest";
import type { CloudflareBindings } from "../src/env";
import {
	resolveAuthRuntimeSecrets,
	resolveStrongRuntimeSecret,
} from "../src/runtime-secrets";

const binding = (value: string) => ({ get: vi.fn(async () => value) });

describe("active Secrets Store runtime resolution", () => {
	it("prefers a configured Store binding and does not mutate the raw environment", async () => {
		const raw = {
			CINAAUTH_DELIVERY_WEBHOOK_SECRET: "legacy-".repeat(8),
			CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: binding(
				"store-delivery-".repeat(4),
			),
			CINAAUTH_ERASURE_WEBHOOK_SECRET: "legacy-erasure-".repeat(4),
			CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2: binding(
				"store-erasure-".repeat(4),
			),
			CINAADMIN_OIDC_CLIENT_SECRET: `cina_cs_${"l".repeat(40)}`,
			CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2: binding(
				`cina_cs_${"c".repeat(40)}`,
			),
			CINAADMIN_OIDC_BRIDGE_SECRET: "legacy-bridge-".repeat(4),
			CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2: binding("store-bridge-".repeat(4)),
		} as unknown as CloudflareBindings;

		const resolved = await resolveAuthRuntimeSecrets(raw);

		expect(resolved).not.toBe(raw);
		expect(resolved.CINAAUTH_DELIVERY_WEBHOOK_SECRET).toBe(
			"store-delivery-".repeat(4),
		);
		expect(resolved.CINAAUTH_ERASURE_WEBHOOK_SECRET).toBe(
			"store-erasure-".repeat(4),
		);
		expect(resolved.CINAADMIN_OIDC_CLIENT_SECRET).toBe(
			`cina_cs_${"c".repeat(40)}`,
		);
		expect(resolved.CINAADMIN_OIDC_BRIDGE_SECRET).toBe(
			"store-bridge-".repeat(4),
		);
		expect(raw.CINAAUTH_DELIVERY_WEBHOOK_SECRET).toBe("legacy-".repeat(8));
	});

	it("uses a valid legacy secret only when no Store binding is configured", async () => {
		await expect(
			resolveStrongRuntimeSecret(undefined, "legacy-secret-".repeat(3)),
		).resolves.toBe("legacy-secret-".repeat(3));
	});

	it("fails closed when a configured Store binding is unavailable", async () => {
		const unavailable = {
			get: vi.fn(async () => {
				throw new Error("store unavailable");
			}),
		};
		await expect(
			resolveStrongRuntimeSecret(unavailable, "legacy-secret-".repeat(3)),
		).rejects.toThrow("Secrets Store binding is unavailable");
	});

	it("rejects weak Store and legacy values without exposing them", async () => {
		await expect(
			resolveStrongRuntimeSecret(binding("short"), undefined),
		).rejects.toThrow("Secrets Store value is invalid");
		await expect(
			resolveStrongRuntimeSecret(undefined, "short"),
		).rejects.toThrow("Runtime secret is missing or invalid");
	});
});
