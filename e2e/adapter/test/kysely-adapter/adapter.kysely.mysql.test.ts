import { kyselyAdapter } from "@cinaauth/kysely-adapter";
import { testAdapter } from "@cinaauth/test-utils/adapter";
import { getMigrations } from "cinaauth/db/migration";
import { Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2/promise";
import { assert } from "vitest";
import {
	authFlowTestSuite,
	caseInsensitiveTestSuite,
	joinsTestSuite,
	normalTestSuite,
	numberIdTestSuite,
	transactionsTestSuite,
	uuidTestSuite,
} from "../adapter-factory";

const mysqlDB = createPool({
	uri: "mysql://user:password@localhost:3307/cinaauth",
	timezone: "Z",
});

const kyselyDB = new Kysely({
	dialect: new MysqlDialect(mysqlDB),
});

const { execute } = await testAdapter({
	adapter: () =>
		kyselyAdapter(kyselyDB, {
			type: "mysql",
			debugLogs: { isRunningAdapterTests: true },
		}),
	async runMigrations(CinaAuthOptions) {
		await mysqlDB.query("DROP DATABASE IF EXISTS cinaauth");
		await mysqlDB.query("CREATE DATABASE cinaauth");
		await mysqlDB.query("USE cinaauth");
		const opts = Object.assign(CinaAuthOptions, { database: mysqlDB });
		const { runMigrations } = await getMigrations(opts);
		await runMigrations();

		// ensure migrations were run successfully
		const [tables_result] = (await mysqlDB.query("SHOW TABLES")) as unknown as [
			{ Tables_in_cinaauth: string }[],
		];
		const tables = tables_result.map((table) => table.Tables_in_cinaauth);
		assert(tables.length > 0, "No tables found");
	},
	prefixTests: "mysql",
	tests: [
		normalTestSuite(),
		transactionsTestSuite({ disableTests: { ALL: true } }),
		authFlowTestSuite(),
		numberIdTestSuite(),
		joinsTestSuite(),
		uuidTestSuite(),
		caseInsensitiveTestSuite({
			disableTests: {
				"findOne - eq with mode sensitive (default) should not match different case": true,
			},
		}),
	],
	async onFinish() {
		await mysqlDB.end();
	},
});
execute();
