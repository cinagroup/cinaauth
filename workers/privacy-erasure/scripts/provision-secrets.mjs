import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REQUIRED_WORKER_SECRETS = ["CINAAUTH_ERASURE_STORAGE_SECRET"];
const includeLegacyWebhook = process.argv.includes("--include-legacy-webhook");
const includeLegacyTargets = process.argv.includes("--include-legacy-targets");
const isDryRun = process.argv.includes("--dry-run");
const wranglerCli = fileURLToPath(import.meta.resolve("wrangler"));

const fail = (message) => {
	console.error(message);
	process.exit(1);
};

const hasValue = (name) => {
	const value = process.env[name];
	return typeof value === "string" && value.length > 0;
};

for (const name of REQUIRED_WORKER_SECRETS) {
	if (!hasValue(name)) fail(`Missing required environment variable ${name}`);
}
if (process.env.CINAAUTH_ERASURE_STORAGE_SECRET.length < 32) {
	fail("CINAAUTH_ERASURE_STORAGE_SECRET must be at least 32 characters");
}

const selected = [...REQUIRED_WORKER_SECRETS];
if (includeLegacyWebhook) {
	const name = "CINAAUTH_ERASURE_WEBHOOK_SECRET";
	if (!hasValue(name) || process.env[name].length < 32) {
		fail(`${name} must be present and at least 32 characters`);
	}
	selected.push(name);
}
if (includeLegacyTargets) {
	const name = "CINAAUTH_ERASURE_TARGETS";
	if (!hasValue(name)) fail(`${name} must be present`);
	let targets;
	try {
		targets = JSON.parse(process.env[name]);
	} catch {
		fail(`${name} must be valid JSON`);
	}
	if (!Array.isArray(targets) || targets.length === 0 || targets.length > 20) {
		fail(`${name} must contain between 1 and 20 targets`);
	}
	selected.push(name);
}

for (const name of selected) {
	if (isDryRun) {
		console.log(`Would provision ${name}`);
		continue;
	}
	const result = spawnSync(
		process.execPath,
		[wranglerCli, "secret", "put", name],
		{
			input: `${process.env[name]}\n`,
			stdio: ["pipe", "inherit", "inherit"],
		},
	);
	if (result.error) {
		fail(`Failed to start Wrangler for ${name}: ${result.error.message}`);
	}
	if (result.status !== 0) process.exit(result.status ?? 1);
	console.log(`Provisioned ${name}`);
}

console.log(
	"Privacy Erasure Worker core secret provisioning complete. Secrets Store V2 webhook and config KEK values are managed separately; target configuration is staged post-deploy through the authenticated control plane.",
);
