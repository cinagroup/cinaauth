import type {
	CinaAuthClientPlugin,
	CinaAuthOptions,
	CinaAuthPlugin,
} from "@cinaauth/core";
import { PACKAGE_VERSION } from "../version";

export * from "./broadcast-channel";
export * from "./equality";
export {
	type FocusListener,
	type FocusManager,
	kFocusManager,
} from "./focus-manager";
export {
	kOnlineManager,
	type OnlineListener,
	type OnlineManager,
} from "./online-manager";
export * from "./parser";
export * from "./query";
export * from "./session-refresh";
export * from "./types";
export * from "./vanilla";

export const InferPlugin = <T extends CinaAuthPlugin>() => {
	return {
		id: "infer-server-plugin",
		version: PACKAGE_VERSION,
		$InferServerPlugin: {} as T,
	} satisfies CinaAuthClientPlugin;
};

export function InferAuth<O extends { options: CinaAuthOptions }>() {
	return {} as O["options"];
}

export type * from "@better-fetch/fetch";
//#region Necessary re-exports
export type * from "@cinaauth/core/db";
export type { DBPrimitive } from "@cinaauth/core/db";
export type * from "nanostores";
export type * from "../plugins/access";
export type * from "../plugins/organization";
export type * from "../types/helper";
export type { UnionToIntersection } from "../types/helper";
export type * from "./path-to-object";
//#endregion
