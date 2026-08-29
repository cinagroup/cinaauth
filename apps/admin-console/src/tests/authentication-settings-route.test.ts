import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminSession } from "@/lib/cinaauth/types";

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	session: vi.fn(),
	recentAuth: vi.fn(),
}));

vi.mock("@/lib/cinaauth/client", () => ({ cinaauthFetch: mocks.fetch }));
vi.mock("@/lib/cinaauth/session", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("@/lib/cinaauth/session")>();
	return { ...original, resolveAdminSession: mocks.session };
});
vi.mock("@/lib/recent-auth-guard", () => ({
	requireRecentAdminAuthentication: mocks.recentAuth,
}));

const SUPER_ADMIN: AdminSession = {
	userId: "admin-1",
	role: "super_admin",
	email: "root@example.com",
	impersonatedBy: null,
};

const SECURITY_ADMIN: AdminSession = {
	userId: "security-1",
	role: "security_admin",
	email: "security@example.com",
	impersonatedBy: null,
};

const request = (method: "GET" | "PUT", body?: unknown) =>
	new NextRequest("http://localhost:3000/api/admin/authentication-settings", {
		method,
		headers: {
			cookie: "session=valid",
			origin: "http://localhost:3000",
			...(body === undefined ? {} : { "content-type": "application/json" }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

const validSettings = {
	emailOtpLoginEnabled: true,
	emailPasswordLoginEnabled: false,
	passkeyLoginEnabled: false,
	siweLoginEnabled: true,
	googleOneTapEnabled: false,
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.session.mockResolvedValue(SUPER_ADMIN);
	mocks.recentAuth.mockResolvedValue(undefined);
	mocks.fetch.mockResolvedValue({
		ok: true,
		data: {
			settings: { socialProviderLimit: 20, ...validSettings },
			methods: {},
			activeOAuthProviderCount: 2,
		},
	});
});

describe("authentication settings BFF", () => {
	it("allows security administrators to read the authoritative snapshot", async () => {
		mocks.session.mockResolvedValue(SECURITY_ADMIN);
		const { GET } = await import(
			"@/app/api/admin/authentication-settings/route"
		);
		const response = await GET(request("GET"));

		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(mocks.fetch).toHaveBeenCalledWith("/admin/authentication-settings", {
			cookie: "session=valid",
		});
	});

	it("requires publish permission, recent authentication, and no impersonation", async () => {
		const { PUT } = await import(
			"@/app/api/admin/authentication-settings/route"
		);
		mocks.session.mockResolvedValue(SECURITY_ADMIN);
		expect((await PUT(request("PUT", validSettings))).status).toBe(403);

		mocks.session.mockResolvedValue(SUPER_ADMIN);
		mocks.recentAuth.mockRejectedValueOnce(
			new Response("stale", { status: 403 }),
		);
		expect((await PUT(request("PUT", validSettings))).status).toBe(403);

		mocks.session.mockResolvedValue({
			...SUPER_ADMIN,
			impersonatedBy: "admin-original",
		});
		expect((await PUT(request("PUT", validSettings))).status).toBe(403);
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("rejects unknown or non-boolean settings before forwarding", async () => {
		const { PUT } = await import(
			"@/app/api/admin/authentication-settings/route"
		);
		for (const invalid of [
			{ ...validSettings, passkeyLoginEnabled: "yes" },
			{ ...validSettings, extra: true },
			{ emailOtpLoginEnabled: true },
		]) {
			expect((await PUT(request("PUT", invalid))).status).toBe(400);
		}
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("forwards the exact governed setting payload", async () => {
		const { PUT } = await import(
			"@/app/api/admin/authentication-settings/route"
		);
		const response = await PUT(request("PUT", validSettings));
		expect(response.status).toBe(200);
		expect(mocks.fetch).toHaveBeenCalledWith(
			"/admin/authentication-settings",
			expect.objectContaining({
				method: "PUT",
				body: validSettings,
				cookie: "session=valid",
			}),
		);
	});
});
