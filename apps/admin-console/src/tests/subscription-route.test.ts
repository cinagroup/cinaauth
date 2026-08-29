import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import type { AdminSession } from "@/lib/cinaauth/types";

const mocks = vi.hoisted(() => ({
	recent: vi.fn(),
}));

vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: vi.fn(),
}));
vi.mock("@/lib/cinaauth/session", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("@/lib/cinaauth/session")>();
	return { ...original, resolveAdminSession: vi.fn() };
});
vi.mock("@/lib/recent-auth-guard", () => ({
	requireRecentAdminAuthentication: mocks.recent,
}));

const mockFetch = vi.mocked(cinaauthFetch);
const mockSession = vi.mocked(resolveAdminSession);

const SUPER_ADMIN: AdminSession = {
	userId: "admin-1",
	role: "super_admin",
	email: "admin@example.com",
	activeOrganizationId: "org-session-must-not-be-used",
};

const request = (
	path: string,
	method: "GET" | "POST" = "GET",
	body?: unknown,
) =>
	new NextRequest(new URL(path, "https://admin.test"), {
		method,
		headers: {
			cookie: "session=verified",
			...(body === undefined ? {} : { "content-type": "application/json" }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

beforeEach(() => {
	vi.clearAllMocks();
	mockSession.mockResolvedValue(SUPER_ADMIN);
	mocks.recent.mockResolvedValue(undefined);
});

describe("Admin scoped subscription BFF", () => {
	it("represents a missing Stripe plugin as an unavailable billing state", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			error: {
				code: "CINAUTH_404",
				message: "CinaSeek Identity request failed",
				status: 404,
			},
		});
		const { GET } = await import("@/app/api/admin/subscriptions/route");

		const response = await GET(request("/api/admin/subscriptions"));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			ok: true,
			data: {
				available: false,
				scope: "user",
				referenceId: "admin-1",
				subscriptions: [],
			},
		});
	});

	it("rejects billing workflows clearly when the Stripe plugin is missing", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			error: {
				code: "CINAUTH_404",
				message: "CinaSeek Identity request failed",
				status: 404,
			},
		});
		const { POST } = await import("@/app/api/admin/subscriptions/route");

		const response = await POST(
			request("/api/admin/subscriptions", "POST", {
				action: "portal",
				returnUrl: "/billing",
			}),
		);

		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({
			ok: false,
			error: {
				code: "BILLING_UNAVAILABLE",
				message: "Billing is not configured",
			},
		});
		expect(mocks.recent).toHaveBeenCalledTimes(1);
	});

	it("normalizes the Stripe plugin's raw array and strips customer identifiers", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			data: [
				{
					id: "db-sub-1",
					plan: "pro",
					status: "active",
					stripeSubscriptionId: "sub_123",
					stripeCustomerId: "cus_secret",
					referenceId: "admin-1",
					billingInterval: "month",
				},
			],
		});
		const { GET } = await import("@/app/api/admin/subscriptions/route");

		const response = await GET(request("/api/admin/subscriptions"));

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledWith("/subscription/list", {
			cookie: "session=verified",
		});
		const payload = await response.json();
		expect(payload).toEqual({
			ok: true,
			data: {
				available: true,
				scope: "user",
				referenceId: "admin-1",
				subscriptions: [
					{
						id: "db-sub-1",
						plan: "pro",
						status: "active",
						stripeSubscriptionId: "sub_123",
						billingInterval: "month",
					},
				],
			},
		});
		expect(JSON.stringify(payload)).not.toContain("cus_secret");
	});

	it("scopes organization reads to the explicit organization selected from the actor list", async () => {
		mockSession.mockResolvedValueOnce({
			...SUPER_ADMIN,
			activeOrganizationId: null,
		});
		mockFetch.mockResolvedValueOnce({ ok: true, data: [] });
		const { GET } = await import("@/app/api/admin/subscriptions/route");

		const response = await GET(
			request(
				"/api/admin/subscriptions?scope=organization&organizationId=org-selected",
			),
		);

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledWith(
			"/subscription/list?customerType=organization&referenceId=org-selected",
			{ cookie: "session=verified" },
		);
		expect(await response.json()).toMatchObject({
			data: { scope: "organization", referenceId: "org-selected" },
		});
	});

	it("rejects organization scope without an explicit organization id instead of falling back to the session", async () => {
		const { GET } = await import("@/app/api/admin/subscriptions/route");

		const response = await GET(
			request("/api/admin/subscriptions?scope=organization"),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: { code: "ORGANIZATION_ID_REQUIRED" },
		});
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it.each([
		"",
		" ",
		"o".repeat(256),
	])("rejects an invalid organization id: %j", async (organizationId) => {
		const { GET } = await import("@/app/api/admin/subscriptions/route");

		const response = await GET(
			request(
				`/api/admin/subscriptions?scope=organization&organizationId=${encodeURIComponent(organizationId)}`,
			),
		);

		expect(response.status).toBe(400);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("rejects an organization id attached to user scope", async () => {
		const { GET } = await import("@/app/api/admin/subscriptions/route");

		const response = await GET(
			request("/api/admin/subscriptions?scope=user&organizationId=org-other"),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: { code: "ORGANIZATION_SCOPE_MISMATCH" },
		});
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("preserves an upstream authorization denial for a non-member organization", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			error: {
				code: "CINAUTH_403",
				message: "CinaSeek Identity request failed",
				status: 403,
			},
		});
		const { GET } = await import("@/app/api/admin/subscriptions/route");

		const response = await GET(
			request(
				"/api/admin/subscriptions?scope=organization&organizationId=org-nonmember",
			),
		);

		expect(response.status).toBe(403);
		expect(await response.json()).toMatchObject({
			ok: false,
			error: { code: "CINAUTH_403", status: 403 },
		});
		expect(mockFetch).toHaveBeenCalledWith(
			"/subscription/list?customerType=organization&referenceId=org-nonmember",
			{ cookie: "session=verified" },
		);
	});

	it("allows billing.subscription.read for security_admin", async () => {
		mockSession.mockResolvedValueOnce({
			...SUPER_ADMIN,
			role: "security_admin",
		});
		mockFetch.mockResolvedValueOnce({ ok: true, data: [] });
		const { GET } = await import("@/app/api/admin/subscriptions/route");

		const response = await GET(request("/api/admin/subscriptions"));

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it("denies billing.subscription.manage for security_admin", async () => {
		mockSession.mockResolvedValueOnce({
			...SUPER_ADMIN,
			role: "security_admin",
		});
		const { POST } = await import("@/app/api/admin/subscriptions/route");

		const response = await POST(
			request("/api/admin/subscriptions", "POST", {
				action: "portal",
				returnUrl: "/billing",
			}),
		);

		expect(response.status).toBe(403);
		expect(mocks.recent).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("uses billing.subscription.manage instead of an exact role string", async () => {
		mockSession.mockResolvedValueOnce({
			...SUPER_ADMIN,
			role: "user,super_admin",
		});
		mockFetch.mockResolvedValueOnce({
			ok: true,
			data: {
				url: "https://billing.stripe.com/p/session/test",
				redirect: false,
			},
		});
		const { POST } = await import("@/app/api/admin/subscriptions/route");

		const response = await POST(
			request("/api/admin/subscriptions", "POST", {
				action: "portal",
				returnUrl: "/billing",
			}),
		);

		expect(response.status).toBe(200);
		expect(mocks.recent).toHaveBeenCalledTimes(1);
	});

	it("requires recent authentication after validating a cancel request", async () => {
		mocks.recent.mockRejectedValueOnce(
			Response.json(
				{
					ok: false,
					error: { code: "SESSION_NOT_FRESH", status: 403 },
				},
				{ status: 403 },
			),
		);
		const { POST } = await import("@/app/api/admin/subscriptions/route");

		const response = await POST(
			request("/api/admin/subscriptions", "POST", {
				action: "cancel",
				subscriptionId: "sub_123",
				returnUrl: "/billing?scope=user",
			}),
		);

		expect(response.status).toBe(403);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("sends the Stripe subscription id and a server-validated return URL", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			data: {
				url: "https://billing.stripe.com/p/session/cancel",
				redirect: false,
			},
		});
		const { POST } = await import("@/app/api/admin/subscriptions/route");

		const response = await POST(
			request("/api/admin/subscriptions", "POST", {
				action: "cancel",
				subscriptionId: "sub_123",
				returnUrl: "/billing?scope=user",
				referenceId: "victim",
			}),
		);

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledWith("/subscription/cancel", {
			method: "POST",
			cookie: "session=verified",
			body: {
				customerType: "user",
				subscriptionId: "sub_123",
				returnUrl: "https://admin.test/billing?scope=user",
				disableRedirect: true,
			},
		});
	});

	it("passes the explicitly selected organization to the authoritative Stripe authorization hook", async () => {
		mockSession.mockResolvedValueOnce({
			...SUPER_ADMIN,
			activeOrganizationId: "org-unrelated-session-value",
		});
		mockFetch.mockResolvedValueOnce({
			ok: true,
			data: {
				url: "https://billing.stripe.com/p/session/org",
				redirect: false,
			},
		});
		const { POST } = await import("@/app/api/admin/subscriptions/route");

		await POST(
			request("/api/admin/subscriptions", "POST", {
				action: "portal",
				scope: "organization",
				organizationId: "org-selected",
				returnUrl: "/billing?scope=organization&organizationId=org-selected",
			}),
		);

		expect(mockFetch).toHaveBeenCalledWith("/subscription/billing-portal", {
			method: "POST",
			cookie: "session=verified",
			body: {
				customerType: "organization",
				referenceId: "org-selected",
				returnUrl:
					"https://admin.test/billing?scope=organization&organizationId=org-selected",
				disableRedirect: true,
			},
		});
	});

	it("rejects organization writes without an explicit organization id before recent auth", async () => {
		const { POST } = await import("@/app/api/admin/subscriptions/route");

		const response = await POST(
			request("/api/admin/subscriptions", "POST", {
				action: "portal",
				scope: "organization",
				returnUrl: "/billing?scope=organization",
			}),
		);

		expect(response.status).toBe(400);
		expect(mocks.recent).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("rejects an organization id attached to a user-scoped write", async () => {
		const { POST } = await import("@/app/api/admin/subscriptions/route");

		const response = await POST(
			request("/api/admin/subscriptions", "POST", {
				action: "portal",
				scope: "user",
				organizationId: "org-other",
				returnUrl: "/billing?scope=user",
			}),
		);

		expect(response.status).toBe(400);
		expect(mocks.recent).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("preserves an upstream organization authorization denial on a billing write", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			error: {
				code: "CINAUTH_403",
				message: "CinaSeek Identity request failed",
				status: 403,
			},
		});
		const { POST } = await import("@/app/api/admin/subscriptions/route");

		const response = await POST(
			request("/api/admin/subscriptions", "POST", {
				action: "portal",
				scope: "organization",
				organizationId: "org-nonmember",
				returnUrl: "/billing?scope=organization&organizationId=org-nonmember",
			}),
		);

		expect(response.status).toBe(403);
		expect(mocks.recent).toHaveBeenCalledTimes(1);
		expect(await response.json()).toMatchObject({
			error: { code: "CINAUTH_403", status: 403 },
		});
	});

	it("forwards only validated upgrade fields and same-origin checkout URLs", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			data: { url: "https://checkout.stripe.com/c/pay/test", redirect: false },
		});
		const { POST } = await import("@/app/api/admin/subscriptions/route");

		const response = await POST(
			request("/api/admin/subscriptions", "POST", {
				action: "upgrade",
				plan: "pro",
				annual: true,
				subscriptionId: "sub_123",
				returnUrl: "/billing",
				successUrl: "/billing?checkout=success",
				cancelUrl: "/billing?checkout=cancel",
				metadata: { privilege: "admin" },
			}),
		);

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledWith("/subscription/upgrade", {
			method: "POST",
			cookie: "session=verified",
			body: {
				customerType: "user",
				plan: "pro",
				annual: true,
				subscriptionId: "sub_123",
				returnUrl: "https://admin.test/billing",
				successUrl: "https://admin.test/billing?checkout=success",
				cancelUrl: "https://admin.test/billing?checkout=cancel",
				disableRedirect: true,
			},
		});
	});

	it.each([
		"https://attacker.example/steal",
		"//attacker.example/steal",
		"javascript:alert(1)",
	])("rejects a non-local returnUrl before recent auth: %s", async (returnUrl) => {
		const { POST } = await import("@/app/api/admin/subscriptions/route");

		const response = await POST(
			request("/api/admin/subscriptions", "POST", {
				action: "portal",
				returnUrl,
			}),
		);

		expect(response.status).toBe(400);
		expect(mocks.recent).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("rejects an arbitrary upstream redirect URL", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			data: { url: "https://attacker.example/steal", redirect: true },
		});
		const { POST } = await import("@/app/api/admin/subscriptions/route");

		const response = await POST(
			request("/api/admin/subscriptions", "POST", {
				action: "portal",
				returnUrl: "/billing",
			}),
		);

		expect(response.status).toBe(502);
		expect(await response.json()).toMatchObject({
			error: { code: "INVALID_BILLING_REDIRECT" },
		});
	});
});
