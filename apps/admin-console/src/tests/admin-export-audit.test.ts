import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: vi.fn(),
}));
vi.mock("@/lib/cinaauth/session", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@/lib/cinaauth/session")>();
	return { ...mod, resolveAdminSession: vi.fn() };
});
vi.mock("@/lib/recent-auth-guard", () => ({
	requireRecentAdminAuthentication: vi.fn(),
}));

const mockFetch = vi.mocked(cinaauthFetch);
const mockSession = vi.mocked(resolveAdminSession);
const mockRecentAuthentication = vi.mocked(requireRecentAdminAuthentication);

const request = (kind: "audit" | "users") =>
	new NextRequest(new URL(`https://admin.test/api/admin/export?kind=${kind}`), {
		headers: { cookie: "s=1" },
	});

beforeEach(() => {
	vi.clearAllMocks();
	mockFetch.mockReset();
	mockSession.mockReset();
	mockSession.mockResolvedValue({
		userId: "admin-1",
		role: "super_admin",
		email: "root@test",
		impersonatedBy: null,
	});
	mockRecentAuthentication.mockResolvedValue(undefined);
});

describe("admin CSV export audit boundary", () => {
	it("requires recent authentication before reading export data", async () => {
		mockRecentAuthentication.mockRejectedValue(
			Response.json(
				{
					ok: false,
					error: {
						code: "SESSION_NOT_FRESH",
						message: "Recent authentication is required",
						status: 403,
					},
				},
				{ status: 403 },
			),
		);
		mockFetch.mockResolvedValue({ ok: true, data: { users: [] } });
		const { GET } = await import("@/app/api/admin/export/route");

		const response = await GET(request("users"));

		expect(response.status).toBe(403);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("denies roles without the audit export permission", async () => {
		mockSession.mockResolvedValue({
			userId: "security-1",
			role: "security_admin",
			email: "security@test",
			impersonatedBy: null,
		});
		const { GET } = await import("@/app/api/admin/export/route");

		const response = await GET(request("users"));

		expect(response.status).toBe(403);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("records a successful users export before releasing CSV", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				data: { users: [{ id: "u1", email: "u1@test" }] },
			})
			.mockResolvedValueOnce({ ok: true, data: { success: true } });
		const { GET } = await import("@/app/api/admin/export/route");

		const response = await GET(request("users"));

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenNthCalledWith(
			2,
			"/audit/log",
			expect.objectContaining({
				method: "POST",
				cookie: "s=1",
				body: expect.objectContaining({
					category: "admin",
					action: "admin.export_csv",
					result: "success",
					actorSite: "admin",
					metadata: { kind: "users" },
				}),
			}),
		);
	});

	it("does not duplicate the Auth endpoint's automatic audit-export event", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			data: "timestamp,actorIp\n2026-08-11,1.2.3.4",
		});
		const { GET } = await import("@/app/api/admin/export/route");

		const response = await GET(request("audit"));

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining("/audit/export?"),
			expect.anything(),
		);
	});

	it("fails closed when the explicit users-export audit event is rejected", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				data: { users: [{ id: "u1", email: "u1@test" }] },
			})
			.mockResolvedValueOnce({
				ok: false,
				error: { code: "CINAUTH_503", message: "audit unavailable" },
			});
		const { GET } = await import("@/app/api/admin/export/route");

		const response = await GET(request("users"));

		expect(response.status).toBe(502);
		expect(await response.text()).toBe("audit unavailable");
	});

	it("neutralizes spreadsheet formulas in user-controlled CSV fields", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				data: {
					users: [
						{
							id: "u1",
							email: '=HYPERLINK("https://attacker.invalid")',
						},
					],
				},
			})
			.mockResolvedValueOnce({ ok: true, data: { success: true } });
		const { GET } = await import("@/app/api/admin/export/route");

		const response = await GET(request("users"));
		const csv = await response.text();

		expect(response.status).toBe(200);
		expect(csv).toContain(`"'=HYPERLINK(""https://attacker.invalid"")"`);
	});

	it("masks the real IP column when earlier audit fields contain commas", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				data: [
					"id,action,actorIp,metadata",
					'1,"admin,user_update",1.2.3.4,"{""field"":""email""}"',
				].join("\n"),
			})
			.mockResolvedValueOnce({ ok: true, data: { success: true } });
		const { GET } = await import("@/app/api/admin/export/route");

		const response = await GET(request("audit"));
		const csv = await response.text();

		expect(response.status).toBe(200);
		expect(csv).toContain('"admin,user_update"');
		expect(csv).toContain("1.2.x.x");
		expect(csv).not.toContain("1.2.3.4");
	});
});
