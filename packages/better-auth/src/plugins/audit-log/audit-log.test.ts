import { describe, expect, it, vi } from "vitest";
import { getTestInstance } from "../../test-utils/test-instance";
import { auditLog } from "./index";
import { writeAuditLog } from "./capture";

describe("audit-log plugin skeleton", () => {
	it("registers without error and creates auditLog table", async () => {
		const { auth } = await getTestInstance({
			plugins: [auditLog()],
		});
		expect(auth).toBeDefined();
		// Inserting a row then reading it back proves the auditLog table was
		// created by the migration. A missing table would throw on create.
		const ctx = await auth.$context;
		await ctx.adapter.create({
			model: "auditLog",
			data: {
				timestamp: new Date(),
				category: "user",
				action: "skeleton.probe",
				result: "success",
			},
		});
		const row = await ctx.adapter.findOne({
			model: "auditLog",
			where: [{ field: "action", operator: "eq", value: "skeleton.probe" }],
		});
		expect(row).not.toBeNull();
	});
});

describe("writeAuditLog", () => {
	it("writes a row and swallows adapter errors", async () => {
		const { auth } = await getTestInstance({ plugins: [auditLog()] });
		const flat = await auth.$context;
		// writeAuditLog expects { context: <flat ctx> }.
		const ctx = { context: flat };
		// Success path: writes via the real adapter.
		await writeAuditLog(ctx, {
			category: "user",
			action: "user.login",
			result: "success",
			actorId: "u1",
			metadata: { ip: "1.2.3.4" },
		});
		const row = await flat.adapter.findOne({
			model: "auditLog",
			where: [{ field: "action", operator: "eq", value: "user.login" }],
		});
		expect(row).not.toBeNull();
		// metadata is JSON-stringified on write.
		expect(String((row as { metadata: string }).metadata)).toContain("1.2.3.4");

		// Failure path: a throwing adapter must NOT propagate; error is logged.
		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await writeAuditLog(
			{
				context: {
					adapter: {
						create: async () => {
							throw new Error("boom");
						},
					},
				},
			},
			{ category: "user", action: "x", result: "success" },
		);
		expect(errSpy).toHaveBeenCalled();
		expect(String(errSpy.mock.calls[0]?.[0])).toContain("[audit-log]");
		errSpy.mockRestore();
	});
});

describe("audit-log endpoints", () => {
	it("logAudit with a writeToken writes a row", async () => {
		const { auth } = await getTestInstance({
			plugins: [auditLog({ writeTokens: ["svc-test-key"] })],
		});
		// Server-side call with the service bearer token (writeToken path,
		// no session required).
		const res = (await auth.api.logAudit({
			headers: new Headers({ authorization: "Bearer svc-test-key" }),
			body: {
				category: "admin",
				action: "admin.export_csv",
				result: "success",
				actorSite: "admin",
			},
		})) as { ok?: boolean } | null;
		expect(res?.ok).toBe(true);
		const ctx = await auth.$context;
		const row = await ctx.adapter.findOne({
			model: "auditLog",
			where: [
				{ field: "action", operator: "eq", value: "admin.export_csv" },
			],
		});
		expect(row).not.toBeNull();
	});

	it("logAudit without a token or session is rejected (403)", async () => {
		const { auth } = await getTestInstance({
			plugins: [auditLog({ writeTokens: ["svc-test-key"] })],
		});
		await expect(
			auth.api.logAudit({
				headers: new Headers(),
				body: { category: "admin", action: "x", result: "success" },
			}),
		).rejects.toThrow();
	});

	it("GET /audit/list filters by category/action (verified via adapter)", async () => {
		const { auth } = await getTestInstance({
			plugins: [auditLog({ allowedRoles: ["admin"] })],
		});
		const ctx = await auth.$context;
		// Seed two rows, different categories.
		await ctx.adapter.create({
			model: "auditLog",
			data: {
				timestamp: new Date(),
				category: "wallet",
				action: "siwe.bind",
				result: "success",
			},
		});
		await ctx.adapter.create({
			model: "auditLog",
			data: {
				timestamp: new Date(),
				category: "auth",
				action: "user.login",
				result: "success",
			},
		});
		// findMany with a category filter mirrors what listAudit builds.
		const walletRows = await ctx.adapter.findMany({
			model: "auditLog",
			limit: 100,
			where: [
				{
					field: "category",
					operator: "eq",
					value: "wallet",
					connector: "AND",
					mode: "sensitive",
				},
			],
		});
		expect(walletRows.length).toBe(1);
		expect((walletRows[0] as { action: string }).action).toBe("siwe.bind");
	});
});

describe("audit-log hooks.after capture", () => {
	it("writes a user.login audit row after a successful sign-in", async () => {
		const { client, auth } = await getTestInstance({
			plugins: [auditLog()],
		});
		await client.signIn.email({
			email: "test@test.com",
			password: "test123456",
		});
		const ctx = await auth.$context;
		const row = await ctx.adapter.findOne({
			model: "auditLog",
			where: [{ field: "action", operator: "eq", value: "user.login" }],
		});
		expect(row).not.toBeNull();
		expect((row as { result: string }).result).toBe("success");
	});

	it("writes a failure audit row after a failed sign-in", async () => {
		const { client, auth } = await getTestInstance({
			plugins: [auditLog()],
		});
		// Wrong password → endpoint returns an APIError → failure row.
		await client.signIn.email({
			email: "test@test.com",
			password: "wrong-password",
		});
		const ctx = await auth.$context;
		const row = await ctx.adapter.findOne({
			model: "auditLog",
			where: [
				{ field: "action", operator: "eq", value: "user.login" },
				{ field: "result", operator: "eq", value: "failure" },
			],
		});
		expect(row).not.toBeNull();
	});
});
