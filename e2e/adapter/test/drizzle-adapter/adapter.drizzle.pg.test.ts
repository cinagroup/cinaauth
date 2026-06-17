import { execSync } from "node:child_process";
import { drizzleAdapter } from "@cinaauth/drizzle-adapter";
import { testAdapter } from "@cinaauth/test-utils/adapter";
import { drizzle } from "drizzle-orm/node-postgres";
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
import { generateDrizzleSchema, resetGenerationCount } from "./generate-schema";

const pgDB = new Pool({
	connectionString: "postgres://user:password@localhost:5432/cinaauth",
});

const cleanupDatabase = async (shouldDestroy = false) => {
	await pgDB.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
	if (shouldDestroy) {
		await pgDB.end();
	}
};

const { execute } = await testAdapter({
	adapter: async (options) => {
		const { schema } = await generateDrizzleSchema(pgDB, options, "pg");
		return drizzleAdapter(drizzle(pgDB, { schema }), {
			debugLogs: { isRunningAdapterTests: true },
			schema,
			provider: "pg",
			transaction: true,
		});
	},
	async runMigrations(CinaAuthOptions) {
		await cleanupDatabase();
		const { fileName } = await generateDrizzleSchema(
			pgDB,
			CinaAuthOptions,
			"pg",
		);

		const command = `npx drizzle-kit push --dialect=postgresql --schema=${fileName}.ts --url=postgres://user:password@localhost:5432/cinaauth`;
		console.log(`Running: ${command}`);
		console.log(`Options:`, CinaAuthOptions);
		try {
			// wait for the above console.log to be printed
			await new Promise((resolve) => setTimeout(resolve, 10));
			execSync(command, {
				cwd: import.meta.dirname,
				stdio: "inherit",
			});
		} catch (error) {
			console.error("Failed to push drizzle schema (pg):", error);
			throw error;
		}
	},
	prefixTests: "pg",
	tests: [
		normalTestSuite(),
		transactionsTestSuite({ disableTests: { ALL: true } }),
		authFlowTestSuite(),
		numberIdTestSuite(),
		joinsTestSuite(),
		uuidTestSuite(),
		caseInsensitiveTestSuite(),
	],
	async onFinish() {
		await cleanupDatabase(true);
		resetGenerationCount();
	},
});

execute();
