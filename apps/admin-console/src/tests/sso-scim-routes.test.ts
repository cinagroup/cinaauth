import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { cinaauthConfig } from "@/lib/cinaauth/config";
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

const SUPER_ADMIN: AdminSession = {
	userId: "admin-1",
	role: "super_admin",
	email: "root@example.com",
	impersonatedBy: null,
};

const SECURITY_ADMIN: AdminSession = {
	...SUPER_ADMIN,
	userId: "security-1",
	role: "security_admin",
};

const validSsoBody = {
	providerId: "acme-oidc",
	organizationId: "organization-active",
	domain: "acme.example",
	issuer: "https://idp.acme.example",
	oidcConfig: {
		clientId: "acme-client",
		clientSecret: "acme-secret",
		discoveryEndpoint:
			"https://idp.acme.example/.well-known/openid-configuration",
		pkce: true,
		scopes: ["openid", "email", "profile"],
	},
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

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
	vi.clearAllMocks();
	mockFetch.mockReset();
	mockSession.mockResolvedValue(SUPER_ADMIN);
	mockRecentAuthentication.mockResolvedValue(undefined);
	mockFetch.mockResolvedValue({ ok: true, data: { providers: [] } });
});

describe("Admin SSO BFF contract", () => {
	it("requires an explicit organization and delegates authorization upstream", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			data: {
				...validSsoBody,
				domainVerified: false,
				domainVerificationToken: "dns-token",
				redirectURI: "https://auth.cinaseek.ai/api/auth/sso/callback/acme-oidc",
			},
		});
		const { POST } = await import("@/app/api/admin/sso/providers/route");

		const response = await POST(
			request("/api/admin/sso/providers", "POST", validSsoBody),
		);

		expect(response.status).toBe(200);
		expect(mockRecentAuthentication).toHaveBeenCalledWith(
			expect.any(NextRequest),
			SUPER_ADMIN,
		);
		expect(mockFetch).toHaveBeenCalledWith("/sso/register", {
			method: "POST",
			body: validSsoBody,
			cookie: "session=valid",
		});
	});

	it("fails closed before SSO upstream calls without an explicit organization", async () => {
		const { GET, POST } = await import("@/app/api/admin/sso/providers/route");
		const { organizationId: _organizationId, ...bodyWithoutOrganization } =
			validSsoBody;

		expect((await GET(request("/api/admin/sso/providers"))).status).toBe(400);
		expect(
			(
				await POST(
					request("/api/admin/sso/providers", "POST", bodyWithoutOrganization),
				)
			).status,
		).toBe(400);
		expect(mockRecentAuthentication).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("deletes an SSO provider after authoritative tenant resolution", async () => {
		const { DELETE } = await import("@/app/api/admin/sso/providers/[id]/route");
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				data: {
					...validSsoBody,
					type: "oidc",
					domainVerified: false,
				},
			})
			.mockResolvedValueOnce({ ok: true, data: { success: true } });

		const response = await DELETE(
			request(
				"/api/admin/sso/providers/acme-oidc?organizationId=organization-active",
				"DELETE",
			),
			params("acme-oidc"),
		);

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenLastCalledWith("/sso/delete-provider", {
			method: "POST",
			body: { providerId: "acme-oidc" },
			cookie: "session=valid",
		});
	});

	it("returns only providers in the explicitly selected organization", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			data: {
				providers: [
					{ ...validSsoBody, organizationId: "organization-active" },
					{ ...validSsoBody, providerId: "other", organizationId: "other-org" },
					{ ...validSsoBody, providerId: "personal", organizationId: null },
				],
			},
		});
		const { GET } = await import("@/app/api/admin/sso/providers/route");

		const response = await GET(
			request("/api/admin/sso/providers?organizationId=organization-active"),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			ok: true,
			data: {
				providers: [
					expect.objectContaining({
						providerId: "acme-oidc",
						organizationId: "organization-active",
					}),
				],
			},
		});
	});

	it("rejects the legacy name/entityId pseudo-contract", async () => {
		const { POST } = await import("@/app/api/admin/sso/providers/route");

		const response = await POST(
			request("/api/admin/sso/providers", "POST", {
				name: "Acme",
				domain: "acme.example",
				entityId: "https://idp.acme.example",
			}),
		);

		expect(response.status).toBe(400);
		expect(mockRecentAuthentication).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("rejects cross-tenant SSO detail and deletion", async () => {
		const detailRoute = await import(
			"@/app/api/admin/sso/providers/[id]/route"
		);
		mockFetch.mockResolvedValue({
			ok: true,
			data: {
				...validSsoBody,
				organizationId: "organization-other",
				domainVerified: false,
			},
		});

		const detailResponse = await detailRoute.GET(
			request(
				"/api/admin/sso/providers/acme-oidc?organizationId=organization-active",
			),
			params("acme-oidc"),
		);
		expect(detailResponse.status).toBe(404);

		mockFetch.mockClear();
		const deleteResponse = await detailRoute.DELETE(
			request(
				"/api/admin/sso/providers/acme-oidc?organizationId=organization-active",
				"DELETE",
			),
			params("acme-oidc"),
		);
		expect(deleteResponse.status).toBe(404);
		expect(mockRecentAuthentication).toHaveBeenCalled();
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).not.toHaveBeenCalledWith(
			"/sso/delete-provider",
			expect.anything(),
		);
	});

	it("separates domain-token request from DNS verification", async () => {
		const { POST } = await import(
			"@/app/api/admin/sso/domain-verification/route"
		);

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				data: {
					...validSsoBody,
					organizationId: "organization-active",
					domainVerified: false,
				},
			})
			.mockResolvedValueOnce({
				ok: true,
				data: { domainVerificationToken: "x" },
			});
		await POST(
			request("/api/admin/sso/domain-verification", "POST", {
				action: "request",
				providerId: "acme-oidc",
				organizationId: "organization-active",
			}),
		);
		expect(mockFetch).toHaveBeenLastCalledWith(
			"/sso/request-domain-verification",
			{
				method: "POST",
				body: { providerId: "acme-oidc" },
				cookie: "session=valid",
			},
		);

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				data: {
					...validSsoBody,
					organizationId: "organization-active",
					domainVerified: false,
				},
			})
			.mockResolvedValueOnce({ ok: true });
		await POST(
			request("/api/admin/sso/domain-verification", "POST", {
				action: "verify",
				providerId: "acme-oidc",
				organizationId: "organization-active",
			}),
		);
		expect(mockFetch).toHaveBeenLastCalledWith("/sso/verify-domain", {
			method: "POST",
			body: { providerId: "acme-oidc" },
			cookie: "session=valid",
		});
		expect(mockRecentAuthentication).toHaveBeenCalledTimes(2);
	});

	it("rejects cross-tenant domain verification before the mutation", async () => {
		const { POST } = await import(
			"@/app/api/admin/sso/domain-verification/route"
		);
		mockFetch.mockResolvedValue({
			ok: true,
			data: {
				...validSsoBody,
				organizationId: "organization-other",
				type: "oidc",
				domainVerified: false,
			},
		});

		const response = await POST(
			request("/api/admin/sso/domain-verification", "POST", {
				action: "request",
				providerId: "acme-oidc",
				organizationId: "organization-active",
			}),
		);

		expect(response.status).toBe(404);
		expect(mockFetch).not.toHaveBeenCalledWith(
			"/sso/request-domain-verification",
			expect.anything(),
		);
	});

	it("builds provider-specific SAML metadata URLs", async () => {
		const { GET } = await import("@/app/api/admin/sso/metadata/route");
		mockFetch.mockResolvedValue({
			ok: true,
			data: {
				...validSsoBody,
				providerId: "acme-saml",
				type: "saml",
				domainVerified: true,
			},
		});
		const response = await GET(
			request(
				"/api/admin/sso/metadata?providerId=acme-saml&organizationId=organization-active",
			),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			ok: true,
			data: {
				url: `${cinaauthConfig.baseUrl}/api/auth/sso/saml2/sp/metadata?providerId=acme-saml`,
			},
		});
	});
});

