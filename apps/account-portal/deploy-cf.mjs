#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCloudflareDeploymentTarget } from "../../scripts/cloudflare-deployment-target.mjs";

/**
 * Run the Account Portal Cloudflare deployment after resolving one explicit
 * deployment target.
 *
 * @param {{
 *   args?: string[];
 *   env?: Record<string, string | undefined>;
 *   execFile?: typeof execFileSync;
 *   nodeExecutable?: string;
 *   parseDeploymentTarget?: typeof parseCloudflareDeploymentTarget;
 *   resolvePlatform?: () => NodeJS.Platform | string;
 * }} options
 */
export const runAccountPortalCloudflareDeploy = (options = {}) => {
	const args = options.args ?? process.argv.slice(2);
	const env = options.env ?? process.env;
	const parseDeploymentTarget =
		options.parseDeploymentTarget ?? parseCloudflareDeploymentTarget;
	const target = parseDeploymentTarget({ args, env });

	if (target.passthroughArgs.length !== 0) {
		throw new Error(
			"Passthrough arguments are not allowed; select only --deployment-target production|siwe-staging",
		);
	}
	if (target.deploymentTarget === "siwe-staging") {
		throw new Error(
			"siwe-staging is not deployable until the isolated inventory and env.staging configuration are complete",
		);
	}

	const pnpmCli = target.childEnv.npm_execpath;
	if (!pnpmCli) throw new Error("deploy:cf must be started through pnpm");

	const resolvePlatform = options.resolvePlatform ?? (() => process.platform);
	const platform = resolvePlatform();
	const childEnv = { ...target.childEnv };
	const command =
		platform === "win32"
			? ["exec", "wrangler", "deploy"]
			: ["exec", "opennextjs-cloudflare", "deploy"];

	if (platform === "win32") childEnv.OPEN_NEXT_DEPLOY = "true";

	const execFile = options.execFile ?? execFileSync;
	const nodeExecutable = options.nodeExecutable ?? process.execPath;
	execFile(nodeExecutable, [pnpmCli, ...command], {
		env: childEnv,
		stdio: "inherit",
	});
};

/**
 * Return whether this module is the directly invoked Node.js entry point.
 *
 * @param {{ argv1?: string; moduleUrl?: string | URL }} options
 */
export const isMain = ({
	argv1 = process.argv[1],
	moduleUrl = import.meta.url,
} = {}) =>
	Boolean(argv1) && resolve(argv1) === resolve(fileURLToPath(moduleUrl));

if (isMain()) runAccountPortalCloudflareDeploy();
