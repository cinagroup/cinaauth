import { describe, expect, it } from "vitest";
import type { CinaAuthDatabase } from "../src/database";
import {
	getEntitlementCapacityLockKey,
	withEntitlementCapacityLock,
} from "../src/entitlement-lock";

const createDatabaseDouble = () => {
	const events: string[] = [];
	const client = {
		query: async (text: string) => {
			events.push(text);
			return { rows: [] };
		},
		release: () => events.push("RELEASE"),
	};
	const database = {
		connect: async () => client,
	} as unknown as CinaAuthDatabase;
	return { database, events };
};

describe("entitlement capacity lock", () => {
	it("uses the same organization-member key across every provisioning path", () => {
		expect(
			getEntitlementCapacityLockKey({
				subjectType: "organization",
				subjectId: "organization-1",
				limit: "organizationMembers",
			}),
		).toBe(
			getEntitlementCapacityLockKey({
				subjectType: "organization",
				subjectId: "organization-1",
				limit: "organizationMembers",
				usageReferenceId: "organization-1",
			}),
		);
	});

	it("holds a transaction advisory lock through the mutation", async () => {
		const { database, events } = createDatabaseDouble();
		await expect(
			withEntitlementCapacityLock(database, "organization:1", async () => {
				events.push("MUTATION");
				return "ok";
			}),
		).resolves.toBe("ok");
		expect(events).toEqual([
			"BEGIN",
			"SET LOCAL statement_timeout = '10000ms'",
			"SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
			"MUTATION",
			"COMMIT",
			"RELEASE",
		]);
	});

	it("rolls back and releases the connection when the mutation fails", async () => {
		const { database, events } = createDatabaseDouble();
		await expect(
			withEntitlementCapacityLock(database, "organization:1", async () => {
				throw new Error("failed mutation");
			}),
		).rejects.toThrow("failed mutation");
		expect(events.slice(-2)).toEqual(["ROLLBACK", "RELEASE"]);
	});
});
