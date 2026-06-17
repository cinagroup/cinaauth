import { expoClient } from "@cinaauth/expo/client";
import { createAuthClient } from "cinaauth/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
	baseURL: "http://localhost:8081",
	disableDefaultFetchPlugins: true,
	plugins: [
		expoClient({
			scheme: "cinaauth",
			storage: SecureStore,
		}),
	],
});
