import type { Pool, PoolClient } from "pg";

type LegacyRow = Record<string, unknown>;

type MigrationSqlClient = {
	query: (
		text: string,
		values?: readonly unknown[],
	) => Promise<{ rows: LegacyRow[] }>;
};

type LegacyTableSpec = {
	table: string;
	columns: readonly string[];
	sourceColumns: readonly string[];
	ignoredSourceColumns: readonly string[];
	dateColumns: ReadonlySet<string>;
	booleanColumns: ReadonlySet<string>;
};

type TableMigrationSummary = {
	table: string;
	sourceRows: number;
	targetRows: number;
};

const tableSpec = (
	table: string,
	columns: readonly string[],
	options: {
		dateColumns?: readonly string[];
		booleanColumns?: readonly string[];
		ignoredSourceColumns?: readonly string[];
	} = {},
): LegacyTableSpec => ({
	table,
	columns,
	sourceColumns: [...columns, ...(options.ignoredSourceColumns ?? [])],
	ignoredSourceColumns: options.ignoredSourceColumns ?? [],
	dateColumns: new Set(options.dateColumns ?? []),
	booleanColumns: new Set(options.booleanColumns ?? []),
});

/**
 * Exact CinaAuth tables present in the legacy production D1 database. The
 * order keeps referenced users and organizations ahead of foreign-key rows.
 */
export const LEGACY_D1_TABLES = [
	tableSpec(
		"user",
		[
			"id",
			"name",
			"email",
			"emailVerified",
			"image",
			"createdAt",
			"updatedAt",
			"twoFactorEnabled",
			"role",
			"banned",
			"banReason",
			"banExpires",
		],
		{
			dateColumns: ["createdAt", "updatedAt", "banExpires"],
			booleanColumns: ["emailVerified", "twoFactorEnabled", "banned"],
		},
	),
	tableSpec(
		"organization",
		["id", "name", "slug", "logo", "createdAt", "metadata"],
		{ dateColumns: ["createdAt"] },
	),
	tableSpec(
		"account",
		[
			"id",
			"accountId",
			"providerId",
			"userId",
			"accessToken",
			"refreshToken",
			"idToken",
			"accessTokenExpiresAt",
			"refreshTokenExpiresAt",
			"scope",
			"password",
			"createdAt",
			"updatedAt",
		],
		{
			dateColumns: [
				"accessTokenExpiresAt",
				"refreshTokenExpiresAt",
				"createdAt",
				"updatedAt",
			],
		},
	),
	tableSpec(
		"session",
		[
			"id",
			"expiresAt",
			"token",
			"createdAt",
			"updatedAt",
			"ipAddress",
			"userAgent",
			"userId",
			"activeOrganizationId",
			"impersonatedBy",
		],
		{ dateColumns: ["expiresAt", "createdAt", "updatedAt"] },
	),
	tableSpec(
		"verification",
		["id", "identifier", "value", "expiresAt", "createdAt", "updatedAt"],
		{ dateColumns: ["expiresAt", "createdAt", "updatedAt"] },
	),
	tableSpec(
		"apikey",
		[
			"id",
			"configId",
			"name",
			"start",
			"referenceId",
			"prefix",
			"key",
			"refillInterval",
			"refillAmount",
			"lastRefillAt",
			"enabled",
			"rateLimitEnabled",
			"rateLimitTimeWindow",
			"rateLimitMax",
			"requestCount",
			"remaining",
			"lastRequest",
			"expiresAt",
			"createdAt",
			"updatedAt",
			"permissions",
			"metadata",
		],
		{
			dateColumns: [
				"lastRefillAt",
				"lastRequest",
				"expiresAt",
				"createdAt",
				"updatedAt",
			],
			booleanColumns: ["enabled", "rateLimitEnabled"],
		},
	),
	tableSpec(
		"auditLog",
		[
			"id",
			"timestamp",
			"actorId",
			"actorRole",
			"actorIp",
			"actorUa",
			"actorSite",
			"category",
			"action",
			"targetType",
			"targetId",
			"result",
			"metadata",
		],
		{ dateColumns: ["timestamp"] },
	),
	tableSpec("member", ["id", "organizationId", "userId", "role", "createdAt"], {
		dateColumns: ["createdAt"],
	}),
	tableSpec(
		"invitation",
		[
			"id",
			"organizationId",
			"email",
			"role",
			"status",
			"expiresAt",
			"createdAt",
			"inviterId",
		],
		{ dateColumns: ["expiresAt", "createdAt"] },
	),
	tableSpec(
		"jwks",
		["id", "publicKey", "privateKey", "createdAt", "expiresAt"],
		{ dateColumns: ["createdAt", "expiresAt"] },
	),
	tableSpec(
		"twoFactor",
		[
			"id",
			"secret",
			"backupCodes",
			"userId",
			"verified",
			"failedVerificationCount",
			"lockedUntil",
		],
		{
			dateColumns: ["lockedUntil"],
			booleanColumns: ["verified"],
		},
	),
	tableSpec(
		"walletAddress",
		["id", "userId", "address", "chainId", "isPrimary", "createdAt"],
		{
			dateColumns: ["createdAt"],
			booleanColumns: ["isPrimary"],
			// The legacy table was created manually with this unused column. The
			// current SIWE schema has no updatedAt field, and production has no rows.
			ignoredSourceColumns: ["updatedAt"],
		},
	),
] as const;

