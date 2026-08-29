import type { PoolClient } from "pg";
import type { CinaAuthDatabase } from "./database";

export const ORGANIZATION_IDENTITY_OUTBOX_INVARIANT_ID =
	"cinatoken-organization-identity-outbox-v1";
export const ORGANIZATION_IDENTITY_OUTBOX_TABLE =
	"cinaauth_cinatoken_identity_outbox";

const OUTBOX_SEQUENCE = "cinaauth_cinatoken_identity_outbox_id_seq";
const OUTBOX_CLOCK_TABLE = "cinaauth_cinatoken_identity_clock";
const APPEND_FUNCTION = "cinaauth_append_cinatoken_identity_event_v1";
const NORMALIZE_ROLES_FUNCTION = "cinaauth_normalize_organization_roles_v1";
const TRIGGER_FUNCTION = "cinaauth_capture_cinatoken_identity_event_v1";

const TRIGGERS = [
	["cinaauth_cinatoken_identity_organization_v1", "organization"],
	["cinaauth_cinatoken_identity_member_v1", "member"],
	["cinaauth_cinatoken_identity_user_email_v1", "user"],
] as const;

type InvariantInstalledRow = { ready: boolean };

export type OrganizationIdentityOutboxInvariantReadiness = {
	id: typeof ORGANIZATION_IDENTITY_OUTBOX_INVARIANT_ID;
	ready: boolean;
};

/**
 * Installs the PostgreSQL transactional outbox in the caller-owned migration
 * transaction. Row triggers capture every authoritative organization,
 * membership, and member-email mutation on the same connection and commit as
 * the source write, including direct SSO/SCIM adapter writes.
 */
