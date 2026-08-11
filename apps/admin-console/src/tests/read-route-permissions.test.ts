import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Admin read route permission contracts", () => {
	it("uses the centralized permission registry and safe upstream status mapping", () => {
		for (const path of [
			"src/app/api/admin/stats/overview/route.ts",
			"src/app/api/admin/stats/signups/route.ts",
			"src/app/api/admin/stats/security-today/route.ts",
			"src/app/api/admin/audit/route.ts",
			"src/app/api/admin/audit/alerts/route.ts",
			"src/app/api/admin/users/[id]/device-sessions/route.ts",
		]) {
			const source = readFileSync(path, "utf8");
			expect(source, path).toContain("requireAdminControlPermission");
			expect(source, path).toContain("adminUpstreamResponseStatus");
			expect(source, path).not.toContain("hasAdminRole");
		}
	});

	it("preserves authentication-boundary statuses on remaining list and recovery routes", () => {
		for (const path of [
			"src/app/api/admin/users/route.ts",
			"src/app/api/admin/users/[id]/sessions/route.ts",
			"src/app/api/admin/users/impersonate/stop/route.ts",
		]) {
			const source = readFileSync(path, "utf8");
			expect(source, path).toContain("adminUpstreamResponseStatus");
			expect(source, path).not.toContain("res.ok ? 200 : 502");
		}
	});
});
