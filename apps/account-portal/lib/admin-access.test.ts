import { describe, expect, it } from "vitest";
import { getAdminAccess } from "./admin-access";

describe("production admin access", () => {
	it("grants security admins only incident-response actions", () => {
		const access = getAdminAccess("security_admin");

		expect(access.canView).toBe(true);
		expect(access.canBan).toBe(true);
		expect(access.canRevokeSessions).toBe(true);
		expect(access.canCreateUser).toBe(false);
		expect(access.canDeleteUser).toBe(false);
		expect(access.canImpersonate).toBe(false);
	});

	it("grants super admins the full production management surface", () => {
		expect(getAdminAccess("super_admin")).toEqual({
			canView: true,
			canBan: true,
			canRevokeSessions: true,
			canCreateUser: true,
			canDeleteUser: true,
			canImpersonate: true,
		});
	});

	it("rejects demo-only or ordinary roles", () => {
		expect(getAdminAccess("admin").canView).toBe(false);
		expect(getAdminAccess("user").canView).toBe(false);
		expect(getAdminAccess(undefined).canView).toBe(false);
	});
});