export const D1_CUTOVER_MARKER_TABLE = "cinaauth_cutover_history";
export const D1_CUTOVER_MARKER_NAME = "d1-to-postgres-v1";

const quoteIdentifier = (identifier: string) =>
	`"${identifier.replaceAll('"', '""')}"`;

const normalizeDate = (value: unknown, table: string, column: string) => {
	if (value === null) return null;
	if (value instanceof Date && Number.isFinite(value.getTime())) return value;
	if (typeof value !== "number" && typeof value !== "string") {
		throw new TypeError(`Invalid date in ${table}.${column}`);
	}
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) {
		throw new TypeError(`Invalid date in ${table}.${column}`);
	}
	return date;
};

const normalizeBoolean = (value: unknown, table: string, column: string) => {
	if (value === null) return null;
	if (typeof value === "boolean") return value;
	if (value === 0 || value === "0" || value === "false") return false;
	if (value === 1 || value === "1" || value === "true") return true;
	throw new TypeError(`Invalid boolean in ${table}.${column}`);
};

/** Converts D1's integer booleans and mixed date encodings for PostgreSQL. */
export const normalizeLegacyValue = (
	spec: LegacyTableSpec,
	column: string,
	value: unknown,
) => {
	if (spec.dateColumns.has(column)) {
		return normalizeDate(value, spec.table, column);
	}
	if (spec.booleanColumns.has(column)) {
		return normalizeBoolean(value, spec.table, column);
	}
	if (value === undefined) {
		throw new TypeError(`Missing value for ${spec.table}.${column}`);
	}
	return value;
};

export const buildLegacyRowUpsert = (spec: LegacyTableSpec, row: LegacyRow) => {
	const columns = spec.columns.map(quoteIdentifier);
	const values = spec.columns.map((column) =>
		normalizeLegacyValue(spec, column, row[column]),
	);
	const assignments = spec.columns
		.filter((column) => column !== "id")
		.map(
			(column) =>
				`${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`,
		);
	return {
		text: `INSERT INTO ${quoteIdentifier(spec.table)} (${columns.join(", ")}) VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")}) ON CONFLICT (${quoteIdentifier("id")}) DO UPDATE SET ${assignments.join(", ")}`,
		values,
	};
};

const makeSqlClient = (client: PoolClient): MigrationSqlClient => ({
	query: async (text, values = []) => {
		const result = await client.query<Record<string, unknown>>(text, [
			...values,
		]);
		return { rows: result.rows };
	},
});

const getSourceTableNames = async (source: D1Database) => {
	const result = await source
		.prepare(
			`SELECT name FROM sqlite_master
			 WHERE type = 'table'
				AND name NOT LIKE '_cf_%'
				AND name NOT LIKE 'sqlite_%'
			 ORDER BY name`,
		)
		.all<{ name: string }>();
	return result.results.map((row) => row.name);
};

const assertExactNames = (
	actual: readonly string[],
	expected: readonly string[],
	label: string,
) => {
	const actualSet = new Set(actual);
	const expectedSet = new Set(expected);
	const missing = expected.filter((name) => !actualSet.has(name));
	const unexpected = actual.filter((name) => !expectedSet.has(name));
	if (missing.length > 0 || unexpected.length > 0) {
		throw new Error(
			`${label} mismatch (missing=${missing.join(",") || "none"}; unexpected=${unexpected.join(",") || "none"})`,
		);
	}
};

const assertSourceSchema = async (source: D1Database) => {
	const expectedTables = LEGACY_D1_TABLES.map((spec) => spec.table).sort();
	const sourceTables = await getSourceTableNames(source);
	assertExactNames(sourceTables, expectedTables, "Legacy D1 tables");

	for (const spec of LEGACY_D1_TABLES) {
		const result = await source
			.prepare(`PRAGMA table_info(${quoteIdentifier(spec.table)})`)
			.all<{ name: string }>();
		assertExactNames(
			result.results.map((row) => row.name),
			[...spec.sourceColumns],
			`Legacy D1 ${spec.table} columns`,
		);
	}
};

