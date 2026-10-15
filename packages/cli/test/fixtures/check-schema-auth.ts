import { DatabaseSync } from "node:sqlite";
import { CinaAuth } from "cinaauth";

export const auth = CinaAuth({
	baseURL: "https://auth.example.com",
	database: new DatabaseSync(":memory:"),
	secret: "check-schema-test-secret-at-least-32-characters",
	logger: { disabled: true },
	advanced: {
		database: {
			validateSchema: false,
		},
	},
});
