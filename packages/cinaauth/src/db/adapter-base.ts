import type { CinaAuthOptions } from "@cinaauth/core";
import { getAuthTables } from "@cinaauth/core/db";
import type { DBAdapter } from "@cinaauth/core/db/adapter";
import { logger } from "@cinaauth/core/env";
import type { MemoryDB } from "@cinaauth/memory-adapter";

export async function getBaseAdapter(
	options: CinaAuthOptions,
	handleDirectDatabase: (
		options: CinaAuthOptions,
	) => Promise<DBAdapter<CinaAuthOptions>>,
): Promise<DBAdapter<CinaAuthOptions>> {
	let adapter: DBAdapter<CinaAuthOptions>;

	if (!options.database) {
		const tables = getAuthTables(options);
		const memoryDB = Object.keys(tables).reduce<MemoryDB>((acc, key) => {
			acc[key] = [];
			return acc;
		}, {});
		const { memoryAdapter } = await import("@cinaauth/memory-adapter");
		adapter = memoryAdapter(memoryDB)(options);
	} else if (typeof options.database === "function") {
		adapter = options.database(options);
	} else {
		adapter = await handleDirectDatabase(options);
	}

	// patch for 1.3.x to ensure we have a transaction function in the adapter
	if (!adapter.transaction) {
		logger.warn(
			"Adapter does not correctly implement transaction function, patching it automatically. Please update your adapter implementation.",
		);
		adapter.transaction = async (cb) => {
			return cb(adapter);
		};
	}

	return adapter;
}
