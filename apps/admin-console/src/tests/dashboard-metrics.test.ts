import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	buildLoginActivityPath,
	sumTrailingSignupWindow,
} from "@/lib/dashboard-metrics";

describe("dashboard metrics", () => {
	it("compares two exact seven-day signup windows", () => {
		const series = Array.from({ length: 14 }, (_, index) => ({
			date: `2026-08-${String(index + 1).padStart(2, "0")}`,
			count: index + 1,
		}));

		expect(sumTrailingSignupWindow(series, 7)).toBe(77);
		expect(sumTrailingSignupWindow(series, 7, 7)).toBe(28);
	});

	it("requests login activity only for the displayed UTC window", () => {
		const path = buildLoginActivityPath(
			14,
			new Date("2026-08-29T18:30:00.000Z"),
		);
		const url = new URL(path, "https://admin.test");

		expect(url.pathname).toBe("/api/admin/audit");
		expect(url.searchParams.get("action")).toBe("user.login");
		expect(url.searchParams.get("result")).toBe("success");
		expect(url.searchParams.get("start")).toBe("2026-08-16T00:00:00.000Z");
		expect(url.searchParams.get("limit")).toBe("1000");
	});

	it("provides a screen-reader summary for every dashboard chart", () => {
		for (const chart of [
			"signup-line.tsx",
			"active-users-chart.tsx",
			"cohort-bars.tsx",
			"channel-pie.tsx",
		]) {
			const source = readFileSync(
				new URL(`../components/charts/${chart}`, `file://${__filename}`),
				"utf8",
			);
			expect(source).toContain("<AccessibleChart");
		}
	});
});
