import type { CinaAuthClientPlugin } from "@cinaauth/core";
import { PACKAGE_VERSION } from "../../version";
import type { oneTimeToken } from "./index";

export const oneTimeTokenClient = () => {
	return {
		id: "one-time-token",
		version: PACKAGE_VERSION,
		$InferServerPlugin: {} as ReturnType<typeof oneTimeToken>,
	} satisfies CinaAuthClientPlugin;
};

export type { OneTimeTokenOptions } from "./index";
