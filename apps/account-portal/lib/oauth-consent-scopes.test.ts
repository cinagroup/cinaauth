import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	buildOAuthConsentSignInPath,
	getOAuthClientMonogram,
	resolveOAuthConsentScopes,
} from "./oauth-consent-scopes";

describe("OAuth consent scope presentation", () => {
	it("tokenizes scopes exactly on whitespace and removes duplicates", () => {
		expect(
			resolveOAuthConsentScopes(
				"openid  profile\nemail\tprofile read:organization",
			).map(({ scope }) => scope),
		).toEqual(["openid", "profile", "email", "read:organization"]);
	});

	it("does not treat substring matches as built-in scopes", () => {
		expect(resolveOAuthConsentScopes("profile:write email_verified")).toEqual([
			{
				scope: "profile:write",
				label: "profile:write",
			},
			{
				scope: "email_verified",
				label: "email_verified",
			},
		]);
	});

	it("keeps unknown scopes visible using their original values", () => {
		expect(
			resolveOAuthConsentScopes("calendar.read custom:permission"),
		).toEqual([
			{
				scope: "calendar.read",
				label: "calendar.read",
			},
			{
				scope: "custom:permission",
				label: "custom:permission",
			},
		]);
	});

	it("does not resolve Object prototype keys as metadata", () => {
		expect(resolveOAuthConsentScopes("constructor toString __proto__")).toEqual(
			[
				{ scope: "constructor", label: "constructor" },
				{ scope: "toString", label: "toString" },
				{ scope: "__proto__", label: "__proto__" },
			],
		);
	});

	it("provides metadata for every built-in Accounts scope", () => {
		const scopes = resolveOAuthConsentScopes(
			"openid profile email offline_access read:organization",
		);

		expect(scopes).toHaveLength(5);
		for (const scope of scopes) {
			expect(scope.label).not.toBe(scope.scope);
			expect(scope.description).toBeTruthy();
		}
	});
});

describe("OAuth consent shell safety", () => {
	it("preserves repeated signed authorization parameters when login is required", () => {
		const path = buildOAuthConsentSignInPath({
			client_id: "client-1",
			redirect_uri: "https://client.example/callback",
			ba_param: ["client_id", "redirect_uri", "scope"],
			scope: "openid offline_access",
			sig: "signature",
		});
		const url = new URL(path, "https://accounts.cinaseek.ai");

		expect(url.pathname).toBe("/sign-in");
		expect(url.searchParams.getAll("ba_param")).toEqual([
			"client_id",
			"redirect_uri",
			"scope",
		]);
		expect(url.searchParams.get("sig")).toBe("signature");
	});

	it("uses a local monogram instead of loading an untrusted client logo", () => {
		expect(getOAuthClientMonogram("  Example App ")).toBe("E");
		expect(getOAuthClientMonogram(" ")).toBe("A");

		const pageSource = readFileSync(
			fileURLToPath(
				new URL("../app/(auth)/oauth/consent/page.tsx", import.meta.url),
			),
			"utf8",
		);
		expect(pageSource).not.toContain('from "next/image"');
		expect(pageSource).not.toContain("clientDetails.logo_uri");
		expect(pageSource).toContain("getOAuthClientMonogram");
	});

	it("makes authorize and cancel mutually exclusive and fail closed", () => {
		const buttonSource = readFileSync(
			fileURLToPath(
				new URL(
					"../app/(auth)/oauth/consent/consent-buttons.tsx",
					import.meta.url,
				),
			),
			"utf8",
		);
		expect(buttonSource).toContain('"authorize" | "cancel" | null');
		expect(buttonSource).toContain("disabled={pendingAction !== null}");
		expect(buttonSource).toContain("finally");
		expect(buttonSource).toContain("throw: true");
	});
});
