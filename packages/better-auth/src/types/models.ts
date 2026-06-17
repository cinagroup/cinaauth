import type { CinaAuthOptions } from "@cinaauth/core";
import type {
	InferDBFieldsFromOptionsInput,
	InferDBFieldsFromPluginsInput,
} from "@cinaauth/core/db";
import type {
	ExtractPluginField,
	InferPluginFieldFromTuple,
	UnionToIntersection,
} from "./helper";

export type AdditionalUserFieldsInput<Options extends CinaAuthOptions> =
	InferDBFieldsFromPluginsInput<"user", Options["plugins"]> &
		InferDBFieldsFromOptionsInput<Options["user"]>;

export type AdditionalSessionFieldsInput<Options extends CinaAuthOptions> =
	InferDBFieldsFromPluginsInput<"session", Options["plugins"]> &
		InferDBFieldsFromOptionsInput<Options["session"]>;

export type InferPluginTypes<O extends CinaAuthOptions> =
	O["plugins"] extends readonly [unknown, ...unknown[]]
		? InferPluginFieldFromTuple<O["plugins"], "$Infer">
		: O["plugins"] extends Array<infer P>
			? UnionToIntersection<ExtractPluginField<P, "$Infer">>
			: {};

export type {
	Account,
	RateLimit,
	Session,
	User,
	Verification,
} from "@cinaauth/core/db";
