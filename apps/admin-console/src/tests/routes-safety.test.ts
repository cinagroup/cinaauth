import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	cinaauthFetch,
	cinaauthFetchWithResponse,
} from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import type { AdminSession } from "@/lib/cinaauth/types";

const mockRecentAuthentication = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cinaauth/client", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@/lib/cinaauth/client")>();
	return {
		...mod,
		cinaauthFetch: vi.fn(),
		cinaauthFetchWithResponse: vi.fn(),
	};
});
vi.mock("@/lib/cinaauth/session", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@/lib/cinaauth/session")>();
	return { ...mod, resolveAdminSession: vi.fn() };
});
vi.mock("@/lib/recent-auth-guard", () => ({
	requireRecentAdminAuthentication: mockRecentAuthentication,
}));

const mockFetch = vi.mocked(cinaauthFetch);
const mockFetchWithResponse = vi.mocked(cinaauthFetchWithResponse);
const mockSession = vi.mocked(resolveAdminSession);

const SUPER: AdminSession = {
	userId: "admin-1",
	role: "super_admin",
	email: "root@test",
	impersonatedBy: null,
};
const IMPERSONATING: AdminSession = {
	userId: "u2",
	role: "user",
	email: "target@test",
	impersonatedBy: "admin-1",
};

function postReq(path: string, body?: unknown): NextRequest {
	return new NextRequest(new URL(`https://admin.test${path}`), {
		method: "POST",
		headers: { cookie: "s=1", "content-type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

function getReq(path: string): NextRequest {
	return new NextRequest(new URL(`https://admin.test${path}`), {
		headers: { cookie: "s=1" },
	});
}

function rawReq(path: string, method: string, raw: string): NextRequest {
	return new NextRequest(new URL(`https://admin.test${path}`), {
		method,
		headers: { cookie: "s=1", "content-type": "application/json" },
		body: raw,
	});
}

const upstreamResponseWithCookies = (...cookies: string[]) => {
	const headers = new Headers();
	for (const cookie of cookies) headers.append("set-cookie", cookie);
	return Response.json(
		{ session: { id: "impersonated-session" } },
		{ headers },
	);
};

const params = <T extends Record<string, string>>(p: T) => ({
	params: Promise.resolve(p),
});

beforeEach(() => {
	vi.clearAllMocks();
	mockSession.mockResolvedValue(SUPER);
	mockFetch.mockResolvedValue({ ok: true, data: {} });
	mockFetchWithResponse.mockResolvedValue({
		result: { ok: true, data: {} },
		response: upstreamResponseWithCookies(
			"__Secure-cinaauth.admin_session=actor; Path=/; Domain=.cinaseek.ai; HttpOnly; Secure; SameSite=Lax",
			"__Secure-cinaauth.session_token=target; Path=/; Domain=.cinaseek.ai; HttpOnly; Secure; SameSite=Lax",
		),
	});
	mockRecentAuthentication.mockResolvedValue(undefined);
});

describe("GET /api/admin/session (impersonation visibility)", () => {
	it("returns the session while impersonating even though role is not admin", async () => {
		mockSession.mockResolvedValue(IMPERSONATING);
		const { GET } = await import("@/app/api/admin/session/route");
		const res = await GET(postReq("/api/admin/session"));
		expect(res.status).toBe(200);
		const body = (await res.json()) as { ok: boolean; data: AdminSession };
		expect(body.data.impersonatedBy).toBe("admin-1");
	});

	it("still rejects a plain non-admin session", async () => {
		mockSession.mockResolvedValue({ ...IMPERSONATING, impersonatedBy: null });
		const { GET } = await import("@/app/api/admin/session/route");
		const res = await GET(postReq("/api/admin/session"));
		expect(res.status).toBe(403);
	});
});

describe("POST /api/admin/users/impersonate/stop", () => {
	it("works for the impersonated session (no admin-role gate)", async () => {
		mockSession.mockResolvedValue(IMPERSONATING);
		mockFetchWithResponse.mockResolvedValueOnce({
			result: { ok: true, data: {} },
			response: upstreamResponseWithCookies(
				"__Secure-cinaauth.session_token=actor; Path=/; Domain=.cinaseek.ai; HttpOnly; Secure; SameSite=Lax",
				"__Secure-cinaauth.admin_session=; Path=/; Domain=.cinaseek.ai; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
			),
		});
		const { POST } = await import(
			"@/app/api/admin/users/impersonate/stop/route"
		);
		const res = await POST(postReq("/api/admin/users/impersonate/stop"));
		expect(res.status).toBe(200);
		expect(mockFetchWithResponse).toHaveBeenCalledWith(
			"/admin/stop-impersonating",
			expect.objectContaining({ method: "POST" }),
		);
		expect(res.headers.get("set-cookie")).toContain(
			"__Secure-cinaauth.session_token=actor",
		);
		expect(res.headers.get("set-cookie")).toContain(
			"__Secure-cinaauth.admin_session=",
		);
		expect(res.headers.get("set-cookie")).not.toContain("Domain=");
	});

	it("fails closed when the restored session cookie is missing", async () => {
		mockSession.mockResolvedValue(IMPERSONATING);
		mockFetchWithResponse.mockResolvedValueOnce({
			result: { ok: true, data: {} },
			response: Response.json({}),
		});
		const { POST } = await import(
			"@/app/api/admin/users/impersonate/stop/route"
		);

		const res = await POST(postReq("/api/admin/users/impersonate/stop"));

		expect(res.status).toBe(502);
		expect(await res.json()).toMatchObject({
			error: { code: "CINAUTH_SESSION_COOKIE_MISSING" },
		});
	});

	it("rejects when there is no session at all", async () => {
		mockSession.mockResolvedValue(null);
		const { POST } = await import(
			"@/app/api/admin/users/impersonate/stop/route"
		);
		const res = await POST(postReq("/api/admin/users/impersonate/stop"));
		expect(res.status).toBe(401);
	});
});

describe("POST /api/admin/users/[id]/impersonate", () => {
	it("forwards the upstream session cookies to the Admin host", async () => {
		const { POST } = await import(
			"@/app/api/admin/users/[id]/impersonate/route"
		);
		const res = await POST(
			postReq("/api/admin/users/u2/impersonate"),
			params({ id: "u2" }),
		);

		expect(res.status).toBe(200);
		expect(mockFetchWithResponse).toHaveBeenCalledWith(
			"/admin/impersonate-user",
			expect.objectContaining({
				method: "POST",
				body: { userId: "u2" },
			}),
		);
		expect(res.headers.get("set-cookie")).toContain(
			"__Secure-cinaauth.session_token=target",
		);
		expect(res.headers.get("set-cookie")).toContain(
			"__Secure-cinaauth.admin_session=actor",
		);
		expect(res.headers.get("set-cookie")).not.toContain("Domain=");
	});

	it("fails closed when the impersonated session cookie is missing", async () => {
		mockFetchWithResponse.mockResolvedValueOnce({
			result: { ok: true, data: {} },
			response: Response.json({}),
		});
		const { POST } = await import(
			"@/app/api/admin/users/[id]/impersonate/route"
		);

		const res = await POST(
			postReq("/api/admin/users/u2/impersonate"),
			params({ id: "u2" }),
		);

		expect(res.status).toBe(502);
		expect(await res.json()).toMatchObject({
			error: { code: "CINAUTH_SESSION_COOKIE_MISSING" },
		});
	});
});

describe("POST /api/admin/users/[id]/ban", () => {
	it("refuses to ban the acting admin", async () => {
		const { POST } = await import("@/app/api/admin/users/[id]/ban/route");
		const res = await POST(
			postReq("/api/admin/users/admin-1/ban", { banReason: "x" }),
			params({ id: "admin-1" }),
		);
		expect(res.status).toBe(400);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("pins the path-param userId over a crafted body userId", async () => {
		const { POST } = await import("@/app/api/admin/users/[id]/ban/route");
		await POST(
			postReq("/api/admin/users/u2/ban", { banReason: "x", userId: "victim" }),
			params({ id: "u2" }),
		);
		expect(mockFetch).toHaveBeenCalledWith(
			"/admin/ban-user",
			expect.objectContaining({
				body: expect.objectContaining({ userId: "u2" }),
			}),
		);
	});

	it("returns 400 on malformed JSON instead of crashing", async () => {
		const { POST } = await import("@/app/api/admin/users/[id]/ban/route");
		const res = await POST(
			rawReq("/api/admin/users/u2/ban", "POST", "{not json"),
			params({ id: "u2" }),
		);
		expect(res.status).toBe(400);
	});
});

describe("retired high-risk admin capabilities", () => {
	it("does not issue a one-time token for a path-param user", async () => {
		const { POST } = await import(
			"@/app/api/admin/users/[id]/one-time-token/route"
		);
		const res = await POST(
			postReq("/api/admin/users/u2/one-time-token"),
			params({ id: "u2" }),
		);

		expect(res.status).toBe(410);
		expect(await res.json()).toEqual({
			ok: false,
			error: {
				code: "ADMIN_ONE_TIME_TOKEN_DISABLED",
				message: "Administrator one-time token issuance is disabled",
				status: 410,
			},
		});
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("still authenticates before reporting one-time token retirement", async () => {
		mockSession.mockResolvedValue(null);
		const { POST } = await import(
			"@/app/api/admin/users/[id]/one-time-token/route"
		);
		const res = await POST(
			postReq("/api/admin/users/u2/one-time-token"),
			params({ id: "u2" }),
		);

		expect(res.status).toBe(401);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("still requires super_admin before reporting one-time token retirement", async () => {
		mockSession.mockResolvedValue({ ...SUPER, role: "security_admin" });
		const { POST } = await import(
			"@/app/api/admin/users/[id]/one-time-token/route"
		);
		const res = await POST(
			postReq("/api/admin/users/u2/one-time-token"),
			params({ id: "u2" }),
		);

		expect(res.status).toBe(403);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it.each([
		"approve",
		"deny",
	] as const)("does not proxy device %s to the end-user authorization endpoint", async (action) => {
		const { POST } =
			action === "approve"
				? await import("@/app/api/admin/device/approve/route")
				: await import("@/app/api/admin/device/deny/route");
		const res = await POST(
			postReq(`/api/admin/device/${action}`, {
				userCode: "ABCD-EFGH",
				action: "lookup",
			}),
		);

		expect(res.status).toBe(410);
		expect(await res.json()).toEqual({
			ok: false,
			error: {
				code: "ADMIN_DEVICE_AUTHORIZATION_DISABLED",
				message: "Device authorization must be completed by the end user",
				status: 410,
			},
		});
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("still authenticates before reporting device authorization retirement", async () => {
		mockSession.mockResolvedValue(null);
		const { POST } = await import("@/app/api/admin/device/approve/route");
		const res = await POST(
			postReq("/api/admin/device/approve", { userCode: "ABCD-EFGH" }),
		);

		expect(res.status).toBe(403);
		expect(mockFetch).not.toHaveBeenCalled();
	});
});

describe("user lookup response semantics", () => {
	it("returns 502 when cinaauth is unavailable", async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			error: { code: "CINAUTH_503", message: "unavailable", status: 503 },
		});
		const { GET } = await import("@/app/api/admin/users/[id]/route");
		const res = await GET(getReq("/api/admin/users/u2"), params({ id: "u2" }));
		expect(res.status).toBe(502);
	});

	it("preserves a real upstream 404", async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			error: { code: "CINAUTH_404", message: "missing", status: 404 },
		});
		const { GET } = await import("@/app/api/admin/users/[id]/route");
		const res = await GET(
			getReq("/api/admin/users/missing"),
			params({ id: "missing" }),
		);
		expect(res.status).toBe(404);
	});
});

describe("POST /api/admin/users/[id]/send-verification", () => {
	it.each([
		"email-otp",
		"phone-number",
	] as const)("delegates %s to the authoritative Admin endpoint with the path user id", async (type) => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			data: { sent: true },
		});
		const { POST } = await import(
			"@/app/api/admin/users/[id]/send-verification/route"
		);
		const res = await POST(
			postReq("/api/admin/users/u2/send-verification", {
				type,
				userId: "victim",
			}),
			params({ id: "u2" }),
		);

		expect(res.status).toBe(200);
		expect(mockRecentAuthentication).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			"/admin/send-verification",
			expect.objectContaining({
				method: "POST",
				body: { userId: "u2", type },
			}),
		);
	});

	it("rejects the disabled magic-link channel before upstream delivery", async () => {
		const { POST } = await import(
			"@/app/api/admin/users/[id]/send-verification/route"
		);
		const res = await POST(
			postReq("/api/admin/users/u2/send-verification", {
				type: "magic-link",
			}),
			params({ id: "u2" }),
		);

		expect(res.status).toBe(400);
		expect(mockRecentAuthentication).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("requires recent authentication after validating the request and before upstream delivery", async () => {
		mockRecentAuthentication.mockRejectedValueOnce(
			new Response(
				JSON.stringify({
					ok: false,
					error: {
						code: "SESSION_NOT_FRESH",
						message: "Recent authentication is required",
						status: 403,
					},
				}),
				{ status: 403 },
			),
		);
		const { POST } = await import(
			"@/app/api/admin/users/[id]/send-verification/route"
		);

		const res = await POST(
			postReq("/api/admin/users/u2/send-verification", {
				type: "email-otp",
			}),
			params({ id: "u2" }),
		);

		expect(res.status).toBe(403);
		expect(await res.json()).toMatchObject({
			error: { code: "SESSION_NOT_FRESH" },
		});
		expect(mockRecentAuthentication).toHaveBeenCalledTimes(1);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it.each([
		{},
		{ type: "push" },
		{ type: "EMAIL-OTP" },
	])("rejects a non-whitelisted verification type %#", async (body) => {
		const { POST } = await import(
			"@/app/api/admin/users/[id]/send-verification/route"
		);
		const res = await POST(
			postReq("/api/admin/users/u2/send-verification", body),
			params({ id: "u2" }),
		);
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({
			ok: false,
			error: { code: "INVALID_VERIFICATION_TYPE" },
		});
		expect(mockRecentAuthentication).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("rejects malformed JSON before looking up the user", async () => {
		const { POST } = await import(
			"@/app/api/admin/users/[id]/send-verification/route"
		);

		const res = await POST(
			rawReq("/api/admin/users/u2/send-verification", "POST", "{not json"),
			params({ id: "u2" }),
		);

		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({
			ok: false,
			error: { code: "INVALID_JSON" },
		});
		expect(mockRecentAuthentication).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("returns 502 when the authoritative Admin endpoint is unavailable", async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			error: { code: "CINAUTH_503", message: "unavailable", status: 503 },
		});
		const { POST } = await import(
			"@/app/api/admin/users/[id]/send-verification/route"
		);
		const res = await POST(
			postReq("/api/admin/users/u2/send-verification", {
				type: "email-otp",
			}),
			params({ id: "u2" }),
		);
		expect(res.status).toBe(502);
	});
});

describe("DELETE + PATCH /api/admin/users/[id]", () => {
	it("refuses to delete the acting admin", async () => {
		const { DELETE } = await import("@/app/api/admin/users/[id]/route");
		const res = await DELETE(
			postReq("/api/admin/users/admin-1"),
			params({ id: "admin-1" }),
		);
		expect(res.status).toBe(400);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("refuses a self role change (lockout protection)", async () => {
		const { PATCH } = await import("@/app/api/admin/users/[id]/route");
		const res = await PATCH(
			postReq("/api/admin/users/admin-1", { role: "user" }),
			params({ id: "admin-1" }),
		);
		expect(res.status).toBe(400);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("rejects unknown role values", async () => {
		const { PATCH } = await import("@/app/api/admin/users/[id]/route");
		const res = await PATCH(
			postReq("/api/admin/users/u2", { role: "owner" }),
			params({ id: "u2" }),
		);
		expect(res.status).toBe(400);
	});

	it("forwards a valid role change for another user", async () => {
		const { PATCH } = await import("@/app/api/admin/users/[id]/route");
		const res = await PATCH(
			postReq("/api/admin/users/u2", { role: "security_admin" }),
			params({ id: "u2" }),
		);
		expect(res.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledWith(
			"/admin/update-user",
			expect.objectContaining({
				body: { userId: "u2", data: { role: "security_admin" } },
			}),
		);
	});
});

describe("POST /api/admin/users/batch", () => {
	it("rejects unknown actions instead of silently succeeding", async () => {
		const { POST } = await import("@/app/api/admin/users/batch/route");
		const res = await POST(
			postReq("/api/admin/users/batch", { action: "nuke", userIds: ["u2"] }),
		);
		expect(res.status).toBe(400);
	});

	it("skips the acting admin and reports it as a per-item failure", async () => {
		const { POST } = await import("@/app/api/admin/users/batch/route");
		const res = await POST(
			postReq("/api/admin/users/batch", {
				action: "delete",
				userIds: ["admin-1", "u2"],
			}),
		);
		const body = (await res.json()) as {
			ok: boolean;
			data: { results: { userId: string; ok: boolean }[] };
		};
		expect(body.ok).toBe(false);
		expect(body.data.results).toEqual([
			expect.objectContaining({ userId: "admin-1", ok: false }),
			expect.objectContaining({ userId: "u2", ok: true }),
		]);
		// Upstream must only be called for the non-self entry.
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it("caps batch size at 100", async () => {
		const { POST } = await import("@/app/api/admin/users/batch/route");
		const res = await POST(
			postReq("/api/admin/users/batch", {
				action: "ban",
				userIds: Array.from({ length: 101 }, (_, i) => `u${i}`),
			}),
		);
		expect(res.status).toBe(400);
	});
});

describe("POST /api/admin/api-keys/[id]/rotate", () => {
	const rotatableKey = {
		id: "k1",
		configId: "default",
		name: "Deploy key",
		start: "cina_sk_old",
		prefix: "cina_sk_",
		referenceId: "admin-1",
		refillInterval: null,
		refillAmount: null,
		lastRefillAt: null,
		enabled: true,
		rateLimitEnabled: true,
		rateLimitTimeWindow: 1_000,
		rateLimitMax: 100,
		requestCount: 0,
		remaining: null,
		lastRequest: null,
		expiresAt: null,
		createdAt: "2026-08-01T00:00:00.000Z",
		updatedAt: "2026-08-01T00:00:00.000Z",
		metadata: null,
		permissions: null,
	};

	it("does NOT delete the old key when creating the new key fails", async () => {
		mockFetch
			.mockResolvedValueOnce({ ok: true, data: rotatableKey })
			.mockResolvedValueOnce({
				ok: false,
				error: { code: "X", message: "boom" },
			});
		const { POST } = await import("@/app/api/admin/api-keys/[id]/rotate/route");
		const res = await POST(
			postReq("/api/admin/api-keys/k1/rotate"),
			params({ id: "k1" }),
		);
		expect(res.status).toBe(502);
		const paths = mockFetch.mock.calls.map((c) => c[0]);
		expect(paths).toContain("/api-key/create");
		expect(paths).not.toContain("/api-key/delete");
	});

	it("reads configuration, creates a replacement, then confirms old-key revoke", async () => {
		mockFetch
			.mockResolvedValueOnce({ ok: true, data: rotatableKey })
			.mockResolvedValueOnce({
				ok: true,
				data: { id: "replacement-key", key: "new-secret" },
			})
			.mockResolvedValueOnce({ ok: true, data: { success: true } });
		const { POST } = await import("@/app/api/admin/api-keys/[id]/rotate/route");
		const res = await POST(
			postReq("/api/admin/api-keys/k1/rotate"),
			params({ id: "k1" }),
		);
		expect(res.status).toBe(200);
		const paths = mockFetch.mock.calls.map((c) => c[0]);
		expect(paths).toEqual([
			"/api-key/get?id=k1",
			"/api-key/create",
			"/api-key/delete",
		]);
	});
});

describe("POST /api/admin/sessions/revoke", () => {
	it("requires sessionId or userId", async () => {
		const { POST } = await import("@/app/api/admin/sessions/revoke/route");
		const res = await POST(postReq("/api/admin/sessions/revoke", {}));
		expect(res.status).toBe(400);
	});

	it("routes userId to revoke-user-sessions", async () => {
		const { POST } = await import("@/app/api/admin/sessions/revoke/route");
		await POST(postReq("/api/admin/sessions/revoke", { userId: "u2" }));
		expect(mockFetch).toHaveBeenCalledWith(
			"/admin/revoke-user-sessions",
			expect.anything(),
		);
	});

	it("routes a non-secret session id to the by-id revocation endpoint", async () => {
		const { POST } = await import("@/app/api/admin/sessions/revoke/route");
		await POST(
			postReq("/api/admin/sessions/revoke", { sessionId: "session-2" }),
		);
		expect(mockFetch).toHaveBeenCalledWith(
			"/admin/revoke-user-session-by-id",
			expect.objectContaining({
				body: { sessionId: "session-2" },
			}),
		);
	});
});

describe("POST /api/admin/api-keys/[id]/toggle", () => {
	it("rejects a non-boolean enabled value", async () => {
		const { POST } = await import("@/app/api/admin/api-keys/[id]/toggle/route");
		const res = await POST(
			postReq("/api/admin/api-keys/k1/toggle", { enabled: "yes" }),
			params({ id: "k1" }),
		);
		expect(res.status).toBe(400);
		expect(mockFetch).not.toHaveBeenCalled();
	});
});

describe("GET /api/admin/export (audit)", () => {
	it("returns 502 instead of a silent empty CSV when upstream fails", async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			error: { code: "X", message: "down" },
		});
		const { GET } = await import("@/app/api/admin/export/route");
		const res = await GET(
			new NextRequest(
				new URL("https://admin.test/api/admin/export?kind=audit"),
				{
					headers: { cookie: "s=1" },
				},
			),
		);
		expect(res.status).toBe(502);
	});
});

describe("admin list routes preserve upstream failures", () => {
	const cases: Array<[string, () => Promise<Response>]> = [
		[
			"API keys",
			async () =>
				(await import("@/app/api/admin/api-keys/route")).GET(
					getReq("/api/admin/api-keys"),
				),
		],
		[
			"organizations",
			async () =>
				(await import("@/app/api/admin/organizations/route")).GET(
					getReq("/api/admin/organizations"),
				),
		],
		[
			"sessions",
			async () =>
				(await import("@/app/api/admin/sessions/route")).GET(
					getReq("/api/admin/sessions"),
				),
		],
		[
			"subscriptions",
			async () =>
				(await import("@/app/api/admin/subscriptions/route")).GET(
					getReq("/api/admin/subscriptions"),
				),
		],
		[
			"SSO providers",
			async () =>
				(await import("@/app/api/admin/sso/providers/route")).GET(
					getReq("/api/admin/sso/providers?organizationId=o1"),
				),
		],
		[
			"SCIM connections",
			async () =>
				(await import("@/app/api/admin/scim/tokens/route")).GET(
					getReq("/api/admin/scim/tokens?organizationId=o1"),
				),
		],
		[
			"audit alerts",
			async () =>
				(await import("@/app/api/admin/audit/alerts/route")).GET(
					getReq("/api/admin/audit/alerts"),
				),
		],
		[
			"user wallets",
			async () =>
				(await import("@/app/api/admin/users/[id]/wallets/route")).GET(
					getReq("/api/admin/users/u2/wallets"),
					params({ id: "u2" }),
				),
		],
		[
			"user sessions",
			async () =>
				(await import("@/app/api/admin/users/[id]/sessions/route")).GET(
					getReq("/api/admin/users/u2/sessions"),
					params({ id: "u2" }),
				),
		],
		[
			"user passkeys",
			async () =>
				(await import("@/app/api/admin/users/[id]/passkeys/route")).GET(
					getReq("/api/admin/users/u2/passkeys"),
					params({ id: "u2" }),
				),
		],
		[
			"organization members",
			async () =>
				(await import("@/app/api/admin/organizations/[id]/members/route")).GET(
					getReq("/api/admin/organizations/o1/members"),
					params({ id: "o1" }),
				),
		],
		[
			"organization teams",
			async () =>
				(await import("@/app/api/admin/organizations/[id]/teams/route")).GET(
					getReq("/api/admin/organizations/o1/teams"),
					params({ id: "o1" }),
				),
		],
		[
			"team members",
			async () =>
				(
					await import(
						"@/app/api/admin/organizations/[id]/teams/[teamId]/members/route"
					)
				).GET(
					getReq("/api/admin/organizations/o1/teams/t1/members"),
					params({ id: "o1", teamId: "t1" }),
				),
		],
	];

	it.each(
		cases,
	)("returns 502 for %s instead of a silent empty result", async (_name, invoke) => {
		mockFetch.mockResolvedValue({
			ok: false,
			error: { code: "UPSTREAM", message: "unavailable" },
		});
		const response = await invoke();
		expect(response.status).toBe(502);
		expect(await response.json()).toMatchObject({ ok: false });
	});

	it("rejects integration lists without an explicit organization selector", async () => {
		const sso = await import("@/app/api/admin/sso/providers/route");
		const scim = await import("@/app/api/admin/scim/tokens/route");

		expect((await sso.GET(getReq("/api/admin/sso/providers"))).status).toBe(
			400,
		);
		expect((await scim.GET(getReq("/api/admin/scim/tokens"))).status).toBe(400);
		expect(mockFetch).not.toHaveBeenCalled();
	});
});

describe("POST /api/admin/subscriptions", () => {
	it("rejects an unknown action instead of defaulting to cancel", async () => {
		const { POST } = await import("@/app/api/admin/subscriptions/route");
		const res = await POST(
			postReq("/api/admin/subscriptions", {
				action: "nope",
				subscriptionId: "s1",
			}),
		);
		expect(res.status).toBe(400);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("rejects a missing action (no silent cancel)", async () => {
		const { POST } = await import("@/app/api/admin/subscriptions/route");
		const res = await POST(
			postReq("/api/admin/subscriptions", { subscriptionId: "s1" }),
		);
		expect(res.status).toBe(400);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("routes an explicit cancel to the cancel endpoint", async () => {
		const { POST } = await import("@/app/api/admin/subscriptions/route");
		await POST(
			postReq("/api/admin/subscriptions", {
				action: "cancel",
				subscriptionId: "s1",
			}),
		);
		expect(mockFetch).toHaveBeenCalledWith(
			"/subscription/cancel",
			expect.anything(),
		);
	});
});

describe("POST /api/admin/organizations/[id]/update (target pinning)", () => {
	it("pins the path-param organizationId over a crafted body value", async () => {
		const { POST } = await import(
			"@/app/api/admin/organizations/[id]/update/route"
		);
		await POST(
			postReq("/api/admin/organizations/orgA/update", {
				name: "x",
				organizationId: "orgB",
			}),
			params({ id: "orgA" }),
		);
		expect(mockFetch).toHaveBeenCalledWith(
			"/organization/update",
			expect.objectContaining({
				body: expect.objectContaining({ organizationId: "orgA" }),
			}),
		);
	});
});
