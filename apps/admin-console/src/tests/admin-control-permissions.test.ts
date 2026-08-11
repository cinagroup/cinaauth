import {
	ADMIN_CONTROL_PERMISSIONS,
	hasAdminControlPermission,
} from "@cinaauth/auth-web-contract";
import { describe, expect, it } from "vitest";

describe("admin control permission registry", () => {
	it("keeps the permission catalog duplicate-free", () => {
		expect(new Set(ADMIN_CONTROL_PERMISSIONS).size).toBe(
			ADMIN_CONTROL_PERMISSIONS.length,
		);
	});

	it("grants super administrators every registered permission", () => {
		for (const permission of ADMIN_CONTROL_PERMISSIONS) {
			expect(hasAdminControlPermission("super_admin", permission)).toBe(true);
		}
	});

	it("matches the Admin plugin's comma-separated role semantics", () => {
		expect(
			hasAdminControlPermission(
				"user,super_admin",
				"security.policy.publish",
			),
		).toBe(true);
		expect(
			hasAdminControlPermission(
				"user,security_admin",
				"identity.session.revoke",
			),
		).toBe(true);
	});

	it("limits security administrators to operational security actions", () => {
		expect(
			hasAdminControlPermission("security_admin", "identity.user.ban"),
		).toBe(true);
		expect(
			hasAdminControlPermission(
				"security_admin",
				"identity.user.send-verification",
			),
		).toBe(true);
		expect(
			hasAdminControlPermission("security_admin", "identity.session.revoke"),
		).toBe(true);
		expect(
			hasAdminControlPermission("security_admin", "security.audit.read"),
		).toBe(true);
		expect(
			hasAdminControlPermission("security_admin", "identity.user.set-role"),
		).toBe(false);
		expect(
			hasAdminControlPermission("security_admin", "security.policy.publish"),
		).toBe(false);
	});

	it("denies unrecognized and missing roles by default", () => {
		expect(hasAdminControlPermission("user", "dashboard.read")).toBe(false);
		expect(hasAdminControlPermission("admin", "dashboard.read")).toBe(false);
		expect(hasAdminControlPermission(null, "dashboard.read")).toBe(false);
	});
});
