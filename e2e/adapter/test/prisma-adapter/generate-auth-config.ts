import fs from "node:fs/promises";
import path from "node:path";
import type { CinaAuthOptions } from "@cinaauth/core";

export const generateAuthConfigFile = async (_options: CinaAuthOptions) => {
	const options = { ..._options };
	// biome-ignore lint/performance/noDelete: perf doesn't matter here.
	delete options.database;
	const code = `import { CinaAuth } from "../../../auth";
import { prismaAdapter } from "../prisma-adapter";		
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

export const auth = CinaAuth({
    database: prismaAdapter(db, {
	    provider: 'sqlite'
    }),
    ${JSON.stringify(options, null, 2).slice(1, -1)}
})`;

	await fs.writeFile(path.join(import.meta.dirname, "auth.ts"), code);
};
