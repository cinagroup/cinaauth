import { CinaAuth } from "cinaauth";
import { organization } from "cinaauth/plugins";

export const auth = CinaAuth({
	plugins: [organization({})],
});
