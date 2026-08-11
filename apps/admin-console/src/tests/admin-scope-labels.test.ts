import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Admin scope labels", () => {
	it("does not present the current administrator's sessions as a global inventory", () => {
		const page = readFileSync("src/app/(admin)/sessions/page.tsx", "utf8");
		const route = readFileSync("src/app/api/admin/sessions/route.ts", "utf8");
		const en = readFileSync("src/lib/i18n/locales/en.json", "utf8");
		const zh = readFileSync("src/lib/i18n/locales/zh.json", "utf8");

		expect(page).toContain("sessions.currentAdminScope");
		expect(page).toContain('["sessions", "current-admin"]');
		expect(route).toContain("/list-sessions");
		expect(route).toContain("adminUpstreamResponseStatus");
		expect(en).toContain('"sessions.currentAdminScope"');
		expect(zh).toContain('"sessions.currentAdminScope"');
	});
});
