import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getAdminNavigationForSession, NAV } from "@/components/layout/sidebar";
import type { AdminSession } from "@/lib/cinaauth/types";
import { getImpersonationRedirect } from "@/lib/impersonation-navigation";
import { getMeSelfServiceAccess, ME_SECTIONS } from "@/lib/me";

const adminSession = (impersonatedBy: string | null = null): AdminSession => ({
	userId: "admin-1",
	role: impersonatedBy ? "user" : "super_admin",
	email: "admin@cinaseek.ai",
	impersonatedBy,
});

describe("administrator /me navigation contract", () => {
	it("adds My Account to the protected Admin navigation", () => {
		const items = NAV.flatMap((section) => section.items);
		expect(items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ href: "/me", key: "nav.me" }),
			]),
		);
	});

	it("exposes the six administrator account areas without reusing admin routes", () => {
		expect(ME_SECTIONS.map(({ key, href }) => ({ key, href }))).toEqual([
			{ key: "security", href: "/me/security" },
			{ key: "privacy", href: "/me/privacy" },
			{ key: "organization", href: "/me/organization" },
			{ key: "developer", href: "/me/developer" },
			{ key: "billing", href: "/me/billing" },
		]);
	});

	it("pins every self-service handoff to the canonical Accounts origin", () => {
		for (const section of ME_SECTIONS) {
			const url = new URL(section.accountsHref);
			expect(url.origin).toBe("https://accounts.cinaseek.ai");
			expect(url.pathname.startsWith("/dashboard")).toBe(true);
		}
	});

	it("blocks self-service handoff while impersonating", () => {
		expect(getMeSelfServiceAccess(null)).toBe("unavailable");
		expect(getMeSelfServiceAccess(adminSession())).toBe("allowed");
		expect(getMeSelfServiceAccess({ role: "user", impersonatedBy: null })).toBe(
			"unavailable",
		);
		expect(getMeSelfServiceAccess(adminSession("actor-admin"))).toBe(
			"impersonating",
		);
	});

	it("limits impersonated sessions to My Account navigation", () => {
		const items = getAdminNavigationForSession(
			adminSession("actor-admin"),
		).flatMap((section) => section.items);
		expect(items.map((item) => item.href)).toEqual(["/me"]);
		expect(getAdminNavigationForSession(adminSession())).toBe(NAV);
	});

	it("redirects impersonated sessions away from administrator routes", () => {
		expect(
			getImpersonationRedirect(adminSession("actor-admin"), "/dashboard"),
		).toBe("/me");
		expect(
			getImpersonationRedirect(adminSession("actor-admin"), "/me/security"),
		).toBeNull();
		expect(getImpersonationRedirect(adminSession(), "/dashboard")).toBeNull();
	});

	it("lands on the safe My Account page after starting impersonation", () => {
		const actions = readFileSync(
			new URL(
				"../app/(admin)/users/[id]/user-actions.tsx",
				`file://${__filename}`,
			),
			"utf8",
		);
		expect(actions).toContain('window.location.assign("/me")');
	});

	it("exposes the current page to assistive technology", () => {
		const sidebar = readFileSync(
			new URL("../components/layout/sidebar.tsx", `file://${__filename}`),
			"utf8",
		);
		expect(sidebar).toContain('aria-current={active ? "page" : undefined}');
	});

	it("closes mobile navigation only after the route commits", () => {
		const sidebar = readFileSync(
			new URL("../components/layout/sidebar.tsx", `file://${__filename}`),
			"utf8",
		);
		const shell = readFileSync(
			new URL("../components/layout/admin-shell.tsx", `file://${__filename}`),
			"utf8",
		);

		expect(sidebar).not.toContain("onClick={onNavigate}");
		expect(sidebar).toContain("onActiveNavigate");
		expect(sidebar).toContain("const current = pathname === item.href");
		expect(sidebar).toContain(
			"onClick={current ? onActiveNavigate : undefined}",
		);
		expect(shell).toContain(
			"onActiveNavigate={() => setMobileNavigationOpen(false)}",
		);
		expect(shell).toContain("usePathname");
		expect(shell).toContain("useEffect");
		expect(shell).toContain("[pathname]");
	});
});
