import type { CinaAuthOptions } from "@cinaauth/core";
import { initMinimal } from "../context/init-minimal";
import type { Auth } from "../types";
import { createCinaAuth } from "./base";

export type { CinaAuthOptions };

/**
 * CinaAuth initializer for minimal mode (without Kysely)
 */
export const CinaAuth = <Options extends CinaAuthOptions>(
	options: Options & {},
): Auth<Options> => {
	return createCinaAuth(options, initMinimal);
};
