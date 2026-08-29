import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import type { CinaAuthDatabase } from "../src/database";
import {
	getSocialSignInInvariantReadiness,
	installSocialSignInInvariant,
	SOCIAL_SIGN_IN_INVARIANT_ID,
} from "../src/social-sign-in-invariant";

const createInstallClient = () => {
	const queries: string[] = [];
	const query = vi.fn(async (text: string) => {
		queries.push(text);
		return { rows: [] };
	});
	return {
		client: { query } as unknown as PoolClient,
		queries,
	};
};

const createReadinessDatabase = ({
	tablesReady,
	settingsReady,
}: {
	tablesReady: boolean;
	settingsReady: boolean;
}) => {
	const query = vi.fn(async (text: string) => {
		if (text.includes("cinaauth_social_sign_in_tables_ready")) {
			return { rows: [{ ready: tablesReady }] };
		}
		if (text.includes("cinaauth_social_sign_in_invariant_ready")) {
			return { rows: [{ ready: settingsReady }] };
		}
		throw new Error("Unexpected readiness query");
	});
	return { database: { query } as unknown as CinaAuthDatabase, query };
};

describe("social sign-in configuration invariant", () => {
	it("creates both tables idempotently and seeds the default settings row", async () => {
		const { client, queries } = createInstallClient();
		await installSocialSignInInvariant(client);
		expect(queries).toHaveLength(4);
		expect(queries[0]).toContain(
			'CREATE TABLE IF NOT EXISTS "cinaauth_social_provider"',
		);
		expect(queries[0]).toContain("CHECK (\"kind\" IN ('social', 'generic'))");
		expect(queries[1]).toContain(
			'CREATE TABLE IF NOT EXISTS "cinaauth_sign_in_settings"',
		);
		expect(queries[1]).toContain("BETWEEN 0 AND 20");
		expect(queries[1]).toContain(
			'"email_otp_login_enabled" BOOLEAN NOT NULL DEFAULT TRUE',
		);
		expect(queries[1]).toContain(
			'"email_password_login_enabled" BOOLEAN NOT NULL DEFAULT FALSE',
		);
		expect(queries[1]).toContain(
			'"passkey_login_enabled" BOOLEAN NOT NULL DEFAULT FALSE',
		);
		expect(queries[1]).toContain(
			'"siwe_login_enabled" BOOLEAN NOT NULL DEFAULT TRUE',
		);
		expect(queries[1]).toContain(
			'"google_one_tap_enabled" BOOLEAN NOT NULL DEFAULT FALSE',
		);
		expect(queries[2]).toContain('ALTER TABLE "cinaauth_sign_in_settings"');
		for (const column of [
			'"email_otp_login_enabled" BOOLEAN NOT NULL DEFAULT TRUE',
			'"email_password_login_enabled" BOOLEAN NOT NULL DEFAULT FALSE',
			'"passkey_login_enabled" BOOLEAN NOT NULL DEFAULT FALSE',
			'"siwe_login_enabled" BOOLEAN NOT NULL DEFAULT TRUE',
			'"google_one_tap_enabled" BOOLEAN NOT NULL DEFAULT FALSE',
		]) {
			expect(queries[2]).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
		}
		expect(queries[3]).toContain('INSERT INTO "cinaauth_sign_in_settings"');
		expect(queries[3]).toContain('ON CONFLICT ("singleton") DO NOTHING');
	});

	it("reports ready only when both tables and the settings row exist", async () => {
		const ready = createReadinessDatabase({
			tablesReady: true,
			settingsReady: true,
		});
		await expect(
			getSocialSignInInvariantReadiness(ready.database),
		).resolves.toEqual({ id: SOCIAL_SIGN_IN_INVARIANT_ID, ready: true });

		const missingTables = createReadinessDatabase({
			tablesReady: false,
			settingsReady: true,
		});
		await expect(
			getSocialSignInInvariantReadiness(missingTables.database),
		).resolves.toEqual({ id: SOCIAL_SIGN_IN_INVARIANT_ID, ready: false });
		expect(missingTables.query).toHaveBeenCalledTimes(1);

		const missingSettings = createReadinessDatabase({
			tablesReady: true,
			settingsReady: false,
		});
		await expect(
			getSocialSignInInvariantReadiness(missingSettings.database),
		).resolves.toEqual({ id: SOCIAL_SIGN_IN_INVARIANT_ID, ready: false });
	});
});
