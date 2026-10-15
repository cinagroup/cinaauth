import { describe, expect, it } from "vitest";
import { isAllowedProxyOrigin } from "@/lib/cinaauth/proxy-origin";

describe("isAllowedProxyOrigin", () => {
	it("allows the configured admin origin", () => {
		expect(
			isAllowedProxyOrigin(
				"https://admin.cinaseek.si",
				"https://admin.cinaseek.si",
			),
		).toBe(true);
	});

	it("rejects missing and cross-site origins", () => {
		expect(isAllowedProxyOrigin(null, "https://admin.cinaseek.si")).toBe(false);
		expect(
			isAllowedProxyOrigin(
				"https://attacker.example",
				"https://admin.cinaseek.si",
			),
		).toBe(false);
	});
});
