import type { PoolClient } from "pg";
import type { CinaAuthDatabase } from "./database";

export const SUPER_ADMIN_DATABASE_INVARIANT_ID = "super-admin-governance-v1";
export const SUPER_ADMIN_DATABASE_INVARIANT_LOCK_KEY =
	"cinaauth:super-admin-governance:invariant:v1";

const SUPER_ADMIN_GOVERNANCE_FUNCTION = "cinaauth_super_admin_governance_v1";
const SUPER_ADMIN_GOVERNANCE_TRIGGER =
	"cinaauth_super_admin_governance_v1_before_write";

const createFunction = `
CREATE OR REPLACE FUNCTION "${SUPER_ADMIN_GOVERNANCE_FUNCTION}"()
RETURNS trigger
LANGUAGE plpgsql VOLATILE
AS $cinaauth_super_admin_governance$
DECLARE
	old_is_super_admin boolean := FALSE;
	new_is_super_admin boolean := FALSE;
	has_remaining_super_admin boolean := FALSE;
BEGIN
	IF TG_OP <> 'INSERT' THEN
		old_is_super_admin :=
			'super_admin' = ANY(string_to_array(COALESCE(OLD."role", ''), ','));
	END IF;
	IF TG_OP <> 'DELETE' THEN
		new_is_super_admin :=
			'super_admin' = ANY(string_to_array(COALESCE(NEW."role", ''), ','));
	END IF;

	IF TG_OP <> 'DELETE'
		AND NEW."isAnonymous" IS TRUE
		AND new_is_super_admin
	THEN
		RAISE EXCEPTION USING
			ERRCODE = '23514',
			MESSAGE = 'ANONYMOUS_USER_CANNOT_BE_SUPER_ADMIN';
	END IF;

	IF TG_OP = 'DELETE'
		AND OLD."isAnonymous" IS TRUE
		AND old_is_super_admin
	THEN
		RAISE EXCEPTION USING
			ERRCODE = '23514',
			MESSAGE = 'ANONYMOUS_SUPER_ADMIN_MUST_BE_DEMOTED_BEFORE_DELETION';
	END IF;

	IF old_is_super_admin AND (TG_OP = 'DELETE' OR NOT new_is_super_admin) THEN
		PERFORM pg_advisory_xact_lock(
			hashtextextended('${SUPER_ADMIN_DATABASE_INVARIANT_LOCK_KEY}', 0)
		);

		-- TG_RELID binds the check to the table that fired this trigger even if a
		-- caller changes search_path. The row lock makes stale repeatable-read
		-- snapshots fail closed instead of accepting a concurrently demoted row.
		EXECUTE format(
			'SELECT TRUE FROM %s AS candidate
			 WHERE candidate."id" <> $1
			   AND $2 = ANY(string_to_array(COALESCE(candidate."role", ''''), '',''))
			 LIMIT 1
			 FOR KEY SHARE',
			TG_RELID::regclass
		)
		INTO has_remaining_super_admin
		USING OLD."id", 'super_admin';

		IF has_remaining_super_admin IS NOT TRUE THEN
			RAISE EXCEPTION USING
				ERRCODE = '23514',
				MESSAGE = 'YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN';
		END IF;
	END IF;

	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$cinaauth_super_admin_governance$`;

const dropTrigger = `
DROP TRIGGER IF EXISTS "${SUPER_ADMIN_GOVERNANCE_TRIGGER}" ON "user"`;

const createTrigger = `
CREATE TRIGGER "${SUPER_ADMIN_GOVERNANCE_TRIGGER}"
BEFORE INSERT OR UPDATE OR DELETE ON "user"
FOR EACH ROW
EXECUTE FUNCTION "${SUPER_ADMIN_GOVERNANCE_FUNCTION}"()`;

const readinessQuery = `
SELECT (
	EXISTS (
		SELECT 1
		FROM pg_trigger AS trigger
		JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
		JOIN pg_namespace AS relation_namespace
			ON relation_namespace.oid = relation.relnamespace
		JOIN pg_proc AS function ON function.oid = trigger.tgfoid
		JOIN pg_namespace AS function_namespace
			ON function_namespace.oid = function.pronamespace
		WHERE relation_namespace.nspname = current_schema()
			AND relation.relname = 'user'
			AND trigger.tgname = '${SUPER_ADMIN_GOVERNANCE_TRIGGER}'
			AND NOT trigger.tgisinternal
			AND trigger.tgenabled IN ('O', 'A')
			AND function.proname = '${SUPER_ADMIN_GOVERNANCE_FUNCTION}'
			AND function_namespace.nspname = relation_namespace.nspname
	)
	AND (
		SELECT COUNT(*) = 2
		FROM information_schema.columns
		WHERE table_schema = current_schema()
			AND table_name = 'user'
			AND column_name IN ('role', 'isAnonymous')
	)
	AND EXISTS (
		SELECT 1
		FROM "user" AS admin_candidate
		WHERE admin_candidate."isAnonymous" IS NOT TRUE
			AND 'super_admin' = ANY(
				string_to_array(COALESCE(admin_candidate."role", ''), ',')
			)
	)
	AND NOT EXISTS (
		SELECT 1
		FROM "user" AS admin_candidate
		WHERE admin_candidate."isAnonymous" IS TRUE
			AND 'super_admin' = ANY(
				string_to_array(COALESCE(admin_candidate."role", ''), ',')
			)
	)
) AS ready`;

/**
 * Deployment-owned PostgreSQL invariant that protects the final super admin
 * in the same transaction and connection as the actual user mutation.
 */
export const SUPER_ADMIN_DATABASE_INVARIANT = {
	id: SUPER_ADMIN_DATABASE_INVARIANT_ID,
	installStatements: [createFunction, dropTrigger, createTrigger],
	readinessQuery,
} as const;

export type SuperAdminDatabaseInvariantReadiness = {
	id: typeof SUPER_ADMIN_DATABASE_INVARIANT_ID;
	ready: boolean;
};

/** Install the invariant inside a caller-owned PostgreSQL transaction. */
export const installSuperAdminDatabaseInvariant = async (
	client: PoolClient,
) => {
	for (const statement of SUPER_ADMIN_DATABASE_INVARIANT.installStatements) {
		await client.query(statement);
	}
};

/** Inspect trigger installation and the current authoritative admin state. */
export const getSuperAdminDatabaseInvariantReadiness = async (
	database: CinaAuthDatabase | PoolClient,
): Promise<SuperAdminDatabaseInvariantReadiness> => {
	const result = await database.query<{ ready: boolean }>(
		SUPER_ADMIN_DATABASE_INVARIANT.readinessQuery,
	);
	return {
		id: SUPER_ADMIN_DATABASE_INVARIANT_ID,
		ready: result.rows[0]?.ready === true,
	};
};
