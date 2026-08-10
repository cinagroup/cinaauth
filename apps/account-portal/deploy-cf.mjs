#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) throw new Error("deploy:cf must be started through pnpm");

const childEnv = { ...process.env };
const command =
	process.platform === "win32"
		? ["exec", "wrangler", "deploy"]
		: ["exec", "opennextjs-cloudflare", "deploy"];

if (process.platform === "win32") childEnv.OPEN_NEXT_DEPLOY = "true";

execFileSync(process.execPath, [pnpmCli, ...command], {
	env: childEnv,
	stdio: "inherit",
});
