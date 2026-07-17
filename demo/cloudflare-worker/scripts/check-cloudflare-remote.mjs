import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://api.cloudflare.com/client/v4";
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const REQUIRED_WORKER_SECRETS = [
	"CINAAUTH_SECRET",
	"CINAAUTH_MIGRATION_TOKEN",
	"CINAAUTH_DELIVERY_WEBHOOK_URL",
	"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
];
const OPTIONAL_PLUGIN_INPUT_GROUPS = [
	{
		name: "Cloudflare Turnstile captcha plugin",
		inputs: ["CLOUDFLARE_TURNSTILE_SECRET_KEY"],
	},
	{
		name: "Google One Tap plugin",
		inputs: ["GOOGLE_CLIENT_ID"],
	},
	{
		name: "generic OAuth plugin",
		inputs: ["GENERIC_OAUTH_CONFIG"],
	},
	{
		name: "Stripe plugin",
		inputs: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
	},
	{
		name: "admin audit service writes",
		inputs: ["CINAUTH_ADMIN_SERVICE_KEY"],
	},
];

const failures = [];
const warnings = [];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workerDir = dirname(scriptDir);
const config = JSON.parse(readFileSync(join(workerDir, "wrangler.json"), "utf8"));
const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const requireAllPluginInputs =
	process.env.CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS === "1";
const configuredRuntimeInputs = new Set(Object.keys(config.vars ?? {}));

const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getAuthOrigin = () =>
	new URL(config.vars?.CINAAUTH_URL || "https://auth.cinagroup.com");

const requireEnv = () => {
	if (!token) {
		fail("CLOUDFLARE_API_TOKEN or CF_API_TOKEN is required");
	}
	if (!accountId) {
		fail("CLOUDFLARE_ACCOUNT_ID is required");
	}
};

const describeFetchError = (error) => {
	if (!(error instanceof Error)) {
		return String(error);
	}
	const cause = error.cause;
	if (
		cause &&
		typeof cause === "object" &&
		("code" in cause || "message" in cause)
	) {
		const code = "code" in cause ? String(cause.code) : "network_error";
		const message =
			"message" in cause && typeof cause.message === "string"
				? cause.message
				: error.message;
		return `${error.message} (${code}: ${message})`;
	}
	return error.message;
};

const shouldRetry = (response) =>
	RETRYABLE_STATUS_CODES.has(response.status) || response.status >= 500;

const cloudflareFetch = async (path) => {
	let lastError;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			const response = await fetch(`${API_BASE}${path}`, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok || body.success === false) {
				const message =
					body.errors?.map((error) => error.message).join("; ") ||
					`HTTP ${response.status}`;
				if (attempt < MAX_ATTEMPTS && shouldRetry(response)) {
					lastError = new Error(message);
					await sleep(500 * attempt);
					continue;
				}
				throw new Error(message);
			}
			return body.result;
		} catch (error) {
			lastError = error;
			if (attempt < MAX_ATTEMPTS) {
				await sleep(500 * attempt);
				continue;
			}
		}
	}
	throw new Error(`Cloudflare API request failed: ${describeFetchError(lastError)}`);
};

const publicFetch = async (url, init = {}) => {
	try {
		return await fetch(url, {
			...init,
			signal: AbortSignal.timeout(10_000),
		});
	} catch (error) {
		warn(`Public endpoint ${url} could not be reached: ${describeFetchError(error)}`);
		return undefined;
	}
};

const getConfiguredRoute = () => {
	const origin = getAuthOrigin();
	return config.routes?.find(
		(route) =>
			route.pattern === `${origin.hostname}/*` ||
			route.pattern === `${origin.hostname}/`,
	);
};

const checkD1 = async () => {
	const binding = config.d1_databases?.find((database) => database.binding === "DB");
	if (!binding) {
		fail("wrangler.json must define a D1 DB binding");
		return;
	}
	const databases = await cloudflareFetch(`/accounts/${accountId}/d1/database`);
	const remote = databases.find(
		(database) => database.name === binding.database_name,
	);
	if (!remote) {
		fail(`D1 database ${binding.database_name} does not exist`);
		return;
	}
	if (remote.uuid !== binding.database_id) {
		fail(
			`D1 database ${binding.database_name} id mismatch: wrangler.json has ${binding.database_id}, Cloudflare has ${remote.uuid}`,
		);
	}
	if (Number(remote.num_tables ?? 0) === 0) {
		warn(
			`D1 database ${binding.database_name} currently has 0 tables; /api/migrate must run before readiness can pass`,
		);
	}
};

