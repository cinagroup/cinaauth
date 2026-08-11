import { describe, expect, it, vi } from "vitest";
import type { CinaAuthDatabase } from "../src/database";
import type { DatabaseInvariantDefinition } from "../src/database-invariants";
import {
	DATABASE_INVARIANT_IDS,
	getDatabaseInvariantReadiness,
	installDatabaseInvariants,
} from "../src/database-invariants";
import { PROVIDER_NAMESPACE_INVARIANT_ID } from "../src/provider-namespace-invariant";
import { SUPER_ADMIN_DATABASE_INVARIANT_ID } from "../src/super-admin-database-invariant";

const firstInvariant = {
	id: "first",
	install: async (client) => {
		await client.query("INSTALL FIRST A");
		await client.query("INSTALL FIRST B");
	},
	getReadiness: async (database) => {
		const result = await database.query<{ ready: boolean }>("CHECK FIRST");
		return { id: "first", ready: result.rows[0]?.ready === true };
	},
} as const satisfies DatabaseInvariantDefinition;
const secondInvariant = {
	id: "second",
	install: async (client) => {
		await client.query("INSTALL SECOND");
	},
	getReadiness: async (database) => {
		const result = await database.query<{ ready: boolean }>("CHECK SECOND");
		return { id: "second", ready: result.rows[0]?.ready === true };
	},
} as const satisfies DatabaseInvariantDefinition;

describe("production database invariants", () => {
	it("requires both deployment-owned security invariants", () => {
		expect(DATABASE_INVARIANT_IDS).toEqual([
			SUPER_ADMIN_DATABASE_INVARIANT_ID,
			PROVIDER_NAMESPACE_INVARIANT_ID,
		]);
	});

	it("installs every invariant atomically and verifies it before commit", async () => {
		const queries: string[] = [];
		const release = vi.fn();
		const database = {
			connect: async () => ({
				query: async (sql: string) => {
					queries.push(sql);
					return { rows: sql.startsWith("CHECK") ? [{ ready: true }] : [] };
				},
				release,
			}),
		} as unknown as CinaAuthDatabase;

		const readiness = await installDatabaseInvariants(
			database,
			[],
			[firstInvariant, secondInvariant],
		);

		expect(readiness).toEqual({
			ok: true,
			required: ["first", "second"],
			installed: ["first", "second"],
			missing: [],
		});
		expect(queries).toEqual([
			"BEGIN",
			expect.stringContaining("SET LOCAL lock_timeout"),
			expect.stringContaining("SET LOCAL statement_timeout"),
			"INSTALL FIRST A",
			"INSTALL FIRST B",
			"INSTALL SECOND",
			"CHECK FIRST",
			"CHECK SECOND",
			"COMMIT",
		]);
		expect(release).toHaveBeenCalledOnce();
	});

	it("rolls back and propagates an installation or verification failure", async () => {
		const queries: string[] = [];
		const release = vi.fn();
		const database = {
			connect: async () => ({
				query: async (sql: string) => {
					queries.push(sql);
					if (sql === "INSTALL SECOND") throw new Error("permission denied");
					return { rows: [] };
				},
				release,
			}),
		} as unknown as CinaAuthDatabase;

		await expect(
			installDatabaseInvariants(
				database,
				[],
				[firstInvariant, secondInvariant],
			),
		).rejects.toThrow("permission denied");
		expect(queries).toContain("ROLLBACK");
		expect(queries).not.toContain("COMMIT");
		expect(release).toHaveBeenCalledOnce();
	});

	it("reports each missing invariant without mutating the database", async () => {
		const query = vi.fn(async (sql: string) => ({
			rows: [{ ready: sql === "CHECK FIRST" }],
		}));
		const database = { query } as unknown as CinaAuthDatabase;

		await expect(
			getDatabaseInvariantReadiness(
				database,
				[],
				[firstInvariant, secondInvariant],
			),
		).resolves.toEqual({
			ok: false,
			required: ["first", "second"],
			installed: ["first"],
			missing: ["second"],
		});
		expect(query).toHaveBeenCalledTimes(2);
	});
});