export const installOrganizationIdentityOutboxInvariant = async (
	client: PoolClient,
): Promise<void> => {
	await client.query(`CREATE SEQUENCE IF NOT EXISTS "${OUTBOX_SEQUENCE}"
		AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE`);
	await client.query(`CREATE TABLE IF NOT EXISTS "${OUTBOX_CLOCK_TABLE}" (
		"aggregate_key" TEXT PRIMARY KEY,
		"last_occurred_at" TIMESTAMPTZ NOT NULL
	)`);
	await client.query(`CREATE TABLE IF NOT EXISTS "${ORGANIZATION_IDENTITY_OUTBOX_TABLE}" (
		"id" BIGINT PRIMARY KEY,
		"event_id" TEXT NOT NULL UNIQUE,
		"event_type" TEXT NOT NULL,
		"aggregate_key" TEXT NOT NULL,
		"payload" JSONB NOT NULL,
		"occurred_at" TIMESTAMPTZ NOT NULL,
		"available_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
		"locked_until" TIMESTAMPTZ,
		"lock_token" TEXT,
		"attempts" INTEGER NOT NULL DEFAULT 0,
		"last_error" TEXT,
		"queued_at" TIMESTAMPTZ,
		"created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
		"dedupe_key" TEXT UNIQUE,
		"replay_count" INTEGER NOT NULL DEFAULT 0,
		CONSTRAINT "cinaauth_cinatoken_identity_outbox_event_type_check"
			CHECK ("event_type" IN (
				'organization.upserted',
				'organization.deleted',
				'organization.membership.upserted',
				'organization.membership.removed'
			)),
		CONSTRAINT "cinaauth_cinatoken_identity_outbox_attempts_check"
			CHECK ("attempts" >= 0),
		CONSTRAINT "cinaauth_cinatoken_identity_outbox_replay_count_check"
			CHECK ("replay_count" >= 0),
		CONSTRAINT "cinaauth_cinatoken_identity_outbox_payload_size_check"
			CHECK (octet_length("payload"::TEXT) <= 120000)
	)`);
	await client.query(`CREATE INDEX IF NOT EXISTS
		"cinaauth_cinatoken_identity_outbox_pending_v1"
		ON "${ORGANIZATION_IDENTITY_OUTBOX_TABLE}"
		("available_at", "id")
		WHERE "queued_at" IS NULL`);
	await client.query(`CREATE INDEX IF NOT EXISTS
		"cinaauth_cinatoken_identity_outbox_retention_v1"
		ON "${ORGANIZATION_IDENTITY_OUTBOX_TABLE}" ("queued_at")
		WHERE "queued_at" IS NOT NULL`);

	await client.query(`CREATE OR REPLACE FUNCTION "${NORMALIZE_ROLES_FUNCTION}"(
		role_value TEXT
	)
	RETURNS JSONB
	LANGUAGE SQL IMMUTABLE PARALLEL SAFE
	AS $normalize_roles$
		SELECT COALESCE(jsonb_agg(normalized.role ORDER BY normalized.role), '[]'::JSONB)
		FROM (
			SELECT DISTINCT btrim(candidate) AS role
			FROM unnest(string_to_array(COALESCE(role_value, ''), ',')) AS candidate
			WHERE btrim(candidate) <> ''
		) AS normalized
	$normalize_roles$`);

	await client.query(`CREATE OR REPLACE FUNCTION "${APPEND_FUNCTION}"(
		identity_event_type TEXT,
		organization_projection JSONB,
		membership_projection JSONB DEFAULT NULL,
		identity_dedupe_key TEXT DEFAULT NULL
	)
	RETURNS VOID
	LANGUAGE plpgsql VOLATILE
	AS $append_identity_event$
	DECLARE
		outbox_id BIGINT;
		identity_event_id TEXT;
		identity_occurred_at TIMESTAMPTZ;
		identity_occurred_at_text TEXT;
		organization_id TEXT;
		membership_subject TEXT;
		identity_aggregate_key TEXT;
		identity_payload JSONB;
	BEGIN
		organization_id := organization_projection->>'id';
		IF organization_id IS NULL OR organization_id = '' THEN
			RAISE EXCEPTION USING
				ERRCODE = '23514',
				MESSAGE = 'CINATOKEN_IDENTITY_ORGANIZATION_ID_REQUIRED';
		END IF;

		IF membership_projection IS NOT NULL THEN
			membership_subject := membership_projection->>'subject';
			IF membership_subject IS NULL OR membership_subject = '' THEN
				RAISE EXCEPTION USING
					ERRCODE = '23514',
					MESSAGE = 'CINATOKEN_IDENTITY_MEMBERSHIP_SUBJECT_REQUIRED';
			END IF;
		END IF;
		identity_aggregate_key := CASE
			WHEN membership_subject IS NULL THEN organization_id
			ELSE organization_id || ':' || membership_subject
		END;

		-- Serialize writes for an organization, then advance a persistent
		-- millisecond logical clock for the exact downstream aggregate. This keeps
		-- last-write-wins deterministic even when several source changes occur in
		-- one millisecond or Queue delivery is reordered.
		PERFORM pg_advisory_xact_lock(
			hashtextextended('cinaauth:cinatoken-identity:' || organization_id, 0)
		);
		INSERT INTO "${OUTBOX_CLOCK_TABLE}" AS identity_clock (
			"aggregate_key", "last_occurred_at"
		) VALUES (
			identity_aggregate_key,
			date_trunc('milliseconds', clock_timestamp())
		)
		ON CONFLICT ("aggregate_key") DO UPDATE SET
			"last_occurred_at" = CASE
				WHEN identity_clock."last_occurred_at" >= EXCLUDED."last_occurred_at"
					THEN identity_clock."last_occurred_at" + INTERVAL '1 millisecond'
				ELSE EXCLUDED."last_occurred_at"
			END
		RETURNING "last_occurred_at" INTO identity_occurred_at;
		identity_occurred_at_text := to_char(
			identity_occurred_at AT TIME ZONE 'UTC',
			'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
		);
		outbox_id := nextval('"${OUTBOX_SEQUENCE}"'::regclass);
		identity_event_id := 'cinaauth-outbox-' || outbox_id::TEXT;

		organization_projection := organization_projection || jsonb_build_object(
			'updatedAt', identity_occurred_at_text
		);
		identity_payload := jsonb_build_object(
			'id', identity_event_id,
			'type', identity_event_type,
			'occurredAt', identity_occurred_at_text,
			'organization', organization_projection
		);
		IF membership_projection IS NOT NULL THEN
			membership_projection := membership_projection || jsonb_build_object(
				'updatedAt', identity_occurred_at_text
			);
			identity_payload := identity_payload || jsonb_build_object(
				'membership', membership_projection
			);
		END IF;

		INSERT INTO "${ORGANIZATION_IDENTITY_OUTBOX_TABLE}" (
			"id", "event_id", "event_type", "aggregate_key", "payload",
			"occurred_at", "dedupe_key"
		) VALUES (
			outbox_id,
			identity_event_id,
			identity_event_type,
			identity_aggregate_key,
			identity_payload,
			identity_occurred_at,
			identity_dedupe_key
		)
		ON CONFLICT ("dedupe_key") DO NOTHING;
	END;
	$append_identity_event$`);

	await client.query(`CREATE OR REPLACE FUNCTION "${TRIGGER_FUNCTION}"()
	RETURNS TRIGGER
	LANGUAGE plpgsql VOLATILE
	AS $capture_identity_event$
	DECLARE
		membership_row RECORD;
		membership_roles JSONB;
	BEGIN
		IF TG_TABLE_NAME = 'organization' THEN
			IF TG_OP = 'UPDATE' AND OLD."id" IS DISTINCT FROM NEW."id" THEN
				PERFORM "${APPEND_FUNCTION}"(
					'organization.deleted',
					jsonb_build_object('id', OLD."id", 'status', 'deleted')
				);
			END IF;
			IF TG_OP = 'DELETE' THEN
				PERFORM "${APPEND_FUNCTION}"(
					'organization.deleted',
					jsonb_build_object('id', OLD."id", 'status', 'deleted')
				);
				RETURN OLD;
			END IF;
			PERFORM "${APPEND_FUNCTION}"(
				'organization.upserted',
				jsonb_build_object(
					'id', NEW."id",
					'name', NEW."name",
					'slug', NEW."slug",
					'status', 'active'
				)
			);
			RETURN NEW;
		ELSIF TG_TABLE_NAME = 'member' THEN
			IF TG_OP = 'UPDATE' AND (
				OLD."organizationId" IS DISTINCT FROM NEW."organizationId"
				OR OLD."userId" IS DISTINCT FROM NEW."userId"
			) THEN
				PERFORM "${APPEND_FUNCTION}"(
					'organization.membership.removed',
					jsonb_build_object('id', OLD."organizationId"),
					jsonb_build_object(
						'subject', OLD."userId",
						'email', (SELECT "email" FROM "user" WHERE "id" = OLD."userId"),
						'roles', '[]'::JSONB,
						'status', 'removed'
					)
				);
			END IF;
			IF TG_OP = 'DELETE' THEN
				PERFORM "${APPEND_FUNCTION}"(
					'organization.membership.removed',
					jsonb_build_object('id', OLD."organizationId"),
					jsonb_build_object(
						'subject', OLD."userId",
						'email', (SELECT "email" FROM "user" WHERE "id" = OLD."userId"),
						'roles', '[]'::JSONB,
						'status', 'removed'
					)
				);
				RETURN OLD;
			END IF;

			membership_roles := "${NORMALIZE_ROLES_FUNCTION}"(NEW."role");
			IF jsonb_array_length(membership_roles) = 0 THEN
				RAISE EXCEPTION USING
					ERRCODE = '23514',
					MESSAGE = 'CINATOKEN_IDENTITY_MEMBERSHIP_ROLE_REQUIRED';
			END IF;
			PERFORM "${APPEND_FUNCTION}"(
				'organization.membership.upserted',
				jsonb_build_object('id', NEW."organizationId"),
				jsonb_build_object(
					'subject', NEW."userId",
					'email', (SELECT "email" FROM "user" WHERE "id" = NEW."userId"),
					'roles', membership_roles,
					'status', 'active'
				)
			);
			RETURN NEW;
		ELSIF TG_TABLE_NAME = 'user' THEN
			IF TG_OP <> 'UPDATE' OR OLD."email" IS NOT DISTINCT FROM NEW."email" THEN
				RETURN NEW;
			END IF;
			FOR membership_row IN
				SELECT "organizationId", "userId", "role"
				FROM "member"
				WHERE "userId" = NEW."id"
				ORDER BY "organizationId"
			LOOP
				membership_roles := "${NORMALIZE_ROLES_FUNCTION}"(membership_row."role");
				IF jsonb_array_length(membership_roles) = 0 THEN
					RAISE EXCEPTION USING
						ERRCODE = '23514',
						MESSAGE = 'CINATOKEN_IDENTITY_MEMBERSHIP_ROLE_REQUIRED';
				END IF;
				PERFORM "${APPEND_FUNCTION}"(
					'organization.membership.upserted',
					jsonb_build_object('id', membership_row."organizationId"),
					jsonb_build_object(
						'subject', membership_row."userId",
						'email', NEW."email",
						'roles', membership_roles,
						'status', 'active'
					)
				);
			END LOOP;
			RETURN NEW;
		END IF;
		RAISE EXCEPTION 'Unsupported CinaToken identity outbox source table';
	END;
	$capture_identity_event$`);

	for (const [triggerName, tableName] of TRIGGERS) {
		await client.query(
			`DROP TRIGGER IF EXISTS "${triggerName}" ON "${tableName}"`,
		);
		const eventClause =
			tableName === "user"
				? 'AFTER UPDATE OF "email"'
				: "AFTER INSERT OR UPDATE OR DELETE";
		await client.query(`CREATE TRIGGER "${triggerName}"
			${eventClause} ON "${tableName}"
			FOR EACH ROW
			EXECUTE FUNCTION "${TRIGGER_FUNCTION}"()`);
	}

	// Fail the migration instead of creating permanently undeliverable events.
	const invalidRoles = await client.query<{ invalid: boolean }>(`SELECT EXISTS(
		SELECT 1 FROM "member"
		WHERE jsonb_array_length("${NORMALIZE_ROLES_FUNCTION}"("role")) = 0
	) AS "invalid"`);
	if (invalidRoles.rows[0]?.invalid === true) {
		throw new Error("Organization membership contains an empty role");
	}

	// Stable dedupe keys make bootstrap idempotent. Trigger installation holds
	// write locks until commit, so this backfill is one complete source snapshot.
	await client.query(`SELECT "${APPEND_FUNCTION}"(
		'organization.upserted',
		jsonb_build_object(
			'id', "id", 'name', "name", 'slug', "slug", 'status', 'active'
		),
		NULL,
		'backfill:organization:' || "id"
	)
	FROM "organization"
	ORDER BY "id"`);
	await client.query(`SELECT "${APPEND_FUNCTION}"(
		'organization.membership.upserted',
		jsonb_build_object('id', membership."organizationId"),
		jsonb_build_object(
			'subject', membership."userId",
			'email', identity_user."email",
			'roles', "${NORMALIZE_ROLES_FUNCTION}"(membership."role"),
			'status', 'active'
		),
		'backfill:membership:' || membership."organizationId" || ':' || membership."userId"
	)
	FROM "member" AS membership
	JOIN "user" AS identity_user ON identity_user."id" = membership."userId"
	ORDER BY membership."organizationId", membership."userId"`);
};

