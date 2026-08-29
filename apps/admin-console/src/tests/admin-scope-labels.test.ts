import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Admin scope labels", () => {
	it("presents the session page as the platform inventory it now queries", () => {
		const page = readFileSync("src/app/(admin)/sessions/page.tsx", "utf8");
		const route = readFileSync("src/app/api/admin/sessions/route.ts", "utf8");
		const en = readFileSync("src/lib/i18n/locales/en.json", "utf8");
		const zh = readFileSync("src/lib/i18n/locales/zh.json", "utf8");

		expect(page).toContain("sessions.platformScope");
		expect(page).toContain('["sessions", "platform"');
		expect(route).toContain("/admin/list-all-sessions");
		expect(route).toContain("adminUpstreamResponseStatus");
		expect(en).toContain('"sessions.platformScope"');
		expect(zh).toContain('"sessions.platformScope"');
	});
});
