import { createAuthClient } from "cinaauth/vue";

export * from "cinaauth/client/plugins";

export const client = createAuthClient({
	baseURL: "http://localhost:3000",
});
