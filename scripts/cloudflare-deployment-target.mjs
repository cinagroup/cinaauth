const DEPLOYMENT_TARGET_FLAG = "--deployment-target";
const VALID_DEPLOYMENT_TARGETS = new Set(["production", "siwe-staging"]);
const FORBIDDEN_WRANGLER_FLAGS = [
	"--env",
	"--config",
	"--cwd",
	"--name",
	"--env-file",
];

const getForbiddenWranglerFlag = (arg) =>
	FORBIDDEN_WRANGLER_FLAGS.find(
		(flag) => arg === flag || arg.startsWith(`${flag}=`),
	);

const getTargetOccurrenceCount = (args) =>
	args.filter(
		(arg) =>
			arg === DEPLOYMENT_TARGET_FLAG ||
			arg.startsWith(`${DEPLOYMENT_TARGET_FLAG}=`),
	).length;

const omitCloudflareEnvironment = (env) =>
	Object.fromEntries(
		Object.entries(env).filter(([name]) => name !== "CLOUDFLARE_ENV"),
	);

/**
 * Parse an explicitly selected Cloudflare deployment target without performing
 * any command, network, filesystem, or environment mutation.
 *
 * @param {{ args?: string[]; env?: Record<string, string | undefined> }} options
 * @returns {{
 *   deploymentTarget: "production" | "siwe-staging";
 *   wranglerArgs: string[];
 *   passthroughArgs: string[];
 *   childEnv: Record<string, string | undefined>;
 * }}
 */
export const parseCloudflareDeploymentTarget = ({
	args = [],
	env = process.env,
} = {}) => {
	if (!Array.isArray(args)) {
		throw new Error("args must be an array");
	}
	if (env === null || typeof env !== "object" || Array.isArray(env)) {
		throw new Error("env must be an object");
	}
	if (args.some((arg) => typeof arg !== "string")) {
		throw new Error("every args entry must be a string");
	}

	if (env.CLOUDFLARE_ENV !== undefined && env.CLOUDFLARE_ENV !== "") {
		throw new Error(
			"CLOUDFLARE_ENV must be unset or empty; use --deployment-target instead",
		);
	}

	for (const arg of args) {
		const forbiddenFlag = getForbiddenWranglerFlag(arg);
		if (forbiddenFlag) {
			throw new Error(
				`${forbiddenFlag} is not allowed; the deployment target owns Wrangler environment selection`,
			);
		}
	}

	if (getTargetOccurrenceCount(args) !== 1) {
		throw new Error(
			"Exactly one --deployment-target production|siwe-staging is required",
		);
	}

	let deploymentTarget;
	const passthroughArgs = [];
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === DEPLOYMENT_TARGET_FLAG) {
			const value = args[index + 1];
			if (value === undefined || value.length === 0) {
				throw new Error(
					"--deployment-target requires production or siwe-staging",
				);
			}
			deploymentTarget = value;
			index += 1;
			continue;
		}
		if (arg.startsWith(`${DEPLOYMENT_TARGET_FLAG}=`)) {
			const value = arg.slice(DEPLOYMENT_TARGET_FLAG.length + 1);
			if (value.length === 0) {
				throw new Error(
					"--deployment-target requires production or siwe-staging",
				);
			}
			deploymentTarget = value;
			continue;
		}
		passthroughArgs.push(arg);
	}

	if (!VALID_DEPLOYMENT_TARGETS.has(deploymentTarget)) {
		throw new Error("--deployment-target must be production or siwe-staging");
	}

	return {
		deploymentTarget,
		wranglerArgs:
			deploymentTarget === "siwe-staging" ? ["--env", "staging"] : [],
		passthroughArgs,
		childEnv: omitCloudflareEnvironment(env),
	};
};
