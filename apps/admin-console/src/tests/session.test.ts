import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";

beforeEach(() => {
	vi.stubEnv("CINAADMIN_ALLOWED_ROLES", "super_admin,security_admin");
	vi.stubEnv("CINAUTH_BASE_URL", "https://auth.test");
	vi.stubEnv("CINAUTH_AUTH_URL", "https://auth-frontend.test");
});

describe("hasAdminRole", () => {
	it("allows whitelisted roles, rejects others", () => {
		expect(hasAdminRole("super_admin")).toBe(true);
		expect(hasAdminRole("security_admin")).toBe(true);
		expect(hasAdminRole("user,super_admin")).toBe(true);
		expect(hasAdminRole("admin")).toBe(false);
		expect(hasAdminRole("user")).toBe(false);
		expect(hasAdminRole(undefined)).toBe(false);
		expect(hasAdminRole(null)).toBe(false);
	});
});

describe("resolveAdminSession", () => {
	it("returns null when no cookie is present", async () => {
		const req = new Request("https://admin.test/api/x");
		expect(await resolveAdminSession(req)).toBeNull();
	});

	it("returns null when cinaauth responds non-200", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response("{}", { status: 401 }));
		const req = new Request("https://admin.test/api/x", {
			headers: { cookie: "__Secure-cinaauth.session_token=invalid" },
		});
		expect(await resolveAdminSession(req)).toBeNull();
		fetchMock.mockRestore();
	});

	it("returns a session when cinaauth responds 200 with session+user", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					session: { userId: "u1" },
					user: { id: "u1", role: "super_admin", email: "a@b.c" },
					activeOrganizationId: "org-active",
				}),
				{ status: 200 },
			),
		);
		const req = new Request("https://admin.test/api/x", {
			headers: { cookie: "__Secure-cinaauth.session_token=test-token" },
		});
		const session = await resolveAdminSession(req);
		expect(session?.userId).toBe("u1");
		expect(session?.role).toBe("super_admin");
		expect(session?.email).toBe("a@b.c");
		expect(session?.activeOrganizationId).toBe("org-active");
		fetchMock.mockRestore();
	});

	it("reads impersonatedBy from the SESSION record (Better Auth admin plugin)", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					session: { userId: "u2", impersonatedBy: "admin-1" },
					user: { id: "u2", role: "user", email: "t@b.c" },
				}),
				{ status: 200 },
			),
		);
		const req = new Request("https://admin.test/api/x", {
			headers: { cookie: "__Secure-cinaauth.session_token=test-token" },
		});
		const session = await resolveAdminSession(req);
		expect(session?.impersonatedBy).toBe("admin-1");
		expect(session?.role).toBe("user");
		fetchMock.mockRestore();
	});

	it("delegates session_data signature verification to cinaauth", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					session: { userId: "u2", impersonatedBy: "admin-1" },
					user: { id: "u2", role: "user", email: "t@b.c" },
				}),
				{ status: 200 },
			),
		);
		const blob = btoa(
			JSON.stringify({
				session: {
					session: { userId: "u2", impersonatedBy: "admin-1" },
					user: { id: "u2", role: "user", email: "t@b.c" },
				},
				expiresAt: Date.now() + 60_000,
			}),
		);
		const req = new Request("https://admin.test/api/x", {
			headers: { cookie: `__Secure-cinaauth.session_data=${blob}` },
		});
		const session = await resolveAdminSession(req);
		expect(session?.impersonatedBy).toBe("admin-1");
		expect(session?.role).toBe("user");
		expect(fetchMock).toHaveBeenCalledOnce();
		const upstreamRequest = fetchMock.mock.calls[0]?.[0];
		expect(upstreamRequest).toBeInstanceOf(Request);
		expect((upstreamRequest as Request).url).toMatch(
			/\/api\/auth\/get-session$/,
		);
		expect((upstreamRequest as Request).headers.get("cookie")).toBe(
			`__Secure-cinaauth.session_data=${blob}`,
		);
		fetchMock.mockRestore();
	});

	it("rejects a locally forged session_data payload", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response("{}", { status: 401 }));
		const blob = btoa(
			JSON.stringify({
				user: { id: "attacker", role: "super_admin" },
				expiresAt: Date.now() + 60_000,
			}),
		);
		const req = new Request("https://admin.test/api/x", {
			headers: { cookie: `__Secure-cinaauth.session_data=${blob}` },
		});
		expect(await resolveAdminSession(req)).toBeNull();
		fetchMock.mockRestore();
	});

	it("returns null when fetch throws (cinaauth unreachable)", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValue(new Error("network"));
		const req = new Request("https://admin.test/api/x", {
			headers: { cookie: "__Secure-cinaauth.session_token=test-token" },
		});
		expect(await resolveAdminSession(req)).toBeNull();
		fetchMock.mockRestore();
	});
});
