import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import type { AdminSession } from "@/lib/cinaauth/types";

vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: vi.fn(),
}));

vi.mock("@/lib/cinaauth/session", () => ({
	hasAdminRole: (role: string | undefined | null) =>
		role === "super_admin" || role === "security_admin",
	resolveAdminSession: vi.fn(),
}));

const mockFetch = vi.mocked(cinaauthFetch);
const mockSession = vi.mocked(resolveAdminSession);

const SUPER_ADMIN: AdminSession = {
	userId: "admin-1",
	role: "super_admin",
	email: "root@example.com",
	impersonatedBy: null,
};

const request = () =>
	new NextRequest("https://admin.test/api/admin/settings/security", {
		headers: { cookie: "__Secure-cinaauth.session_token=session-token" },
	});

beforeEach(() => {
	vi.clearAllMocks();
	mockSession.mockResolvedValue(SUPER_ADMIN);
});

describe("GET /api/admin/settings/security", () => {
	it("loads and normalizes the authoritative Auth Worker rate-limit policy", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			data: {
				enabled: true,
				window: 60,
				max: 300,
				storage: "durable-object",
				customRules: {
					"/sign-in/*": { window: 60, max: 5 },
				},
			},
		});

		const { GET } = await import("@/app/api/admin/settings/security/route");
		const response = await GET(request());

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledWith("/admin/rate-limit-config", {
			cookie: "__Secure-cinaauth.session_token=session-token",
		});
		expect(await response.json()).toEqual({
			ok: true,
			data: {
				readOnly: true,
				source: "auth-worker",
				rateLimit: {
					enabled: true,
					window: 60,
					max: 300,
					storage: "durable-object",
					customRules: [{ path: "/sign-in/*", window: 60, max: 5 }],
				},
				otpTtl: null,
				otpDailyMax: null,
				lockoutThreshold: null,
				banDuration: null,
				force2fa: null,
				trustedOrigins: null,
			},
		});
	});

	it("fails closed when the authoritative response is malformed", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			data: {
				enabled: true,
				window: "60",
				max: 300,
				storage: "durable-object",
				customRules: {},
			},
		});

		const { GET } = await import("@/app/api/admin/settings/security/route");
		const response = await GET(request());

		expect(response.status).toBe(502);
		expect(await response.json()).toMatchObject({
			ok: false,
			error: { code: "CINAUTH_INVALID_RATE_LIMIT_CONFIG" },
		});
	});

	it("preserves upstream failure instead of returning invented defaults", async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			error: {
				code: "CINAUTH_503",
				message: "cinaauth unavailable",
				status: 503,
			},
		});

		const { GET } = await import("@/app/api/admin/settings/security/route");
		const response = await GET(request());

		expect(response.status).toBe(502);
		expect(await response.json()).toMatchObject({
			ok: false,
			error: { code: "CINAUTH_503" },
		});
	});

	it("allows a security administrator to read the security posture", async () => {
		mockSession.mockResolvedValue({
			...SUPER_ADMIN,
			role: "security_admin",
		});
		mockFetch.mockResolvedValue({
			ok: true,
			data: {
				enabled: true,
				window: 60,
				max: 300,
				storage: "durable-object",
				customRules: {},
			},
		});

		const { GET } = await import("@/app/api/admin/settings/security/route");
		const response = await GET(request());

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledOnce();
	});

	it("rejects a non-admin session before contacting cinaauth", async () => {
		mockSession.mockResolvedValue({
			...SUPER_ADMIN,
			role: "user",
		});

		const { GET } = await import("@/app/api/admin/settings/security/route");
		const response = await GET(request());

		expect(response.status).toBe(403);
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
