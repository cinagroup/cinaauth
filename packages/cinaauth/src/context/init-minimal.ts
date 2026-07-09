import type { CinaAuthOptions } from "@cinaauth/core";
import { CinaAuthError } from "@cinaauth/core/error";
import { getBaseAdapter } from "../db/adapter-base";
import { createAuthContext } from "./create-context";

export const initMinimal = async (options: CinaAuthOptions) => {
	const adapter = await getBaseAdapter(options, async () => {
		throw new CinaAuthError(
			"Direct database connection requires Kysely. Please use `cinaauth` instead of `cinaauth/minimal`, or provide an adapter (drizzleAdapter, prismaAdapter, etc.)",
		);
	});

	// Without Kysely, we can't detect database type, so always return "unknown"
	const getDatabaseType = (_database: CinaAuthOptions["database"]) => "unknown";

	// Use base context creation
	const ctx = await createAuthContext(adapter, options, getDatabaseType);

	// Add runMigrations that throws error (migrations require Kysely)
	ctx.runMigrations = async function () {
		throw new CinaAuthError(
			"Migrations are not supported in 'cinaauth/minimal'. Please use 'cinaauth' for migration support.",
		);
	};

	return ctx;
};
