import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyCloudflareEdgeMitigation } from "../../../scripts/cloudflare-edge-mitigation.mjs";

const API_BASE = "https://api.cloudflare.com/client/v4";
const ORIGIN = "https://cinaauth-erasure.cinagroup.com";
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const REQUIRED_SECRETS = ["CINAAUTH_ERASURE_STORAGE_SECRET"];
const SECRETS_STORE_BINDINGS = [
	{
		name: "CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2",
		storeId: "346e2b4b86334bc29083c064116e91cf",
		secretName: "CINAAUTH_ERASURE_WEBHOOK_SECRET_V2",
	},
	{
		name: "CINAAUTH_ERASURE_CONFIG_KEK_STORE",
		storeId: "346e2b4b86334bc29083c064116e91cf",
		secretName: "CINAAUTH_ERASURE_CONFIG_KEK_V1",
	},
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
const edgeMitigatedEndpoints = [];

const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const shouldRetry = (response) =>
	RETRYABLE_STATUS_CODES.has(response.status) || response.status >= 500;

const isRecord = (value) =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const containsHttpUrl = (value) => {
	if (typeof value === "string") return /^https?:\/\//i.test(value);
	if (Array.isArray(value)) return value.some(containsHttpUrl);
	if (isRecord(value)) return Object.values(value).some(containsHttpUrl);
	return false;
};

const hasOnlyKeys = (value, allowedKeys) =>
	isRecord(value) && Object.keys(value).every((key) => allowedKeys.has(key));

const hasPublicReadinessShape = (body) => {
	if (
		!hasOnlyKeys(
			body,
			new Set([
				"success",
				"service",
				"version",
				"runtimeConfig",
				"webhookAuthentication",
			]),
		) ||
		!hasOnlyKeys(
			body.runtimeConfig,
			new Set([
				"ok",
				"structuralReady",
				"operationalReady",
				"source",
				"issues",
				"targetIds",
				"configuration",
			]),
		)
	) {
		return false;
	}
	return (
		body.webhookAuthentication === undefined ||
		hasOnlyKeys(
			body.webhookAuthentication,
			new Set(["active", "ok", "source", "issues"]),
		)
	);
};

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

const markEdgeMitigatedEndpoint = async (
	response,
	endpoint,
	allowEdgeMitigation,
) => {
	if (!allowEdgeMitigation || response.status !== 403) return false;

	let mitigation = classifyCloudflareEdgeMitigation({
		status: response.status,
		headers: response.headers,
		body: "",
	});
	if (!mitigation && response.headers.get("cf-ray")?.trim()) {
		const body = await response
			.clone()
			.text()
			.catch(() => "");
		mitigation = classifyCloudflareEdgeMitigation({
			status: response.status,
			headers: response.headers,
			body,
		});
	}
	if (!mitigation) return false;

	edgeMitigatedEndpoints.push(endpoint);
	warn(
		`${endpoint} is edge-mitigated/unverified (${mitigation.evidence}); Cloudflare API Worker, binding, and domain checks completed without failures, but this public endpoint was not verified`,
	);
	return true;
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
	for (const expected of [
		{ binding: "ERASURE_COORDINATOR", className: "ErasureCoordinator" },
		{ binding: "ERASURE_CONFIG", className: "ErasureConfigDurableObject" },
	]) {
		const binding = settings.bindings?.find(
			(item) =>
				item.name === expected.binding &&
				item.type === "durable_object_namespace",
		);
		if (!binding) {
			fail(
				`Remote Worker is missing ${expected.binding} Durable Object binding`,
			);
			continue;
		}
		if (typeof binding.namespace_id !== "string") {
			fail(`Remote ${expected.binding} binding is missing its namespace id`);
			continue;
		}
		const durableNamespace = await cloudflareFetch(
			`/accounts/${accountId}/workers/durable_objects/namespaces/${binding.namespace_id}`,
		);
		if (
			durableNamespace.script !== config.name ||
			durableNamespace.class !== expected.className ||
			durableNamespace.use_sqlite !== true
		) {
			fail(
				`Remote ${expected.className} namespace must use SQLite Durable Object storage`,
			);
		}
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
	for (const className of [
		"ErasureCoordinator",
		"ErasureConfigDurableObject",
	]) {
		const durableHandler = version.resources?.script?.named_handlers?.find(
			(handler) =>
				handler.name === className && handler.handlers?.includes("class"),
		);
		if (!durableHandler) {
			fail(`Remote Worker version does not export ${className}`);
		}
	}
	if (version.resources?.script_runtime?.migration_tag !== "v2") {
		fail("Remote Privacy Erasure Worker must have Durable Object migration v2");
	}

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
	const allowHostsBinding = settings.bindings?.find(
		(item) => item.name === "CINAAUTH_ERASURE_ALLOWED_HOSTS",
	);
	if (allowHostsBinding?.type !== "plain_text") {
		fail(
			"Remote Worker is missing static CINAAUTH_ERASURE_ALLOWED_HOSTS policy",
		);
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
	} else if (
		remote.environment !== undefined &&
		remote.environment !== "production"
	) {
		fail(
			"Privacy Erasure Worker Custom Domain must target the production environment",
		);
	}
};

const checkPublicEndpoints = async (allowEdgeMitigation) => {
	const root = await publicFetch(`${ORIGIN}/`, {
		headers: { Accept: "application/json" },
	});
	const rootIsEdgeMitigated = await markEdgeMitigatedEndpoint(
		root,
		"Privacy Erasure Worker root endpoint",
		allowEdgeMitigation,
	);
	if (!rootIsEdgeMitigated) {
		if (!root.ok)
			fail(`Privacy Erasure Worker root returned HTTP ${root.status}`);
		if (!root.headers.get("cache-control")?.includes("no-store")) {
			fail("Privacy Erasure Worker root must return Cache-Control: no-store");
		}
	}

	const readinessSecret =
		process.env.CINAAUTH_ERASURE_WEBHOOK_SECRET_V2 ||
		process.env.CINAAUTH_ERASURE_WEBHOOK_SECRET;
	const ready = await publicFetch(`${ORIGIN}/ready`, {
		headers: {
			Accept: "application/json",
			...(readinessSecret
				? { Authorization: `Bearer ${readinessSecret}` }
				: {}),
		},
	});
	if (
		await markEdgeMitigatedEndpoint(
			ready,
			"Privacy Erasure Worker readiness endpoint",
			allowEdgeMitigation,
		)
	) {
		return;
	}
	const body = await ready.json().catch(() => undefined);
	if (allowNotReady && ready.status === 503) {
		if (
			!body ||
			body.runtimeConfig?.ok !== false ||
			body.runtimeConfig?.operationalReady !== false ||
			body.runtimeConfig?.structuralReady !== true
		) {
			fail(
				"Bootstrap must be structurally ready and operationally fail closed",
			);
		} else {
			warn(
				"Privacy Erasure Worker is intentionally fail-closed with no ready target",
			);
		}
		if (!hasPublicReadinessShape(body) || containsHttpUrl(body)) {
			fail("Readiness must not expose target URLs or secret fields");
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
	if (
		body.runtimeConfig?.structuralReady !== true ||
		body.runtimeConfig?.operationalReady !== true
	) {
		fail("Operational readiness must also confirm structural readiness");
	}
	if (readinessSecret && !Array.isArray(body.runtimeConfig?.targetIds)) {
		fail(
			"Authorized readiness must expose the configured public-safe target IDs",
		);
	}
	if (
		readinessSecret &&
		(body.webhookAuthentication?.active !== true ||
			body.webhookAuthentication?.ok !== true ||
			body.webhookAuthentication?.source !== "secrets-store-v2" ||
			!Array.isArray(body.webhookAuthentication?.issues) ||
			body.webhookAuthentication.issues.length !== 0)
	) {
		fail("Authorized readiness must confirm active Secrets Store V2 auth");
	}
	if (!hasPublicReadinessShape(body) || containsHttpUrl(body)) {
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
				await checkPublicEndpoints(failures.length === 0);
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
	if (edgeMitigatedEndpoints.length > 0) {
		console.log(
			`Privacy Erasure Worker Cloudflare preflight completed with ${edgeMitigatedEndpoints.length} edge-mitigated/unverified public endpoint(s); readiness was not verified.`,
		);
		return;
	}
	console.log("Privacy Erasure Worker Cloudflare preflight passed.");
};

await main();
