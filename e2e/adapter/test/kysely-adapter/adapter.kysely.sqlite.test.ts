import fs from "node:fs/promises";
import path from "node:path";
import { kyselyAdapter } from "@cinaauth/kysely-adapter";
import { testAdapter } from "@cinaauth/test-utils/adapter";
import Database from "better-sqlite3";
import { getMigrations } from "cinaauth/db/migration";
import { Kysely, SqliteDialect } from "kysely";
import {
	authFlowTestSuite,
	caseInsensitiveTestSuite,
	joinsTestSuite,
	normalTestSuite,
	numberIdTestSuite,
	transactionsTestSuite,
	uuidTestSuite,
} from "../adapter-factory";

const dbPath = path.join(__dirname, "test.db");
let database = new Database(dbPath);

let kyselyDB = new Kysely({
	dialect: new SqliteDialect({ database }),
});

const { execute } = await testAdapter({
	adapter: () => {
		return kyselyAdapter(kyselyDB, {
			type: "sqlite",
			debugLogs: { isRunningAdapterTests: true },
		});
	},
	prefixTests: "sqlite",
	async runMigrations(CinaAuthOptions) {
		database.close();
		try {
			await fs.unlink(dbPath);
		} catch {
			console.log("db doesn't exist");
		}
		database = new Database(dbPath);
		kyselyDB = new Kysely({ dialect: new SqliteDialect({ database }) });
		const opts = Object.assign(CinaAuthOptions, { database });
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
		caseInsensitiveTestSuite(),
	],
	async onFinish() {
		database.close();
	},
});
execute();
