import { sso } from "@cinaauth/sso";
import { CinaAuth } from "cinaauth";

export const auth = CinaAuth({
	plugins: [sso()],
});
