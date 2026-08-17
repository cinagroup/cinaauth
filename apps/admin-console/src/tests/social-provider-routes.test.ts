import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminSession } from "@/lib/cinaauth/types";

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	session: vi.fn(),
	recentAuth: vi.fn(),
}));

vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: mocks.fetch,
}));
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

const request = (
	path: string,
	method: "GET" | "PUT" | "DELETE" = "GET",
	body?: unknown,
) =>
	new NextRequest(new URL(`http://localhost:3000${path}`), {
		method,
		headers: {
			cookie: "session=valid",
			origin: "http://localhost:3000",
			...(body === undefined ? {} : { "content-type": "application/json" }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

beforeEach(() => {
	vi.clearAllMocks();
	mocks.session.mockResolvedValue(SUPER_ADMIN);
	mocks.recentAuth.mockResolvedValue(undefined);
	mocks.fetch.mockResolvedValue({
		ok: true,
		data: {
			catalog: [{ id: "google", displayName: "Google" }],
			providers: [
				{
					id: "google",
					kind: "social",
					configured: true,
					enabled: true,
					source: "environment",
					clientId: "google-client-id",
				},
			],
			settings: { socialProviderLimit: 5, emailOtpLoginEnabled: true },
		},
	});
});

describe("social providers BFF", () => {
	it("forwards the provider list read to the Auth Worker", async () => {
		const { GET } = await import("@/app/api/admin/social-providers/route");
		const response = await GET(request("/api/admin/social-providers"));

		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(mocks.fetch).toHaveBeenCalledWith(
			"/admin/social-providers",
			expect.objectContaining({ cookie: "session=valid" }),
		);
		const body = (await response.json()) as {
			data: { settings: { socialProviderLimit: number } };
		};
		expect(body.data.settings.socialProviderLimit).toBe(5);
	});

	it("allows security_admin to read but not to mutate", async () => {
		mocks.session.mockResolvedValue(SECURITY_ADMIN);
		const { GET, PUT } = await import("@/app/api/admin/social-providers/route");
		expect((await GET(request("/api/admin/social-providers"))).status).toBe(
			200,
		);

		const rejected = await PUT(
			request("/api/admin/social-providers", "PUT", {
				kind: "social",
				providerId: "discord",
				clientId: "id",
				clientSecret: "secret",
				enabled: true,
			}),
		);
		expect(rejected.status).toBe(403);
		expect(mocks.fetch).toHaveBeenCalledTimes(1);
	});

	it("requires a recent session and blocks impersonation for writes", async () => {
		const { PUT } = await import("@/app/api/admin/social-providers/route");

		mocks.recentAuth.mockRejectedValueOnce(
			new Response("stale", { status: 403 }),
		);
		const stale = await PUT(
			request("/api/admin/social-providers", "PUT", {
				kind: "social",
				providerId: "discord",
				clientId: "id",
				clientSecret: "secret",
				enabled: true,
			}),
		);
		expect(stale.status).toBe(403);
		expect(mocks.fetch).not.toHaveBeenCalled();

		mocks.session.mockResolvedValue({
			...SUPER_ADMIN,
			impersonatedBy: "admin-original",
		});
		const impersonated = await PUT(
			request("/api/admin/social-providers", "PUT", {
				kind: "social",
				providerId: "discord",
				clientId: "id",
				clientSecret: "secret",
				enabled: true,
			}),
		);
		expect(impersonated.status).toBe(403);
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("forwards credential upserts and deletions verbatim", async () => {
		const { PUT, DELETE } = await import(
			"@/app/api/admin/social-providers/route"
		);
		const payload = {
			kind: "social",
			providerId: "discord",
			clientId: "discord-id",
			clientSecret: "discord-secret",
			enabled: true,
		};
		const upsert = await PUT(
			request("/api/admin/social-providers", "PUT", payload),
		);
		expect(upsert.status).toBe(200);
		expect(mocks.fetch).toHaveBeenCalledWith(
			"/admin/social-providers",
			expect.objectContaining({ method: "PUT", body: payload }),
		);

		const deleted = await DELETE(
			request("/api/admin/social-providers", "DELETE", {
				providerId: "discord",
			}),
		);
		expect(deleted.status).toBe(200);
		expect(mocks.fetch).toHaveBeenCalledWith(
			"/admin/social-providers",
			expect.objectContaining({
				method: "DELETE",
				body: { providerId: "discord" },
			}),
		);
	});

	it("rejects a sign-in limit outside 0-20 before calling upstream", async () => {
		const { PUT } = await import("@/app/api/admin/sign-in-settings/route");
		for (const invalid of [
			{ socialProviderLimit: -1, emailOtpLoginEnabled: true },
			{ socialProviderLimit: 21, emailOtpLoginEnabled: true },
			{ socialProviderLimit: 4.5, emailOtpLoginEnabled: true },
			{ socialProviderLimit: 3, emailOtpLoginEnabled: "yes" },
			{ socialProviderLimit: 3 },
		]) {
			const response = await PUT(
				request("/api/admin/sign-in-settings", "PUT", invalid),
			);
			expect(response.status).toBe(400);
		}
		expect(mocks.fetch).not.toHaveBeenCalled();

		const valid = await PUT(
			request("/api/admin/sign-in-settings", "PUT", {
				socialProviderLimit: 3,
				emailOtpLoginEnabled: false,
			}),
		);
		expect(valid.status).toBe(200);
		expect(mocks.fetch).toHaveBeenCalledWith(
			"/admin/sign-in-settings",
			expect.objectContaining({
				method: "PUT",
				body: { socialProviderLimit: 3, emailOtpLoginEnabled: false },
			}),
		);
	});
});
