import type { CinaAuthOptions } from "@cinaauth/core";
import { kyselyAdapter } from "@cinaauth/kysely-adapter";
import { testAdapter } from "@cinaauth/test-utils/adapter";
import { getMigrations } from "cinaauth/db/migration";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import {
	authFlowTestSuite,
	caseInsensitiveTestSuite,
	joinsTestSuite,
	normalTestSuite,
	numberIdTestSuite,
	transactionsTestSuite,
	uuidTestSuite,
} from "../adapter-factory";
import {
	DEFAULT_SCHEMA_REFERENCE,
	schemaRefJoinTestSuite,
	schemaRefTestSuite,
} from "./schema-reference-test-suite";

const pgDB = new Pool({
	connectionString: "postgres://user:password@localhost:5433/cinaauth",
});

const kyselyDB = new Kysely({
	dialect: new PostgresDialect({ pool: pgDB }),
});

const cleanupDatabase = async () => {
	await pgDB.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
	await pgDB.query(
		`DROP SCHEMA IF EXISTS "${DEFAULT_SCHEMA_REFERENCE}" CASCADE; CREATE SCHEMA "${DEFAULT_SCHEMA_REFERENCE}";`,
	);
};

const { execute } = await testAdapter({
	adapter: () =>
		kyselyAdapter(kyselyDB, {
			type: "postgres",
			debugLogs: { isRunningAdapterTests: true },
		}),
	prefixTests: "pg",
	async runMigrations(CinaAuthOptions) {
		await cleanupDatabase();
		const opts = Object.assign(CinaAuthOptions, {
			database: pgDB,
		} satisfies CinaAuthOptions);
		const { runMigrations } = await getMigrations(opts);
		await runMigrations();
	},
	tests: [
		normalTestSuite(),
		transactionsTestSuite({ disableTests: { ALL: true } }),
		authFlowTestSuite(),
		numberIdTestSuite(),
		joinsTestSuite(),
		uuidTestSuite(),
		caseInsensitiveTestSuite(),
		schemaRefTestSuite(),
		schemaRefJoinTestSuite(),
	],
	async onFinish() {
		await pgDB.end();
	},
});
execute();
