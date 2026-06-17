import type {
	AuthContext,
	CinaAuthOptions,
	CinaAuthPlugin,
} from "@cinaauth/core";

import type { CinaAuthPluginDBSchema } from "@cinaauth/core/db";
import type {
	ExtractPluginField,
	InferPluginFieldFromTuple,
	UnionToIntersection,
} from "./helper";

export type InferOptionSchema<S extends CinaAuthPluginDBSchema> =
	S extends Record<string, { fields: infer Fields }>
		? {
				[K in keyof S]?: {
					modelName?: string | undefined;
					fields?:
						| {
								[P in keyof Fields]?: string;
						  }
						| undefined;
				};
			}
		: never;

export type InferPluginErrorCodes<O extends CinaAuthOptions> =
	O["plugins"] extends readonly [unknown, ...unknown[]]
		? InferPluginFieldFromTuple<O["plugins"], "$ERROR_CODES">
		: O["plugins"] extends Array<infer P>
			? UnionToIntersection<ExtractPluginField<P, "$ERROR_CODES">>
			: {};

export type InferPluginIDs<O extends CinaAuthOptions> =
	O["plugins"] extends Array<infer P>
		? UnionToIntersection<P extends CinaAuthPlugin ? P["id"] : never>
		: never;

type ExtractInitContext<P extends CinaAuthPlugin> = P["init"] extends (
	...args: any[]
) => infer R
	? Awaited<R> extends { context?: infer C }
		? C extends Record<string, any>
			? Omit<C, keyof AuthContext>
			: {}
		: {}
	: {};

export type InferPluginContext<O extends CinaAuthOptions> =
	O["plugins"] extends Array<infer P>
		? UnionToIntersection<
				P extends CinaAuthPlugin ? ExtractInitContext<P> : {}
			>
		: {};
