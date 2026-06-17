import { DatabaseSync } from "node:sqlite";
import { CinaAuth } from "cinaauth";
import { getMigrations } from "cinaauth/db/migration";

const database = new DatabaseSync(":memory:");

export const auth = CinaAuth({
	baseURL: "http://localhost:4000",
	database,
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: [
		"http://localhost:*", // Allow any localhost port for smoke tests
	],
	logger: {
		level: "debug",
	},
});

const { runMigrations } = await getMigrations(auth.options);

await runMigrations();

Deno.serve(
	{
		port: 0,
		onListen: ({ port }) => {
			console.log(`Listening on http://localhost:${port}`);
		},
	},
	auth.handler,
);
