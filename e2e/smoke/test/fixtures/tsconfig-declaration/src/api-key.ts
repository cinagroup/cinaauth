import { apiKey } from "@cinaauth/api-key";
import { CinaAuth } from "cinaauth";

/**
 * @see https://github.com/cinagroup/cinaauth/issues/9757
 *
 * Declaration emit must not produce TS4023 for MiddlewareOptions
 * when using the api-key plugin.
 */
export const auth = CinaAuth({
	plugins: [apiKey()],
});
