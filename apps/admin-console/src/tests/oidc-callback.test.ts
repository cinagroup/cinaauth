import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("GET /api/auth/oidc/callback", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubEnv("CINAADMIN_ORIGIN", "https://admin.test");
		vi.stubEnv("CINAUTH_REQUEST_ORIGIN", "https://admin.test");
		vi.stubEnv("CINAUTH_BASE_URL", "https://auth.test");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it("preserves the bridged session cookie while clearing the OIDC transaction", async () => {
		const fetchAuthRequest = vi.fn().mockImplementation((request: Request) => {
			const headers = new Headers();
			headers.append(
				"set-cookie",
				"__Secure-cinaauth.session_token=session-token; Path=/; Domain=.cinaseek.ai; HttpOnly; Secure; SameSite=Lax",
			);
			return Promise.resolve(
				new Response(
					JSON.stringify({
						ok: true,
						user: { id: "admin-user", role: "super_admin" },
					}),
					{ status: 200, headers },
				),
			);
		});
		vi.doMock("@/lib/cinaauth/oidc-secrets", () => ({
			getAdminOidcSecrets: vi.fn().mockResolvedValue({
				CINAADMIN_OIDC_CLIENT_SECRET: "cina_cs_test-secret",
				CINAADMIN_OIDC_TRANSACTION_SECRET: "transaction-secret",
				CINAADMIN_OIDC_BRIDGE_SECRET: "bridge-secret",
			}),
		}));
		vi.doMock("@/lib/cinaauth/oidc-transaction", async (importOriginal) => {
			const original =
				await importOriginal<
					typeof import("@/lib/cinaauth/oidc-transaction")
				>();
			return {
				...original,
				openOidcTransaction: vi.fn().mockResolvedValue({
					state: "state",
					nonce: "nonce",
					codeVerifier: "verifier",
					callbackPath: "/dashboard",
					createdAt: Date.now(),
					mode: "login",
				}),
			};
		});
		vi.doMock("@/lib/cinaauth/oidc-client", () => ({
			discoverAdminAuthorizationServer: vi.fn().mockResolvedValue({}),
			exchangeAdminAuthorizationCode: vi.fn().mockResolvedValue({
				accessToken: "access-token",
				subject: "admin-user",
				authenticationTime: undefined,
			}),
			getAdminOidcFailureDetails: vi.fn(),
			hasRequiredAdminAuthenticationProof: vi.fn().mockReturnValue(true),
		}));
		vi.doMock("@/lib/cinaauth/fetcher", () => ({ fetchAuthRequest }));

		const { GET } = await import("@/app/api/auth/oidc/callback/route");
		const request = new NextRequest(
			"https://admin.test/api/auth/oidc/callback?code=code&state=state",
			{
				headers: {
					cookie: "__Host-cinaadmin_oidc_tx=transaction-cookie",
				},
			},
		);

		const response = await GET(request);
		const setCookie = response.headers.get("set-cookie") ?? "";

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe(
			"https://admin.test/dashboard",
		);
		expect(setCookie).toContain(
			"__Secure-cinaauth.session_token=session-token",
		);
		expect(setCookie).toContain("__Host-cinaadmin_oidc_tx=");
		expect(setCookie).not.toMatch(/domain=/i);
		expect(fetchAuthRequest).toHaveBeenCalledOnce();
		expect(
			(fetchAuthRequest.mock.calls[0]?.[0] as Request).headers.get(
				"x-cinaadmin-auth-time",
			),
		).toBe("0");
	});

	it("fails closed before bridging when step-up lacks auth_time proof", async () => {
		const fetchAuthRequest = vi.fn();
		vi.doMock("@/lib/cinaauth/oidc-secrets", () => ({
			getAdminOidcSecrets: vi.fn().mockResolvedValue({
				CINAADMIN_OIDC_CLIENT_SECRET: "cina_cs_test-secret",
				CINAADMIN_OIDC_TRANSACTION_SECRET: "transaction-secret",
				CINAADMIN_OIDC_BRIDGE_SECRET: "bridge-secret",
			}),
		}));
		vi.doMock("@/lib/cinaauth/oidc-transaction", async (importOriginal) => {
			const original =
				await importOriginal<
					typeof import("@/lib/cinaauth/oidc-transaction")
				>();
			return {
				...original,
				openOidcTransaction: vi.fn().mockResolvedValue({
					state: "state",
					nonce: "nonce",
					codeVerifier: "verifier",
					callbackPath: "/settings/security",
					createdAt: Date.now(),
					mode: "step-up",
				}),
			};
		});
		vi.doMock("@/lib/cinaauth/oidc-client", async (importOriginal) => {
			const original =
				await importOriginal<typeof import("@/lib/cinaauth/oidc-client")>();
			return {
				...original,
				discoverAdminAuthorizationServer: vi.fn().mockResolvedValue({}),
				exchangeAdminAuthorizationCode: vi.fn().mockResolvedValue({
					accessToken: "access-token",
					subject: "admin-user",
					authenticationTime: undefined,
				}),
			};
		});
		vi.doMock("@/lib/cinaauth/fetcher", () => ({ fetchAuthRequest }));

		const { GET } = await import("@/app/api/auth/oidc/callback/route");
		const response = await GET(
			new NextRequest(
				"https://admin.test/api/auth/oidc/callback?code=code&state=state",
				{
					headers: {
						cookie: "__Host-cinaadmin_oidc_tx=transaction-cookie",
					},
				},
			),
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe(
			"https://admin.test/login?error=recent_auth_required",
		);
		expect(fetchAuthRequest).not.toHaveBeenCalled();
	});

	it("sets a distinct recent-auth proof only after verified step-up", async () => {
		const now = Date.now();
		vi.doMock("@/lib/cinaauth/oidc-secrets", () => ({
			getAdminOidcSecrets: vi.fn().mockResolvedValue({
				CINAADMIN_OIDC_CLIENT_SECRET: "cina_cs_test-secret",
				CINAADMIN_OIDC_TRANSACTION_SECRET:
					"transaction-secret-with-at-least-32-characters",
				CINAADMIN_OIDC_BRIDGE_SECRET: "bridge-secret",
			}),
		}));
		vi.doMock("@/lib/cinaauth/oidc-transaction", async (importOriginal) => {
			const original =
				await importOriginal<
					typeof import("@/lib/cinaauth/oidc-transaction")
				>();
			return {
				...original,
				openOidcTransaction: vi.fn().mockResolvedValue({
					state: "state",
					nonce: "nonce",
					codeVerifier: "verifier",
					callbackPath: "/settings/security",
					createdAt: now,
					mode: "step-up",
				}),
			};
		});
		vi.doMock("@/lib/cinaauth/oidc-client", async (importOriginal) => {
			const original =
				await importOriginal<typeof import("@/lib/cinaauth/oidc-client")>();
			return {
				...original,
				discoverAdminAuthorizationServer: vi.fn().mockResolvedValue({}),
				exchangeAdminAuthorizationCode: vi.fn().mockResolvedValue({
					accessToken: "access-token",
					subject: "admin-user",
					authenticationTime: Math.floor(now / 1000),
				}),
			};
		});
		vi.doMock("@/lib/cinaauth/fetcher", () => ({
			fetchAuthRequest: vi.fn().mockImplementation(() => {
				const headers = new Headers();
				headers.append(
					"set-cookie",
					"__Secure-cinaauth.session_token=session-token; Path=/; Domain=.cinaseek.ai; HttpOnly; Secure; SameSite=Lax",
				);
				return Promise.resolve(
					new Response(
						JSON.stringify({
							ok: true,
							user: { id: "admin-user", role: "super_admin" },
						}),
						{ status: 200, headers },
					),
				);
			}),
		}));

		const { GET } = await import("@/app/api/auth/oidc/callback/route");
		const response = await GET(
			new NextRequest(
				"https://admin.test/api/auth/oidc/callback?code=code&state=state",
				{
					headers: {
						cookie: "__Host-cinaadmin_oidc_tx=transaction-cookie",
					},
				},
			),
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe(
			"https://admin.test/settings/security",
		);
		expect(response.headers.get("set-cookie")).toContain(
			"__Host-cinaadmin_recent_auth=",
		);
	});
});
