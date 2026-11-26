import { expo } from "@cinaauth/expo";
import { drizzleAdapter } from "cinaauth/adapters/drizzle";
import { CinaAuth } from "cinaauth/minimal";

export const auth = CinaAuth({
	database: drizzleAdapter({}, { provider: "sqlite" }),
	plugins: [expo()],
});
