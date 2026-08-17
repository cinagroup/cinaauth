import type { PoolClient } from "pg";
import type { CinaAuthDatabase } from "./database";

export const SOCIAL_SIGN_IN_INVARIANT_ID = "social-sign-in-config-v1";

/** Upper bound for advertised federated login options on the sign-in page. */
export const MAX_SOCIAL_PROVIDER_LIMIT = 20;

type InvariantInstalledRow = { ready: boolean };
type InvariantTablesRow = { ready: boolean };

export type SocialSignInInvariantReadiness = {
	id: typeof SOCIAL_SIGN_IN_INVARIANT_ID;
	ready: boolean;
};

/**
 * Installs the runtime social sign-in configuration tables inside the
 * caller-owned migration transaction. All statements are idempotent so a
 * re-run migration never disturbs staged credentials.
 */
export const installSocialSignInInvariant = async (
	client: PoolClient,
): Promise<void> => {
	await client.query(`CREATE TABLE IF NOT EXISTS "cinaauth_social_provider" (
		"provider_id" TEXT PRIMARY KEY,
		"kind" TEXT NOT NULL,
		"client_id" TEXT NOT NULL,
		"client_secret" TEXT NOT NULL,
		"enabled" BOOLEAN NOT NULL DEFAULT TRUE,
		"config" JSONB,
		"updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
		"updated_by" TEXT NOT NULL,
		CONSTRAINT "cinaauth_social_provider_kind_check"
			CHECK ("kind" IN ('social', 'generic'))
	)`);
	await client.query(`CREATE TABLE IF NOT EXISTS "cinaauth_sign_in_settings" (
		"singleton" BOOLEAN PRIMARY KEY DEFAULT TRUE,
		"social_provider_limit" INTEGER NOT NULL DEFAULT ${MAX_SOCIAL_PROVIDER_LIMIT},
		"email_otp_login_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
		"updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
		"updated_by" TEXT NOT NULL,
		CONSTRAINT "cinaauth_sign_in_settings_singleton_check" CHECK ("singleton"),
		CONSTRAINT "cinaauth_sign_in_settings_limit_check"
			CHECK ("social_provider_limit" BETWEEN 0 AND ${MAX_SOCIAL_PROVIDER_LIMIT})
	)`);
	// Existing deployments created the table before the OTP login toggle existed.
	await client.query(`ALTER TABLE "cinaauth_sign_in_settings"
		ADD COLUMN IF NOT EXISTS "email_otp_login_enabled" BOOLEAN NOT NULL DEFAULT TRUE`);
	await client.query(`INSERT INTO "cinaauth_sign_in_settings"
		("singleton", "social_provider_limit", "updated_by")
		VALUES (TRUE, ${MAX_SOCIAL_PROVIDER_LIMIT}, 'system')
		ON CONFLICT ("singleton") DO NOTHING`);
};

/** Checks that both configuration tables exist and the settings row is present. */
export const getSocialSignInInvariantReadiness = async (
	database: CinaAuthDatabase | PoolClient,
): Promise<SocialSignInInvariantReadiness> => {
	// to_regclass keeps this inspection error-free before the first install.
	const tables = await database.query<InvariantTablesRow>(
		`SELECT (
			to_regclass('cinaauth_social_provider') IS NOT NULL
			AND to_regclass('cinaauth_sign_in_settings') IS NOT NULL
		) AS "ready"
		/* cinaauth_social_sign_in_tables_ready */`,
	);
	if (tables.rows[0]?.ready !== true) {
		return { id: SOCIAL_SIGN_IN_INVARIANT_ID, ready: false };
	}
	const settings = await database.query<InvariantInstalledRow>(
		`SELECT EXISTS(
			SELECT 1
			FROM "cinaauth_sign_in_settings" settings
			WHERE settings."singleton" = TRUE
		) AS "ready"
		/* cinaauth_social_sign_in_invariant_ready */`,
	);
	return {
		id: SOCIAL_SIGN_IN_INVARIANT_ID,
		ready: settings.rows[0]?.ready === true,
	};
};
