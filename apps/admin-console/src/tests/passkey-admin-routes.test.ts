import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminSession } from "@/lib/cinaauth/types";

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	recentAuthentication: vi.fn(),
	session: vi.fn(),
}));

vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: mocks.fetch,
}));
vi.mock("@/lib/cinaauth/session", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@/lib/cinaauth/session")>();
	return { ...mod, resolveAdminSession: mocks.session };
});
vi.mock("@/lib/recent-auth-guard", () => ({
	requireRecentAdminAuthentication: mocks.recentAuthentication,
}));

const SUPER_ADMIN: AdminSession = {
	userId: "admin-1",
	role: "super_admin",
	impersonatedBy: null,
};
const SECURITY_ADMIN: AdminSession = {
	...SUPER_ADMIN,
	userId: "security-1",
	role: "security_admin",
};

function request(
	path: string,
	method: "GET" | "POST" | "DELETE" = "GET",
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

const params = (userId: string, passkeyId?: string) => ({
	params: Promise.resolve({
		id: userId,
		...(passkeyId ? { passkeyId } : {}),
	}),
});

beforeEach(() => {
	vi.clearAllMocks();
	mocks.session.mockResolvedValue(SUPER_ADMIN);
	mocks.fetch.mockResolvedValue({ ok: true, data: {} });
	mocks.recentAuthentication.mockResolvedValue(undefined);
});

describe("target-user passkey Admin BFF", () => {
	it("lists the path target through the Admin endpoint instead of a self-service endpoint that ignores userId", async () => {
		mocks.session.mockResolvedValue(SECURITY_ADMIN);
		const { GET } = await import("@/app/api/admin/users/[id]/passkeys/route");

		const response = await GET(
			request("/api/admin/users/target-user/passkeys"),
			params("target-user") as { params: Promise<{ id: string }> },
		);

		expect(response.status).toBe(200);
		expect(mocks.fetch).toHaveBeenCalledWith(
			"/admin/list-user-passkeys",
			expect.objectContaining({
				method: "POST",
				body: { userId: "target-user" },
			}),
		);
		expect(mocks.recentAuthentication).not.toHaveBeenCalled();
	});

	it("pins delete to both path targets instead of the acting administrator's ownership", async () => {
		mocks.session.mockResolvedValue(SECURITY_ADMIN);
		const { DELETE } = await import(
			"@/app/api/admin/users/[id]/passkeys/[passkeyId]/route"
		);

		const response = await DELETE(
			request(
				"/api/admin/users/target-user/passkeys/target-passkey",
				"DELETE",
				{ userId: "crafted-user", passkeyId: "crafted-passkey" },
			),
			params("target-user", "target-passkey") as {
				params: Promise<{ id: string; passkeyId: string }>;
			},
		);

		expect(response.status).toBe(200);
		expect(mocks.fetch).toHaveBeenCalledWith(
			"/admin/delete-user-passkey",
			expect.objectContaining({
				method: "POST",
				body: {
					userId: "target-user",
					passkeyId: "target-passkey",
				},
			}),
		);
		expect(mocks.recentAuthentication).toHaveBeenCalledWith(
			expect.any(NextRequest),
			SECURITY_ADMIN,
		);
	});

	it("pins rename to both path targets instead of the acting administrator's ownership", async () => {
		const { POST } = await import(
			"@/app/api/admin/users/[id]/passkeys/[passkeyId]/rename/route"
		);

		const response = await POST(
			request(
				"/api/admin/users/target-user/passkeys/target-passkey/rename",
				"POST",
				{
					name: "Security key",
					userId: "crafted-user",
					passkeyId: "crafted-passkey",
				},
			),
			params("target-user", "target-passkey") as {
				params: Promise<{ id: string; passkeyId: string }>;
			},
		);

		expect(response.status).toBe(200);
		expect(mocks.fetch).toHaveBeenCalledWith(
			"/admin/update-user-passkey",
			expect.objectContaining({
				method: "POST",
				body: {
					userId: "target-user",
					passkeyId: "target-passkey",
					name: "Security key",
				},
			}),
		);
		expect(mocks.recentAuthentication).toHaveBeenCalled();
	});

	it("allows security_admin to revoke but not rename a passkey", async () => {
		mocks.session.mockResolvedValue(SECURITY_ADMIN);
		const { POST } = await import(
			"@/app/api/admin/users/[id]/passkeys/[passkeyId]/rename/route"
		);

		const response = await POST(
			request(
				"/api/admin/users/target-user/passkeys/target-passkey/rename",
				"POST",
				{ name: "Blocked rename" },
			),
			params("target-user", "target-passkey") as {
				params: Promise<{ id: string; passkeyId: string }>;
			},
		);

		expect(response.status).toBe(403);
		expect(mocks.recentAuthentication).not.toHaveBeenCalled();
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("requires recent authentication for revoke before calling CinaAuth", async () => {
		mocks.recentAuthentication.mockRejectedValue(
			new Response(
				JSON.stringify({
					ok: false,
					error: { code: "SESSION_NOT_FRESH" },
				}),
				{ status: 403, headers: { "Cache-Control": "no-store" } },
			),
		);
		const { DELETE } = await import(
			"@/app/api/admin/users/[id]/passkeys/[passkeyId]/route"
		);

		const response = await DELETE(
			request("/api/admin/users/target-user/passkeys/target-passkey", "DELETE"),
			params("target-user", "target-passkey") as {
				params: Promise<{ id: string; passkeyId: string }>;
			},
		);

		expect(response.status).toBe(403);
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("preserves Worker SESSION_NOT_FRESH for revoke and rename step-up", async () => {
		mocks.fetch.mockResolvedValue({
			ok: false,
			error: {
				code: "SESSION_NOT_FRESH",
				message: "Recent authentication required",
				status: 403,
			},
		});
		const revokeRoute = await import(
			"@/app/api/admin/users/[id]/passkeys/[passkeyId]/route"
		);
		const renameRoute = await import(
			"@/app/api/admin/users/[id]/passkeys/[passkeyId]/rename/route"
		);

		const revokeResponse = await revokeRoute.DELETE(
			request("/api/admin/users/target-user/passkeys/target-passkey", "DELETE"),
			params("target-user", "target-passkey") as {
				params: Promise<{ id: string; passkeyId: string }>;
			},
		);
		const renameResponse = await renameRoute.POST(
			request(
				"/api/admin/users/target-user/passkeys/target-passkey/rename",
				"POST",
				{ name: "Security key" },
			),
			params("target-user", "target-passkey") as {
				params: Promise<{ id: string; passkeyId: string }>;
			},
		);

		expect(revokeResponse.status).toBe(403);
		expect(renameResponse.status).toBe(403);
		await expect(revokeResponse.json()).resolves.toMatchObject({
			error: { code: "SESSION_NOT_FRESH" },
		});
		await expect(renameResponse.json()).resolves.toMatchObject({
			error: { code: "SESSION_NOT_FRESH" },
		});
	});
});
