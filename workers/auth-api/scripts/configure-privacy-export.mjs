import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BUCKET = "cinaauth-privacy-exports";
const QUEUES = ["cinaauth-privacy-export", "cinaauth-privacy-export-dlq"];
const LIFECYCLE_RULE = "expire-cinaauth-privacy-exports-after-one-day";
const isDryRun = process.argv.includes("--dry-run");
const wranglerEntry = fileURLToPath(
	new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);

const run = (args, { capture = false } = {}) => {
	if (isDryRun) {
		console.log(`Would run wrangler ${args.join(" ")}`);
		return { status: 0, stdout: "" };
	}
	return spawnSync(process.execPath, [wranglerEntry, ...args], {
		encoding: "utf8",
		stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
	});
};

const requireSuccess = (result, operation) => {
	if (result.status === 0) return;
	console.error(`${operation} failed`);
	process.exit(result.status ?? 1);
};

const ensureBucket = () => {
	const info = run(["r2", "bucket", "info", BUCKET], { capture: true });
	if (info.status === 0) return;
	requireSuccess(
		run(["r2", "bucket", "create", BUCKET, "--location", "apac"]),
		`Creating R2 bucket ${BUCKET}`,
	);
};

const ensureQueue = (queue) => {
	const info = run(["queues", "info", queue], { capture: true });
	if (info.status !== 0) {
		requireSuccess(
			run([
				"queues",
				"create",
				queue,
				"--message-retention-period-secs",
				"86400",
			]),
			`Creating Queue ${queue}`,
		);
		return;
	}
	requireSuccess(
		run([
			"queues",
			"update",
			queue,
			"--message-retention-period-secs",
			"86400",
		]),
		`Updating Queue ${queue}`,
	);
};

const ensureLifecycleRule = () => {
	const rules = run(["r2", "bucket", "lifecycle", "list", BUCKET], {
		capture: true,
	});
	requireSuccess(rules, `Listing lifecycle rules for ${BUCKET}`);
	if (rules.stdout.includes(LIFECYCLE_RULE)) return;
	requireSuccess(
		run([
			"r2",
			"bucket",
			"lifecycle",
			"add",
			BUCKET,
			LIFECYCLE_RULE,
			"privacy-exports/",
			"--expire-days",
			"1",
			"--abort-multipart-days",
			"1",
			"--force",
		]),
		`Adding lifecycle rule ${LIFECYCLE_RULE}`,
	);
};

ensureBucket();
for (const queue of QUEUES) ensureQueue(queue);
ensureLifecycleRule();
console.log("Privacy export R2 and Queue resources are configured.");
