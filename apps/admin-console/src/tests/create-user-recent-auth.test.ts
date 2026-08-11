import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { getAdminOidcTransactionSecret } from "@/lib/cinaauth/oidc-secrets";
import {
	ADMIN_OIDC_RECENT_AUTH_COOKIE,
	sealRecentAuthenticationProof,
} from "@/lib/cinaauth/oidc-transaction";
import { resolveAdminSession } from "@/lib/cinaauth/session";

vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: vi.fn(),
}));
vi.mock("@/lib/cinaauth/session", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@/lib/cinaauth/session")>();
	return { ...mod, resolveAdminSession: vi.fn() };
});
vi.mock("@/lib/cinaauth/oidc-secrets", () => ({
	getAdminOidcTransactionSecret: vi.fn(),
}));

const SIGNING_SECRET = "create-user-recent-auth-secret-at-least-32-chars";
const mockFetch = vi.mocked(cinaauthFetch);
const mockSession = vi.mocked(resolveAdminSession);
const mockTransactionSecret = vi.mocked(getAdminOidcTransactionSecret);

const request = (proof?: string) =>
	new NextRequest("https://admin.test/api/admin/users/create", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			cookie: [
				"session=valid",
				proof ? `${ADMIN_OIDC_RECENT_AUTH_COOKIE}=${proof}` : null,
			]
				.filter(Boolean)
				.join("; "),
		},
		body: JSON.stringify({
			email: "new-admin@example.com",
			name: "New administrator",
			password: "StrongPassword123",
			role: "security_admin",
		}),
	});

beforeEach(() => {
	vi.clearAllMocks();
	mockSession.mockResolvedValue({
		userId: "admin-1",
		role: "super_admin",
		email: "root@example.com",
		impersonatedBy: null,
	});
	mockTransactionSecret.mockResolvedValue(SIGNING_SECRET);
	mockFetch.mockResolvedValue({ ok: true, data: { id: "new-admin" } });
});

describe("create-user recent authentication", () => {
	it("rejects creation without a subject-bound recent-auth proof", async () => {
		const { POST } = await import("@/app/api/admin/users/create/route");

		const response = await POST(request());

		expect(response.status).toBe(403);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(await response.json()).toMatchObject({
			error: { code: "SESSION_NOT_FRESH" },
		});
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("allows creation with a valid proof for the acting Admin", async () => {
		const proof = await sealRecentAuthenticationProof(
			"admin-1",
			Math.floor(Date.now() / 1000),
			SIGNING_SECRET,
		);
		const { POST } = await import("@/app/api/admin/users/create/route");

		const response = await POST(request(proof));

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledWith(
			"/admin/create-user",
			expect.objectContaining({ method: "POST" }),
		);
	});
});
