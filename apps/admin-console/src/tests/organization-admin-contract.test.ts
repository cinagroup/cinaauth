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

const SUPER_ADMIN: AdminSession = {
	userId: "admin-1",
	role: "super_admin",
	impersonatedBy: null,
};

const request = (method: "GET" | "POST", body?: unknown) =>
	new NextRequest("https://admin.test/api/admin/organizations", {
		method,
		headers: {
			cookie: "session=valid",
			...(body === undefined ? {} : { "content-type": "application/json" }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

beforeEach(() => {
	vi.clearAllMocks();
	mocks.session.mockResolvedValue(SUPER_ADMIN);
	mocks.fetch.mockResolvedValue({ ok: true, data: [] });
	mocks.recentAuthentication.mockResolvedValue(undefined);
});

describe("tenant-scoped organization Admin contract", () => {
	it("requires recent authentication before creating an organization", async () => {
		mocks.recentAuthentication.mockRejectedValue(
			new Response(
				JSON.stringify({
					ok: false,
					error: { code: "SESSION_NOT_FRESH" },
				}),
				{ status: 403, headers: { "Cache-Control": "no-store" } },
			),
		);
		const { POST } = await import("@/app/api/admin/organizations/route");

		const response = await POST(
			request("POST", { name: "Example", slug: "example" }),
		);

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
		const { POST } = await import("@/app/api/admin/organizations/route");

		const response = await POST(
			request("POST", { name: "Example", slug: "example" }),
		);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toMatchObject({
			error: { code: "SESSION_NOT_FRESH" },
		});
	});

	it("enforces centralized permission, recent-auth, and upstream status guards on every organization mutation BFF", () => {
		const mutationRoutes = [
			"src/app/api/admin/organizations/route.ts",
			"src/app/api/admin/organizations/[id]/update/route.ts",
			"src/app/api/admin/organizations/[id]/delete/route.ts",
			"src/app/api/admin/organizations/[id]/invite/route.ts",
			"src/app/api/admin/organizations/[id]/invitations/[inviteId]/route.ts",
			"src/app/api/admin/organizations/[id]/members/[memberId]/route.ts",
			"src/app/api/admin/organizations/[id]/members/[memberId]/role/route.ts",
			"src/app/api/admin/organizations/[id]/teams/route.ts",
			"src/app/api/admin/organizations/[id]/teams/[teamId]/route.ts",
			"src/app/api/admin/organizations/[id]/teams/[teamId]/members/route.ts",
			"src/app/api/admin/organizations/[id]/teams/[teamId]/members/[memberId]/route.ts",
		];

		for (const path of mutationRoutes) {
			const source = readFileSync(path, "utf8");
			expect(source, path).toContain("requireAdminControlPermission");
			expect(source, path).toContain("requireRecentAdminAuthentication");
			expect(source, path).toContain("adminUpstreamResponseStatus");
		}
	});

	it("enforces centralized permission and upstream status guards on every organization read BFF", () => {
		const readRoutes = [
			"src/app/api/admin/organizations/route.ts",
			"src/app/api/admin/organizations/[id]/route.ts",
			"src/app/api/admin/organizations/[id]/members/route.ts",
			"src/app/api/admin/organizations/[id]/teams/route.ts",
			"src/app/api/admin/organizations/[id]/teams/[teamId]/members/route.ts",
		];

		for (const path of readRoutes) {
			const source = readFileSync(path, "utf8");
			expect(source, path).toContain("requireAdminControlPermission");
			expect(source, path).toContain("adminUpstreamResponseStatus");
		}
	});

	it("uses the step-up-aware client and clearly labels the tenant scope", () => {
		const pageSources = [
			"src/app/(admin)/organizations/page.tsx",
			"src/app/(admin)/organizations/[id]/page.tsx",
			"src/app/(admin)/organizations/[id]/invite-dialog.tsx",
		].map((path) => readFileSync(path, "utf8"));

		for (const source of pageSources) {
			expect(source).not.toContain("await fetch(");
		}
		expect(pageSources[0]).toContain("organizations.tenantScope");

		const en = readFileSync("src/lib/i18n/locales/en.json", "utf8");
		const zh = readFileSync("src/lib/i18n/locales/zh.json", "utf8");
		expect(en).toContain('"organizations.tenantScope"');
		expect(zh).toContain('"organizations.tenantScope"');
	});
});
