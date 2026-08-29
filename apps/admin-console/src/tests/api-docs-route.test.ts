import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { requireAdmin } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";

vi.mock("@/lib/auth-guard", () => ({
	requireAdmin: vi.fn(),
}));

vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: vi.fn(),
}));

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockFetch = vi.mocked(cinaauthFetch);

describe("Admin OpenAPI BFF", () => {
	it("returns the generated schema with a bounded private cache", async () => {
		mockRequireAdmin.mockResolvedValue({
			userId: "admin-1",
			role: "super_admin",
			email: "admin@cinaseek.ai",
			impersonatedBy: null,
		});
		mockFetch.mockResolvedValue({
			ok: true,
			data: {
				openapi: "3.1.1",
				info: { title: "CinaSeek Identity", version: "1.1.0" },
				paths: {},
			},
		});
		const { GET } = await import("@/app/api/admin/openapi/route");

		const response = await GET(
			new NextRequest("https://admin.test/api/admin/openapi", {
				headers: { cookie: "session=valid" },
			}),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe(
			"private, max-age=300, stale-while-revalidate=60",
		);
		expect(mockFetch).toHaveBeenCalledWith("/open-api/generate-schema", {
			cookie: "session=valid",
		});
	});
});
