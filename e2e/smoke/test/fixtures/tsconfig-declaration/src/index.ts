import { oauthProvider } from "@cinaauth/oauth-provider";
import { CinaAuth } from "cinaauth";
import { organization } from "cinaauth/plugins";
import type { GoogleProfile, JoinConfig, JoinOption } from "cinaauth/types";

/**
 * @see https://github.com/cinagroup/cinaauth/issues/9378
 */
export const auth = CinaAuth({
	plugins: [
		organization({}),
		oauthProvider({
			loginPage: "/auth/sign-in",
			consentPage: "/auth/oauth/consent",
			scopes: ["openid", "email"],
			allowDynamicClientRegistration: true,
			allowUnauthenticatedClientRegistration: true,
		}),
	],
});

auth.api
	.getSession({
		headers: new Headers(),
	})
	.catch();

auth.api
	.getSession({
		headers: [] as [string, string][],
	})
	.catch();

auth.api
	.getSession({
		headers: {} as Record<string, string>,
	})
	.catch();

auth.api
	.getSession({
		headers: new Headers(),
		asResponse: true,
	})
	.then((r: Response) => {
		console.log(r);
	});

auth.api
	.getSession({
		headers: new Headers(),
		returnHeaders: true,
	})
	.then(({ headers }: { headers: Headers }) => {
		console.log(headers);
	});

/**
 * @see https://github.com/cinagroup/cinaauth/issues/6876
 */
export type TypeExportRegression = {
	profile: GoogleProfile;
	joinOption: JoinOption;
	joinConfig: JoinConfig;
};
