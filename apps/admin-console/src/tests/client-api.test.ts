import { afterEach, describe, expect, it, vi } from "vitest";
import {
	AdminApiError,
	copyText,
	downloadAdminCsv,
	fetchAdminJson,
	getAdminApiErrorMessage,
	handleAdminStepUpError,
	openExternal,
} from "@/lib/client-api";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("fetchAdminJson", () => {
	it("uses only sanitized Admin API messages for operator diagnostics", () => {
		const fallback = "Configuration action failed";

		expect(
			getAdminApiErrorMessage(
				new AdminApiError("Provider rejected the test recipient", 422),
				fallback,
			),
		).toBe("Provider rejected the test recipient");
		expect(
			getAdminApiErrorMessage(new Error("raw internal error"), fallback),
		).toBe(fallback);
		expect(
			getAdminApiErrorMessage(new AdminApiError("   ", 502), fallback),
		).toBe(fallback);
	});

	it("uses current path and search for one structured step-up redirect", async () => {
		const assign = vi.fn();
		const navigation = {
			pathname: "/users/u1",
			search: "?tab=sessions&next=https://attacker.example/path",
			assign,
		};
		const payload = {
			ok: false,
			error: {
				code: "SESSION_NOT_FRESH",
				message: "Recent authentication required",
				redirectUrl: "https://attacker.example/steal",
			},
		};

		expect(handleAdminStepUpError(502, payload, navigation)).toBe(
			"SESSION_NOT_FRESH",
		);
		expect(assign).not.toHaveBeenCalled();
		expect(handleAdminStepUpError(403, payload, navigation)).toBe(
			"SESSION_NOT_FRESH",
		);
		expect(handleAdminStepUpError(403, payload, navigation)).toBe(
			"SESSION_NOT_FRESH",
		);
		expect(assign).toHaveBeenCalledTimes(1);
		expect(assign).toHaveBeenCalledWith(
			"/api/auth/oidc/login?mode=step-up&callbackURL=%2Fusers%2Fu1%3Ftab%3Dsessions%26next%3Dhttps%3A%2F%2Fattacker.example%2Fpath",
		);

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(Response.json(payload, { status: 403 })),
		);
		await expect(fetchAdminJson("/high-risk-action")).rejects.toMatchObject({
			status: 403,
			code: "SESSION_NOT_FRESH",
			message: "Recent authentication required",
		});
	});

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
					JSON.stringify({
						ok: false,
						error: { message: "upstream unavailable" },
					}),
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
	it("starts step-up instead of downloading a rejected CSV", async () => {
		vi.resetModules();
		const assign = vi.fn();
		vi.stubGlobal("window", {
			location: {
				pathname: "/audit",
				search: "?category=admin",
				assign,
			},
		});
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				Response.json(
					{
						ok: false,
						error: {
							code: "SESSION_NOT_FRESH",
							message: "Recent authentication is required",
						},
					},
					{ status: 403 },
				),
			),
		);
		const freshClient = await import("@/lib/client-api");

		await expect(
			freshClient.downloadAdminCsv("/api/admin/export?kind=audit", "audit.csv"),
		).resolves.toBe(false);
		expect(assign).toHaveBeenCalledWith(
			"/api/auth/oidc/login?mode=step-up&callbackURL=%2Faudit%3Fcategory%3Dadmin",
		);
	});

	it("downloads a successful protected CSV response", async () => {
		const click = vi.fn();
		const createElement = vi
			.spyOn(document, "createElement")
			.mockReturnValue({ click } as unknown as HTMLAnchorElement);
		const createObjectURL = vi.fn().mockReturnValue("blob:admin-export");
		const revokeObjectURL = vi.fn();
		vi.stubGlobal("URL", {
			...URL,
			createObjectURL,
			revokeObjectURL,
		});
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response("id,email\nu1,u1@test", {
					status: 200,
					headers: { "content-type": "text/csv" },
				}),
			),
		);

		await expect(
			downloadAdminCsv("/api/admin/export?kind=users", "users.csv"),
		).resolves.toBe(true);
		expect(createElement).toHaveBeenCalledWith("a");
		expect(createObjectURL).toHaveBeenCalledTimes(1);
		expect(click).toHaveBeenCalledTimes(1);
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:admin-export");
	});

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
