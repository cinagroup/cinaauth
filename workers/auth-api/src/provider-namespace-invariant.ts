import type { PoolClient } from "pg";
import type { CinaAuthDatabase } from "./database";

export const PROVIDER_NAMESPACE_INVARIANT_ID = "provider-namespace-registry-v1";

const FIXED_ACCOUNT_PROVIDER_IDS = [
	"credential",
	"email-otp",
	"magic-link",
	"phone-number",
	"anonymous",
	"siwe",
	"google",
	"github",
] as const;

type InvariantCollisionRow = { collision: boolean };
type InvariantInstalledRow = { ready: boolean };
type InvariantCoverageRow = { hasConflict: boolean };

export type ProviderNamespaceInvariantReadiness = {
	id: typeof PROVIDER_NAMESPACE_INVARIANT_ID;
	ready: boolean;
};

const getReservedAccountProviderIds = (
	configuredProviderIds: readonly string[],
) => [...new Set([...FIXED_ACCOUNT_PROVIDER_IDS, ...configuredProviderIds])];

/**
 * Installs the provider namespace registry inside the caller-owned migration
 * transaction. Table locks make validation and backfill one atomic snapshot;
 * callers must roll back the transaction when this function throws.
 */
export const installProviderNamespaceInvariant = async (
	client: PoolClient,
	configuredProviderIds: readonly string[] = [],
): Promise<void> => {
	const reservedProviderIds = getReservedAccountProviderIds(
		configuredProviderIds,
	);

	await client.query(`CREATE TABLE IF NOT EXISTS "cinaauth_provider_namespace" (
		"provider_id" TEXT PRIMARY KEY,
		"kind" TEXT NOT NULL,
		"claimed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT "cinaauth_provider_namespace_kind_check"
			CHECK ("kind" IN ('account', 'sso', 'scim'))
	)`);
	await client.query(`LOCK TABLE "account", "ssoProvider", "scimProvider",
		"cinaauth_provider_namespace" IN SHARE ROW EXCLUSIVE MODE`);

	await client.query(`CREATE OR REPLACE FUNCTION "cinaauth_claim_provider_namespace_v1"()
	RETURNS TRIGGER
	LANGUAGE plpgsql
	AS $provider_namespace$
	DECLARE
		desired_kind TEXT;
		existing_kind TEXT;
		active_provider_exists BOOLEAN := FALSE;
	BEGIN
		IF TG_TABLE_NAME = 'account' THEN
			INSERT INTO "cinaauth_provider_namespace" ("provider_id", "kind")
			VALUES (NEW."providerId", 'account')
			ON CONFLICT ("provider_id") DO NOTHING;
			SELECT "kind" INTO existing_kind
			FROM "cinaauth_provider_namespace"
			WHERE "provider_id" = NEW."providerId";
			IF existing_kind = 'account' THEN
				RETURN NEW;
			ELSIF existing_kind = 'sso' THEN
				SELECT EXISTS(
					SELECT 1 FROM "ssoProvider"
					WHERE "providerId" = NEW."providerId"
				) INTO active_provider_exists;
			ELSIF existing_kind = 'scim' THEN
				SELECT EXISTS(
					SELECT 1 FROM "scimProvider"
					WHERE "providerId" = NEW."providerId"
				) INTO active_provider_exists;
			END IF;
			IF active_provider_exists THEN
				RETURN NEW;
			END IF;
			RAISE EXCEPTION USING
				ERRCODE = 'unique_violation',
				MESSAGE = 'Provider namespace collision';
		ELSIF TG_TABLE_NAME = 'ssoProvider' THEN
			desired_kind := 'sso';
		ELSIF TG_TABLE_NAME = 'scimProvider' THEN
			desired_kind := 'scim';
		ELSE
			RAISE EXCEPTION 'Unsupported provider namespace claim source';
		END IF;

		INSERT INTO "cinaauth_provider_namespace" ("provider_id", "kind")
		VALUES (NEW."providerId", desired_kind)
		ON CONFLICT ("provider_id") DO NOTHING;

		SELECT "kind" INTO existing_kind
		FROM "cinaauth_provider_namespace"
		WHERE "provider_id" = NEW."providerId";
		IF existing_kind IS NULL OR existing_kind <> desired_kind THEN
			RAISE EXCEPTION USING
				ERRCODE = 'unique_violation',
				MESSAGE = 'Provider namespace collision';
		END IF;
		RETURN NEW;
	END;
	$provider_namespace$`);

	for (const [triggerName, tableName] of [
		["cinaauth_account_provider_namespace_v1", "account"],
		["cinaauth_sso_provider_namespace_v1", "ssoProvider"],
		["cinaauth_scim_provider_namespace_v1", "scimProvider"],
	] as const) {
		await client.query(
			`DROP TRIGGER IF EXISTS "${triggerName}" ON "${tableName}"`,
		);
		await client.query(`CREATE TRIGGER "${triggerName}"
			BEFORE INSERT OR UPDATE OF "providerId" ON "${tableName}"
			FOR EACH ROW
			EXECUTE FUNCTION "cinaauth_claim_provider_namespace_v1"()`);
	}

	const collision = await client.query<InvariantCollisionRow>(
		`SELECT EXISTS(
			SELECT 1
			FROM "ssoProvider" sso
			JOIN "scimProvider" scim
				ON scim."providerId" = sso."providerId"
			UNION ALL
			SELECT 1
			FROM "ssoProvider" sso
			JOIN "cinaauth_provider_namespace" namespace
				ON namespace."provider_id" = sso."providerId"
			WHERE namespace."kind" <> 'sso'
			UNION ALL
			SELECT 1
			FROM "scimProvider" scim
			JOIN "cinaauth_provider_namespace" namespace
				ON namespace."provider_id" = scim."providerId"
			WHERE namespace."kind" <> 'scim'
			UNION ALL
			SELECT 1 FROM "ssoProvider"
			WHERE "providerId" = ANY($1::text[])
			UNION ALL
			SELECT 1 FROM "scimProvider"
			WHERE "providerId" = ANY($1::text[])
			UNION ALL
			SELECT 1
			FROM "cinaauth_provider_namespace"
			WHERE "provider_id" = ANY($1::text[])
				AND "kind" <> 'account'
		) AS "collision"`,
		[reservedProviderIds],
	);
	if (collision.rows[0]?.collision !== false) {
		throw new Error("Provider namespace contains conflicting claims");
	}

	await client.query(`INSERT INTO "cinaauth_provider_namespace" ("provider_id", "kind")
		SELECT DISTINCT "providerId", 'sso' FROM "ssoProvider"
		ON CONFLICT ("provider_id") DO NOTHING`);
	await client.query(`INSERT INTO "cinaauth_provider_namespace" ("provider_id", "kind")
		SELECT DISTINCT "providerId", 'scim' FROM "scimProvider"
		ON CONFLICT ("provider_id") DO NOTHING`);
	await client.query(`INSERT INTO "cinaauth_provider_namespace" ("provider_id", "kind")
		SELECT DISTINCT "providerId", 'account' FROM "account"
		ON CONFLICT ("provider_id") DO NOTHING`);
	await client.query(
		`INSERT INTO "cinaauth_provider_namespace" ("provider_id", "kind")
		SELECT reserved."providerId", 'account'
		FROM unnest($1::text[]) AS reserved("providerId")
		ON CONFLICT ("provider_id") DO NOTHING`,
		[reservedProviderIds],
	);
};

