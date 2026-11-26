import { env } from "cloudflare:workers";
import { scim } from "@cinaauth/scim";
import { sso } from "@cinaauth/sso";
import { CinaAuth } from "cinaauth";
import { jwt } from "cinaauth/plugins/jwt";

export const auth = CinaAuth({
	baseURL: "http://localhost:4000",
	database: env.DB,
	emailAndPassword: {
		enabled: true,
	},
	logger: {
		level: "debug",
	},
	plugins: [
		jwt(),
		sso(),
		scim({
			connections: [
				{
					id: "workforce",
					credentials: [
						{ type: "bearer", id: "scim-token", token: "scim-token" },
					],
				},
			],
		}),
	],
});
