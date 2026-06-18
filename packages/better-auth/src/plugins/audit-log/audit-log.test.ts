import { describe, expect, it } from "vitest";
import { getTestInstance } from "../../test-utils/test-instance";
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
