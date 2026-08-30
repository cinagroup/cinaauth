import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dashboardMessages } from "./dashboard-i18n";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("Accounts dashboard localization contract", () => {
	it("keeps the dashboard dictionary complete in Chinese and English", () => {
		expect(Object.keys(dashboardMessages.en).sort()).toEqual(
			Object.keys(dashboardMessages["zh-CN"]).sort(),
		);
		expect(dashboardMessages["zh-CN"].navigationLabel).toBe("账户中心导航");
		expect(dashboardMessages.en.navigationLabel).toBe("Account dashboard");
		expect(dashboardMessages.en.exportStatusExpired).toBe("Expired");
		expect(dashboardMessages["zh-CN"].exportStatusExpired).toBe("已过期");
		expect(dashboardMessages.en.resendCode).toBe("Resend code");
		expect(dashboardMessages["zh-CN"].resendCode).toBe("重新发送验证码");
	});

	it("localizes the shared dashboard shell and exposes a language switcher", () => {
		const sidebar = readSource("../components/dashboard/dashboard-sidebar.tsx");
		const topbar = readSource("../components/dashboard/dashboard-topbar.tsx");
		const shell = readSource("../components/dashboard/dashboard-shell.tsx");
		const navigation = readSource("./dashboard-navigation.ts");

		for (const source of [sidebar, topbar, shell]) {
			expect(source).toContain("useDashboardI18n");
		}
		expect(topbar).toContain("<LanguageSwitcher");
		expect(navigation).toContain("labelKey:");
		expect(navigation).not.toMatch(/label:\s*"/);
	});

	it("localizes every dashboard page heading", () => {
		const sources = [
			"../app/dashboard/page.tsx",
			"../app/dashboard/security/security-center.tsx",
			"../app/dashboard/privacy/privacy-center.tsx",
			"../app/dashboard/organization/organization-console.tsx",
			"../app/dashboard/developer/developer-console.tsx",
		].map(readSource);

		for (const source of sources) {
			expect(source).not.toMatch(/<DashboardPageHeader\s+title="/);
		}
	});

	it("localizes every account overview card and the account switcher", () => {
		const sources = [
			"../components/account-switch.tsx",
			"../app/dashboard/_components/user-card.tsx",
			"../app/dashboard/_components/wallet-overview-card.tsx",
			"../app/dashboard/_components/organization-card.tsx",
			"../app/dashboard/_components/subscription-card.tsx",
		].map(readSource);

		for (const source of sources) {
			expect(source).toContain("useDashboardI18n");
		}
		expect(sources.join("\n")).not.toMatch(
			/>Organization<|>Subscription<|>Sign Out<|>No wallet linked</,
		);
	});

	it("localizes every dashboard interaction surface", () => {
		const sources = [
			"../app/dashboard/security/security-center.tsx",
			"../app/dashboard/privacy/privacy-center.tsx",
			"../app/dashboard/organization/organization-console.tsx",
			"../app/dashboard/organization/advanced-organization-card.tsx",
			"../app/dashboard/organization/enterprise-connections-card.tsx",
			"../app/dashboard/organization/organization-audit-card.tsx",
			"../app/dashboard/organization/sso-provider-manager.tsx",
			"../app/dashboard/developer/developer-console.tsx",
			"../components/forms/email-verification-otp-form.tsx",
			"../components/forms/two-factor-disable-form.tsx",
			"../components/forms/two-factor-enable-form.tsx",
			"../components/forms/two-factor-qr-form.tsx",
			"../components/forms/update-user-form.tsx",
			"../components/forms/create-organization-form.tsx",
			"../components/forms/invite-member-form.tsx",
		].map(readSource);

		for (const source of sources) {
			expect(source).toContain("useDashboardI18n");
		}
		expect(sources.join("\n")).not.toMatch(
			/>Recent authentication required<|>Create OAuth client<|>Enterprise connections<|>Organization activity<|>Delete account</,
		);
	});

	it("localizes dashboard metadata from the same persisted request locale", () => {
		const pageSources = [
			"../app/dashboard/page.tsx",
			"../app/dashboard/security/page.tsx",
			"../app/dashboard/privacy/page.tsx",
			"../app/dashboard/organization/page.tsx",
			"../app/dashboard/developer/page.tsx",
		].map(readSource);

		for (const source of pageSources) {
			expect(source).toContain("getRequestLocale");
			expect(source).toContain("dashboardMessages");
			expect(source).not.toMatch(/export const metadata/);
		}
	});
});
