import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminSession } from "@/lib/cinaauth/types";

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	recentAuthentication: vi.fn(),
	session: vi.fn(),
}));

vi.mock("@/lib/cinaauth/client", () => ({ cinaauthFetch: mocks.fetch }));
vi.mock("@/lib/cinaauth/session", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@/lib/cinaauth/session")>();
	return { ...mod, resolveAdminSession: mocks.session };
});
vi.mock("@/lib/recent-auth-guard", () => ({
	requireRecentAdminAuthentication: mocks.recentAuthentication,
}));

const SECURITY_ADMIN: AdminSession = {
	userId: "security-1",
	role: "security_admin",
	impersonatedBy: null,
};

const request = (method: "GET" | "DELETE", body?: unknown) =>
	new NextRequest("https://admin.test/api/admin/users/target/wallets/0xabc", {
		method,
		headers: {
			cookie: "session=valid",
			...(body === undefined ? {} : { "content-type": "application/json" }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

beforeEach(() => {
	vi.clearAllMocks();
	mocks.session.mockResolvedValue(SECURITY_ADMIN);
	mocks.fetch.mockResolvedValue({ ok: true, data: { wallets: [] } });
	mocks.recentAuthentication.mockResolvedValue(undefined);
});

describe("target-user wallet Admin BFF", () => {
	it("requires a subject-bound recent-auth proof before unbinding a wallet", async () => {
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
			"@/app/api/admin/users/[id]/wallets/[address]/route"
		);

		const response = await DELETE(request("DELETE", { chainId: 1 }), {
			params: Promise.resolve({
				id: "target-user",
				address: "0x1111111111111111111111111111111111111111",
			}),
		});

		expect(response.status).toBe(403);
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("preserves an authoritative Worker SESSION_NOT_FRESH response", async () => {
		mocks.fetch.mockResolvedValue({
			ok: false,
			error: {
				code: "SESSION_NOT_FRESH",
				message: "Recent authentication required",
				status: 403,
			},
		});
		const { DELETE } = await import(
			"@/app/api/admin/users/[id]/wallets/[address]/route"
		);

		const response = await DELETE(request("DELETE", { chainId: 1 }), {
			params: Promise.resolve({
				id: "target-user",
				address: "0x1111111111111111111111111111111111111111",
			}),
		});

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toMatchObject({
			error: { code: "SESSION_NOT_FRESH" },
		});
	});

	it("uses the centralized client so SESSION_NOT_FRESH starts OIDC step-up", () => {
		const source = readFileSync(
			"src/app/(admin)/users/[id]/tabs/wallets.tsx",
			"utf8",
		);

		expect(source).toContain("fetchAdminResponse");
		expect(source).not.toContain("const r = await fetch(");
	});
});
