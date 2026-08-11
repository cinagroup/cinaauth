import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("GET /api/auth/oidc/login", () => {
	afterEach(() => {
		vi.resetModules();
		vi.restoreAllMocks();
	});

	it("binds the controlled step-up mode into the signed transaction", async () => {
		const sealOidcTransaction = vi.fn().mockResolvedValue("sealed-transaction");
		const createAdminAuthorizationUrl = vi
			.fn()
			.mockResolvedValue(new URL("https://auth.test/authorize"));
		vi.doMock("@/lib/cinaauth/oidc-secrets", () => ({
			getAdminOidcSecrets: vi.fn().mockResolvedValue({
				CINAADMIN_OIDC_TRANSACTION_SECRET:
					"transaction-secret-with-at-least-32-characters",
			}),
		}));
		vi.doMock("@/lib/cinaauth/oidc-client", () => ({
			createAdminAuthorizationUrl,
			discoverAdminAuthorizationServer: vi.fn().mockResolvedValue({}),
		}));
		vi.doMock("@/lib/cinaauth/oidc-transaction", async (importOriginal) => {
			const original =
				await importOriginal<
					typeof import("@/lib/cinaauth/oidc-transaction")
				>();
			return { ...original, sealOidcTransaction };
		});

		const { GET } = await import("@/app/api/auth/oidc/login/route");
		const response = await GET(
			new NextRequest(
				"https://admin.test/api/auth/oidc/login?mode=step-up&callbackURL=%2Fsettings%2Fsecurity",
			),
		);

		expect(response.status).toBe(302);
		expect(sealOidcTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: "step-up",
				callbackPath: "/settings/security",
			}),
			"transaction-secret-with-at-least-32-characters",
		);
		expect(createAdminAuthorizationUrl).toHaveBeenCalledWith(
			{},
			expect.objectContaining({ mode: "step-up" }),
		);
	});
});
