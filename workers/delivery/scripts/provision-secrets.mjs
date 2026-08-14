import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseCloudflareDeploymentTarget } from "../../../scripts/cloudflare-deployment-target.mjs";

const LEGACY_SECRETS = [
	"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
	"RESEND_API_KEY",
	"RESEND_EMAIL_FROM",
	"TWILIO_ACCOUNT_SID",
	"TWILIO_AUTH_TOKEN",
	"TWILIO_FROM_NUMBER",
];
const SUPPORTED_FLAGS = new Set(["--dry-run"]);

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

const getSelectedSecretNames = (env) => {
	const selectedSecrets = LEGACY_SECRETS.filter((name) => hasValue(env, name));
	if (
		hasValue(env, "CINAAUTH_DELIVERY_WEBHOOK_SECRET") &&
		env.CINAAUTH_DELIVERY_WEBHOOK_SECRET.length < 32
	) {
		throw new Error(
			"CINAAUTH_DELIVERY_WEBHOOK_SECRET must be at least 32 characters",
		);
	}
	const legacyProviderGroups = [
		["RESEND_API_KEY", "RESEND_EMAIL_FROM"],
		["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
	];
	for (const group of legacyProviderGroups) {
		const configured = group.filter((name) => hasValue(env, name));
		if (configured.length > 0 && configured.length !== group.length) {
			throw new Error(
				`Legacy provider values must be supplied together: ${group.join(", ")}`,
			);
		}
	}
	return selectedSecrets;
};

const defaultResolveWranglerCli = () =>
	fileURLToPath(import.meta.resolve("wrangler"));

/**
 * Provision Delivery Worker secrets for one explicit deployment target.
 *
 * @param {{
 *   args?: string[];
 *   env?: Record<string, string | undefined>;
 *   log?: (message: string) => void;
 *   resolveWranglerCli?: () => string;
 *   spawnSyncImpl?: typeof spawnSync;
 * }} options
 */
export const runDeliverySecretProvisioning = (options = {}) => {
	const args = options.args ?? process.argv.slice(2);
	const env = options.env ?? process.env;
	const target = parseCloudflareDeploymentTarget({ args, env });
	const selectedFlags = parseSupportedFlags(target.passthroughArgs);
	if (target.deploymentTarget === "siwe-staging") {
		throw new Error(
			"siwe-staging Delivery secret provisioning is not available until its isolated inventory and Wrangler environment are complete",
		);
	}

	const selectedSecrets = getSelectedSecretNames(env);
	if (selectedFlags.has("--dry-run")) {
		const log = options.log ?? console.log;
		for (const name of selectedSecrets) log(`Would provision ${name}`);
		log(
			selectedSecrets.length > 0
				? "Legacy Delivery Worker secret provisioning dry run complete."
				: "No legacy Worker secrets selected; post-deploy provider configuration remains enabled.",
		);
		return;
	}

	const log = options.log ?? console.log;
	const resolveWranglerCli =
		options.resolveWranglerCli ?? defaultResolveWranglerCli;
	const spawnSyncImpl = options.spawnSyncImpl ?? spawnSync;
	const wranglerCli =
		selectedSecrets.length > 0 ? resolveWranglerCli() : undefined;
	for (const name of selectedSecrets) {
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
		selectedSecrets.length > 0
			? "Legacy Delivery Worker secret provisioning complete."
			: "No legacy Worker secrets selected; post-deploy provider configuration remains enabled.",
	);
};

export const isMain =
	typeof process.argv[1] === "string" &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
	try {
		runDeliverySecretProvisioning();
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode =
			error && typeof error === "object" && "exitCode" in error
				? Number(error.exitCode)
				: 1;
	}
}
