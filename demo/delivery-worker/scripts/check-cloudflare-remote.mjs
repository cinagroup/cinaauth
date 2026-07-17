import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://api.cloudflare.com/client/v4";
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const REQUIRED_RUNTIME_INPUTS = [
	"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
	"RESEND_API_KEY",
	"RESEND_EMAIL_FROM",
	"TWILIO_ACCOUNT_SID",
	"TWILIO_AUTH_TOKEN",
	"TWILIO_FROM_NUMBER",
];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workerDir = dirname(scriptDir);
const config = JSON.parse(readFileSync(join(workerDir, "wrangler.json"), "utf8"));
const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const configuredRuntimeInputs = new Set(Object.keys(config.vars ?? {}));
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
	if (!accountId) {
		fail("CLOUDFLARE_ACCOUNT_ID is required");
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
	throw new Error(`Cloudflare API request failed: ${describeFetchError(lastError)}`);
};

const isMissingWorkerError = (error) =>
	error instanceof Error &&
	/Worker does not exist|script.*not found|not exist/i.test(error.message);

const publicFetch = async (url) => {
	const headers = { Accept: "application/json" };
	if (process.env.CINAAUTH_DELIVERY_WEBHOOK_SECRET) {
		headers.Authorization = `Bearer ${process.env.CINAAUTH_DELIVERY_WEBHOOK_SECRET}`;
	}
	try {
		return await fetch(url, {
			headers,
			signal: AbortSignal.timeout(10_000),
		});
	} catch (error) {
		warn(`Public endpoint ${url} could not be reached: ${describeFetchError(error)}`);
		return undefined;
	}
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

const checkRuntimeInputs = async () => {
	let secrets = [];
	try {
		secrets = await cloudflareFetch(
			`/accounts/${accountId}/workers/scripts/${config.name}/secrets`,
		);
	} catch (error) {
		if (!isMissingWorkerError(error)) {
			throw error;
		}
		fail(
			`Delivery Worker ${config.name} is not deployed yet; deploy it before remote secret names can be verified`,
		);
	}
	for (const secret of secrets) {
		configuredRuntimeInputs.add(secret.name);
	}
	for (const input of REQUIRED_RUNTIME_INPUTS) {
		if (!configuredRuntimeInputs.has(input)) {
			fail(`Delivery Worker runtime input ${input} is missing`);
		}
	}
};

const checkZoneAndRoute = async () => {
	const route = config.routes?.find((item) =>
		item.pattern === "cinaauth-delivery.cinagroup.com/*",
	);
	if (!route) {
		fail("wrangler.json must define cinaauth-delivery.cinagroup.com/* route");
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
	if (root && root.status === 404) {
		warn("Delivery Worker public root returned 404; it may not be deployed yet");
	}
	const ready = await publicFetch("https://cinaauth-delivery.cinagroup.com/ready");
	if (!ready) return;
	if (ready.status === 404) {
		warn("Delivery Worker readiness returned 404; it may not be deployed yet");
		return;
	}
	if (ready.ok) {
		warn("Delivery Worker readiness already passes; confirm provider credentials are production values");
	}
};

const main = async () => {
	requireEnv();
	if (failures.length === 0) {
		try {
			await checkKVNamespaces();
			await checkRuntimeInputs();
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
		console.error("Delivery Worker Cloudflare remote preflight failed:");
		for (const failure of failures) {
			console.error(`- ${failure}`);
		}
		process.exit(1);
	}
	console.log("Delivery Worker Cloudflare remote preflight passed.");
};

await main();
