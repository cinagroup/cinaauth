import { describe, expect, it } from "vitest";
import { getAdminPageAccess } from "@/lib/auth-guard";
import type { AdminSession } from "@/lib/cinaauth/types";

const session = (
	role: string,
	impersonatedBy: string | null = null,
): AdminSession => ({
	userId: "user-1",
	role,
	email: "user@example.com",
	impersonatedBy,
});

describe("getAdminPageAccess", () => {
	it("sends missing sessions to sign in", () => {
		expect(getAdminPageAccess(null)).toBe("sign-in");
	});

	it("allows configured administrator roles", () => {
		expect(getAdminPageAccess(session("super_admin"))).toBe("allow");
		expect(getAdminPageAccess(session("security_admin"))).toBe("allow");
	});

	it("rejects ordinary authenticated users", () => {
		expect(getAdminPageAccess(session("user"))).toBe("forbidden");
	});

	it("keeps an impersonated session in the shell so it can be stopped", () => {
		expect(getAdminPageAccess(session("user", "admin-1"))).toBe("allow");
	});
});
