import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { fetchAuthCapabilitiesForQuery } from "../hooks/use-auth-capabilities";
import { CORE_AUTH_CAPABILITIES } from "./auth-capabilities";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("auth capability query failures", () => {
	it("returns a normalized capability snapshot after one successful request", async () => {
		const fetcher = vi.fn(async () =>
			Response.json({
				...CORE_AUTH_CAPABILITIES,
				methods: {
					...CORE_AUTH_CAPABILITIES.methods,
					emailOtp: true,
					magicLink: true,
				},
				oauthProviders: [{ id: "github", type: "social" }],
				oneTap: false,
			}),
		);

		await expect(fetchAuthCapabilitiesForQuery(fetcher)).resolves.toMatchObject(
			{
				methods: {
					emailPassword: false,
					emailOtp: true,
					magicLink: false,
					username: false,
				},
				oauthProviders: [{ id: "github", type: "social" }],
			},
		);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it("turns non-success responses into query errors", async () => {
		await expect(
			fetchAuthCapabilitiesForQuery(
				vi.fn(async () => new Response(null, { status: 503 })),
			),
		).rejects.toThrow("HTTP 503");
	});

	it("keeps network failures observable to React Query", async () => {
		await expect(
			fetchAuthCapabilitiesForQuery(
				vi.fn(async () => {
					throw new Error("network unavailable");
				}),
			),
		).rejects.toThrow("network unavailable");
	});

	it("rejects a successful response with an incomplete capability payload", async () => {
		await expect(
			fetchAuthCapabilitiesForQuery(vi.fn(async () => Response.json({}))),
		).rejects.toThrow("invalid payload");
	});

	it("retries once without making optional methods available on missing data", () => {
		const hookSource = readSource("../hooks/use-auth-capabilities.ts");
		const oauthSource = readSource("../components/oauth-provider-buttons.tsx");
		const emailOtpSource = readSource("../components/forms/email-otp-form.tsx");
		const captchaSource = readSource("../components/turnstile-challenge.tsx");

		expect(hookSource).toContain("retry: 1");
		expect(oauthSource).toContain("data?.oauthProviders ?? []");
		expect(emailOtpSource).toContain(
			"capabilities.data?.methods.emailOtp === true",
		);
		expect(captchaSource).toContain("captcha?.enabled === true");
	});
});
