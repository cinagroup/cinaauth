import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
const COMPOSITE_SUPER_ADMIN: AdminSession = {
	...SUPER_ADMIN,
	role: "user,super_admin",
};
const SECURITY_ADMIN: AdminSession = {
	...SUPER_ADMIN,
	userId: "security-1",
	role: "security_admin",
};

const request = (
	path: string,
	method: "GET" | "POST" | "DELETE" = "GET",
	body?: unknown,
) =>
	new NextRequest(new URL(`https://admin.test${path}`), {
		method,
		headers: {
			cookie: "session=valid",
			...(body === undefined ? {} : { "content-type": "application/json" }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const existingKey = {
	id: "old-key",
	configId: "default",
	name: "Deploy key",
	start: "cina_sk_old",
	prefix: "cina_sk_",
	referenceId: "admin-1",
	refillInterval: null,
	refillAmount: null,
	lastRefillAt: null,
	enabled: true,
	rateLimitEnabled: true,
	rateLimitTimeWindow: 86_400_000,
	rateLimitMax: 10,
	requestCount: 2,
	remaining: null,
	lastRequest: "2026-08-10T00:00:00.000Z",
	expiresAt: "2026-09-10T00:00:00.000Z",
	createdAt: "2026-08-01T00:00:00.000Z",
	updatedAt: "2026-08-10T00:00:00.000Z",
	metadata: { environment: "production" },
	permissions: null,
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.useRealTimers();
	mocks.session.mockResolvedValue(SUPER_ADMIN);
	mocks.recentAuthentication.mockResolvedValue(undefined);
	mocks.fetch.mockResolvedValue({ ok: true, data: {} });
});

describe("actor-owned Admin API key routes", () => {
	it("allows security_admin to read the current actor's keys without step-up", async () => {
		mocks.session.mockResolvedValue(SECURITY_ADMIN);
		mocks.fetch.mockResolvedValue({
			ok: true,
			data: { apiKeys: [], total: 0, limit: null, offset: null },
		});
		const { GET } = await import("@/app/api/admin/api-keys/route");

		const response = await GET(request("/api/admin/api-keys"));

		expect(response.status).toBe(200);
		expect(mocks.fetch).toHaveBeenCalledWith(
			"/api-key/list?",
			expect.objectContaining({ cookie: "session=valid" }),
		);
		expect(mocks.recentAuthentication).not.toHaveBeenCalled();
	});

	it("rejects organization targeting on the actor-owned list endpoint", async () => {
		const { GET } = await import("@/app/api/admin/api-keys/route");

		const response = await GET(
			request("/api/admin/api-keys?organizationId=target-organization"),
		);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: { code: "UNSUPPORTED_API_KEY_QUERY" },
		});
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("uses ADMIN_CONTROL role parsing for create and sends only public create fields", async () => {
		mocks.session.mockResolvedValue(COMPOSITE_SUPER_ADMIN);
		mocks.fetch.mockResolvedValue({
			ok: true,
			data: { id: "new-key", key: "cina_sk_secret" },
		});
		const { POST } = await import("@/app/api/admin/api-keys/route");

		const response = await POST(
			request("/api/admin/api-keys", "POST", {
				name: "  Deploy key  ",
				prefix: "cina_prod_",
			}),
		);

		expect(response.status).toBe(200);
		expect(mocks.recentAuthentication).toHaveBeenCalledWith(
			expect.any(NextRequest),
			COMPOSITE_SUPER_ADMIN,
		);
		expect(mocks.fetch).toHaveBeenCalledWith("/api-key/create", {
			method: "POST",
			body: { name: "Deploy key", prefix: "cina_prod_" },
			cookie: "session=valid",
		});
	});

	it.each([
		["prefixes", ["read-users"]],
		["scope", "read-users"],
		["permissions", { user: ["read"] }],
	])("rejects legacy or server-only create field %s", async (field, value) => {
		const { POST } = await import("@/app/api/admin/api-keys/route");

		const response = await POST(
			request("/api/admin/api-keys", "POST", {
				name: "Deploy key",
				[field]: value,
			}),
		);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: { code: "UNSUPPORTED_API_KEY_FIELD" },
		});
		expect(mocks.recentAuthentication).not.toHaveBeenCalled();
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("denies security_admin mutation permission before recent-auth", async () => {
		mocks.session.mockResolvedValue(SECURITY_ADMIN);
		const { DELETE } = await import("@/app/api/admin/api-keys/[id]/route");

		const response = await DELETE(
			request("/api/admin/api-keys/key-1", "DELETE"),
			params("key-1"),
		);

		expect(response.status).toBe(403);
		expect(mocks.recentAuthentication).not.toHaveBeenCalled();
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("maps the UI expiry date to the package's expiresIn contract", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-11T00:00:00.000Z"));
		const { POST } = await import("@/app/api/admin/api-keys/[id]/edit/route");

		const response = await POST(
			request("/api/admin/api-keys/key-1/edit", "POST", {
				name: "  Renamed key  ",
				expiresAt: "2026-08-12T00:00:00.000Z",
			}),
			params("key-1"),
		);

		expect(response.status).toBe(200);
		expect(mocks.fetch).toHaveBeenCalledWith("/api-key/update", {
			method: "POST",
			body: { keyId: "key-1", name: "Renamed key", expiresIn: 86_400 },
			cookie: "session=valid",
		});
		expect(mocks.recentAuthentication).toHaveBeenCalled();
	});

	it("maps a cleared UI expiry to expiresIn null", async () => {
		const { POST } = await import("@/app/api/admin/api-keys/[id]/edit/route");

		await POST(
			request("/api/admin/api-keys/key-1/edit", "POST", {
				expiresAt: null,
			}),
			params("key-1"),
		);

		expect(mocks.fetch).toHaveBeenCalledWith(
			"/api-key/update",
			expect.objectContaining({
				body: { keyId: "key-1", expiresIn: null },
			}),
		);
	});

	it("requires recent-auth for every API key mutation before upstream access", async () => {
		mocks.recentAuthentication.mockImplementation(() =>
			Promise.reject(
				new Response(
					JSON.stringify({
						ok: false,
						error: {
							code: "SESSION_NOT_FRESH",
							message: "Recent authentication is required",
						},
					}),
					{ status: 403, headers: { "Cache-Control": "no-store" } },
				),
			),
		);

		const create = await import("@/app/api/admin/api-keys/route");
		const edit = await import("@/app/api/admin/api-keys/[id]/edit/route");
		const toggle = await import("@/app/api/admin/api-keys/[id]/toggle/route");
		const revoke = await import("@/app/api/admin/api-keys/[id]/route");
		const rotate = await import("@/app/api/admin/api-keys/[id]/rotate/route");
		const invocations = [
			() =>
				create.POST(request("/api/admin/api-keys", "POST", { name: "Key" })),
			() =>
				edit.POST(
					request("/api/admin/api-keys/key-1/edit", "POST", { name: "Key" }),
					params("key-1"),
				),
			() =>
				toggle.POST(
					request("/api/admin/api-keys/key-1/toggle", "POST", {
						enabled: false,
					}),
					params("key-1"),
				),
			() =>
				revoke.DELETE(
					request("/api/admin/api-keys/key-1", "DELETE"),
					params("key-1"),
				),
			() =>
				rotate.POST(
					request("/api/admin/api-keys/key-1/rotate", "POST"),
					params("key-1"),
				),
		];

		for (const invoke of invocations) {
			const response = await invoke();
			expect(response.status).toBe(403);
			await expect(response.json()).resolves.toMatchObject({
				error: { code: "SESSION_NOT_FRESH" },
			});
		}
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("preserves an upstream SESSION_NOT_FRESH response for browser step-up", async () => {
		mocks.fetch.mockResolvedValue({
			ok: false,
			error: {
				code: "SESSION_NOT_FRESH",
				message: "Recent authentication required",
				status: 403,
			},
		});
		const { POST } = await import("@/app/api/admin/api-keys/[id]/toggle/route");

		const response = await POST(
			request("/api/admin/api-keys/key-1/toggle", "POST", { enabled: false }),
			params("key-1"),
		);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toMatchObject({
			error: { code: "SESSION_NOT_FRESH" },
		});
	});
});

describe("fail-closed actor-owned API key rotation", () => {
	it("preserves public configuration before revoking the old key", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-11T00:00:00.000Z"));
		mocks.fetch
			.mockResolvedValueOnce({ ok: true, data: existingKey })
			.mockResolvedValueOnce({
				ok: true,
				data: { id: "replacement-key", key: "cina_sk_replacement" },
			})
			.mockResolvedValueOnce({ ok: true, data: { success: true } });
		const { POST } = await import("@/app/api/admin/api-keys/[id]/rotate/route");

		const response = await POST(
			request("/api/admin/api-keys/old-key/rotate", "POST"),
			params("old-key"),
		);

		expect(response.status).toBe(200);
		expect(mocks.fetch.mock.calls).toEqual([
			["/api-key/get?id=old-key", { cookie: "session=valid" }],
			[
				"/api-key/create",
				{
					method: "POST",
					body: {
						configId: "default",
						name: "Deploy key",
						prefix: "cina_sk_",
						expiresIn: 2_592_000,
						metadata: { environment: "production" },
					},
					cookie: "session=valid",
				},
			],
			[
				"/api-key/delete",
				{ method: "POST", body: { keyId: "old-key" }, cookie: "session=valid" },
			],
		]);
		await expect(response.json()).resolves.toMatchObject({
			ok: true,
			data: { id: "replacement-key", key: "cina_sk_replacement" },
		});
	});

	it.each([
		["permissions", { users: ["read"] }],
		["remaining", 100],
		["refillAmount", 100],
		["refillInterval", 3_600_000],
		["enabled", false],
	])("refuses rotation when %s cannot be preserved", async (field, value) => {
		mocks.fetch.mockResolvedValueOnce({
			ok: true,
			data: { ...existingKey, [field]: value },
		});
		const { POST } = await import("@/app/api/admin/api-keys/[id]/rotate/route");

		const response = await POST(
			request("/api/admin/api-keys/old-key/rotate", "POST"),
			params("old-key"),
		);

		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toMatchObject({
			ok: false,
			error: { code: "API_KEY_ROTATION_UNSUPPORTED_CONFIGURATION" },
			data: { oldKeyId: "old-key", oldKeyState: "active" },
		});
		expect(mocks.fetch).toHaveBeenCalledTimes(1);
	});

	it("rolls back the replacement and reports that the old key remains active when revoke fails", async () => {
		mocks.fetch
			.mockResolvedValueOnce({
				ok: true,
				data: { ...existingKey, expiresAt: null },
			})
			.mockResolvedValueOnce({
				ok: true,
				data: { id: "replacement-key", key: "never-return-this-secret" },
			})
			.mockResolvedValueOnce({
				ok: false,
				error: { code: "CINAUTH_500", message: "delete failed", status: 500 },
			})
			.mockResolvedValueOnce({ ok: true, data: { success: true } });
		const { POST } = await import("@/app/api/admin/api-keys/[id]/rotate/route");

		const response = await POST(
			request("/api/admin/api-keys/old-key/rotate", "POST"),
			params("old-key"),
		);

		expect(response.status).toBe(502);
		expect(mocks.fetch.mock.calls.at(-1)).toEqual([
			"/api-key/delete",
			{
				method: "POST",
				body: { keyId: "replacement-key" },
				cookie: "session=valid",
			},
		]);
		const body = await response.json();
		expect(body).toMatchObject({
			ok: false,
			error: { code: "API_KEY_ROTATION_REVOKE_FAILED" },
			data: {
				oldKeyId: "old-key",
				replacementKeyId: "replacement-key",
				state: "replacement_revoked_old_retained",
			},
		});
		expect(JSON.stringify(body)).not.toContain("never-return-this-secret");
	});

	it("reports both keys as potentially active when replacement rollback also fails", async () => {
		mocks.fetch
			.mockResolvedValueOnce({
				ok: true,
				data: { ...existingKey, expiresAt: null },
			})
			.mockResolvedValueOnce({
				ok: true,
				data: { id: "replacement-key", key: "never-return-this-secret" },
			})
			.mockResolvedValueOnce({ ok: true, data: { success: false } })
			.mockResolvedValueOnce({
				ok: false,
				error: { code: "CINAUTH_500", message: "rollback failed", status: 500 },
			});
		const { POST } = await import("@/app/api/admin/api-keys/[id]/rotate/route");

		const response = await POST(
			request("/api/admin/api-keys/old-key/rotate", "POST"),
			params("old-key"),
		);

		expect(response.status).toBe(502);
		const body = await response.json();
		expect(body).toMatchObject({
			ok: false,
			error: { code: "API_KEY_ROTATION_ROLLBACK_FAILED" },
			data: {
				oldKeyId: "old-key",
				replacementKeyId: "replacement-key",
				state: "old_and_replacement_may_be_active",
			},
		});
		expect(JSON.stringify(body)).not.toContain("never-return-this-secret");
	});

	it("preserves old-key revoke SESSION_NOT_FRESH after rolling back the replacement", async () => {
		mocks.fetch
			.mockResolvedValueOnce({
				ok: true,
				data: { ...existingKey, expiresAt: null },
			})
			.mockResolvedValueOnce({
				ok: true,
				data: { id: "replacement-key", key: "never-return-this-secret" },
			})
			.mockResolvedValueOnce({
				ok: false,
				error: {
					code: "SESSION_NOT_FRESH",
					message: "Recent authentication required",
					status: 403,
				},
			})
			.mockResolvedValueOnce({ ok: true, data: { success: true } });
		const { POST } = await import("@/app/api/admin/api-keys/[id]/rotate/route");

		const response = await POST(
			request("/api/admin/api-keys/old-key/rotate", "POST"),
			params("old-key"),
		);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toMatchObject({
			error: { code: "SESSION_NOT_FRESH" },
			data: { state: "replacement_revoked_old_retained" },
		});
	});
});

describe("Admin API key UI and DTO contract", () => {
	it("labels the page as current-admin scoped and removes the fake scope selector", () => {
		const page = readFileSync(
			resolve("src", "app", "(admin)", "api-keys", "page.tsx"),
			"utf8",
		);
		const english = JSON.parse(
			readFileSync(resolve("src", "lib", "i18n", "locales", "en.json"), "utf8"),
		) as Record<string, string>;

		expect(page).toContain('description={t("apiKeys.description")}');
		expect(page).toContain("fetchAdminJson");
		expect(page).not.toContain("prefixes");
		expect(page).not.toContain("scope.readUsers");
		expect(page).not.toContain("scope.verifySiwe");
		expect(english["apiKeys.title"]).toBe("My API Keys");
		expect(english["apiKeys.description"]).toContain(
			"current administrator account",
		);
		expect(english["apiKeys.description"]).toContain(
			"not a global key inventory",
		);
	});

	it("matches the package's safe API key metadata field names", () => {
		const dto = readFileSync(
			resolve("..", "..", "packages", "auth-web-contract", "src", "dto.ts"),
			"utf8",
		);

		for (const field of [
			"configId",
			"start",
			"lastRequest",
			"referenceId",
			"permissions",
		]) {
			expect(dto).toContain(`${field}:`);
		}
		expect(dto).not.toContain("startsAt:");
		expect(dto).not.toContain("lastUsedAt:");
	});
});
