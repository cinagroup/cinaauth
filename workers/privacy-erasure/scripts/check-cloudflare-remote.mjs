import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://api.cloudflare.com/client/v4";
const ORIGIN = "https://cinaauth-erasure.cinagroup.com";
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const REQUIRED_SECRETS = [
	"CINAAUTH_ERASURE_WEBHOOK_SECRET",
	"CINAAUTH_ERASURE_STORAGE_SECRET",
	"CINAAUTH_ERASURE_TARGETS",
];
const allowNotReady = process.argv.includes("--allow-not-ready");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workerDir = dirname(scriptDir);
const config = JSON.parse(
	readFileSync(join(workerDir, "wrangler.json"), "utf8"),
);
const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const failures = [];
const warnings = [];

const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const shouldRetry = (response) =>
	RETRYABLE_STATUS_CODES.has(response.status) || response.status >= 500;

const describeFetchError = (error) => {
	if (!(error instanceof Error)) return String(error);
	const cause = error.cause;
	if (cause && typeof cause === "object" && "code" in cause) {
		return `${error.message} (${String(cause.code)})`;
	}
	return error.message;
};

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
	throw new Error(
		`Cloudflare API request failed: ${describeFetchError(lastError)}`,
	);
};

const publicFetch = async (url, init = {}) => {
	let lastError;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			const response = await fetch(url, {
				...init,
				signal: AbortSignal.timeout(10_000),
			});
			if (attempt < MAX_ATTEMPTS && shouldRetry(response)) {
				lastError = new Error(`HTTP ${response.status}`);
				await sleep(500 * attempt);
				continue;
			}
			return response;
		} catch (error) {
			lastError = error;
			if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt);
		}
	}
	throw new Error(`Public endpoint failed: ${describeFetchError(lastError)}`);
};

const resolveAccountId = async () => {
	if (accountId) return;
	const accounts = await cloudflareFetch("/accounts");
	if (!Array.isArray(accounts) || accounts.length !== 1) {
		fail(
			"CLOUDFLARE_ACCOUNT_ID is required unless the API token accesses exactly one account",
		);
		return;
	}
	accountId = accounts[0].id;
};

const checkWorkerSettings = async () => {
	const settings = await cloudflareFetch(
		`/accounts/${accountId}/workers/scripts/${config.name}/settings`,
	);
	const binding = settings.bindings?.find(
		(item) =>
			item.name === "ERASURE_COORDINATOR" &&
			item.type === "durable_object_namespace",
	);
	if (!binding) {
		fail("Remote Worker is missing ERASURE_COORDINATOR Durable Object binding");
		return;
	}
	if (typeof binding.namespace_id !== "string") {
		fail("Remote ERASURE_COORDINATOR binding is missing its namespace id");
		return;
	}
	const durableNamespace = await cloudflareFetch(
		`/accounts/${accountId}/workers/durable_objects/namespaces/${binding.namespace_id}`,
	);
	if (
		durableNamespace.script !== config.name ||
		durableNamespace.class !== "ErasureCoordinator" ||
		durableNamespace.use_sqlite !== true
	) {
		fail(
			"Remote ErasureCoordinator namespace must use SQLite Durable Object storage",
		);
	}

	const deployments = await cloudflareFetch(
		`/accounts/${accountId}/workers/scripts/${config.name}/deployments`,
	);
	const currentVersion = deployments.deployments?.[0]?.versions?.find(
		(version) => version.percentage === 100,
	)?.version_id;
	if (typeof currentVersion !== "string") {
		fail("Remote Privacy Erasure Worker has no active 100% deployment");
		return;
	}
	const version = await cloudflareFetch(
		`/accounts/${accountId}/workers/scripts/${config.name}/versions/${currentVersion}`,
	);
	const durableHandler = version.resources?.script?.named_handlers?.find(
		(handler) =>
			handler.name === "ErasureCoordinator" &&
			handler.handlers?.includes("class"),
	);
	if (!durableHandler) {
		fail("Remote Worker version does not export ErasureCoordinator");
	}
	if (version.resources?.script_runtime?.migration_tag !== "v1") {
		fail("Remote Privacy Erasure Worker must have Durable Object migration v1");
	}
};

const checkSecrets = async () => {
	const secrets = await cloudflareFetch(
		`/accounts/${accountId}/workers/scripts/${config.name}/secrets`,
	);
	const names = new Set(secrets.map(({ name }) => name));
	for (const secret of REQUIRED_SECRETS) {
		if (!names.has(secret)) fail(`Worker secret ${secret} is missing`);
	}
};

const checkCustomDomain = async () => {
	const domains = await cloudflareFetch(
		`/accounts/${accountId}/workers/domains`,
	);
	const remote = domains.find(
		(domain) => domain.hostname === "cinaauth-erasure.cinagroup.com",
	);
	if (!remote) {
		fail("Privacy Erasure Worker Custom Domain is missing");
	} else if (remote.service !== config.name) {
		fail(
			`Privacy Erasure Worker Custom Domain is bound to ${remote.service}, expected ${config.name}`,
		);
	}
};

const checkPublicEndpoints = async () => {
	const root = await publicFetch(`${ORIGIN}/`, {
		headers: { Accept: "application/json" },
	});
	if (!root.ok)
		fail(`Privacy Erasure Worker root returned HTTP ${root.status}`);
	if (!root.headers.get("cache-control")?.includes("no-store")) {
		fail("Privacy Erasure Worker root must return Cache-Control: no-store");
	}

	const readinessSecret = process.env.CINAAUTH_ERASURE_WEBHOOK_SECRET;
	const ready = await publicFetch(`${ORIGIN}/ready`, {
		headers: {
			Accept: "application/json",
			...(readinessSecret
				? { Authorization: `Bearer ${readinessSecret}` }
				: {}),
		},
	});
	const body = await ready.json().catch(() => undefined);
	if (allowNotReady && ready.status === 503) {
		if (!body || body.runtimeConfig?.ok !== false) {
			fail(
				"Fail-closed bootstrap readiness must report runtimeConfig.ok=false",
			);
		} else {
			warn(
				"Privacy Erasure Worker is intentionally fail-closed with no ready target",
			);
		}
		return;
	}
	if (!ready.ok) {
		fail(`Privacy Erasure Worker readiness returned HTTP ${ready.status}`);
		return;
	}
	if (!body || body.success !== true || body.runtimeConfig?.ok !== true) {
		fail("Privacy Erasure Worker readiness response is incomplete");
	}
	if (readinessSecret && !Array.isArray(body.runtimeConfig?.targetIds)) {
		fail(
			"Authorized readiness must expose the configured public-safe target IDs",
		);
	}
	const serialized = JSON.stringify(body);
	if (/https?:\/\//i.test(serialized) || serialized.includes("secret")) {
		fail("Readiness must not expose target URLs or secret fields");
	}
};

const main = async () => {
	if (!token) fail("CLOUDFLARE_API_TOKEN or CF_API_TOKEN is required");
	if (failures.length === 0) {
		try {
			await resolveAccountId();
			if (failures.length === 0) {
				await checkWorkerSettings();
				await checkSecrets();
				await checkCustomDomain();
				await checkPublicEndpoints();
			}
		} catch (error) {
			fail(error instanceof Error ? error.message : String(error));
		}
	}
	for (const warning of warnings) console.warn(`Warning: ${warning}`);
	if (failures.length > 0) {
		console.error("Privacy Erasure Worker Cloudflare preflight failed:");
		for (const failure of failures) console.error(`- ${failure}`);
		process.exit(1);
	}
	console.log("Privacy Erasure Worker Cloudflare preflight passed.");
};

await main();
