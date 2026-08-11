import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";

vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: vi.fn(),
}));

vi.mock("@/lib/cinaauth/session", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@/lib/cinaauth/session")>();
	return { ...mod, resolveAdminSession: vi.fn() };
});

const mockFetch = vi.mocked(cinaauthFetch);
const mockSession = vi.mocked(resolveAdminSession);

describe("GET /api/admin/users/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSession.mockResolvedValue({
			userId: "admin-1",
			role: "super_admin",
			email: "root@example.com",
			impersonatedBy: null,
		});
	});

	it("normalizes cinaauth's direct user result for the detail-page contract", async () => {
		const upstreamUser = {
			id: "user/with space",
			email: "person@example.com",
			name: "Person",
			role: "user",
		};
		mockFetch.mockResolvedValue({ ok: true, data: upstreamUser });

		const { GET } = await import("@/app/api/admin/users/[id]/route");
		const request = new NextRequest(
			"https://admin.example.com/api/admin/users/user%2Fwith%20space",
			{ headers: { cookie: "cinaauth.session_token=secret" } },
		);
		const response = await GET(request, {
			params: Promise.resolve({ id: "user/with space" }),
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			ok: true,
			data: { user: upstreamUser },
		});
		expect(mockFetch).toHaveBeenCalledWith(
			"/admin/get-user?id=user%2Fwith%20space",
			{ cookie: "cinaauth.session_token=secret" },
		);
	});

	it("fails closed when cinaauth returns success without a user record", async () => {
		mockFetch.mockResolvedValue({ ok: true });

		const { GET } = await import("@/app/api/admin/users/[id]/route");
		const response = await GET(
			new NextRequest("https://admin.example.com/api/admin/users/u2", {
				headers: { cookie: "cinaauth.session_token=secret" },
			}),
			{ params: Promise.resolve({ id: "u2" }) },
		);

		expect(response.status).toBe(502);
		expect(await response.json()).toMatchObject({
			ok: false,
			error: { code: "CINAUTH_INVALID_USER_RESPONSE" },
		});
	});
});
