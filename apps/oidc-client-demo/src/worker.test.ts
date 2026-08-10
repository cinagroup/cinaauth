import { describe, expect, it } from "vitest";
import { handleRequest } from "./worker";

describe("OIDC demo asset worker", () => {
	it("publishes non-secret runtime configuration", async () => {
		const response = await handleRequest(
			new Request("https://oidc-demo.cinaseek.ai/config.json"),
			async () => new Response("unused"),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		await expect(response.json()).resolves.toMatchObject({
			issuer: "https://auth.cinaseek.ai",
			clientId: "cinaauth-oidc-demo",
			redirectUri: "https://oidc-demo.cinaseek.ai/callback",
		});
	});

	it("adds security headers to SPA assets", async () => {
		const response = await handleRequest(
			new Request("https://oidc-demo.cinaseek.ai/dashboard"),
			async () =>
				new Response("<!doctype html>", {
					headers: { "Content-Type": "text/html" },
				}),
		);

		expect(response.headers.get("Content-Security-Policy")).toContain(
			"frame-ancestors 'none'",
		);
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(response.headers.get("Cache-Control")).toBe("no-cache");
	});
});
