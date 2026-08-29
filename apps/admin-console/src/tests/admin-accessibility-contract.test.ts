import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
	readFileSync(new URL(`../${relativePath}`, `file://${__filename}`), "utf8");

describe("administrator accessibility contract", () => {
	it("names global navigation controls without relying on visible initials", () => {
		const topbar = source("components/layout/topbar.tsx");
		const commandMenu = source("components/layout/command-menu.tsx");

		expect(topbar).toContain('aria-label={t("language.select")}');
		expect(topbar).toContain('aria-label={t("nav.accountMenu")}');
		expect(commandMenu).toContain('aria-label={t("command.placeholder")}');
	});

	it("names every audit-log filter", () => {
		const audit = source("app/(admin)/audit/page.tsx");
		for (const key of [
			"audit.filter.category",
			"audit.filter.result",
			"audit.filter.date",
			"audit.filter.search",
		]) {
			expect(audit).toContain(`aria-label={t("${key}")}`);
		}
	});

	it("names role and confirmation fields in user and organization workflows", () => {
		expect(source("app/(admin)/users/new/page.tsx")).toContain(
			'<Label htmlFor="new-user-role">',
		);
		expect(source("app/(admin)/users/[id]/tabs/overview.tsx")).toContain(
			'<Label htmlFor="user-role">',
		);
		const banDialog = source("app/(admin)/users/[id]/ban-dialog.tsx");
		expect(banDialog).toContain('aria-label={t("userDetail.ban.duration")}');
		expect(banDialog).toContain('aria-label={t("userDetail.ban.reason")}');

		const inviteDialog = source(
			"app/(admin)/organizations/[id]/invite-dialog.tsx",
		);
		expect(inviteDialog).toContain('aria-label={t("users.col.email")}');
		expect(inviteDialog).toContain('aria-label={t("users.col.role")}');
		expect(source("app/(admin)/organizations/[id]/page.tsx")).toContain(
			'aria-label={t("organizations.memberRoleFor",',
		);
	});
});