describe("Admin SCIM BFF contract", () => {
	it("lists only the selected tenant and requires it for token generation", async () => {
		const route = await import("@/app/api/admin/scim/tokens/route");

		mockFetch.mockResolvedValueOnce({
			ok: true,
			data: {
				providers: [
					{
						id: "connection-active",
						providerId: "acme-scim",
						organizationId: "organization-active",
					},
					{
						id: "connection-other",
						providerId: "other-scim",
						organizationId: "organization-other",
					},
				],
			},
		});
		const listResponse = await route.GET(
			request("/api/admin/scim/tokens?organizationId=organization-active"),
		);
		expect(await listResponse.json()).toMatchObject({
			ok: true,
			data: {
				providers: [
					expect.objectContaining({
						providerId: "acme-scim",
						organizationId: "organization-active",
					}),
				],
			},
		});
		expect(mockFetch).toHaveBeenLastCalledWith(
			"/scim/list-provider-connections",
			{ cookie: "session=valid" },
		);

		mockFetch.mockResolvedValueOnce({
			ok: true,
			data: { scimToken: "secret" },
		});
		await route.POST(
			request("/api/admin/scim/tokens", "POST", {
				providerId: "acme-scim",
				organizationId: "organization-active",
			}),
		);
		expect(mockRecentAuthentication).toHaveBeenCalled();
		expect(mockFetch).toHaveBeenLastCalledWith("/scim/generate-token", {
			method: "POST",
			body: {
				providerId: "acme-scim",
				organizationId: "organization-active",
			},
			cookie: "session=valid",
		});
	});

	it("fails closed before SCIM upstream calls without an explicit organization", async () => {
		const { GET, POST } = await import("@/app/api/admin/scim/tokens/route");

		expect((await GET(request("/api/admin/scim/tokens"))).status).toBe(400);
		expect(
			(
				await POST(
					request("/api/admin/scim/tokens", "POST", {
						providerId: "acme-scim",
					}),
				)
			).status,
		).toBe(400);
		expect(mockRecentAuthentication).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("deletes a SCIM provider after authoritative tenant resolution", async () => {
		const { DELETE } = await import("@/app/api/admin/scim/tokens/[id]/route");
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				data: {
					id: "connection-active",
					providerId: "acme-scim",
					organizationId: "organization-active",
				},
			})
			.mockResolvedValueOnce({ ok: true, data: { success: true } });

		const response = await DELETE(
			request(
				"/api/admin/scim/tokens/acme-scim?organizationId=organization-active",
				"DELETE",
			),
			params("acme-scim"),
		);

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenLastCalledWith(
			"/scim/delete-provider-connection",
			{
				method: "POST",
				body: { providerId: "acme-scim" },
				cookie: "session=valid",
			},
		);
	});

	it("rejects token generation without providerId", async () => {
		const { POST } = await import("@/app/api/admin/scim/tokens/route");
		const response = await POST(
			request("/api/admin/scim/tokens", "POST", {
				organizationId: "organization-1",
			}),
		);

		expect(response.status).toBe(400);
		expect(mockRecentAuthentication).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("rejects deletion of a SCIM provider outside the selected tenant", async () => {
		const { DELETE } = await import("@/app/api/admin/scim/tokens/[id]/route");
		mockFetch.mockResolvedValue({
			ok: true,
			data: {
				id: "connection-other",
				providerId: "acme-scim",
				organizationId: "organization-other",
			},
		});

		const response = await DELETE(
			request(
				"/api/admin/scim/tokens/acme-scim?organizationId=organization-active",
				"DELETE",
			),
			params("acme-scim"),
		);

		expect(response.status).toBe(404);
		expect(mockRecentAuthentication).toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalledWith(
			"/scim/delete-provider-connection",
			expect.anything(),
		);
	});
});

describe("integration permission and step-up boundaries", () => {
	it("allows security_admin reads but denies SSO and SCIM management", async () => {
		mockSession.mockResolvedValue(SECURITY_ADMIN);
		const ssoRoute = await import("@/app/api/admin/sso/providers/route");
		const scimRoute = await import("@/app/api/admin/scim/tokens/route");

		expect(
			(
				await ssoRoute.GET(
					request(
						"/api/admin/sso/providers?organizationId=organization-active",
					),
				)
			).status,
		).toBe(200);
		expect(
			(
				await scimRoute.GET(
					request("/api/admin/scim/tokens?organizationId=organization-active"),
				)
			).status,
		).toBe(200);

		mockFetch.mockClear();
		expect(
			(
				await ssoRoute.POST(
					request("/api/admin/sso/providers", "POST", validSsoBody),
				)
			).status,
		).toBe(403);
		expect(
			(
				await scimRoute.POST(
					request("/api/admin/scim/tokens", "POST", {
						providerId: "acme-scim",
					}),
				)
			).status,
		).toBe(403);
		expect(mockRecentAuthentication).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("preserves an authoritative Worker step-up response", async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			error: {
				code: "SESSION_NOT_FRESH",
				message: "Recent authentication is required",
				status: 403,
			},
		});
		const { POST } = await import("@/app/api/admin/scim/tokens/route");

		const response = await POST(
			request("/api/admin/scim/tokens", "POST", {
				providerId: "acme-scim",
				organizationId: "organization-active",
			}),
		);

		expect(response.status).toBe(403);
		expect(await response.json()).toMatchObject({
			error: { code: "SESSION_NOT_FRESH", status: 403 },
		});
	});
});
