/**
 * @see https://github.com/cinagroup/cinaauth/issues/9212
 */
import { passkey } from "@cinaauth/passkey";
import { passkeyClient } from "@cinaauth/passkey/client";
import { CinaAuth } from "cinaauth";
import { createAuthClient } from "cinaauth/react";

export const auth = CinaAuth({
	plugins: [
		passkey({
			rpID: "localhost",
			rpName: "App",
			origin: "http://localhost:3000",
		}),
	],
});

export const authWithoutSessionRequired = CinaAuth({
	plugins: [
		passkey({
			rpID: "localhost",
			rpName: "App",
			origin: "http://localhost:3000",
			registration: {
				requireSession: false,
			},
		}),
	],
});

export const authClient = createAuthClient({
	baseURL: "http://localhost:3000",
	plugins: [passkeyClient()],
});

authClient.signIn.passkey;
authClient.passkey.addPasskey;
