import type { CinaAuthClientPlugin } from "@cinaauth/core";
import type { i18n } from ".";
import { PACKAGE_VERSION } from "./version";

/**
 * i18n client plugin for CinaAuth
 *
 * This client plugin provides type inference for the i18n server plugin.
 * Error messages from the server will already be translated based on
 * the detected locale.
 *
 * @example
 * ```ts
 * import { createAuthClient } from "cinaauth/client";
 * import { i18nClient } from "@cinaauth/i18n/client";
 *
 * export const client = createAuthClient({
 *   plugins: [i18nClient()],
 * });
 * ```
 */
export const i18nClient = () => {
	return {
		id: "i18n",
		version: PACKAGE_VERSION,
		$InferServerPlugin: {} as ReturnType<typeof i18n>,
	} satisfies CinaAuthClientPlugin;
};
