import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
	createSignInCapabilitiesHydrationState,
	loadInitialSignInCapabilities,
} from "../app/(auth)/sign-in/_components/initial-capabilities";
import {
	getTurnstileSize,
	getTurnstileTheme,
	isTurnstileSubmissionReady,
} from "../components/turnstile-challenge";
import { AUTH_CAPABILITIES_QUERY_KEY } from "../lib/auth-capabilities";
import { CORE_AUTH_CAPABILITIES } from "./auth-capabilities";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("sign-in capability hydration", () => {
	it("dehydrates the authoritative server snapshot into the shared query", () => {
		const state = createSignInCapabilitiesHydrationState(
			CORE_AUTH_CAPABILITIES,
		);
		const query = state.queries.find(
			(candidate) =>
				JSON.stringify(candidate.queryKey) ===
				JSON.stringify(AUTH_CAPABILITIES_QUERY_KEY),
		);

		expect(query?.state.status).toBe("success");
		expect(query?.state.data).toEqual(CORE_AUTH_CAPABILITIES);
	});

	it("does not invent initial data when the server fetch fails", async () => {
		const failure = vi.fn(async () => {
			throw new Error("service binding unavailable");
		});

		await expect(
			loadInitialSignInCapabilities(failure),
		).resolves.toBeUndefined();
		await expect(
			loadInitialSignInCapabilities(
				vi.fn(async () => ({}) as typeof CORE_AUTH_CAPABILITIES),
			),
		).resolves.toBeUndefined();
	});

	it("keeps submission closed until capabilities resolve and captcha completes", () => {
		expect(
			isTurnstileSubmissionReady({
				hasCapabilities: false,
				hasCapabilityError: false,
				enabled: false,
				siteKey: null,
				action: null,
				token: null,
			}),
		).toBe(false);
		expect(
			isTurnstileSubmissionReady({
				hasCapabilities: true,
				hasCapabilityError: true,
				enabled: false,
				siteKey: null,
				action: null,
				token: null,
			}),
		).toBe(false);
		expect(
			isTurnstileSubmissionReady({
				hasCapabilities: true,
				hasCapabilityError: false,
				enabled: false,
				siteKey: null,
				action: null,
				token: null,
			}),
		).toBe(true);
		expect(
			isTurnstileSubmissionReady({
				hasCapabilities: true,
				hasCapabilityError: false,
				enabled: true,
				siteKey: "site-key",
				action: "sign_in",
				token: null,
			}),
		).toBe(false);
		expect(
			isTurnstileSubmissionReady({
				hasCapabilities: true,
				hasCapabilityError: false,
				enabled: true,
				siteKey: "site-key",
				action: "sign_in",
				token: "verified-token",
			}),
		).toBe(true);
	});

	it("adapts Turnstile to narrow cards and the resolved application theme", () => {
		expect(getTurnstileSize(240)).toBe("compact");
		expect(getTurnstileSize(299)).toBe("compact");
		expect(getTurnstileSize(300)).toBe("flexible");
		expect(getTurnstileSize(420)).toBe("flexible");
		expect(getTurnstileTheme("light")).toBe("light");
		expect(getTurnstileTheme("dark")).toBe("dark");
		expect(getTurnstileTheme(undefined)).toBe("auto");
		expect(getTurnstileTheme("system")).toBe("auto");
	});

	it("wires the server snapshot through the direct password form", () => {
		const pageSource = readSource("../app/(auth)/sign-in/page.tsx");
		const signInSource = readSource(
			"../app/(auth)/sign-in/_components/sign-in.tsx",
		);
		const formSource = readSource("../components/forms/sign-in-form.tsx");
		const turnstileSource = readSource("../components/turnstile-challenge.tsx");

		expect(pageSource).toContain("auth.api.getCapabilities");
		expect(pageSource).toContain('export const dynamic = "force-dynamic"');
		expect(pageSource).toContain("loadInitialSignInCapabilities");
		expect(pageSource).toContain("createSignInCapabilitiesHydrationState");
		expect(pageSource).toContain("<HydrationBoundary state={hydrationState}>");
		expect(signInSource).toContain("useAuthCapabilities()");
		expect(signInSource).not.toContain("initialCapabilities");
		expect(signInSource).toContain("capabilities.isError");
		expect(signInSource).toContain("capabilities.refetch()");
		expect(formSource).toContain("useTurnstileChallenge()");
		expect(formSource).not.toContain("initialCapabilities");
		expect(turnstileSource).toContain("hasCapabilities:");
		expect(turnstileSource).toContain("hasCapabilityError:");
		expect(turnstileSource).toContain("useTheme()");
		expect(turnstileSource).toContain(
			"getTurnstileSize(container.clientWidth)",
		);
		expect(turnstileSource).toContain("turnstileTheme,");
		expect(turnstileSource).toContain("new ResizeObserver");
		expect(turnstileSource).toContain("widgetSize,");
		expect(turnstileSource).toContain(
			'"error-callback": () => {\n\t\t\t\tsetScriptFailed(true);',
		);
		expect(turnstileSource).toContain(
			'className={scriptFailed ? "hidden" : "min-h-16 w-full"}',
		);
		expect(turnstileSource).toContain(
			'role={scriptFailed ? "alert" : "status"}',
		);
	});
});
