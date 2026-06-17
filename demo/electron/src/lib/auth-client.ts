import { electronClient } from "@cinaauth/electron/client";
import { storage } from "@cinaauth/electron/storage";
import { createAuthClient } from "cinaauth/client";

export const authClient = createAuthClient({
	baseURL: "http://localhost:3000/api/auth",
	plugins: [
		electronClient({
			protocol: {
				scheme: "com.cinaauth.demo",
			},
			signInURL: "http://localhost:3000/sign-in",
			storage: storage(),
		}),
	],
});
