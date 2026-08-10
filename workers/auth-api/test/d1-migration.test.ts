import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import {
	buildLegacyRowUpsert,
	LEGACY_D1_TABLES,
	migrateLegacyD1ToPostgres,
	normalizeLegacyValue,
} from "../src/d1-migration";

const getSpec = (table: string) => {
	const spec = LEGACY_D1_TABLES.find((item) => item.table === table);
	if (!spec) throw new Error(`Missing test spec for ${table}`);
	return spec;
};

const makeD1Result = <T>(results: T[]) =>
	({ results }) as unknown as D1Result<T>;

describe("legacy D1 value conversion", () => {
	it("keeps foreign-key parents first", () => {
		expect(LEGACY_D1_TABLES.map((spec) => spec.table)).toEqual([
			"user",
			"organization",
			"account",
			"session",
			"verification",
			"apikey",
			"auditLog",
			"member",
			"invitation",
			"jwks",
			"twoFactor",
			"walletAddress",
		]);
	});

	it("normalizes D1 millisecond and ISO dates plus integer booleans", () => {
		const user = getSpec("user");
		expect(
			(
				normalizeLegacyValue(user, "createdAt", 1_700_000_000_000) as Date
			).toISOString(),
		).toBe("2023-11-14T22:13:20.000Z");
		expect(
			(
				normalizeLegacyValue(
					user,
					"updatedAt",
					"2026-08-09T00:00:00.000Z",
				) as Date
			).toISOString(),
		).toBe("2026-08-09T00:00:00.000Z");
		expect(normalizeLegacyValue(user, "emailVerified", 1)).toBe(true);
		expect(normalizeLegacyValue(user, "banned", 0)).toBe(false);
		expect(normalizeLegacyValue(user, "banExpires", null)).toBeNull();
	});

	it("parameterizes values and never embeds auth data in SQL", () => {
		const verification = getSpec("verification");
		const sensitiveValue = "one-time-secret-value";
		const query = buildLegacyRowUpsert(verification, {
			id: "verification-id",
			identifier: "person@example.com",
			value: sensitiveValue,
			expiresAt: 1_800_000_000_000,
			createdAt: 1_700_000_000_000,
			updatedAt: 1_700_000_000_000,
		});

		expect(query.text).toContain('INSERT INTO "verification"');
		expect(query.text).toContain('ON CONFLICT ("id")');
		expect(query.text).not.toContain(sensitiveValue);
		expect(query.values).toContain(sensitiveValue);
	});
});

describe("legacy D1 transactional migration", () => {
	it("copies an exact source snapshot and verifies every target table", async () => {
		const sourceRows = new Map<string, Array<Record<string, unknown>>>(
			LEGACY_D1_TABLES.map((spec) => [spec.table, []]),
		);
		sourceRows.set("user", [
			{
				id: "user-id",
				name: "Migration Test",
				email: "migration@example.com",
				emailVerified: 1,
				image: null,
				createdAt: 1_700_000_000_000,
				updatedAt: "2026-08-09T00:00:00.000Z",
				twoFactorEnabled: null,
				role: "user",
				banned: 0,
				banReason: null,
				banExpires: null,
			},
		]);

		const source = {
			prepare: (sql: string) =>
				({
					all: async () => {
						if (sql.includes("sqlite_master")) {
							return makeD1Result(
								LEGACY_D1_TABLES.map((spec) => ({ name: spec.table })).sort(
									(left, right) => left.name.localeCompare(right.name),
								),
							);
						}
						const pragmaTable = /PRAGMA table_info\("([^"]+)"\)/.exec(sql)?.[1];
						if (pragmaTable) {
							return makeD1Result(
								getSpec(pragmaTable).sourceColumns.map((name) => ({ name })),
							);
						}
						const table = /SELECT \* FROM "([^"]+)"/.exec(sql)?.[1];
						if (table) {
							return makeD1Result(sourceRows.get(table) ?? []);
						}
						throw new Error(`Unexpected D1 query: ${sql}`);
					},
				}) as unknown as D1PreparedStatement,
		} as unknown as D1Database;

		const calls: Array<{ text: string; values: readonly unknown[] }> = [];
		const targetRows = new Map(LEGACY_D1_TABLES.map((spec) => [spec.table, 0]));
		const release = vi.fn();
		const client = {
			query: async (text: string, values: readonly unknown[] = []) => {
				calls.push({ text, values });
				if (text.includes("information_schema.columns")) {
					return {
						rows: getSpec(String(values[0])).columns.map((name) => ({ name })),
					};
				}
				const insertedTable = /INSERT INTO "([^"]+)"/.exec(text)?.[1];
				if (insertedTable) {
					targetRows.set(
						insertedTable,
						sourceRows.get(insertedTable)?.length ?? 0,
					);
					return { rows: [] };
				}
				const countedTable = /FROM "([^"]+)"/.exec(text)?.[1];
				if (text.includes("COUNT(*)") && countedTable) {
					return { rows: [{ count: targetRows.get(countedTable) ?? 0 }] };
				}
				return { rows: [] };
			},
			release,
		};
		const pool = {
			connect: async () => client,
		} as unknown as Pool;

		const result = await migrateLegacyD1ToPostgres(source, pool);

		expect(result.migrated).toBe(true);
		expect(result.tables.find((table) => table.table === "user")).toEqual({
			table: "user",
			sourceRows: 1,
			targetRows: 1,
		});
		expect(calls.map((call) => call.text)).toContain("BEGIN");
		expect(calls.map((call) => call.text)).toContain("COMMIT");
		expect(calls.map((call) => call.text)).not.toContain("ROLLBACK");
		expect(
			calls.some((call) => call.text.includes("cinaauth_cutover_history")),
		).toBe(true);
		expect(
			calls.some((call) => call.text.includes("migration@example.com")),
		).toBe(false);
		expect(release).toHaveBeenCalledOnce();
	});
});
