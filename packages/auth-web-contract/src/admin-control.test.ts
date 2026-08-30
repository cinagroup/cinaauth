import { describe, expect, it } from "vitest";
import {
	ADMIN_CONTROL_PERMISSIONS,
	hasAdminControlPermission,
} from "./admin-control";

describe("Agent Auth admin control permissions", () => {
	it("keeps Agent Auth inspection and mutation permissions distinct", () => {
		expect(ADMIN_CONTROL_PERMISSIONS).toContain("integration.agent-auth.read");
		expect(ADMIN_CONTROL_PERMISSIONS).toContain(
			"integration.agent-auth.manage",
		);
		expect(
			hasAdminControlPermission(
				"security_admin",
				"integration.agent-auth.read",
			),
		).toBe(true);
		expect(
			hasAdminControlPermission(
				"security_admin",
				"integration.agent-auth.manage",
			),
		).toBe(false);
		expect(
			hasAdminControlPermission("super_admin", "integration.agent-auth.manage"),
		).toBe(true);
	});
});
