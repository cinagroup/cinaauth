import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("POST /api/auth/sign-out", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubEnv("CINAADMIN_ORIGIN", "https://admin.test");
		vi.stubEnv("CINAUTH_REQUEST_ORIGIN", "https://admin.test");
		vi.stubEnv("CINAUTH_BASE_URL", "https://auth.test");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it("rejects cross-site requests before contacting auth", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch");
		const { POST } = await import("@/app/api/auth/sign-out/route");
		const request = new NextRequest(
			"https://admin.test/api/auth/sign-out",
			{
				method: "POST",
				headers: { origin: "https://attacker.example" },
			},
		);

		const response = await POST(request);

		expect(response.status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("forwards the session and scopes cleared cookies to the admin host", async () => {
		const headers = new Headers();
		headers.append(
			"set-cookie",
			"__Secure-cinaauth.session_token=; Max-Age=0; Path=/; Domain=.cinaseek.ai; HttpOnly; Secure; SameSite=Lax",
		);
		headers.append(
			"set-cookie",
			"__Secure-cinaauth.session_data=; Max-Age=0; Path=/; Domain=.cinaseek.ai; HttpOnly; Secure; SameSite=Lax",
		);
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers,
			}),
		);
		const { POST } = await import("@/app/api/auth/sign-out/route");
		const request = new NextRequest(
			"https://admin.test/api/auth/sign-out",
			{
				method: "POST",
				headers: {
					origin: "https://admin.test",
					cookie: "__Secure-cinaauth.session_token=session-token",
				},
			},
		);

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true });
		const upstreamRequest = fetchMock.mock.calls[0]?.[0];
		expect(upstreamRequest).toBeInstanceOf(Request);
		const authRequest = upstreamRequest as Request;
		expect(authRequest.url).toBe("https://auth.test/api/auth/sign-out");
		expect(authRequest.method).toBe("POST");
		expect(authRequest.headers.get("content-type")).toBe("application/json");
		expect(authRequest.headers.get("origin")).toBe("https://admin.test");
		expect(authRequest.headers.get("cookie")).toBe(
			"__Secure-cinaauth.session_token=session-token",
		);
		expect(await authRequest.text()).toBe("{}");
		const setCookie = response.headers.get("set-cookie") ?? "";
		expect(setCookie).toContain("__Secure-cinaauth.session_token=");
		expect(setCookie).toContain("__Secure-cinaauth.session_data=");
		expect(setCookie).toContain("Max-Age=0");
		expect(setCookie).not.toMatch(/domain=/i);
	});

	it("returns a controlled error when the auth backend is unavailable", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
		const { POST } = await import("@/app/api/auth/sign-out/route");
		const request = new NextRequest(
			"https://admin.test/api/auth/sign-out",
			{
				method: "POST",
				headers: { origin: "https://admin.test" },
			},
		);

		const response = await POST(request);

		expect(response.status).toBe(502);
		expect(await response.json()).toMatchObject({
			error: { code: "AUTH_UNAVAILABLE" },
		});
	});
});
