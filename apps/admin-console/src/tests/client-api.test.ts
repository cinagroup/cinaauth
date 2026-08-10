import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText, fetchAdminJson, openExternal } from "@/lib/client-api";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("fetchAdminJson", () => {
	it("returns a successful JSON envelope", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ ok: true, data: { count: 2 } }), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
			),
		);
		await expect(fetchAdminJson("/test")).resolves.toMatchObject({ ok: true });
	});

	it("rejects an HTTP error with status and upstream message", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({ ok: false, error: { message: "upstream unavailable" } }),
					{ status: 502, headers: { "content-type": "application/json" } },
				),
			),
		);
		await expect(fetchAdminJson("/test")).rejects.toMatchObject({
			status: 502,
			message: "upstream unavailable",
		});
	});

	it("rejects a 200 response carrying ok false", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ ok: false, error: "denied" }), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
			),
		);
		await expect(fetchAdminJson("/test")).rejects.toThrow("denied");
	});
});

describe("browser helpers", () => {
	it("reports clipboard success only after the write resolves", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText },
		});
		await expect(copyText("secret")).resolves.toBe(true);
		expect(writeText).toHaveBeenCalledWith("secret");
	});

	it("rejects non-HTTP external URLs", () => {
		expect(openExternal("javascript:alert(1)")).toBe(false);
	});
});
