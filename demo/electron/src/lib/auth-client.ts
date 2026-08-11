import { electronClient } from "@cinaauth/electron/client";
import { storage } from "@cinaauth/electron/storage";
import type { CinaAuthClientPlugin } from "cinaauth/client";
import { createAuthClient } from "cinaauth/client";

const linkedElectronPlugin = electronClient({
	protocol: {
		scheme: "com.cinaauth.demo",
	},
	signInURL: "http://localhost:3000/sign-in",
	storage: storage(),
});

// The package source verifies this contract with `satisfies`; preserve the
// concrete action and bridge inference across the local link's declaration boundary.
const electronPlugin = linkedElectronPlugin as CinaAuthClientPlugin &
	typeof linkedElectronPlugin;

export const authClient = createAuthClient({
	baseURL: "http://localhost:3000/api/auth",
	plugins: [electronPlugin],
});
