import { describe, expect, it } from "vitest";
import {
	SUPER_ADMIN_DATABASE_INVARIANT,
	SUPER_ADMIN_DATABASE_INVARIANT_ID,
	SUPER_ADMIN_DATABASE_INVARIANT_LOCK_KEY,
} from "../src/super-admin-database-invariant";

describe("super-admin PostgreSQL invariant", () => {
	it("installs a transaction-local final guard on the production user table", () => {
		const sql = SUPER_ADMIN_DATABASE_INVARIANT.installStatements.join("\n");

		expect(SUPER_ADMIN_DATABASE_INVARIANT.id).toBe(
			SUPER_ADMIN_DATABASE_INVARIANT_ID,
		);
		expect(sql).toContain("RETURNS trigger");
		expect(sql).toContain("LANGUAGE plpgsql VOLATILE");
		expect(sql).toContain("BEFORE INSERT OR UPDATE OR DELETE");
		expect(sql).toContain("FOR EACH ROW");
		expect(sql).toMatch(/pg_advisory_xact_lock\(\s*hashtextextended\(/);
		expect(sql).toContain(SUPER_ADMIN_DATABASE_INVARIANT_LOCK_KEY);
		expect(sql).toContain("TG_RELID::regclass");
		expect(sql).toContain("FOR KEY SHARE");
	});

	it("uses the exact comma role contract and rejects every anonymous super admin sink", () => {
		const sql = SUPER_ADMIN_DATABASE_INVARIANT.installStatements.join("\n");

		expect(sql).toContain(
			`'super_admin' = ANY(string_to_array(COALESCE(OLD."role", ''), ','))`,
		);
		expect(sql).toContain(
			`'super_admin' = ANY(string_to_array(COALESCE(NEW."role", ''), ','))`,
		);
		expect(sql).toContain("ANONYMOUS_USER_CANNOT_BE_SUPER_ADMIN");
		expect(sql).toContain(
			"ANONYMOUS_SUPER_ADMIN_MUST_BE_DEMOTED_BEFORE_DELETION",
		);
		expect(sql).toContain("YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN");
		expect(sql).not.toContain("trim(");
	});

	it("requires the versioned enabled trigger and both referenced columns", () => {
		const sql = SUPER_ADMIN_DATABASE_INVARIANT.readinessQuery;

		expect(sql).toContain("pg_trigger");
		expect(sql).toContain("NOT trigger.tgisinternal");
		expect(sql).toContain("trigger.tgenabled IN ('O', 'A')");
		expect(sql).toContain("information_schema.columns");
		expect(sql).toContain("'role'");
		expect(sql).toContain("'isAnonymous'");
		expect(sql).toContain('FROM "user" AS admin_candidate');
		expect(sql).toContain('admin_candidate."isAnonymous" IS NOT TRUE');
		expect(sql).toContain('admin_candidate."isAnonymous" IS TRUE');
		expect(sql).toContain("NOT EXISTS");
		expect(sql).toContain("AS ready");
	});
});
