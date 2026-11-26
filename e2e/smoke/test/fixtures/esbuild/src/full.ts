import { expo } from "@cinaauth/expo";
import { CinaAuth } from "cinaauth";
import { drizzleAdapter } from "cinaauth/adapters/drizzle";

export const auth = CinaAuth({
	database: drizzleAdapter({}, { provider: "sqlite" }),
	plugins: [expo()],
});
