import { describe, expect, it } from "vitest";
import { ADMIN_PERMISSION_STATEMENT, ADMIN_ROLE_PERMISSIONS } from "./admin";

describe("Admin wallet permissions", () => {
	it("grants wallet inspection and unbinding to both Admin roles", () => {
		expect(ADMIN_PERMISSION_STATEMENT.wallet).toEqual(["list", "unbind"]);
		expect(ADMIN_ROLE_PERMISSIONS.super_admin.wallet).toEqual([
			"list",
			"unbind",
		]);
		expect(ADMIN_ROLE_PERMISSIONS.security_admin.wallet).toEqual([
			"list",
			"unbind",
		]);
		expect(ADMIN_ROLE_PERMISSIONS.user.wallet).toEqual([]);
	});
});
