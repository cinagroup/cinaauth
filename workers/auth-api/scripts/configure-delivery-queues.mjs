import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const API_BASE = "https://api.cloudflare.com/client/v4";
const QUEUES = ["cinaauth-delivery", "cinaauth-delivery-dlq"];
export const DELIVERY_QUEUE_RETENTION_SECONDS = 86_400;

export const evaluateRetentionChange = ({
	currentRetentionSeconds,
	backlogCount,
}) => {
	if (currentRetentionSeconds === DELIVERY_QUEUE_RETENTION_SECONDS) {
		return "unchanged";
	}
	if (
		currentRetentionSeconds > DELIVERY_QUEUE_RETENTION_SECONDS &&
		backlogCount !== 0
	) {
		return "blocked";
	}
	return "update";
};

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
	throw new Error(`${operation} failed`);
};

const getCloudflareRuntime = () => {
	const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	if (!token || !accountId) {
		throw new Error(
			"CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required",
		);
	}
	return { accountId, token };
};

const cloudflareFetch = async ({ accountId, token }, path) => {
	const response = await fetch(`${API_BASE}${path}`, {
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	});
	if (!response.ok) {
		throw new Error(`Cloudflare API ${response.status} while reading ${path}`);
	}
	const payload = await response.json();
	if (payload?.success !== true) {
		throw new Error(`Cloudflare API rejected ${path}`);
	}
	return payload.result;
};

const readQueueInventory = async (runtime) => {
	const queues = await cloudflareFetch(
		runtime,
		`/accounts/${runtime.accountId}/queues`,
	);
	if (!Array.isArray(queues)) {
		throw new Error("Cloudflare API returned invalid Queue inventory");
	}
	return new Map(queues.map((queue) => [queue.queue_name, queue]));
};

const readBacklogCount = async (runtime, queue) => {
	const metrics = await cloudflareFetch(
		runtime,
		`/accounts/${runtime.accountId}/queues/${queue.queue_id}/metrics`,
	);
	if (
		typeof metrics?.backlog_count !== "number" ||
		!Number.isFinite(metrics.backlog_count) ||
		metrics.backlog_count < 0
	) {
		throw new Error(
			`Cloudflare API returned invalid backlog metrics for ${queue.queue_name}`,
		);
	}
	return metrics.backlog_count;
};

const createQueue = (queue) => {
	requireSuccess(
		run([
			"queues",
			"create",
			queue,
			"--message-retention-period-secs",
			String(DELIVERY_QUEUE_RETENTION_SECONDS),
		]),
		`Creating Queue ${queue}`,
	);
};

const updateQueue = (queue) => {
	requireSuccess(
		run([
			"queues",
			"update",
			queue,
			"--message-retention-period-secs",
			String(DELIVERY_QUEUE_RETENTION_SECONDS),
		]),
		`Updating Queue ${queue}`,
	);
};

const main = async () => {
	if (isDryRun) {
		for (const queue of QUEUES) {
			console.log(`Would verify zero backlog before reducing ${queue}`);
			updateQueue(queue);
		}
		console.log(
			"Delivery Queue resources would be configured with 24-hour retention.",
		);
		return;
	}

	const runtime = getCloudflareRuntime();
	const inventory = await readQueueInventory(runtime);
	for (const queueName of QUEUES) {
		const queue = inventory.get(queueName);
		if (!queue) {
			createQueue(queueName);
			continue;
		}
		const currentRetentionSeconds = queue.settings?.message_retention_period;
		if (
			typeof currentRetentionSeconds !== "number" ||
			!Number.isFinite(currentRetentionSeconds)
		) {
			throw new Error(`Queue ${queueName} has invalid retention settings`);
		}
		const backlogCount =
			currentRetentionSeconds > DELIVERY_QUEUE_RETENTION_SECONDS
				? await readBacklogCount(runtime, queue)
				: undefined;
		const decision = evaluateRetentionChange({
			currentRetentionSeconds,
			backlogCount,
		});
		if (decision === "blocked") {
			throw new Error(
				`Refusing to reduce Queue ${queueName} retention while backlog_count is ${backlogCount}`,
			);
		}
		if (decision === "update") updateQueue(queueName);
	}
	console.log("Delivery Queue resources use 24-hour retention.");
};

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
