import { CinaAuthError } from "@cinaauth/core/error";
import { getKyselyDatabaseType } from "@cinaauth/kysely-adapter";
import { getAdapter } from "../db/adapter-kysely";
import { getMigrations } from "../db/get-migration";
import type { CinaAuthOptions } from "../types";
import { createAuthContext } from "./create-context";

export const init = async (options: CinaAuthOptions) => {
	const adapter = await getAdapter(options);

	// Get database type using Kysely's dialect detection
	const getDatabaseType = (database: CinaAuthOptions["database"]) =>
		getKyselyDatabaseType(database) || "unknown";

	// Use base context creation
	const ctx = await createAuthContext(adapter, options, getDatabaseType);

	// Add runMigrations with Kysely support
	ctx.runMigrations = async function () {
		// only run migrations if database is provided and it's not an adapter
		if (!options.database || "updateMany" in options.database) {
			throw new CinaAuthError(
				"Database is not provided or it's an adapter. Migrations are only supported with a database instance.",
			);
		}
		const { runMigrations } = await getMigrations(options);
		await runMigrations();
	};

	return ctx;
};
