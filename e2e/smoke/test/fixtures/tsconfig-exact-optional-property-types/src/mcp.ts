/**
 * @see https://github.com/better-auth/better-auth/issues/10213
 */
import { mcp } from "@cinaauth/mcp";
import { CinaAuth } from "cinaauth";

export const auth = CinaAuth({
	plugins: [
		mcp({
			resource: "https://example.com/mcp",
			loginPage: "/login",
			consentPage: "/consent",
		}),
	],
});
