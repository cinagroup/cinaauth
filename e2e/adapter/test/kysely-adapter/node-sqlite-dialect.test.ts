import { DatabaseSync } from "node:sqlite";
import { kyselyAdapter } from "@cinaauth/kysely-adapter";
import { NodeSqliteDialect } from "@cinaauth/kysely-adapter/node-sqlite-dialect";
import { testAdapter } from "@cinaauth/test-utils/adapter";
import { getMigrations } from "cinaauth/db/migration";
import { Kysely } from "kysely";
import {
	authFlowTestSuite,
	joinsTestSuite,
	normalTestSuite,
	numberIdTestSuite,
	transactionsTestSuite,
	uuidTestSuite,
} from "../adapter-factory";

let db = new DatabaseSync(":memory:");
let CinaAuthKysely = new Kysely({
	dialect: new NodeSqliteDialect({
		database: db,
	}),
});

const { execute } = await testAdapter({
	adapter: () => {
		return kyselyAdapter(CinaAuthKysely, {
			type: "sqlite",
			debugLogs: { isRunningAdapterTests: true },
		});
	},
	prefixTests: "node-sqlite",
	async runMigrations(CinaAuthOptions) {
		await CinaAuthKysely.destroy();
		db = new DatabaseSync(":memory:");
		CinaAuthKysely = new Kysely({
			dialect: new NodeSqliteDialect({
				database: db,
			}),
		});
		const opts = Object.assign(CinaAuthOptions, { database: db });
		const { runMigrations } = await getMigrations(opts);
		await runMigrations();
	},
	tests: [
		normalTestSuite(),
		transactionsTestSuite(),
		authFlowTestSuite(),
		numberIdTestSuite(),
		joinsTestSuite(),
		uuidTestSuite(),
	],
	async onFinish() {
		await CinaAuthKysely.destroy();
	},
});

execute();
