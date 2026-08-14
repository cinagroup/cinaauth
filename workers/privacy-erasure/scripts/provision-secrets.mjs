import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseCloudflareDeploymentTarget } from "../../../scripts/cloudflare-deployment-target.mjs";

const REQUIRED_WORKER_SECRETS = ["CINAAUTH_ERASURE_STORAGE_SECRET"];
const SUPPORTED_FLAGS = new Set([
	"--dry-run",
	"--include-legacy-webhook",
	"--include-legacy-targets",
]);

const parseSupportedFlags = (args) => {
	const selected = new Set();
	for (const arg of args) {
		if (!SUPPORTED_FLAGS.has(arg)) {
			throw new Error("Unknown argument");
		}
		if (selected.has(arg)) {
			throw new Error(`${arg} may be provided at most once`);
		}
		selected.add(arg);
	}
	return selected;
};

const hasValue = (env, name) => {
	const value = env[name];
	return typeof value === "string" && value.length > 0;
};

const getSelectedSecretNames = (env, selectedFlags) => {
	for (const name of REQUIRED_WORKER_SECRETS) {
		if (!hasValue(env, name)) {
			throw new Error(`Missing required environment variable ${name}`);
		}
	}
	if (env.CINAAUTH_ERASURE_STORAGE_SECRET.length < 32) {
		throw new Error(
			"CINAAUTH_ERASURE_STORAGE_SECRET must be at least 32 characters",
		);
	}

	const selected = [...REQUIRED_WORKER_SECRETS];
	if (selectedFlags.has("--include-legacy-webhook")) {
		const name = "CINAAUTH_ERASURE_WEBHOOK_SECRET";
		if (!hasValue(env, name) || env[name].length < 32) {
			throw new Error(`${name} must be present and at least 32 characters`);
		}
		selected.push(name);
	}
	if (selectedFlags.has("--include-legacy-targets")) {
		const name = "CINAAUTH_ERASURE_TARGETS";
		if (!hasValue(env, name)) throw new Error(`${name} must be present`);
		let targets;
		try {
			targets = JSON.parse(env[name]);
		} catch {
			throw new Error(`${name} must be valid JSON`);
		}
		if (
			!Array.isArray(targets) ||
			targets.length === 0 ||
			targets.length > 20
		) {
			throw new Error(`${name} must contain between 1 and 20 targets`);
		}
		selected.push(name);
	}
	return selected;
};

const defaultResolveWranglerCli = () =>
	fileURLToPath(import.meta.resolve("wrangler"));

/**
 * Provision Privacy Erasure Worker secrets for one explicit deployment target.
 *
 * @param {{
 *   args?: string[];
 *   env?: Record<string, string | undefined>;
 *   log?: (message: string) => void;
 *   resolveWranglerCli?: () => string;
 *   spawnSyncImpl?: typeof spawnSync;
 * }} options
 */
export const runPrivacyErasureSecretProvisioning = (options = {}) => {
	const args = options.args ?? process.argv.slice(2);
	const env = options.env ?? process.env;
	const target = parseCloudflareDeploymentTarget({ args, env });
	const selectedFlags = parseSupportedFlags(target.passthroughArgs);
	if (target.deploymentTarget === "siwe-staging") {
		throw new Error(
			"siwe-staging Privacy Erasure secret provisioning is not available until its isolated inventory and Wrangler environment are complete",
		);
	}

	const selected = getSelectedSecretNames(env, selectedFlags);
	if (selectedFlags.has("--dry-run")) {
		const log = options.log ?? console.log;
		for (const name of selected) log(`Would provision ${name}`);
		log("Privacy Erasure Worker secret provisioning dry run complete.");
		return;
	}

	const log = options.log ?? console.log;
	const resolveWranglerCli =
		options.resolveWranglerCli ?? defaultResolveWranglerCli;
	const spawnSyncImpl = options.spawnSyncImpl ?? spawnSync;
	const wranglerCli = resolveWranglerCli();
	for (const name of selected) {
		const result = spawnSyncImpl(
			process.execPath,
			[wranglerCli, "secret", "put", name, ...target.wranglerArgs],
			{
				env: target.childEnv,
				input: `${env[name]}\n`,
				stdio: ["pipe", "inherit", "inherit"],
			},
		);
		if (result.error) {
			throw new Error(`Failed to start Wrangler for ${name}`);
		}
		if (result.status !== 0) {
			const error = new Error(`Wrangler secret put failed for ${name}`);
			error.exitCode = result.status ?? 1;
			throw error;
		}
		log(`Provisioned ${name}`);
	}

	log(
		"Privacy Erasure Worker core secret provisioning complete. Secrets Store V2 webhook and config KEK values are managed separately; target configuration is staged post-deploy through the authenticated control plane.",
	);
};

export const isMain =
	typeof process.argv[1] === "string" &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
	try {
		runPrivacyErasureSecretProvisioning();
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode =
			error && typeof error === "object" && "exitCode" in error
				? Number(error.exitCode)
				: 1;
	}
}
