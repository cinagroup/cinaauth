import { authClient } from "./auth-client";
import { createCinaAuthSiweProtocolClient } from "./siwe-wallet-protocol";

/** Uses the Accounts same-origin auth transport for the server-owned SIWE flow. */
export const cinaAuthSiweProtocolClient = createCinaAuthSiweProtocolClient({
	async post(path, body) {
		const { data, error } = await authClient.$fetch(path, {
			method: "POST",
			body,
		});
		if (error) throw error;
		return data;
	},
});
