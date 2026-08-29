import { describe, expect, it, vi } from "vitest";
import type { CinaAuthDatabase } from "../src/database";
import {
	getOrganizationIdentityOutboxInvariantReadiness,
	installOrganizationIdentityOutboxInvariant,
	ORGANIZATION_IDENTITY_OUTBOX_INVARIANT_ID,
	ORGANIZATION_IDENTITY_OUTBOX_TABLE,
} from "../src/organization-identity-outbox-invariant";

describe("CinaToken organization identity outbox invariant", () => {
	it("installs an idempotent transactional capture, bootstrap, and lease schema", async () => {
		const statements: string[] = [];
		const client = {
			query: vi.fn(async (sql: string) => {
				statements.push(sql);
				return {
					rows: sql.includes('AS "invalid"') ? [{ invalid: false }] : [],
				};
			}),
		};

		await installOrganizationIdentityOutboxInvariant(client as never);

		const sql = statements.join("\n");
		expect(sql).toContain(
			`CREATE TABLE IF NOT EXISTS "${ORGANIZATION_IDENTITY_OUTBOX_TABLE}"`,
		);
		expect(sql).toContain("cinaauth_cinatoken_identity_clock");
		expect(sql).toContain("pg_advisory_xact_lock");
		expect(sql).toContain("clock_timestamp()");
		expect(sql).toContain("INTERVAL '1 millisecond'");
		expect(sql).toContain('ON CONFLICT ("dedupe_key") DO NOTHING');
		expect(sql).toContain("backfill:organization:");
		expect(sql).toContain("backfill:membership:");
		expect(sql).toContain('OLD."email" IS NOT DISTINCT FROM NEW."email"');
		expect(
			statements.filter((statement) => statement.includes("CREATE TRIGGER")),
		).toHaveLength(3);
	});

	it("fails installation when a source membership cannot form a valid event", async () => {
		const client = {
			query: vi.fn(async (sql: string) => ({
				rows: sql.includes('AS "invalid"') ? [{ invalid: true }] : [],
			})),
		};

		await expect(
			installOrganizationIdentityOutboxInvariant(client as never),
		).rejects.toThrow("empty role");
	});

	it("reports readiness only when the table, functions, and triggers match", async () => {
		const readyDatabase = {
			query: vi.fn(async () => ({ rows: [{ ready: true }] })),
		} as unknown as CinaAuthDatabase;
		const missingDatabase = {
			query: vi.fn(async () => ({ rows: [{ ready: false }] })),
		} as unknown as CinaAuthDatabase;

		await expect(
			getOrganizationIdentityOutboxInvariantReadiness(readyDatabase),
		).resolves.toEqual({
			id: ORGANIZATION_IDENTITY_OUTBOX_INVARIANT_ID,
			ready: true,
		});
		await expect(
			getOrganizationIdentityOutboxInvariantReadiness(missingDatabase),
		).resolves.toEqual({
			id: ORGANIZATION_IDENTITY_OUTBOX_INVARIANT_ID,
			ready: false,
		});
	});
});
