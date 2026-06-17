import { getMigrations } from "cinaauth/db/migration";
import type { SchemaGenerator } from "./types";

export const generateKyselySchema: SchemaGenerator = async ({
	options,
	file,
}) => {
	const { compileMigrations } = await getMigrations(options);
	const migrations = await compileMigrations();
	return {
		code: migrations.trim() === ";" ? "" : migrations,
		fileName:
			file ||
			`./cinaauth_migrations/${new Date()
				.toISOString()
				.replace(/:/g, "-")}.sql`,
	};
};
