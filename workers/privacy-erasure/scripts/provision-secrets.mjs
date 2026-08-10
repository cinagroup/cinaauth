import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REQUIRED_SECRETS = [
	"CINAAUTH_ERASURE_WEBHOOK_SECRET",
	"CINAAUTH_ERASURE_STORAGE_SECRET",
	"CINAAUTH_ERASURE_TARGETS",
];
const allowEmptyTargets = process.argv.includes("--allow-empty-targets");
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

const parseHttpsUrl = (value) => {
	if (typeof value !== "string") return false;
	try {
		const url = new URL(value);
		return (
			url.protocol === "https:" &&
			!url.username &&
			!url.password &&
			!url.hash &&
			url.hostname !== "localhost" &&
			!url.hostname.endsWith(".local")
		);
	} catch {
		return false;
	}
};

for (const name of REQUIRED_SECRETS) {
	if (!hasValue(name)) fail(`Missing required environment variable ${name}`);
}
for (const name of [
	"CINAAUTH_ERASURE_WEBHOOK_SECRET",
	"CINAAUTH_ERASURE_STORAGE_SECRET",
]) {
	if (process.env[name].length < 32) {
		fail(`${name} must be at least 32 characters`);
	}
}

let targets;
try {
	targets = JSON.parse(process.env.CINAAUTH_ERASURE_TARGETS);
} catch {
	fail("CINAAUTH_ERASURE_TARGETS must be valid JSON");
}
if (!Array.isArray(targets) || targets.length > 20) {
	fail("CINAAUTH_ERASURE_TARGETS must be an array with at most 20 targets");
}
if (targets.length === 0 && !allowEmptyTargets) {
	fail(
		"CINAAUTH_ERASURE_TARGETS must contain at least one target; use --allow-empty-targets only for a fail-closed bootstrap",
	);
}
const ids = new Set();
for (const target of targets) {
	if (
		!target ||
		typeof target !== "object" ||
		Array.isArray(target) ||
		Object.keys(target).sort().join(",") !== "id,secret,url" ||
		typeof target.id !== "string" ||
		!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(target.id) ||
		!parseHttpsUrl(target.url) ||
		typeof target.secret !== "string" ||
		target.secret.length < 32 ||
		target.secret.length > 512
	) {
		fail("CINAAUTH_ERASURE_TARGETS contains an invalid target");
	}
	if (ids.has(target.id)) {
		fail(`CINAAUTH_ERASURE_TARGETS contains duplicate target id ${target.id}`);
	}
	ids.add(target.id);
}

for (const name of REQUIRED_SECRETS) {
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
	`Privacy Erasure Worker secret provisioning complete (${targets.length} target ids validated; values were not printed).`,
);
