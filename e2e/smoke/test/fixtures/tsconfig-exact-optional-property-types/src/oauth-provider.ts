/**
 * @see https://github.com/better-auth/better-auth/issues/10213
 */
import { oauthProvider } from "@cinaauth/oauth-provider";
import { CinaAuth } from "cinaauth";

export const auth = CinaAuth({
	plugins: [
		oauthProvider({
			loginPage: "/login",
			consentPage: "/consent",
		}),
	],
});
