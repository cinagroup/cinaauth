import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import type { AdminSession } from "@/lib/cinaauth/types";

vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: vi.fn(),
}));
vi.mock("@/lib/cinaauth/session", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@/lib/cinaauth/session")>();
	return { ...mod, resolveAdminSession: vi.fn() };
});

const mockFetch = vi.mocked(cinaauthFetch);
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

const params = <T extends Record<string, string>>(p: T) => ({
	params: Promise.resolve(p),
});

beforeEach(() => {
	vi.clearAllMocks();
	mockSession.mockResolvedValue(SUPER);
	mockFetch.mockResolvedValue({ ok: true, data: {} });
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
		const { POST } = await import("@/app/api/admin/users/impersonate/stop/route");
		const res = await POST(postReq("/api/admin/users/impersonate/stop"));
		expect(res.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledWith(
			"/admin/stop-impersonating",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("rejects when there is no session at all", async () => {
		mockSession.mockResolvedValue(null);
		const { POST } = await import("@/app/api/admin/users/impersonate/stop/route");
		const res = await POST(postReq("/api/admin/users/impersonate/stop"));
		expect(res.status).toBe(401);
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

describe("user lookup response semantics", () => {
	it("returns 502 when cinaauth is unavailable", async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			error: { code: "CINAUTH_503", message: "unavailable", status: 503 },
		});
		const { GET } = await import("@/app/api/admin/users/[id]/route");
		const res = await GET(
			getReq("/api/admin/users/u2"),
			params({ id: "u2" }),
		);
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
	it("reads the nested get-user response before sending an OTP", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				data: { user: { email: "user@example.com" } },
			})
			.mockResolvedValueOnce({ ok: true, data: {} });
		const { POST } = await import(
			"@/app/api/admin/users/[id]/send-verification/route"
		);
		const res = await POST(
			postReq("/api/admin/users/u2/send-verification", {
				type: "email-otp",
			}),
			params({ id: "u2" }),
		);
		expect(res.status).toBe(200);
		expect(mockFetch).toHaveBeenNthCalledWith(
			2,
			"/email-otp/send-verification-otp",
			expect.objectContaining({
				method: "POST",
				body: { email: "user@example.com" },
			}),
		);
	});

	it("returns 502 when the lookup service is unavailable", async () => {
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
	it("does NOT delete the old key when creating the new key fails", async () => {
		mockFetch.mockResolvedValue({ ok: false, error: { code: "X", message: "boom" } });
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

	it("creates first, then deletes the old key on success", async () => {
		mockFetch.mockResolvedValue({ ok: true, data: { key: "new-secret" } });
		const { POST } = await import("@/app/api/admin/api-keys/[id]/rotate/route");
		const res = await POST(
			postReq("/api/admin/api-keys/k1/rotate"),
			params({ id: "k1" }),
		);
		expect(res.status).toBe(200);
		const paths = mockFetch.mock.calls.map((c) => c[0]);
		expect(paths).toEqual(["/api-key/create", "/api-key/delete"]);
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
		mockFetch.mockResolvedValue({ ok: false, error: { code: "X", message: "down" } });
		const { GET } = await import("@/app/api/admin/export/route");
		const res = await GET(
			new NextRequest(new URL("https://admin.test/api/admin/export?kind=audit"), {
				headers: { cookie: "s=1" },
			}),
		);
		expect(res.status).toBe(502);
	});
});

describe("admin list routes preserve upstream failures", () => {
	const cases: Array<[string, () => Promise<Response>]> = [
		[
			"API keys",
			async () => (await import("@/app/api/admin/api-keys/route")).GET(getReq("/api/admin/api-keys")),
		],
		[
			"organizations",
			async () => (await import("@/app/api/admin/organizations/route")).GET(getReq("/api/admin/organizations")),
		],
		[
			"sessions",
			async () => (await import("@/app/api/admin/sessions/route")).GET(getReq("/api/admin/sessions")),
		],
		[
			"subscriptions",
			async () => (await import("@/app/api/admin/subscriptions/route")).GET(getReq("/api/admin/subscriptions")),
		],
		[
			"SSO providers",
			async () => (await import("@/app/api/admin/sso/providers/route")).GET(getReq("/api/admin/sso/providers")),
		],
		[
			"SCIM connections",
			async () => (await import("@/app/api/admin/scim/tokens/route")).GET(getReq("/api/admin/scim/tokens")),
		],
		[
			"audit alerts",
			async () => (await import("@/app/api/admin/audit/alerts/route")).GET(getReq("/api/admin/audit/alerts")),
		],
		[
			"user wallets",
			async () => (await import("@/app/api/admin/users/[id]/wallets/route")).GET(
				getReq("/api/admin/users/u2/wallets"),
				params({ id: "u2" }),
			),
		],
		[
			"user sessions",
			async () => (await import("@/app/api/admin/users/[id]/sessions/route")).GET(
				getReq("/api/admin/users/u2/sessions"),
				params({ id: "u2" }),
			),
		],
		[
			"user passkeys",
			async () => (await import("@/app/api/admin/users/[id]/passkeys/route")).GET(
				getReq("/api/admin/users/u2/passkeys"),
				params({ id: "u2" }),
			),
		],
		[
			"organization members",
			async () => (await import("@/app/api/admin/organizations/[id]/members/route")).GET(
				getReq("/api/admin/organizations/o1/members"),
				params({ id: "o1" }),
			),
		],
		[
			"organization teams",
			async () => (await import("@/app/api/admin/organizations/[id]/teams/route")).GET(
				getReq("/api/admin/organizations/o1/teams"),
				params({ id: "o1" }),
			),
		],
		[
			"team members",
			async () => (await import("@/app/api/admin/organizations/[id]/teams/[teamId]/members/route")).GET(
				getReq("/api/admin/organizations/o1/teams/t1/members"),
				params({ id: "o1", teamId: "t1" }),
			),
		],
	];

	it.each(cases)("returns 502 for %s instead of a silent empty result", async (_name, invoke) => {
		mockFetch.mockResolvedValue({
			ok: false,
			error: { code: "UPSTREAM", message: "unavailable" },
		});
		const response = await invoke();
		expect(response.status).toBe(502);
		expect(await response.json()).toMatchObject({ ok: false });
	});
});

describe("POST /api/admin/subscriptions", () => {
	it("rejects an unknown action instead of defaulting to cancel", async () => {
		const { POST } = await import("@/app/api/admin/subscriptions/route");
		const res = await POST(postReq("/api/admin/subscriptions", { action: "nope", subscriptionId: "s1" }));
		expect(res.status).toBe(400);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("rejects a missing action (no silent cancel)", async () => {
		const { POST } = await import("@/app/api/admin/subscriptions/route");
		const res = await POST(postReq("/api/admin/subscriptions", { subscriptionId: "s1" }));
		expect(res.status).toBe(400);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("routes an explicit cancel to the cancel endpoint", async () => {
		const { POST } = await import("@/app/api/admin/subscriptions/route");
		await POST(postReq("/api/admin/subscriptions", { action: "cancel", subscriptionId: "s1" }));
		expect(mockFetch).toHaveBeenCalledWith("/subscription/cancel", expect.anything());
	});
});

describe("POST /api/admin/organizations/[id]/update (target pinning)", () => {
	it("pins the path-param organizationId over a crafted body value", async () => {
		const { POST } = await import("@/app/api/admin/organizations/[id]/update/route");
		await POST(
			postReq("/api/admin/organizations/orgA/update", { name: "x", organizationId: "orgB" }),
			params({ id: "orgA" }),
		);
		expect(mockFetch).toHaveBeenCalledWith(
			"/organization/update",
			expect.objectContaining({ body: expect.objectContaining({ organizationId: "orgA" }) }),
		);
	});
});
