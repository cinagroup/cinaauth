import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";

vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: vi.fn(),
}));
vi.mock("@/lib/cinaauth/session", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@/lib/cinaauth/session")>();
	return { ...mod, resolveAdminSession: vi.fn() };
});
vi.mock("@/lib/recent-auth-guard", () => ({
	requireRecentAdminAuthentication: vi.fn().mockResolvedValue(undefined),
}));

const mockFetch = vi.mocked(cinaauthFetch);
const mockSession = vi.mocked(resolveAdminSession);

const request = () =>
	new NextRequest("https://admin.test/api/admin/sso/providers", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			cookie: "session=valid",
		},
		body: JSON.stringify({
			providerId: "enterprise",
			organizationId: "org-1",
			domain: "example.com",
			issuer: "https://login.example.com",
			oidcConfig: {
				clientId: "admin-console",
				clientSecret: "test-secret",
				discoveryEndpoint:
					"https://login.example.com/.well-known/openid-configuration",
				pkce: true,
				scopes: ["openid", "email", "profile"],
			},
		}),
	});

beforeEach(() => {
	vi.clearAllMocks();
	mockSession.mockResolvedValue({
		userId: "admin-1",
		role: "super_admin",
		email: "root@test",
		impersonatedBy: null,
	});
});

describe("Admin upstream status boundary", () => {
	it("allows 404 only when the caller opts in", () => {
		const response = {
			ok: false as const,
			error: { code: "NOT_FOUND", message: "missing", status: 404 },
		};

		expect(adminUpstreamResponseStatus(response)).toBe(502);
		expect(adminUpstreamResponseStatus(response, { allowNotFound: true })).toBe(
			404,
		);
	});

	it.each([
		[401, "UNAUTHORIZED"],
		[403, "SESSION_NOT_FRESH"],
	] as const)("preserves an authoritative %s response for the browser", async (status, code) => {
		mockFetch.mockResolvedValue({
			ok: false,
			error: {
				code,
				message: "Authentication boundary rejected the request",
				status,
			},
		});
		const { POST } = await import("@/app/api/admin/sso/providers/route");

		const response = await POST(request());

		expect(response.status).toBe(status);
		expect(await response.json()).toMatchObject({
			ok: false,
			error: { code, status },
		});
	});

	it("continues to hide unrelated upstream failures behind 502", async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			error: {
				code: "CINAUTH_500",
				message: "internal detail",
				status: 500,
			},
		});
		const { POST } = await import("@/app/api/admin/sso/providers/route");

		const response = await POST(request());

		expect(response.status).toBe(502);
	});
});
