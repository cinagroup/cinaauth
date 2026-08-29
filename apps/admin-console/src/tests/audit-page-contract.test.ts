import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	buildAuditExportPath,
	buildAuditListPath,
	resolveAuditFilters,
} from "@/lib/audit-query";

describe("audit page contract", () => {
	it("uses the same server filters for the table and CSV export", () => {
		const filters = resolveAuditFilters(
			{ category: "wallet", result: "failure", dateRange: "7" },
			new Date("2026-08-29T12:00:00.000Z"),
		);
		const list = new URL(
			buildAuditListPath(filters, 100, 100),
			"https://admin.test",
		);
		const exported = new URL(
			buildAuditExportPath(filters),
			"https://admin.test",
		);

		expect(list.searchParams.get("offset")).toBe("100");
		expect(list.searchParams.get("limit")).toBe("100");
		expect(exported.searchParams.get("kind")).toBe("audit");
		for (const key of ["category", "result", "start"]) {
			expect(exported.searchParams.get(key)).toBe(list.searchParams.get(key));
		}
		expect(exported.searchParams.has("offset")).toBe(false);
	});

	it("renders the audit total with server pagination", () => {
		const page = readFileSync(
			new URL("../app/(admin)/audit/page.tsx", `file://${__filename}`),
			"utf8",
		);
		expect(page).toContain("keepPreviousData");
		expect(page).toContain("<Pagination");
		expect(page).toContain("data?.total");
		expect(page).toContain("setOffset(0)");
	});
});
