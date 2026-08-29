import type { PoolClient } from "pg";
import type { CinaAuthDatabase } from "./database";
import {
	getOrganizationIdentityOutboxInvariantReadiness,
	installOrganizationIdentityOutboxInvariant,
	ORGANIZATION_IDENTITY_OUTBOX_INVARIANT_ID,
} from "./organization-identity-outbox-invariant";
import {
	getProviderNamespaceInvariantReadiness,
	installProviderNamespaceInvariant,
	PROVIDER_NAMESPACE_INVARIANT_ID,
} from "./provider-namespace-invariant";
import {
	getSocialSignInInvariantReadiness,
	installSocialSignInInvariant,
	SOCIAL_SIGN_IN_INVARIANT_ID,
} from "./social-sign-in-invariant";
import {
	getSuperAdminDatabaseInvariantReadiness,
	installSuperAdminDatabaseInvariant,
	SUPER_ADMIN_DATABASE_INVARIANT_ID,
} from "./super-admin-database-invariant";

const INVARIANT_INSTALL_LOCK_TIMEOUT_MS = 10_000;
const INVARIANT_INSTALL_STATEMENT_TIMEOUT_MS = 30_000;

type DatabaseInvariantTarget = CinaAuthDatabase | PoolClient;

export type DatabaseInvariantDefinition = {
	readonly id: string;
	install: (client: PoolClient) => Promise<void>;
	getReadiness: (
		database: DatabaseInvariantTarget,
	) => Promise<{ id: string; ready: boolean }>;
};

export type DatabaseInvariantReadiness = {
	ok: boolean;
	required: string[];
	installed: string[];
	missing: string[];
};

export const DATABASE_INVARIANT_IDS = [
	SUPER_ADMIN_DATABASE_INVARIANT_ID,
	PROVIDER_NAMESPACE_INVARIANT_ID,
	SOCIAL_SIGN_IN_INVARIANT_ID,
	ORGANIZATION_IDENTITY_OUTBOX_INVARIANT_ID,
] as const;

const getDatabaseInvariantDefinitions = (
	configuredProviderIds: readonly string[],
): readonly DatabaseInvariantDefinition[] => [
	{
		id: SUPER_ADMIN_DATABASE_INVARIANT_ID,
		install: installSuperAdminDatabaseInvariant,
		getReadiness: getSuperAdminDatabaseInvariantReadiness,
	},
	{
		id: PROVIDER_NAMESPACE_INVARIANT_ID,
		install: (client) =>
			installProviderNamespaceInvariant(client, configuredProviderIds),
		getReadiness: (database) =>
			getProviderNamespaceInvariantReadiness(database, configuredProviderIds),
	},
	{
		id: SOCIAL_SIGN_IN_INVARIANT_ID,
		install: installSocialSignInInvariant,
		getReadiness: getSocialSignInInvariantReadiness,
	},
	{
		id: ORGANIZATION_IDENTITY_OUTBOX_INVARIANT_ID,
		install: installOrganizationIdentityOutboxInvariant,
		getReadiness: getOrganizationIdentityOutboxInvariantReadiness,
	},
];

const inspectDatabaseInvariants = async (
	database: DatabaseInvariantTarget,
	invariants: readonly DatabaseInvariantDefinition[],
): Promise<DatabaseInvariantReadiness> => {
	const required = invariants.map((invariant) => invariant.id);
	const installed: string[] = [];
	for (const invariant of invariants) {
		const readiness = await invariant.getReadiness(database);
		if (readiness.id !== invariant.id) {
			throw new Error(`Unexpected database invariant id: ${readiness.id}`);
		}
		if (readiness.ready) installed.push(invariant.id);
	}
	const installedSet = new Set(installed);
	const missing = required.filter((id) => !installedSet.has(id));
	return {
		ok: missing.length === 0,
		required,
		installed,
		missing,
	};
};

/** Inspect deployment-owned PostgreSQL invariants without mutating schema. */
export const getDatabaseInvariantReadiness = (
	database: CinaAuthDatabase,
	configuredProviderIds: readonly string[] = [],
	invariants: readonly DatabaseInvariantDefinition[] = getDatabaseInvariantDefinitions(
		configuredProviderIds,
	),
) => inspectDatabaseInvariants(database, invariants);

/**
 * Install every deployment-owned invariant in one PostgreSQL transaction.
 * Readiness is rechecked before commit so a partially effective definition is
 * never reported as an applied migration.
 */
export const installDatabaseInvariants = async (
	database: CinaAuthDatabase,
	configuredProviderIds: readonly string[] = [],
	invariants: readonly DatabaseInvariantDefinition[] = getDatabaseInvariantDefinitions(
		configuredProviderIds,
	),
): Promise<DatabaseInvariantReadiness> => {
	const client = await database.connect();
	let transactionStarted = false;
	try {
		await client.query("BEGIN");
		transactionStarted = true;
		await client.query(
			`SET LOCAL lock_timeout = '${INVARIANT_INSTALL_LOCK_TIMEOUT_MS}ms'`,
		);
		await client.query(
			`SET LOCAL statement_timeout = '${INVARIANT_INSTALL_STATEMENT_TIMEOUT_MS}ms'`,
		);
		for (const invariant of invariants) {
			await invariant.install(client);
		}

		const readiness = await inspectDatabaseInvariants(client, invariants);
		if (!readiness.ok) {
			throw new Error(
				`Database invariant verification failed: ${readiness.missing.join(", ")}`,
			);
		}

		await client.query("COMMIT");
		transactionStarted = false;
		return readiness;
	} catch (error) {
		if (transactionStarted) {
			await client.query("ROLLBACK").catch(() => undefined);
		}
		throw error;
	} finally {
		client.release();
	}
};

/** Fail closed when one mutation-critical database invariant is unavailable. */
export const assertDatabaseInvariantReady = async (
	database: CinaAuthDatabase,
	invariant: DatabaseInvariantDefinition,
) => {
	const readiness = await inspectDatabaseInvariants(database, [invariant]);
	if (!readiness.ok) {
		throw new Error(
			`Required database invariant is unavailable: ${invariant.id}`,
		);
	}
};

export const SUPER_ADMIN_INVARIANT_DEFINITION: DatabaseInvariantDefinition = {
	id: SUPER_ADMIN_DATABASE_INVARIANT_ID,
	install: installSuperAdminDatabaseInvariant,
	getReadiness: getSuperAdminDatabaseInvariantReadiness,
};
