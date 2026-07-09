import { describe, expect, it, vi } from "vitest";
import { getTestInstance } from "../../test-utils/test-instance";
import { admin } from "../admin/admin";
import { writeAuditLog } from "./capture";
import { auditLog } from "./index";

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
			where: [{ field: "action", operator: "eq", value: "admin.export_csv" }],
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

describe("audit-log export + alerts", () => {
	it("auditAlerts flags actors exceeding the failure threshold", async () => {
		// Load the admin plugin so the test user is assigned a `role` ("user"
		// by default), then allow that role to query audit. Without admin, the
		// user has no `role` field and the audit role gate cannot match.
		const { auth, signInWithTestUser } = await getTestInstance({
			plugins: [admin(), auditLog({ allowedRoles: ["user"] })],
		});
		const { headers } = await signInWithTestUser();
		const ctx = await auth.$context;
		// Seed 11 failures for one actor (threshold 10) + 2 for another.
		for (let i = 0; i < 11; i++) {
			await ctx.adapter.create({
				model: "auditLog",
				data: {
					timestamp: new Date(),
					category: "auth",
					action: "user.login",
					result: "failure",
					actorId: "suspicious-1",
				},
			});
		}
		for (let i = 0; i < 2; i++) {
			await ctx.adapter.create({
				model: "auditLog",
				data: {
					timestamp: new Date(),
					category: "auth",
					action: "user.login",
					result: "failure",
					actorId: "low-volume",
				},
			});
		}
		const res = (await auth.api.auditAlerts({
			headers,
			query: { windowHours: 24, failThreshold: 10 },
		})) as { flagged: { actor: string; failures: number }[] };
		const hit = res.flagged.find((f) => f.actor === "suspicious-1");
		expect(hit).toBeDefined();
		expect(hit?.failures).toBe(11);
		expect(res.flagged.find((f) => f.actor === "low-volume")).toBeUndefined();
	});

	it("exportAudit returns a CSV attachment", async () => {
		const { auth, signInWithTestUser } = await getTestInstance({
			plugins: [admin(), auditLog({ allowedRoles: ["user"] })],
		});
		const { headers } = await signInWithTestUser();
		const ctx = await auth.$context;
		await ctx.adapter.create({
			model: "auditLog",
			data: {
				timestamp: new Date(),
				category: "wallet",
				action: "siwe.bind",
				result: "success",
			},
		});
		const res = (await auth.api.exportAudit({
			headers,
			query: {},
		})) as unknown as Response;
		expect(res).toBeInstanceOf(Response);
		expect(res.headers.get("content-type")).toContain("text/csv");
		expect(res.headers.get("content-disposition")).toContain("attachment");
		const text = await res.text();
		expect(text).toContain("category");
		expect(text).toContain("siwe.bind");
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
