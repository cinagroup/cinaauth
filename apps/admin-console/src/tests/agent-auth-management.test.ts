import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
	...SUPER_ADMIN,
	userId: "security-1",
	role: "security_admin",
};

const request = (path: string, method: "GET" | "POST" = "GET") =>
	new NextRequest(new URL(`https://admin.cinaseek.ai${path}`), {
		method,
		headers: { cookie: "session=valid" },
	});

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
	vi.clearAllMocks();
	mocks.session.mockResolvedValue(SUPER_ADMIN);
	mocks.recentAuth.mockResolvedValue(undefined);
	mocks.fetch.mockResolvedValue({
		ok: true,
		data: {
			policy: {
				enabled: true,
				providerName: "CinaSeek Identity",
				modes: ["delegated"],
				approvalMethods: ["device_authorization"],
				capabilities: [],
			},
			summary: {
				agentCount: 0,
				activeAgentCount: 0,
				hostCount: 0,
				activeHostCount: 0,
				grantCount: 0,
				pendingApprovalCount: 0,
			},
			agents: [],
			hosts: [],
			grants: [],
			approvals: [],
			limit: 100,
		},
	});
});

describe("Agent Auth Admin BFF", () => {
	it("allows security administrators to inspect the redacted inventory", async () => {
		mocks.session.mockResolvedValue(SECURITY_ADMIN);
		const { GET } = await import("@/app/api/admin/agent-auth/route");
		const response = await GET(request("/api/admin/agent-auth"));

		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(mocks.fetch).toHaveBeenCalledWith("/admin/agent-auth?limit=100", {
			cookie: "session=valid",
		});
	});

	it("allows only a fresh super administrator to revoke an agent", async () => {
		const { POST } = await import(
			"@/app/api/admin/agent-auth/agents/[id]/revoke/route"
		);
		mocks.session.mockResolvedValue(SECURITY_ADMIN);
		expect(
			(
				await POST(
					request("/api/admin/agent-auth/agents/agent-1/revoke", "POST"),
					params("agent-1"),
				)
			).status,
		).toBe(403);
		expect(mocks.fetch).not.toHaveBeenCalled();

		mocks.session.mockResolvedValue(SUPER_ADMIN);
		mocks.recentAuth.mockRejectedValueOnce(
			new Response("stale", { status: 403 }),
		);
		expect(
			(
				await POST(
					request("/api/admin/agent-auth/agents/agent-1/revoke", "POST"),
					params("agent-1"),
				)
			).status,
		).toBe(403);
		expect(mocks.fetch).not.toHaveBeenCalled();

		const accepted = await POST(
			request("/api/admin/agent-auth/agents/agent-1/revoke", "POST"),
			params("agent-1"),
		);
		expect(accepted.status).toBe(200);
		expect(mocks.fetch).toHaveBeenCalledWith(
			"/admin/agent-auth/agents/agent-1/revoke",
			expect.objectContaining({ method: "POST", cookie: "session=valid" }),
		);
	});

	it("rejects malformed resource identifiers before forwarding", async () => {
		const { POST } = await import(
			"@/app/api/admin/agent-auth/hosts/[id]/revoke/route"
		);
		const response = await POST(
			request("/api/admin/agent-auth/hosts/bad/revoke", "POST"),
			params("../../host-1"),
		);
		expect(response.status).toBe(400);
		expect(mocks.fetch).not.toHaveBeenCalled();
	});
});

describe("Agent Auth management page contract", () => {
	it("provides a dedicated bilingual, governed management destination", () => {
		const page = readFileSync(
			resolve("src/app/(admin)/settings/agent-auth/page.tsx"),
			"utf8",
		);
		const sidebar = readFileSync(
			resolve("src/components/layout/sidebar.tsx"),
			"utf8",
		);
		const english = readFileSync(
			resolve("src/lib/i18n/locales/en.json"),
			"utf8",
		);
		const chinese = readFileSync(
			resolve("src/lib/i18n/locales/zh.json"),
			"utf8",
		);

		expect(sidebar).toContain("/settings/agent-auth");
		expect(sidebar).toContain("nav.agentAuth");
		expect(page).toContain('"integration.agent-auth.manage"');
		expect(page).toContain("ConfirmDialog");
		expect(page).toContain('value="agents"');
		expect(page).toContain('value="hosts"');
		expect(page).toContain('value="grants"');
		expect(page).toContain('value="approvals"');
		expect(page).toContain("/api/admin/agent-auth");
		expect(page).not.toContain("publicKey");
		for (const locale of [english, chinese]) {
			expect(locale).toContain('"agentAuth.title"');
			expect(locale).toContain('"agentAuth.revokeAgent"');
			expect(locale).toContain('"agentAuth.denyApproval"');
		}
	});
});
