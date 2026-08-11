import { describe, expect, it, vi } from "vitest";
import { getActiveSecretsStoreReadiness } from "../src/secrets-store-readiness";

const binding = (value: string) => ({
	get: vi.fn(async () => value),
});

const strong = (label: string) => `${label}-${"x".repeat(48)}`;

describe("active Secrets Store readiness", () => {
	it("validates every active V2 binding without exposing its value", async () => {
		const clientSecret = `cina_cs_${strong("client")}`;
		const env = {
			CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: binding(strong("delivery")),
			CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2: binding(strong("erasure")),
			CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2: binding(clientSecret),
			CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2: binding(strong("bridge")),
		};

		const readiness = await getActiveSecretsStoreReadiness(env);

		expect(readiness).toEqual({
			active: true,
			source: "secrets-store-v2",
			ok: true,
			issues: [],
		});
		expect(JSON.stringify(readiness)).not.toContain(clientSecret);
		for (const secretBinding of Object.values(env)) {
			expect(secretBinding.get).toHaveBeenCalledOnce();
		}
	});

	it("fails closed for an unavailable or weak binding", async () => {
		const unavailable = {
			get: vi.fn(async () => {
				throw new Error("binding unavailable");
			}),
		};
		const readiness = await getActiveSecretsStoreReadiness({
			CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2: unavailable,
			CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2: binding("short"),
			CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2: binding(
				`cina_cs_${"x".repeat(32)}`,
			),
			CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2: binding(strong("bridge")),
		});

		expect(readiness).toEqual({
			active: true,
			source: "secrets-store-v2",
			ok: false,
			issues: [
				"delivery_webhook_secret_store_v2_unavailable",
				"erasure_webhook_secret_store_v2_weak",
			],
		});
	});
});
