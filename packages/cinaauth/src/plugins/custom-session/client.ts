import type { Auth } from "cinaauth";
import { InferServerPlugin } from "../../client/plugins";
import type { CinaAuthOptions } from "../../types";

export const customSessionClient = <
	A extends
		| Auth
		| {
				options: CinaAuthOptions;
		  },
>() => {
	return InferServerPlugin<A, "custom-session">();
};