/** Checks trigger installation and registry coverage without exposing ids. */
export const getProviderNamespaceInvariantReadiness = async (
	database: CinaAuthDatabase | PoolClient,
	configuredProviderIds: readonly string[] = [],
): Promise<ProviderNamespaceInvariantReadiness> => {
	const installed = await database.query<InvariantInstalledRow>(
		`SELECT (
			EXISTS(
				SELECT 1
				FROM pg_class registry
				JOIN pg_namespace registry_namespace
					ON registry_namespace.oid = registry.relnamespace
				WHERE registry.relname = 'cinaauth_provider_namespace'
					AND registry.relkind = 'r'
					AND registry_namespace.nspname = current_schema()
			)
			AND (
				SELECT COUNT(*) = 3
				FROM information_schema.columns column_definition
				WHERE column_definition.table_schema = current_schema()
					AND column_definition.table_name = 'cinaauth_provider_namespace'
					AND (
						(column_definition.column_name = 'provider_id'
							AND column_definition.data_type = 'text'
							AND column_definition.is_nullable = 'NO')
						OR (column_definition.column_name = 'kind'
							AND column_definition.data_type = 'text'
							AND column_definition.is_nullable = 'NO')
						OR (column_definition.column_name = 'claimed_at'
							AND column_definition.data_type = 'timestamp with time zone'
							AND column_definition.is_nullable = 'NO')
					)
			)
			AND EXISTS(
				SELECT 1
				FROM pg_constraint registry_constraint
				JOIN pg_class registry
					ON registry.oid = registry_constraint.conrelid
				JOIN pg_namespace registry_namespace
					ON registry_namespace.oid = registry.relnamespace
				JOIN pg_attribute provider_id_column
					ON provider_id_column.attrelid = registry.oid
					AND provider_id_column.attnum = ANY(registry_constraint.conkey)
				WHERE registry.relname = 'cinaauth_provider_namespace'
					AND registry_namespace.nspname = current_schema()
					AND registry_constraint.contype = 'p'
					AND cardinality(registry_constraint.conkey) = 1
					AND provider_id_column.attname = 'provider_id'
			)
			AND (
				SELECT COUNT(*) = 3
				FROM pg_trigger trigger
				JOIN pg_class relation ON relation.oid = trigger.tgrelid
				JOIN pg_namespace relation_namespace
					ON relation_namespace.oid = relation.relnamespace
				JOIN pg_proc trigger_function
					ON trigger_function.oid = trigger.tgfoid
				JOIN pg_namespace function_namespace
					ON function_namespace.oid = trigger_function.pronamespace
				WHERE NOT trigger.tgisinternal
					AND trigger.tgenabled IN ('O', 'A')
					AND trigger_function.proname =
						'cinaauth_claim_provider_namespace_v1'
					AND relation_namespace.nspname = current_schema()
					AND function_namespace.oid = relation_namespace.oid
					AND (trigger.tgname, relation.relname) IN (
						('cinaauth_account_provider_namespace_v1', 'account'),
						('cinaauth_sso_provider_namespace_v1', 'ssoProvider'),
						('cinaauth_scim_provider_namespace_v1', 'scimProvider')
					)
			)
		) AS "ready"
		/* cinaauth_provider_namespace_invariant_ready */`,
	);
	if (installed.rows[0]?.ready !== true) {
		return { id: PROVIDER_NAMESPACE_INVARIANT_ID, ready: false };
	}

	const reservedProviderIds = getReservedAccountProviderIds(
		configuredProviderIds,
	);
	const coverage = await database.query<InvariantCoverageRow>(
		`SELECT EXISTS(
			SELECT 1
			FROM "ssoProvider" provider
			LEFT JOIN "cinaauth_provider_namespace" namespace
				ON namespace."provider_id" = provider."providerId"
			WHERE namespace."kind" IS DISTINCT FROM 'sso'
			UNION ALL
			SELECT 1
			FROM "scimProvider" provider
			LEFT JOIN "cinaauth_provider_namespace" namespace
				ON namespace."provider_id" = provider."providerId"
			WHERE namespace."kind" IS DISTINCT FROM 'scim'
			UNION ALL
			SELECT 1
			FROM "account" account
			LEFT JOIN "cinaauth_provider_namespace" namespace
				ON namespace."provider_id" = account."providerId"
			WHERE namespace."provider_id" IS NULL
			UNION ALL
			SELECT 1
			FROM unnest($1::text[]) AS reserved("providerId")
			LEFT JOIN "cinaauth_provider_namespace" namespace
				ON namespace."provider_id" = reserved."providerId"
			WHERE namespace."kind" IS DISTINCT FROM 'account'
		) AS "hasConflict"`,
		[reservedProviderIds],
	);

	return {
		id: PROVIDER_NAMESPACE_INVARIANT_ID,
		ready: coverage.rows[0]?.hasConflict === false,
	};
};
