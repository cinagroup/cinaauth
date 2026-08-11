import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://api.cloudflare.com/client/v4";
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const SECRETS_STORE_BINDINGS = [
	{
		name: "CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2",
		storeId: "346e2b4b86334bc29083c064116e91cf",
		secretName: "CINAAUTH_DELIVERY_WEBHOOK_SECRET_V2",
	},
	{
		name: "CINAAUTH_DELIVERY_CONFIG_KEK_STORE",
		storeId: "346e2b4b86334bc29083c064116e91cf",
		secretName: "CINAAUTH_DELIVERY_CONFIG_KEK_V1",
	},
];

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

const requireEnv = () => {
	if (!token) {
		fail("CLOUDFLARE_API_TOKEN or CF_API_TOKEN is required");
	}
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
	throw new Error(
		`Cloudflare API request failed: ${describeFetchError(lastError)}`,
	);
};

const resolveAccountId = async () => {
	if (accountId) return;
	const accounts = await cloudflareFetch("/accounts");
	if (!Array.isArray(accounts) || accounts.length === 0) {
		fail(
			"CLOUDFLARE_ACCOUNT_ID is required because no accessible account was found",
		);
		return;
	}
	if (accounts.length > 1) {
		fail(
			"CLOUDFLARE_ACCOUNT_ID is required when the API token can access multiple accounts",
		);
		return;
	}
	accountId = accounts[0].id;
};

const publicFetch = async (url) => {
	const headers = { Accept: "application/json" };
	if (process.env.CINAAUTH_DELIVERY_WEBHOOK_SECRET) {
		headers.Authorization = `Bearer ${process.env.CINAAUTH_DELIVERY_WEBHOOK_SECRET}`;
	}
	let lastError;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			const response = await fetch(url, {
				headers,
				signal: AbortSignal.timeout(10_000),
			});
			if (attempt < MAX_ATTEMPTS && shouldRetry(response)) {
				await sleep(500 * attempt);
				continue;
			}
			return response;
		} catch (error) {
			lastError = error;
			if (attempt < MAX_ATTEMPTS) {
				await sleep(500 * attempt);
			}
		}
	}
	warn(
		`Public endpoint ${url} could not be reached: ${describeFetchError(lastError)}`,
	);
	return undefined;
};

const checkKVNamespaces = async () => {
	for (const binding of config.kv_namespaces ?? []) {
		try {
			await cloudflareFetch(
				`/accounts/${accountId}/storage/kv/namespaces/${binding.id}`,
			);
		} catch {
			fail(`KV namespace ${binding.binding} (${binding.id}) does not exist`);
		}
	}
};

const checkWorkerSettings = async () => {
	const settings = await cloudflareFetch(
		`/accounts/${accountId}/workers/scripts/${config.name}/settings`,
	);
	for (const expected of SECRETS_STORE_BINDINGS) {
		const binding = settings.bindings?.find(
			(item) => item.name === expected.name,
		);
		if (
			binding?.type !== "secrets_store_secret" ||
			binding.store_id !== expected.storeId ||
			binding.secret_name !== expected.secretName
		) {
			fail(
				`Remote ${expected.name} binding must target ${expected.storeId}/${expected.secretName}`,
			);
		}
	}
	const durableObject = settings.bindings?.find(
		(item) => item.name === "DELIVERY_CONFIG",
	);
	if (durableObject?.type !== "durable_object_namespace") {
		fail("Remote DELIVERY_CONFIG Durable Object binding is missing");
	}
};

const checkZoneAndRoute = async () => {
	const hostname = "cinaauth-delivery.cinagroup.com";
	const route = config.routes?.find(
		(item) => item.pattern === hostname || item.pattern === `${hostname}/*`,
	);
	if (!route) {
		fail(`wrangler.json must define a route for ${hostname}`);
		return;
	}
	if (route.custom_domain === true) {
		const domains = await cloudflareFetch(
			`/accounts/${accountId}/workers/domains`,
		);
		const remoteDomain = domains.find((domain) => domain.hostname === hostname);
		if (!remoteDomain) {
			warn(
				`Custom Domain ${hostname} is not live yet; wrangler deploy should create it`,
			);
			return;
		}
		if (remoteDomain.service !== config.name) {
			fail(
				`Custom Domain ${hostname} is bound to ${remoteDomain.service}, expected ${config.name}`,
			);
		}
		return;
	}
	if (!route.zone_name && !route.zone_id) {
		fail(`Worker route ${route.pattern} must include zone_name or zone_id`);
		return;
	}
	const zones = await cloudflareFetch(
		`/zones?name=${encodeURIComponent(route.zone_name)}`,
	);
	const zone = zones.find((item) => item.name === route.zone_name);
	if (!zone) {
		fail(`Cloudflare zone ${route.zone_name} does not exist`);
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
	const root = await publicFetch("https://cinaauth-delivery.cinagroup.com/");
	if (root) {
		const rootBody = await root.json().catch(() => undefined);
		if (
			!root.ok ||
			!rootBody ||
			typeof rootBody !== "object" ||
			rootBody.structuralReady !== true
		) {
			fail("Delivery Worker structural health response is incomplete");
		}
	}
	const ready = await publicFetch(
		"https://cinaauth-delivery.cinagroup.com/ready",
	);
	if (!ready) return;
	if (!ready.ok && ready.status !== 503) {
		fail(`Delivery Worker readiness returned unexpected HTTP ${ready.status}`);
		return;
	}
	if (!process.env.CINAAUTH_DELIVERY_WEBHOOK_SECRET) {
		warn(
			"Detailed delivery readiness was not checked because CINAAUTH_DELIVERY_WEBHOOK_SECRET is not available in this process",
		);
		return;
	}
	const body = await ready.json().catch(() => undefined);
	if (
		!body ||
		typeof body !== "object" ||
		typeof body.success !== "boolean" ||
		typeof body.runtimeConfig?.ok !== "boolean" ||
		body.secretsStore?.active !== true ||
		body.secretsStore?.ok !== true ||
		!Array.isArray(body.secretsStore?.issues) ||
		body.secretsStore.issues.length !== 0 ||
		typeof body.providers?.email !== "boolean" ||
		typeof body.providers?.sms !== "boolean" ||
		body.replay?.kv !== true
	) {
		fail("Authorized Delivery Worker readiness response is incomplete");
	}
	if (body.success !== true) {
		warn(
			`Delivery Worker is structurally deployed but operational state is ${body.runtimeConfig?.operationalState ?? "unknown"}; finish provider configuration after deployment`,
		);
	}
};

const main = async () => {
	requireEnv();
	if (failures.length === 0) {
		try {
			await resolveAccountId();
			if (failures.length === 0) {
				await checkWorkerSettings();
				await checkKVNamespaces();
				await checkZoneAndRoute();
				await checkPublicEndpoints();
			}
		} catch (error) {
			fail(error instanceof Error ? error.message : String(error));
		}
	}

	for (const warning of warnings) {
		console.warn(`Warning: ${warning}`);
	}
	if (failures.length > 0) {
		console.error("Delivery Worker Cloudflare remote preflight failed:");
		for (const failure of failures) {
			console.error(`- ${failure}`);
		}
		process.exit(1);
	}
	console.log("Delivery Worker Cloudflare remote preflight passed.");
};

await main();
