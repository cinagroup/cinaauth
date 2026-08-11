import type { AdminControlPermission } from "@cinaauth/auth-web-contract";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import type { AdminSession } from "@/lib/cinaauth/types";

const mockRecentAuthentication = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: vi.fn(),
}));
vi.mock("@/lib/cinaauth/session", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@/lib/cinaauth/session")>();
	return { ...mod, resolveAdminSession: vi.fn() };
});
vi.mock("@/lib/recent-auth-guard", () => ({
	requireRecentAdminAuthentication: mockRecentAuthentication,
}));

const mockFetch = vi.mocked(cinaauthFetch);
const mockSession = vi.mocked(resolveAdminSession);

const SECURITY_ADMIN: AdminSession = {
	userId: "security-1",
	role: "security_admin",
	email: "security@example.com",
	impersonatedBy: null,
};

function request(
	path: string,
	method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
	body?: unknown,
): NextRequest {
	return new NextRequest(new URL(`https://admin.test${path}`), {
		method,
		headers: {
			cookie: "session=valid",
			...(body === undefined ? {} : { "content-type": "application/json" }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
	vi.clearAllMocks();
	mockSession.mockResolvedValue(SECURITY_ADMIN);
	mockFetch.mockResolvedValue({ ok: true, data: { id: "user-2" } });
	mockRecentAuthentication.mockResolvedValue(undefined);
});

describe("requireAdminControlPermission", () => {
	it("uses the shared control-plane permission registry", () => {
		expect(() =>
			requireAdminControlPermission(SECURITY_ADMIN, "identity.user.read"),
		).not.toThrow();

		let rejection: unknown;
		try {
			requireAdminControlPermission(SECURITY_ADMIN, "identity.user.delete");
		} catch (error) {
			rejection = error;
		}

		expect(rejection).toBeInstanceOf(Response);
		expect((rejection as Response).status).toBe(403);
	});

	it.each<AdminControlPermission>([
		"identity.user.read",
		"identity.user.ban",
		"identity.user.send-verification",
		"identity.session.read",
		"identity.session.revoke",
		"identity.credential.read",
		"identity.credential.revoke",
	])("allows security_admin to exercise %s", (permission) => {
		expect(() =>
			requireAdminControlPermission(SECURITY_ADMIN, permission),
		).not.toThrow();
	});

	it.each<AdminControlPermission>([
		"identity.user.delete",
		"identity.user.set-role",
		"identity.user.reset-password",
		"identity.user.reset-2fa",
		"identity.user.impersonate",
		"identity.credential.update",
	])("denies security_admin the high-risk permission %s", (permission) => {
		expect(() => {
			requireAdminControlPermission(SECURITY_ADMIN, permission);
		}).toThrow();
	});
});

describe("security_admin identity route enforcement", () => {
	it("allows user list and detail reads", async () => {
		const usersRoute = await import("@/app/api/admin/users/route");
		const userRoute = await import("@/app/api/admin/users/[id]/route");

		const listResponse = await usersRoute.GET(request("/api/admin/users"));
		const detailResponse = await userRoute.GET(
			request("/api/admin/users/user-2"),
			params("user-2"),
		);

		expect(listResponse.status).toBe(200);
		expect(detailResponse.status).toBe(200);
	});

	it("allows ban and unban operations", async () => {
		const banRoute = await import("@/app/api/admin/users/[id]/ban/route");
		const unbanRoute = await import("@/app/api/admin/users/[id]/unban/route");

		const banResponse = await banRoute.POST(
			request("/api/admin/users/user-2/ban", "POST", {
				banReason: "policy violation",
			}),
			params("user-2"),
		);
		const unbanResponse = await unbanRoute.POST(
			request("/api/admin/users/user-2/unban", "POST"),
			params("user-2"),
		);

		expect(banResponse.status).toBe(200);
		expect(unbanResponse.status).toBe(200);
	});

	it("allows session reads and revocation", async () => {
		const sessionsRoute = await import("@/app/api/admin/sessions/route");
		const userSessionsRoute = await import(
			"@/app/api/admin/users/[id]/sessions/route"
		);
		const revokeRoute = await import("@/app/api/admin/sessions/revoke/route");

		const sessionsResponse = await sessionsRoute.GET(
			request("/api/admin/sessions"),
		);
		const userSessionsResponse = await userSessionsRoute.GET(
			request("/api/admin/users/user-2/sessions"),
			params("user-2"),
		);
		const revokeResponse = await revokeRoute.POST(
			request("/api/admin/sessions/revoke", "POST", {
				sessionId: "session-2",
			}),
		);

		expect(sessionsResponse.status).toBe(200);
		expect(userSessionsResponse.status).toBe(200);
		expect(revokeResponse.status).toBe(200);
	});

	it("allows sending a verification challenge", async () => {
		mockFetch.mockResolvedValueOnce({ ok: true, data: { sent: true } });
		const route = await import(
			"@/app/api/admin/users/[id]/send-verification/route"
		);

		const response = await route.POST(
			request("/api/admin/users/user-2/send-verification", "POST", {
				type: "email-otp",
			}),
			params("user-2"),
		);

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			"/admin/send-verification",
			expect.objectContaining({
				body: { userId: "user-2", type: "email-otp" },
			}),
		);
	});

	it.each([
		[
			"create users",
			async () =>
				(await import("@/app/api/admin/users/create/route")).POST(
					request("/api/admin/users/create", "POST", {
						email: "new@example.com",
						name: "New user",
					}),
				),
		],
		[
			"update users",
			async () =>
				(await import("@/app/api/admin/users/[id]/route")).PATCH(
					request("/api/admin/users/user-2", "PATCH", { name: "Changed" }),
					params("user-2"),
				),
		],
		[
			"delete users",
			async () =>
				(await import("@/app/api/admin/users/[id]/route")).DELETE(
					request("/api/admin/users/user-2", "DELETE"),
					params("user-2"),
				),
		],
		[
			"set user roles",
			async () =>
				(await import("@/app/api/admin/users/[id]/route")).PATCH(
					request("/api/admin/users/user-2", "PATCH", {
						role: "security_admin",
					}),
					params("user-2"),
				),
		],
		[
			"reset passwords",
			async () =>
				(await import("@/app/api/admin/users/[id]/reset-password/route")).POST(
					request("/api/admin/users/user-2/reset-password", "POST", {
						newPassword: "StrongPassword123",
					}),
					params("user-2"),
				),
		],
		[
			"reset two-factor authentication",
			async () =>
				(await import("@/app/api/admin/users/[id]/reset-2fa/route")).POST(
					request("/api/admin/users/user-2/reset-2fa", "POST"),
					params("user-2"),
				),
		],
		[
			"impersonate users",
			async () =>
				(await import("@/app/api/admin/users/[id]/impersonate/route")).POST(
					request("/api/admin/users/user-2/impersonate", "POST"),
					params("user-2"),
				),
		],
	] as const)("forbids security_admin from %s", async (_name, invoke) => {
		const response = await invoke();

		expect(response.status).toBe(403);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("rejects a plain user from reading another user", async () => {
		mockSession.mockResolvedValue({
			...SECURITY_ADMIN,
			role: "user",
		});
		const { GET } = await import("@/app/api/admin/users/[id]/route");

		const response = await GET(
			request("/api/admin/users/user-2"),
			params("user-2"),
		);

		expect(response.status).toBe(403);
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
