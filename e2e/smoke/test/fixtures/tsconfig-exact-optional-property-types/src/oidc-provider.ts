import { CinaAuth } from "cinaauth";
import { oidcProvider } from "cinaauth/plugins";

export const auth = CinaAuth({
	plugins: [
		oidcProvider({
			loginPage: "/login",
		}),
	],
});