/** Checks the outbox table, sequence, capture functions, and all source triggers. */
export const getOrganizationIdentityOutboxInvariantReadiness = async (
	database: CinaAuthDatabase | PoolClient,
): Promise<OrganizationIdentityOutboxInvariantReadiness> => {
	const result = await database.query<InvariantInstalledRow>(`SELECT (
		to_regclass('${ORGANIZATION_IDENTITY_OUTBOX_TABLE}') IS NOT NULL
		AND to_regclass('${OUTBOX_SEQUENCE}') IS NOT NULL
		AND to_regclass('${OUTBOX_CLOCK_TABLE}') IS NOT NULL
		AND (
			SELECT COUNT(*) = 2
			FROM information_schema.columns
			WHERE table_schema = current_schema()
				AND table_name = '${OUTBOX_CLOCK_TABLE}'
				AND column_name IN ('aggregate_key', 'last_occurred_at')
		)
		AND (
			SELECT COUNT(*) = 15
			FROM information_schema.columns
			WHERE table_schema = current_schema()
				AND table_name = '${ORGANIZATION_IDENTITY_OUTBOX_TABLE}'
				AND column_name IN (
					'id', 'event_id', 'event_type', 'aggregate_key', 'payload',
					'occurred_at', 'available_at', 'locked_until', 'lock_token',
					'attempts', 'last_error', 'queued_at', 'created_at',
					'dedupe_key', 'replay_count'
				)
		)
		AND (
			SELECT COUNT(*) = 3
			FROM pg_proc function_definition
			JOIN pg_namespace function_namespace
				ON function_namespace.oid = function_definition.pronamespace
			WHERE function_namespace.nspname = current_schema()
				AND function_definition.proname IN (
					'${NORMALIZE_ROLES_FUNCTION}',
					'${APPEND_FUNCTION}',
					'${TRIGGER_FUNCTION}'
				)
		)
		AND (
			SELECT COUNT(*) = 3
			FROM pg_trigger trigger_definition
			JOIN pg_class relation ON relation.oid = trigger_definition.tgrelid
			JOIN pg_namespace relation_namespace
				ON relation_namespace.oid = relation.relnamespace
			JOIN pg_proc trigger_function
				ON trigger_function.oid = trigger_definition.tgfoid
			WHERE NOT trigger_definition.tgisinternal
				AND trigger_definition.tgenabled IN ('O', 'A')
				AND relation_namespace.nspname = current_schema()
				AND trigger_function.proname = '${TRIGGER_FUNCTION}'
				AND (trigger_definition.tgname, relation.relname) IN (
					('cinaauth_cinatoken_identity_organization_v1', 'organization'),
					('cinaauth_cinatoken_identity_member_v1', 'member'),
					('cinaauth_cinatoken_identity_user_email_v1', 'user')
				)
		)
	) AS "ready"
	/* cinaauth_cinatoken_identity_outbox_invariant_ready */`);

	return {
		id: ORGANIZATION_IDENTITY_OUTBOX_INVARIANT_ID,
		ready: result.rows[0]?.ready === true,
	};
};
