import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAuthReadiness } from "./check-auth-readiness.mjs";
import {
	evaluateDeliveryCapabilityParity,
	evaluateRuntimeCapabilities,
} from "./check-runtime-capabilities.mjs";
import {
	DEFAULT_TURNSTILE_DOMAINS,
	DEFAULT_TURNSTILE_WIDGET_NAME,
	selectTurnstileWidget,
	turnstileWidgetNeedsUpdate,
} from "./configure-turnstile.mjs";

const API_BASE = "https://api.cloudflare.com/client/v4";
const DELIVERY_READY_URL = "https://cinaauth-delivery.cinagroup.com/ready";
const MAX_ATTEMPTS = 3;
const MAX_QUEUE_RETENTION_SECONDS = 86_400;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const REQUIRED_WORKER_SECRETS = [
	"CINAAUTH_SECRET",
	"CINAAUTH_MIGRATION_TOKEN",
	"CINAAUTH_DELIVERY_WEBHOOK_URL",
	"CINAAUTH_PRIVACY_EXPORT_KEY",
	"CINAAUTH_ERASURE_WEBHOOK_URL",
	"CINATOKEN_OIDC_CLIENT_SECRET",
	"CINATOKEN_OIDC_BRIDGE_SECRET",
];
const SECRETS_STORE_BINDINGS = [
	{
		name: "CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2",
		storeId: "346e2b4b86334bc29083c064116e91cf",
		secretName: "CINAAUTH_DELIVERY_WEBHOOK_SECRET_V2",
	},
	{
		name: "CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2",
		storeId: "346e2b4b86334bc29083c064116e91cf",
		secretName: "CINAAUTH_ERASURE_WEBHOOK_SECRET_V2",
	},
	{
		name: "CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2",
		storeId: "346e2b4b86334bc29083c064116e91cf",
		secretName: "CINAADMIN_OIDC_CLIENT_SECRET_V2",
	},
	{
		name: "CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2",
		storeId: "346e2b4b86334bc29083c064116e91cf",
		secretName: "CINAADMIN_OIDC_BRIDGE_SECRET_V2",
	},
	{
		name: "CINATOKEN_IDENTITY_EVENTS_SECRET_STORE_V2",
		storeId: "346e2b4b86334bc29083c064116e91cf",
		secretName: "CINATOKEN_IDENTITY_EVENTS_SECRET_V2",
	},
];
const SERVICE_BINDINGS = [
	{ name: "CINAAUTH_DELIVERY_SERVICE", service: "cinaauth-delivery" },
	{ name: "CINAAUTH_ERASURE_SERVICE", service: "cinaauth-privacy-erasure" },
	{ name: "CINATOKEN_IDENTITY_EVENTS_SERVICE", service: "cinatoken-admin" },
];
const SIWE_RUNTIME_VARIABLE_NAMES = [
	"CINAAUTH_SIWE_ENABLED",
	"CINAAUTH_SIWE_ALLOWED_CHAIN_IDS",
	"CINAAUTH_SIWE_RP_DOMAIN",
	"CINAAUTH_SIWE_RP_URI",
	"CINAAUTH_SIWE_ALLOW_LEGACY",
	"CINAAUTH_SIWE_AUTO_SIGNUP",
];
const OPTIONAL_PLUGIN_INPUT_GROUPS = [
	{
		name: "Cloudflare Turnstile captcha plugin",
		inputs: [
			"CLOUDFLARE_TURNSTILE_SITE_KEY",
			"CLOUDFLARE_TURNSTILE_SECRET_KEY",
		],
	},
	{
		name: "Google social provider",
		inputs: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
	},
	{
		name: "GitHub social provider",
		inputs: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
	},
	{
		name: "generic OAuth plugin",
		inputs: ["GENERIC_OAUTH_CONFIG"],
	},
	{
		name: "Stripe plugin",
		inputs: [
			"STRIPE_SECRET_KEY",
			"STRIPE_WEBHOOK_SECRET",
			"STRIPE_DEFAULT_PRICE_ID",
			"CINAAUTH_ENTITLEMENT_CONFIG",
		],
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
const config = JSON.parse(
	readFileSync(join(workerDir, "wrangler.json"), "utf8"),
);
const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const migrationToken = process.env.CINAAUTH_MIGRATION_TOKEN;
const requireAllPluginInputs =
	process.env.CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS === "1";
const configuredRuntimeInputs = new Set(Object.keys(config.vars ?? {}));

const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getAuthOrigin = () =>
	new URL(config.vars?.CINAAUTH_URL || "https://auth.cinaseek.ai");

const requireEnv = () => {
	if (!token) {
		fail("CLOUDFLARE_API_TOKEN or CF_API_TOKEN is required");
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
			if (attempt < MAX_ATTEMPTS) {
				await sleep(500 * attempt);
				continue;
			}
		}
	}
	warn(
		`Public endpoint ${url} could not be reached: ${describeFetchError(lastError)}`,
	);
	return undefined;
};

const getConfiguredRoute = () => {
	const origin = getAuthOrigin();
	return config.routes?.find(
		(route) =>
			route.pattern === origin.hostname ||
			route.pattern === `${origin.hostname}/*` ||
			route.pattern === `${origin.hostname}/`,
	);
};

const checkHyperdrive = async () => {
	const binding = config.hyperdrive?.find(
		(hyperdrive) => hyperdrive.binding === "HYPERDRIVE",
	);
	if (!binding) {
		fail("wrangler.json must define the HYPERDRIVE binding");
		return;
	}
	if (binding.id === "00000000000000000000000000000000") {
		fail("wrangler.json still contains the Hyperdrive placeholder ID");
		return;
	}
	const hyperdrives = await cloudflareFetch(
		`/accounts/${accountId}/hyperdrive/configs`,
	);
	const remote = hyperdrives.find((hyperdrive) => hyperdrive.id === binding.id);
	if (!remote) {
		fail(`Hyperdrive config ${binding.id} does not exist`);
		return;
	}
	if (
		remote.origin?.scheme !== "postgres" &&
		remote.origin?.scheme !== "postgresql"
	) {
		fail(`Hyperdrive config ${binding.id} must target PostgreSQL`);
	}
	if (remote.caching?.disabled !== true) {
		fail(
			`Hyperdrive config ${binding.id} must disable query caching for authentication data`,
		);
	}
};

const checkLegacyD1 = async () => {
	const binding = config.d1_databases?.find(
		(database) => database.binding === "LEGACY_D1",
	);
	if (!binding?.database_id) {
		fail("wrangler.json must retain the LEGACY_D1 binding");
		return;
	}
	const remote = await cloudflareFetch(
		`/accounts/${accountId}/d1/database/${binding.database_id}`,
	);
	if (remote.name !== binding.database_name) {
		fail(
			`LEGACY_D1 ${binding.database_id} is ${remote.name}, expected ${binding.database_name}`,
		);
	}
};

const checkPrivacyExportBucket = async () => {
	const binding = config.r2_buckets?.find(
		(bucket) => bucket.binding === "CINAAUTH_PRIVACY_EXPORTS",
	);
	if (!binding?.bucket_name) {
		fail("wrangler.json must bind the privacy export R2 bucket");
		return;
	}
	const result = await cloudflareFetch(`/accounts/${accountId}/r2/buckets`);
	const buckets = Array.isArray(result) ? result : (result?.buckets ?? []);
	if (!buckets.some((bucket) => bucket.name === binding.bucket_name)) {
		fail(`R2 bucket ${binding.bucket_name} does not exist`);
		return;
	}
	const lifecycle = await cloudflareFetch(
		`/accounts/${accountId}/r2/buckets/${encodeURIComponent(binding.bucket_name)}/lifecycle`,
	);
	const rules = Array.isArray(lifecycle?.rules) ? lifecycle.rules : [];
	const expiry = rules.find(
		(rule) =>
			rule.id === "expire-cinaauth-privacy-exports-after-one-day" &&
			rule.conditions?.prefix === "privacy-exports/" &&
			rule.deleteObjectsTransition?.condition?.type === "Age" &&
			rule.deleteObjectsTransition?.condition?.maxAge === 86_400,
	);
	if (!expiry) {
		fail(
			`R2 bucket ${binding.bucket_name} must expire privacy-exports/ after one day`,
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
		const remoteQueue = remoteQueues.get(queue);
		if (!remoteQueue) {
			fail(`Queue ${queue} does not exist`);
			continue;
		}
		if (
			remoteQueue.settings?.message_retention_period !==
			MAX_QUEUE_RETENTION_SECONDS
		) {
			fail(
				`Queue ${queue} must use ${MAX_QUEUE_RETENTION_SECONDS}-second retention`,
			);
		}
	}
};

const checkWorkerBindings = async () => {
	const configuredServices = config.services ?? [];
	if (configuredServices.length !== SERVICE_BINDINGS.length) {
		fail(
			`wrangler.json must declare exactly ${SERVICE_BINDINGS.length} service bindings`,
		);
	}
	for (const expected of SERVICE_BINDINGS) {
		const configured = configuredServices.find(
			(binding) => binding.binding === expected.name,
		);
		if (configured?.service !== expected.service) {
			fail(`wrangler.json must bind ${expected.name} to ${expected.service}`);
		}
	}
	const configuredSecretsStoreBindings = config.secrets_store_secrets ?? [];
	if (configuredSecretsStoreBindings.length !== SECRETS_STORE_BINDINGS.length) {
		fail(
			`wrangler.json must declare exactly ${SECRETS_STORE_BINDINGS.length} Secrets Store bindings`,
		);
	}
	for (const expected of SECRETS_STORE_BINDINGS) {
		const configured = configuredSecretsStoreBindings.find(
			(binding) => binding.binding === expected.name,
		);
		if (
			configured?.store_id !== expected.storeId ||
			configured.secret_name !== expected.secretName
		) {
			fail(
				`wrangler.json must map ${expected.name} to ${expected.storeId}/${expected.secretName}`,
			);
		}
	}

	const settings = await cloudflareFetch(
		`/accounts/${accountId}/workers/scripts/${config.name}/settings`,
	);
	for (const name of SIWE_RUNTIME_VARIABLE_NAMES) {
		const binding = (settings.bindings ?? []).find(
			(item) => item.type === "plain_text" && item.name === name,
		);
		if (binding?.text !== config.vars?.[name]) {
			fail(`Remote ${name} must match the tracked non-secret SIWE config`);
		}
	}
	const remoteServices = (settings.bindings ?? []).filter(
		(item) => item.type === "service",
	);
	if (remoteServices.length !== SERVICE_BINDINGS.length) {
		fail(
			`Remote Auth Worker must expose exactly ${SERVICE_BINDINGS.length} service bindings`,
		);
	}
	for (const expected of SERVICE_BINDINGS) {
		const binding = remoteServices.find((item) => item.name === expected.name);
		if (binding?.service !== expected.service) {
			fail(`Remote ${expected.name} binding must target ${expected.service}`);
		}
	}

	const remoteSecretsStoreBindings = (settings.bindings ?? []).filter(
		(item) => item.type === "secrets_store_secret",
	);
	if (remoteSecretsStoreBindings.length !== SECRETS_STORE_BINDINGS.length) {
		fail(
			`Remote Auth Worker must expose exactly ${SECRETS_STORE_BINDINGS.length} Secrets Store bindings`,
		);
	}
	for (const expected of SECRETS_STORE_BINDINGS) {
		const binding = remoteSecretsStoreBindings.find(
			(item) => item.name === expected.name,
		);
		if (
			binding?.store_id !== expected.storeId ||
			binding.secret_name !== expected.secretName
		) {
			fail(
				`Remote ${expected.name} binding must target ${expected.storeId}/${expected.secretName}`,
			);
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

const checkTurnstileResource = async () => {
	const widgets = await cloudflareFetch(
		`/accounts/${accountId}/challenges/widgets?per_page=100`,
	);
	const widget = selectTurnstileWidget(
		Array.isArray(widgets) ? widgets : [],
		DEFAULT_TURNSTILE_WIDGET_NAME,
	);
	const secretsConfigured = [
		"CLOUDFLARE_TURNSTILE_SITE_KEY",
		"CLOUDFLARE_TURNSTILE_SECRET_KEY",
	].every((name) => configuredRuntimeInputs.has(name));
	if (!widget) {
		const message = `${DEFAULT_TURNSTILE_WIDGET_NAME} Turnstile widget is missing; run configure:turnstile with a Turnstile Sites Write token`;
		if (secretsConfigured || requireAllPluginInputs) {
			fail(message);
		} else {
			warn(message);
		}
		return;
	}
	if (turnstileWidgetNeedsUpdate(widget, DEFAULT_TURNSTILE_DOMAINS)) {
		fail(
			`${DEFAULT_TURNSTILE_WIDGET_NAME} Turnstile widget must use managed mode, no clearance, and the production hostname allow-list`,
		);
	}
};

const checkZoneAndRoute = async () => {
	const route = getConfiguredRoute();
	if (!route) {
		fail(`wrangler.json must define a route for ${getAuthOrigin().hostname}/*`);
		return;
	}

	if (route.custom_domain === true) {
		const domains = await cloudflareFetch(
			`/accounts/${accountId}/workers/domains`,
		);
		const remoteDomain = domains.find(
			(domain) => domain.hostname === getAuthOrigin().hostname,
		);
		if (!remoteDomain) {
			warn(
				`Custom Domain ${route.pattern} is not live yet; wrangler deploy should create it`,
			);
			return;
		}
		if (remoteDomain.service !== config.name) {
			fail(
				`Custom Domain ${route.pattern} is bound to ${remoteDomain.service}, expected ${config.name}`,
			);
		}
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

const checkDeliveryCapabilityParity = async (capabilities) => {
	const secret =
		process.env.CINAAUTH_DELIVERY_WEBHOOK_SECRET_V2 ||
		process.env.CINAAUTH_DELIVERY_WEBHOOK_SECRET;
	if (!secret) {
		warn(
			"Delivery capability parity was not checked because neither CINAAUTH_DELIVERY_WEBHOOK_SECRET_V2 nor its legacy fallback is available in this process",
		);
		return;
	}
	const response = await publicFetch(DELIVERY_READY_URL, {
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${secret}`,
		},
	});
	if (!response) {
		fail("Authorized Delivery Worker readiness is unreachable");
		return;
	}
	if (response.status !== 200 && response.status !== 503) {
		fail(
			`Authorized Delivery Worker readiness returned HTTP ${response.status}`,
		);
		return;
	}
	const body = await response.json().catch(() => undefined);
	if (
		!body ||
		typeof body !== "object" ||
		typeof body.providers?.email !== "boolean" ||
		typeof body.providers?.sms !== "boolean"
	) {
		fail("Authorized Delivery Worker readiness has invalid provider details");
		return;
	}
	for (const message of evaluateDeliveryCapabilityParity({
		capabilities,
		providers: body.providers,
	})) {
		fail(message);
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

	const capabilitiesUrl = new URL("/api/auth/capabilities", origin).href;
	const capabilitiesResponse = await publicFetch(capabilitiesUrl, {
		headers: { Accept: "application/json" },
	});
	if (!capabilitiesResponse) {
		fail(`Public capabilities endpoint ${capabilitiesUrl} is unreachable`);
	} else {
		const cacheControl =
			capabilitiesResponse.headers.get("cache-control") || "";
		if (!capabilitiesResponse.ok) {
			fail(
				`Public capabilities endpoint ${capabilitiesUrl} returned HTTP ${capabilitiesResponse.status}`,
			);
		}
		if (!cacheControl.toLowerCase().includes("no-store")) {
			fail("Public auth capabilities must return Cache-Control: no-store");
		}
		const capabilities = await capabilitiesResponse
			.json()
			.catch(() => undefined);
		if (!capabilities || typeof capabilities !== "object") {
			fail("Public auth capabilities must return a JSON object");
		} else {
			for (const message of evaluateRuntimeCapabilities({
				configuredInputs: configuredRuntimeInputs,
				configuredValues: config.vars ?? {},
				capabilities,
			})) {
				fail(message);
			}
			await checkDeliveryCapabilityParity(capabilities);
		}
	}

	await checkAuthReadiness({
		origin,
		migrationToken,
		publicFetch,
		fail,
		warn,
	});
};

const main = async () => {
	requireEnv();
	if (failures.length === 0) {
		try {
			await resolveAccountId();
			if (failures.length === 0) {
				await checkHyperdrive();
				await checkLegacyD1();
				await checkPrivacyExportBucket();
				await checkQueues();
				await checkWorkerBindings();
				await checkSecrets();
				checkOptionalPluginInputs();
				await checkTurnstileResource();
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
		console.error("Cloudflare remote preflight failed:");
		for (const failure of failures) {
			console.error(`- ${failure}`);
		}
		process.exit(1);
	}
	console.log("Cloudflare remote preflight passed.");
};

await main();
