import { describe, expect, it } from "vitest";
import { hasPermission } from "./has-permission";
import { defaultRoles } from "./access/statement";
import type { AdminOptions } from "./types";

const opts = { roles: defaultRoles } as unknown as AdminOptions;

describe("security_admin role permissions", () => {
	it("can ban/unban, list/get users, read stats, manage wallets", () => {
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { user: ["ban"] } }),
		).toBe(true);
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { user: ["list"] } }),
		).toBe(true);
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { user: ["get"] } }),
		).toBe(true);
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { stats: ["read"] } }),
		).toBe(true);
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { wallet: ["list"] } }),
		).toBe(true);
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { wallet: ["unbind"] } }),
		).toBe(true);
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { session: ["revoke"] } }),
		).toBe(true);
	});

	it("cannot create/delete users, set role, impersonate, or set password", () => {
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { user: ["create"] } }),
		).toBe(false);
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { user: ["delete"] } }),
		).toBe(false);
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { user: ["set-role"] } }),
		).toBe(false);
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { user: ["impersonate"] } }),
		).toBe(false);
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { user: ["set-password"] } }),
		).toBe(false);
		expect(
			hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { user: ["update"] } }),
		).toBe(false);
	});

	it("admin role still has full permissions (regression guard)", () => {
		expect(
			hasPermission({ userId: "x", role: "admin", options: opts, permissions: { user: ["create"] } }),
		).toBe(true);
		expect(
			hasPermission({ userId: "x", role: "admin", options: opts, permissions: { user: ["delete"] } }),
		).toBe(true);
	});
});
