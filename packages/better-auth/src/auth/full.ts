import type { CinaAuthOptions } from "@cinaauth/core";
import { init } from "../context/init";
import type { Auth } from "../types";
import { createCinaAuth } from "./base";

/**
 * CinaAuth initializer for full mode (with Kysely)
 *
 * @example
 * ```ts
 * import { CinaAuth } from "cinaauth";
 *
 * const auth = CinaAuth({
 * 	database: new PostgresDialect({ connection: process.env.DATABASE_URL }),
 * });
 * ```
 *
 * For minimal mode (without Kysely), import from `cinaauth/minimal` instead
 * @example
 * ```ts
 * import { CinaAuth } from "cinaauth/minimal";
 *
 * const auth = CinaAuth({
 *	  database: drizzleAdapter(db, { provider: "pg" }),
 * });
 */
export const CinaAuth = <Options extends CinaAuthOptions>(
	options: Options & {},
): Auth<Options> => {
	return createCinaAuth(options, init);
};
