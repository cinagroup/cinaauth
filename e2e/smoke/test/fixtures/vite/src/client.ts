/// <reference types="vite/client" />
export * from "cinaauth/client/plugins";

import { createAuthClient } from "cinaauth/client";

export * from "cinaauth/client/plugins";

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_BASE_URL || "http://localhost:3000",
});
