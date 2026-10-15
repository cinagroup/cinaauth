import { CinaAuth } from "cinaauth";
import { memoryAdapter } from "cinaauth/adapters/memory";
import { sveltekitCookies } from "cinaauth/svelte-kit";
import { getRequestEvent } from "$app/server";

const database = {
	user: [],
	session: [],
	account: [],
	verification: [],
};

export const auth = CinaAuth({
	baseURL: {
		allowedHosts: ["localhost:*"],
		protocol: "http",
	},
	database: memoryAdapter(database),
	secret: "cinaauth-sveltekit-test-secret",
	emailAndPassword: {
		enabled: true,
	},
	plugins: [sveltekitCookies(getRequestEvent)],
});
