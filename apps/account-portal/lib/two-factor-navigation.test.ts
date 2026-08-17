import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	buildTwoFactorAuthPath,
	getTwoFactorSuccessPath,
} from "./two-factor-navigation";

const signedQuery = new URLSearchParams([
	["client_id", "cinaauth-oidc-demo"],
	["redirect_uri", "https://oidc-demo.cinaseek.ai/callback"],
	["state", "opaque-state"],
	["resource", "https://api-one.example"],
	["resource", "https://api-two.example"],
	["ba_param", "client_id"],
	["ba_param", "redirect_uri"],
	["ba_param", "resource"],
	["sig", "signature"],
	["callbackURL", "/dashboard"],
]);

const readSource = (relativePath: string) =>
	readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("two-factor authentication navigation", () => {
	it("preserves a complete Device Flow target across the 2FA boundary", () => {
		const params = new URLSearchParams(
			"callbackURL=%2Fdevice%3Fuser_code%3DABCD-1234",
		);
		const target = new URL(
			buildTwoFactorAuthPath("/two-factor", params),
			"https://accounts.cinaseek.ai",
		);

		expect(target.pathname).toBe("/two-factor");
		expect(target.searchParams.get("callbackURL")).toBe(
			"/device?user_code=ABCD-1234",
		);
		expect(getTwoFactorSuccessPath(params)).toBe("/device?user_code=ABCD-1234");
	});

	it("preserves signed OIDC parameters and delegates its final redirect", () => {
		for (const pathname of ["/two-factor", "/two-factor/backup"] as const) {
			const target = new URL(
				buildTwoFactorAuthPath(pathname, signedQuery),
				"https://accounts.cinaseek.ai",
			);

			expect(target.pathname).toBe(pathname);
			expect(target.searchParams.getAll("ba_param")).toEqual([
				"client_id",
				"redirect_uri",
				"resource",
			]);
			expect(target.searchParams.getAll("resource")).toEqual([
				"https://api-one.example",
				"https://api-two.example",
			]);
			expect(target.searchParams.get("sig")).toBe("signature");
		}
		expect(getTwoFactorSuccessPath(signedQuery)).toBeNull();
	});

	it("never returns an external or protocol-relative account callback", () => {
		for (const callbackURL of [
			"https://attacker.example/steal",
			"//attacker.example/steal",
		]) {
			const params = new URLSearchParams({ callbackURL });
			const target = new URL(
				buildTwoFactorAuthPath("/two-factor", params),
				"https://accounts.cinaseek.ai",
			);

			expect(target.searchParams.get("callbackURL")).toBe("/dashboard");
			expect(getTwoFactorSuccessPath(params)).toBe("/dashboard");
		}
	});

	it("wires the client redirect and verification pages to the contract", () => {
		const clientSource = readSource("./auth-client.ts");
		const totpPageSource = readSource("../app/(auth)/two-factor/page.tsx");
		const backupPageSource = readSource(
			"../app/(auth)/two-factor/backup/page.tsx",
		);
		const totpFormSource = readSource(
			"../components/forms/two-factor-totp-form.tsx",
		);

		expect(clientSource).toContain("buildTwoFactorAuthPath");
		expect(clientSource).not.toContain('window.location.href = "/two-factor"');
		for (const pageSource of [totpPageSource, backupPageSource]) {
			expect(pageSource).toContain('import { Suspense } from "react"');
			expect(pageSource).toContain("<Suspense");
			expect(pageSource).toContain("buildTwoFactorAuthPath");
			expect(pageSource).toContain("getTwoFactorSuccessPath");
			expect(pageSource).toContain("<Button asChild");
			expect(pageSource).not.toContain('router.push("/dashboard")');
		}
		expect(totpFormSource).toContain(
			"classifyTwoFactorVerificationData(res.data)",
		);
		expect(totpFormSource).toContain('if (outcome === "redirect") return');
	});
});
