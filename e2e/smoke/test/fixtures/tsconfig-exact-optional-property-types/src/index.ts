import { CinaAuth } from "cinaauth";
import {
	inferAdditionalFields,
	organizationClient,
} from "cinaauth/client/plugins";
import { nextCookies } from "cinaauth/next-js";
import { organization } from "cinaauth/plugins";
import { createAuthClient } from "cinaauth/react";

const auth = CinaAuth({
	trustedOrigins: [],
	emailAndPassword: {
		enabled: true,
	},
	plugins: [organization(), nextCookies()],
	user: {
		additionalFields: {},
	},
});
const authClient = createAuthClient({
	baseURL: "http://localhost:3000",
	plugins: [inferAdditionalFields<typeof auth>(), organizationClient()],
});

authClient.useActiveOrganization();
authClient.useSession();

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
