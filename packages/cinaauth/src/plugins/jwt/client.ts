import type {
	CinaAuthClientOptions,
	CinaAuthClientPlugin,
	ClientFetchOption,
	ClientStore,
} from "@cinaauth/core";
import type { BetterFetch } from "@better-fetch/fetch";
import type { JSONWebKeySet } from "jose";
import { PACKAGE_VERSION } from "../../version";
import type { jwt } from "./index";

interface JwtClientOptions {
	jwks?: {
		/**
		 * The path of the endpoint exposing the JWKS.
		 * Must match the server configuration.
		 *
		 * @default /jwks
		 */
		jwksPath?: string;
	};
}

export const jwtClient = (options?: JwtClientOptions) => {
	const jwksPath = options?.jwks?.jwksPath ?? "/jwks";

	return {
		id: "cinaauth-client",
		version: PACKAGE_VERSION,
		$InferServerPlugin: {} as ReturnType<typeof jwt>,
		pathMethods: {
			[jwksPath]: "GET",
		},
		getActions: (
			$fetch: BetterFetch,
			_$store: ClientStore,
			_options: CinaAuthClientOptions | undefined,
		) => ({
			jwks: async (fetchOptions?: ClientFetchOption) => {
				return await $fetch<JSONWebKeySet>(jwksPath, {
					method: "GET",
					...fetchOptions,
				});
			},
		}),
	} satisfies CinaAuthClientPlugin;
};

export type * from "./types";