const checkQueues = async () => {
	const expectedQueues = new Set([
		...(config.queues?.producers ?? []).map((producer) => producer.queue),
		...(config.queues?.consumers ?? []).map((consumer) => consumer.queue),
		...(config.queues?.consumers ?? [])
			.map((consumer) => consumer.dead_letter_queue)
			.filter(Boolean),
	]);
	if (expectedQueues.size === 0) {
		fail("wrangler.json must define Queue bindings");
		return;
	}
	const queues = await cloudflareFetch(`/accounts/${accountId}/queues`);
	const remoteQueues = new Map(
		queues.map((queue) => [queue.queue_name, queue]),
	);
	for (const queue of expectedQueues) {
		if (!remoteQueues.has(queue)) {
			fail(`Queue ${queue} does not exist`);
		}
	}
};

const checkSecrets = async () => {
	const secrets = await cloudflareFetch(
		`/accounts/${accountId}/workers/scripts/${config.name}/secrets`,
	);
	const names = new Set(secrets.map((secret) => secret.name));
	for (const name of names) {
		configuredRuntimeInputs.add(name);
	}
	for (const secret of REQUIRED_WORKER_SECRETS) {
		if (!names.has(secret)) {
			fail(`Worker secret ${secret} is missing`);
		}
	}
};

const checkOptionalPluginInputs = () => {
	for (const group of OPTIONAL_PLUGIN_INPUT_GROUPS) {
		const missing = group.inputs.filter(
			(input) => !configuredRuntimeInputs.has(input),
		);
		if (missing.length === 0) {
			continue;
		}
		const message = `${group.name} is not fully configured; missing ${missing.join(", ")}`;
		if (requireAllPluginInputs) {
			fail(message);
		} else {
			warn(
				`${message}. Set CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS=1 to enforce every optional plugin input before deploy`,
			);
		}
	}
};

const checkZoneAndRoute = async () => {
	const route = getConfiguredRoute();
	if (!route) {
		fail(
			`wrangler.json must define a route for ${getAuthOrigin().hostname}/*`,
		);
		return;
	}

	if (!route.zone_name && !route.zone_id) {
		fail(`Worker route ${route.pattern} must include zone_name or zone_id`);
		return;
	}

	let zone;
	if (route.zone_id) {
		zone = await cloudflareFetch(`/zones/${route.zone_id}`);
	} else {
		const zones = await cloudflareFetch(
			`/zones?name=${encodeURIComponent(route.zone_name)}`,
		);
		zone = zones.find((item) => item.name === route.zone_name);
	}

	if (!zone) {
		fail(`Cloudflare zone ${route.zone_name || route.zone_id} does not exist`);
		return;
	}

	if (zone.status && zone.status !== "active") {
		warn(`Cloudflare zone ${zone.name} status is ${zone.status}`);
	}

	const routes = await cloudflareFetch(`/zones/${zone.id}/workers/routes`);
	const remoteRoute = routes.find((item) => item.pattern === route.pattern);
	if (!remoteRoute) {
		warn(
			`Worker route ${route.pattern} is not live yet; wrangler deploy should create it`,
		);
		return;
	}

	if (remoteRoute.script && remoteRoute.script !== config.name) {
		fail(
			`Worker route ${route.pattern} is bound to ${remoteRoute.script}, expected ${config.name}`,
		);
	}
};

const checkPublicEndpoints = async () => {
	const origin = getAuthOrigin();
	if (origin.protocol !== "https:") {
		fail(`CINAAUTH_URL must be HTTPS, got ${origin.origin}`);
		return;
	}

	const root = await publicFetch(origin.href, {
		headers: { Accept: "application/json" },
	});
	if (root) {
		if (!root.ok) {
			warn(`Public auth endpoint ${origin.href} returned HTTP ${root.status}`);
		}
		const cacheControl = root.headers.get("cache-control") || "";
		if (!cacheControl.toLowerCase().includes("no-store")) {
			warn(
				`Public auth endpoint ${origin.href} does not return Cache-Control: no-store; it may still be serving the old Worker`,
			);
		}
	}

	const readyUrl = new URL("/api/ready", origin).href;
	const readiness = await publicFetch(readyUrl, { method: "GET" });
	if (!readiness) {
		return;
	}
	if (readiness.status === 404) {
		warn(
			`Public readiness endpoint ${readyUrl} returned 404; the hardened Worker is not deployed yet`,
		);
		return;
	}
	if (readiness.ok) {
		fail(
			`Public readiness endpoint ${readyUrl} returned HTTP ${readiness.status} without a migration token; it must stay protected`,
		);
	}
};

const main = async () => {
	requireEnv();
	if (failures.length === 0) {
		try {
			await checkD1();
			await checkQueues();
			await checkSecrets();
			checkOptionalPluginInputs();
			await checkZoneAndRoute();
			await checkPublicEndpoints();
		} catch (error) {
			fail(error instanceof Error ? error.message : String(error));
		}
	}

	for (const warning of warnings) {
		console.warn(`Warning: ${warning}`);
	}
	if (failures.length > 0) {
		console.error("Cloudflare remote preflight failed:");
		for (const failure of failures) {
			console.error(`- ${failure}`);
		}
		process.exit(1);
	}
	console.log("Cloudflare remote preflight passed.");
};

await main();
