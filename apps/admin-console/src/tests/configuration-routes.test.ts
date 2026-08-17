import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminSession } from "@/lib/cinaauth/types";

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	session: vi.fn(),
	recentAuth: vi.fn(),
}));

vi.mock("@/lib/cinaauth/control-client", () => ({
	cinaauthControlFetch: mocks.fetch,
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

const request = (
	path: string,
	method: "GET" | "POST" = "GET",
	body?: unknown,
	headers: Record<string, string> = {},
) =>
	new NextRequest(new URL(`http://localhost:3000${path}`), {
		method,
		headers: {
			cookie: "session=valid",
			origin: "http://localhost:3000",
			...(body === undefined ? {} : { "content-type": "application/json" }),
			...headers,
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
			structuralReady: true,
			operationalState: "disabled",
			revision: 0,
			updatedAt: null,
			capabilities: { email: false, sms: false },
			channels: {
				email: {
					provider: "resend",
					configured: false,
					validated: false,
					activeVersion: null,
					nextVersion: null,
					previousVersion: null,
					updatedAt: null,
					lastTestedAt: null,
				},
				sms: {
					provider: "twilio",
					configured: false,
					validated: false,
					activeVersion: null,
					nextVersion: null,
					previousVersion: null,
					updatedAt: null,
					lastTestedAt: null,
				},
			},
		},
	});
});

describe("delivery configuration BFF", () => {
	it("reads a status-only payload through the authoritative control endpoint", async () => {
		const { GET } = await import(
			"@/app/api/admin/configuration/delivery/status/route"
		);
		const response = await GET(
			request("/api/admin/configuration/delivery/status"),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(mocks.fetch).toHaveBeenCalledWith(
			"/api/admin/configuration/delivery/status",
			expect.objectContaining({ cookie: "session=valid" }),
		);
	});

	it("requires a super admin, recent auth, same origin and JSON before staging", async () => {
		const { POST } = await import(
			"@/app/api/admin/configuration/delivery/stage/route"
		);
		const body = {
			expectedVersion: 0,
			idempotencyKey: "stage-resend-20260811",
			channel: "email",
			config: {
				provider: "resend",
				apiKey: "re_example-secret-value",
				from: "identity@example.com",
			},
		};

		mocks.session.mockResolvedValueOnce({
			...SUPER_ADMIN,
			role: "security_admin",
		});
		expect(
			(
				await POST(
					request("/api/admin/configuration/delivery/stage", "POST", body),
				)
			).status,
		).toBe(403);

		mocks.session.mockResolvedValueOnce({
			...SUPER_ADMIN,
			impersonatedBy: "admin-0",
		});
		expect(
			(
				await POST(
					request("/api/admin/configuration/delivery/stage", "POST", body),
				)
			).status,
		).toBe(403);

		expect(
			(
				await POST(
					request("/api/admin/configuration/delivery/stage", "POST", body, {
						origin: "https://attacker.example",
					}),
				)
			).status,
		).toBe(403);

		expect(
			(
				await POST(
					request("/api/admin/configuration/delivery/stage", "POST", body, {
						"content-type": "text/plain",
					}),
				)
			).status,
		).toBe(415);
	});

	it.each([
		401, 403, 409, 429, 503,
	])("preserves upstream %s", async (status) => {
		mocks.fetch.mockResolvedValueOnce({
			ok: false,
			error: { code: `UPSTREAM_${status}`, message: "failed", status },
		});
		const { POST } = await import(
			"@/app/api/admin/configuration/delivery/stage/route"
		);
		const response = await POST(
			request("/api/admin/configuration/delivery/stage", "POST", {
				expectedVersion: 0,
				idempotencyKey: "stage-resend-20260811",
				channel: "email",
				config: {
					provider: "resend",
					apiKey: "re_example-secret-value",
					from: "identity@example.com",
				},
			}),
		);

		expect(response.status).toBe(status);
		expect(response.headers.get("cache-control")).toBe("no-store");
	});

	it("returns only a validated operation acknowledgement", async () => {
		mocks.fetch.mockResolvedValueOnce({
			ok: true,
			data: {
				operation: "stage",
				revision: 1,
				version: 1,
				validated: false,
				updatedAt: "2026-08-11T00:00:00.000Z",
			},
		});
		const { POST } = await import(
			"@/app/api/admin/configuration/delivery/stage/route"
		);
		const response = await POST(
			request("/api/admin/configuration/delivery/stage", "POST", {
				expectedVersion: 0,
				idempotencyKey: "stage-resend-20260811",
				channel: "email",
				config: {
					provider: "resend",
					apiKey: "re_example-secret-value",
					from: "identity@example.com",
				},
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			ok: true,
			data: {
				operation: "stage",
				revision: 1,
				version: 1,
				validated: false,
				updatedAt: "2026-08-11T00:00:00.000Z",
			},
		});
	});

	it("forwards a Cloudflare Email stage payload to the control client", async () => {
		mocks.fetch.mockResolvedValueOnce({
			ok: true,
			data: {
				operation: "stage",
				revision: 1,
				version: 1,
				validated: false,
				updatedAt: "2026-08-17T00:00:00.000Z",
			},
		});
		const { POST } = await import(
			"@/app/api/admin/configuration/delivery/stage/route"
		);
		const body = {
			expectedVersion: 0,
			idempotencyKey: "stage-cloudflare-20260817",
			channel: "email",
			config: {
				provider: "cloudflare-email",
				apiToken: "cf-email-token-abcdefghij1234",
				accountId: "f1234567890abcdef01234567890abcd",
				from: "identity@example.com",
			},
		};
		const response = await POST(
			request("/api/admin/configuration/delivery/stage", "POST", body),
		);

		expect(response.status).toBe(200);
		expect(mocks.fetch).toHaveBeenCalledWith(
			"/api/admin/configuration/delivery/stage",
			expect.objectContaining({ cookie: "session=valid", body }),
		);
	});
});

describe("configuration mutation perimeter", () => {
	const cases = [
		[
			"delivery stage",
			() => import("@/app/api/admin/configuration/delivery/stage/route"),
			"/api/admin/configuration/delivery/stage",
			{
				expectedVersion: 0,
				idempotencyKey: "delivery-stage-20260811",
				channel: "email",
				config: {
					provider: "resend",
					apiKey: "re_example-secret-value",
					from: "identity@example.com",
				},
			},
		],
		[
			"delivery test",
			() => import("@/app/api/admin/configuration/delivery/test/route"),
			"/api/admin/configuration/delivery/test",
			{
				expectedVersion: 1,
				idempotencyKey: "delivery-test-20260811",
				channel: "email",
				recipient: "operator@example.com",
			},
		],
		[
			"delivery activate",
			() => import("@/app/api/admin/configuration/delivery/activate/route"),
			"/api/admin/configuration/delivery/activate",
			{
				expectedVersion: 1,
				idempotencyKey: "delivery-activate-20260811",
				channel: "email",
				confirmation: "ACTIVATE",
			},
		],
		[
			"delivery rollback",
			() => import("@/app/api/admin/configuration/delivery/rollback/route"),
			"/api/admin/configuration/delivery/rollback",
			{
				expectedVersion: 2,
				idempotencyKey: "delivery-rollback-20260811",
				channel: "email",
				confirmation: "ROLLBACK",
			},
		],
		[
			"erasure stage",
			() => import("@/app/api/admin/configuration/erasure/stage/route"),
			"/api/admin/configuration/erasure/stage",
			{
				expectedVersion: 0,
				idempotencyKey: "erasure-stage-20260811",
				targets: [
					{
						id: "cinashop",
						url: "https://api.example.com/privacy/erase",
						signingSecret: "a-strong-signing-secret-with-32-characters",
					},
				],
			},
		],
		[
			"erasure test",
			() => import("@/app/api/admin/configuration/erasure/test/route"),
			"/api/admin/configuration/erasure/test",
			{
				expectedVersion: 1,
				idempotencyKey: "erasure-test-20260811",
			},
		],
		[
			"erasure activate",
			() => import("@/app/api/admin/configuration/erasure/activate/route"),
			"/api/admin/configuration/erasure/activate",
			{
				expectedVersion: 1,
				idempotencyKey: "erasure-activate-20260811",
				confirmation: "ACTIVATE",
			},
		],
		[
			"erasure rollback",
			() => import("@/app/api/admin/configuration/erasure/rollback/route"),
			"/api/admin/configuration/erasure/rollback",
			{
				expectedVersion: 2,
				idempotencyKey: "erasure-rollback-20260811",
				confirmation: "ROLLBACK",
			},
		],
	] as const;

	it.each(
		cases,
	)("requires recent authentication for %s", async (_name, load, path, body) => {
		mocks.recentAuth.mockRejectedValueOnce(
			new Response(
				JSON.stringify({
					ok: false,
					error: {
						code: "SESSION_NOT_FRESH",
						message: "Recent authentication is required",
						status: 403,
					},
				}),
				{ status: 403 },
			),
		);
		const { POST } = await load();
		const response = await POST(request(path, "POST", body));

		expect(response.status).toBe(403);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(mocks.fetch).not.toHaveBeenCalled();
	});
});

describe("erasure configuration BFF", () => {
	it("lets security administrators read only the read-safe slot metadata", async () => {
		mocks.session.mockResolvedValueOnce({
			...SUPER_ADMIN,
			role: "security_admin",
		});
		mocks.fetch.mockResolvedValueOnce({
			ok: true,
			data: {
				structuralReady: true,
				operationalState: "disabled",
				revision: 1,
				updatedAt: "2026-08-11T00:00:00.000Z",
				capabilities: { execution: false, verification: true },
				slots: {
					active: null,
					next: {
						version: 1,
						targetCount: 1,
						targetIds: ["cinashop"],
						validated: false,
						createdAt: "2026-08-11T00:00:00.000Z",
						lastTestedAt: null,
						activatedAt: null,
					},
					previous: null,
				},
			},
		});
		const { GET } = await import(
			"@/app/api/admin/configuration/erasure/status/route"
		);
		const response = await GET(
			request("/api/admin/configuration/erasure/status"),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			ok: true,
			data: {
				slots: { next: { targetIds: ["cinashop"] } },
			},
		});
	});
});
