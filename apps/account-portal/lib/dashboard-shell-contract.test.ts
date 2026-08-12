import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	DASHBOARD_NAVIGATION,
	isDashboardNavigationActive,
	isDashboardPath,
} from "./dashboard-navigation";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("CinaSeek Accounts dashboard shell contract", () => {
	it("isolates dashboard routes from the public marketing chrome", () => {
		const rootLayoutSource = readSource("../app/layout.tsx");
		const siteChromeSource = readSource("../components/site-chrome.tsx");
		const dashboardLayoutSource = readSource("../app/dashboard/layout.tsx");

		expect(rootLayoutSource).toContain("<SiteChrome>{children}</SiteChrome>");
		expect(rootLayoutSource).not.toContain("<Header />");
		expect(rootLayoutSource).not.toContain("<Footer />");
		expect(siteChromeSource).toContain("isDashboardPath(pathname)");
		expect(siteChromeSource).toContain("<Header />");
		expect(siteChromeSource).toContain("<Footer />");
		expect(dashboardLayoutSource).toContain("<DashboardShell>");
	});

	it("provides one responsive dashboard landmark and navigation surface", () => {
		const shellSource = readSource(
			"../components/dashboard/dashboard-shell.tsx",
		);
		const sidebarSource = readSource(
			"../components/dashboard/dashboard-sidebar.tsx",
		);
		const topbarSource = readSource(
			"../components/dashboard/dashboard-topbar.tsx",
		);

		expect(shellSource.match(/<main\b/g) ?? []).toHaveLength(1);
		expect(shellSource).toContain('id="main"');
		expect(shellSource).toContain("mobileNavigationOpen");
		expect(shellSource).toContain("sidebarCollapsed");
		expect(shellSource).toContain("usePathname");
		expect(shellSource).toContain("useEffect");
		expect(shellSource).toContain("[pathname]");
		expect(sidebarSource).toContain("usePathname");
		expect(sidebarSource).not.toContain("onClick={onNavigate}");
		expect(sidebarSource).toContain("onActiveNavigate");
		expect(sidebarSource).toContain("const current = pathname === item.href");
		expect(sidebarSource).toContain(
			"onClick={current ? onActiveNavigate : undefined}",
		);
		expect(shellSource).toContain(
			"onActiveNavigate={() => setMobileNavigationOpen(false)}",
		);
		expect(topbarSource).toContain("ThemeToggle");
		expect(topbarSource).toContain('aria-label="Open navigation"');
	});

	it("keeps every existing dashboard destination in the shared navigation", () => {
		expect(DASHBOARD_NAVIGATION.map((item) => item.href)).toEqual([
			"/dashboard",
			"/dashboard/security",
			"/dashboard/privacy",
			"/dashboard/organization",
			"/dashboard/developer",
		]);
	});

	it("uses one Admin-style page header across every dashboard destination", () => {
		const pageSources = [
			"../app/dashboard/page.tsx",
			"../app/dashboard/security/security-center.tsx",
			"../app/dashboard/privacy/privacy-center.tsx",
			"../app/dashboard/organization/organization-console.tsx",
			"../app/dashboard/developer/developer-console.tsx",
		].map(readSource);

		for (const source of pageSources) {
			expect(source).toContain("<DashboardPageHeader");
			expect(source.match(/<main\b/g) ?? []).toHaveLength(0);
		}
	});

	it("does not keep Overview active on nested dashboard routes", () => {
		expect(isDashboardNavigationActive("/dashboard", "/dashboard")).toBe(true);
		expect(
			isDashboardNavigationActive("/dashboard/security", "/dashboard"),
		).toBe(false);
		expect(
			isDashboardNavigationActive(
				"/dashboard/security/passkeys",
				"/dashboard/security",
			),
		).toBe(true);
	});

	it("does not classify dashboard-like public paths as dashboard chrome", () => {
		expect(isDashboardPath("/dashboard")).toBe(true);
		expect(isDashboardPath("/dashboard/security")).toBe(true);
		expect(isDashboardPath("/dashboard-old")).toBe(false);
		expect(isDashboardPath("/dashboard-preview")).toBe(false);
	});
});
