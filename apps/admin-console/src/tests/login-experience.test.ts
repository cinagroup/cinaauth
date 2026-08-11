import { describe, expect, it } from "vitest";
import { getAdminLoginErrorKey } from "@/lib/login-experience";

describe("Admin login experience", () => {
	it("maps authorization failures to the administrator-specific message", () => {
		expect(getAdminLoginErrorKey("admin_forbidden")).toBe(
			"login.adminForbidden",
		);
	});

	it("keeps protocol failures generic and does not expose internals", () => {
		expect(getAdminLoginErrorKey("invalid_transaction")).toBe(
			"login.oidcUnavailable",
		);
		expect(getAdminLoginErrorKey(null)).toBeNull();
	});
});