const assertTargetSchema = async (client: MigrationSqlClient) => {
	for (const spec of LEGACY_D1_TABLES) {
		const result = await client.query(
			`SELECT column_name AS name
			 FROM information_schema.columns
			 WHERE table_schema = ANY(current_schemas(false))
				AND table_name = $1
			 ORDER BY ordinal_position`,
			[spec.table],
		);
		const targetColumns = new Set(result.rows.map((row) => String(row.name)));
		const missing = spec.columns.filter((column) => !targetColumns.has(column));
		if (missing.length > 0) {
			throw new Error(
				`PostgreSQL ${spec.table} columns missing ${missing.join(",")}`,
			);
		}
	}
};

const getTargetRowCount = async (client: MigrationSqlClient, table: string) => {
	const result = await client.query(
		`SELECT COUNT(*)::integer AS count FROM ${quoteIdentifier(table)}`,
	);
	const count = Number(result.rows[0]?.count);
	if (!Number.isSafeInteger(count) || count < 0) {
		throw new Error(`Invalid PostgreSQL count for ${table}`);
	}
	return count;
};

const readSourceRows = async (source: D1Database) => {
	const tables = new Map<string, LegacyRow[]>();
	for (const spec of LEGACY_D1_TABLES) {
		const result = await source
			.prepare(`SELECT * FROM ${quoteIdentifier(spec.table)}`)
			.all<LegacyRow>();
		if (result.results.length > 0 && spec.ignoredSourceColumns.length > 0) {
			throw new Error(
				`Legacy D1 ${spec.table} contains rows with unsupported columns`,
			);
		}
		tables.set(spec.table, result.results);
	}
	return tables;
};

const getSourceRowCount = async (source: D1Database, table: string) => {
	const result = await source
		.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`)
		.all<{ count: number }>();
	const count = Number(result.results[0]?.count);
	if (!Number.isSafeInteger(count) || count < 0) {
		throw new Error(`Invalid D1 count for ${table}`);
	}
	return count;
};

export const previewLegacyD1Migration = async (
	source: D1Database,
	pool: Pool,
) => {
	const client = await pool.connect();
	try {
		const sql = makeSqlClient(client);
		await assertSourceSchema(source);
		await assertTargetSchema(sql);
		const tables: TableMigrationSummary[] = [];
		for (const spec of LEGACY_D1_TABLES) {
			tables.push({
				table: spec.table,
				sourceRows: await getSourceRowCount(source, spec.table),
				targetRows: await getTargetRowCount(sql, spec.table),
			});
		}
		return { compatible: true, tables };
	} finally {
		client.release();
	}
};

/**
 * Copies one maintenance-mode D1 snapshot into PostgreSQL in a single
 * transaction. Every row is upserted by primary key and exact table counts are
 * checked before commit, making retries safe while the target remains isolated.
 */
export const migrateLegacyD1ToPostgres = async (
	source: D1Database,
	pool: Pool,
) => {
	const client = await pool.connect();
	const sql = makeSqlClient(client);
	try {
		await assertSourceSchema(source);
		await assertTargetSchema(sql);
		const sourceRows = await readSourceRows(source);
		await sql.query("BEGIN");
		try {
			for (const spec of LEGACY_D1_TABLES) {
				for (const row of sourceRows.get(spec.table) ?? []) {
					const query = buildLegacyRowUpsert(spec, row);
					await sql.query(query.text, query.values);
				}
			}

			const tables: TableMigrationSummary[] = [];
			for (const spec of LEGACY_D1_TABLES) {
				const sourceCount = sourceRows.get(spec.table)?.length ?? 0;
				const targetCount = await getTargetRowCount(sql, spec.table);
				if (targetCount !== sourceCount) {
					throw new Error(`Row-count mismatch for ${spec.table}`);
				}
				tables.push({
					table: spec.table,
					sourceRows: sourceCount,
					targetRows: targetCount,
				});
			}

			await sql.query(
				`CREATE TABLE IF NOT EXISTS ${quoteIdentifier(D1_CUTOVER_MARKER_TABLE)} (
					"name" text PRIMARY KEY,
					"completedAt" timestamptz NOT NULL,
					"sourceCounts" jsonb NOT NULL
				)`,
			);
			await sql.query(
				`INSERT INTO ${quoteIdentifier(D1_CUTOVER_MARKER_TABLE)} ("name", "completedAt", "sourceCounts")
				 VALUES ($1, NOW(), $2::jsonb)
				 ON CONFLICT ("name") DO UPDATE SET
					"completedAt" = EXCLUDED."completedAt",
					"sourceCounts" = EXCLUDED."sourceCounts"`,
				[
					D1_CUTOVER_MARKER_NAME,
					JSON.stringify(
						Object.fromEntries(
							tables.map((table) => [table.table, table.sourceRows]),
						),
					),
				],
			);

			await sql.query("COMMIT");
			return { migrated: true, tables };
		} catch (error) {
			await sql.query("ROLLBACK");
			throw error;
		}
	} finally {
		client.release();
	}
};
