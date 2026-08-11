import { spawnSync } from "node:child_process";

const REQUIRED_SECRETS = [
	"CINAAUTH_SECRET",
	"CINAAUTH_MIGRATION_TOKEN",
	"CINAAUTH_DELIVERY_WEBHOOK_URL",
	"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
	"CINAAUTH_PRIVACY_EXPORT_KEY",
	"CINAAUTH_ERASURE_WEBHOOK_URL",
	"CINAAUTH_ERASURE_WEBHOOK_SECRET",
	"CINAADMIN_OIDC_CLIENT_SECRET",
	"CINAADMIN_OIDC_BRIDGE_SECRET",
];

const OPTIONAL_SECRETS = [
	"OAUTH_PAIRWISE_SECRET",
	"GENERIC_OAUTH_CONFIG",
	"GOOGLE_CLIENT_ID",
	"GOOGLE_CLIENT_SECRET",
	"GITHUB_CLIENT_ID",
	"GITHUB_CLIENT_SECRET",
	"CLOUDFLARE_TURNSTILE_SITE_KEY",
	"CLOUDFLARE_TURNSTILE_SECRET_KEY",
	"STRIPE_SECRET_KEY",
	"STRIPE_WEBHOOK_SECRET",
	"STRIPE_DEFAULT_PRICE_ID",
	"STRIPE_DEFAULT_PLAN_NAME",
	"CINAAUTH_ENTITLEMENT_CONFIG",
	"CINAUTH_ADMIN_SERVICE_KEY",
];

const isDryRun = process.argv.includes("--dry-run");
const ADMIN_OIDC_CLIENT_SECRET_PREFIX = "cina_cs_";
const ADMIN_OIDC_CLIENT_SECRET_MIN_PAYLOAD_LENGTH = 32;
const skipDeliveryReadyCheck =
	process.env.CINAAUTH_SKIP_DELIVERY_READY_CHECK === "1";
const allowErasureNotReady = process.argv.includes("--allow-erasure-not-ready");
const STRONG_SECRETS = new Set([
	"CINAAUTH_SECRET",
	"CINAAUTH_MIGRATION_TOKEN",
	"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
	"CINAAUTH_PRIVACY_EXPORT_KEY",
	"CINAAUTH_ERASURE_WEBHOOK_SECRET",
	"CINAADMIN_OIDC_CLIENT_SECRET",
	"CINAADMIN_OIDC_BRIDGE_SECRET",
]);

const fail = (message) => {
	console.error(message);
	process.exit(1);
};

const hasValue = (name) => {
	const value = process.env[name];
	return typeof value === "string" && value.length > 0;
};

const assertStrong = (name) => {
	if (!hasValue(name)) {
		fail(`Missing required environment variable ${name}`);
	}
	if (STRONG_SECRETS.has(name) && process.env[name].length < 32) {
		fail(`${name} must be at least 32 characters`);
	}
};

const assertAdminOidcClientSecret = () => {
	const value = process.env.CINAADMIN_OIDC_CLIENT_SECRET;
	if (!value.startsWith(ADMIN_OIDC_CLIENT_SECRET_PREFIX)) {
		fail(
			`CINAADMIN_OIDC_CLIENT_SECRET must start with ${ADMIN_OIDC_CLIENT_SECRET_PREFIX}`,
		);
	}
	if (
		value.length - ADMIN_OIDC_CLIENT_SECRET_PREFIX.length <
		ADMIN_OIDC_CLIENT_SECRET_MIN_PAYLOAD_LENGTH
	) {
		fail(
			`CINAADMIN_OIDC_CLIENT_SECRET payload must be at least ${ADMIN_OIDC_CLIENT_SECRET_MIN_PAYLOAD_LENGTH} characters`,
		);
	}
};

const assertHttpsUrl = (name) => {
	try {
		const url = new URL(process.env[name]);
		if (url.protocol !== "https:") {
			fail(`${name} must be an HTTPS URL`);
		}
	} catch {
		fail(`${name} must be a valid HTTPS URL`);
	}
};

const assertPaired = (first, second) => {
	if (hasValue(first) !== hasValue(second)) {
		fail(`${first} and ${second} must be configured together`);
	}
};

const assertConfiguredTogether = (names) => {
	const configured = names.filter(hasValue);
	if (configured.length !== 0 && configured.length !== names.length) {
		fail(`${names.join(", ")} must be configured together`);
	}
};

const checkDeliveryReady = async () => {
	if (skipDeliveryReadyCheck || isDryRun) return;
	const url = new URL(process.env.CINAAUTH_DELIVERY_WEBHOOK_URL);
	const readyUrl = new URL("/ready", url.origin);
	const response = await fetch(readyUrl, {
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${process.env.CINAAUTH_DELIVERY_WEBHOOK_SECRET}`,
		},
		signal: AbortSignal.timeout(10_000),
	}).catch((error) => {
		fail(`Delivery Worker readiness check failed: ${error.message}`);
	});
	if (!response.ok) {
		fail(
			`Delivery Worker readiness must pass before provisioning auth secrets; ${readyUrl.href} returned HTTP ${response.status}`,
		);
	}
};

const checkErasureReady = async () => {
	if (isDryRun) return;
	const url = new URL(process.env.CINAAUTH_ERASURE_WEBHOOK_URL);
	const readyUrl = new URL("/ready", url.origin);
	const response = await fetch(readyUrl, {
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${process.env.CINAAUTH_ERASURE_WEBHOOK_SECRET}`,
		},
		signal: AbortSignal.timeout(10_000),
	}).catch((error) => {
		fail(`Privacy Erasure Worker readiness check failed: ${error.message}`);
	});
	if (allowErasureNotReady && response.status === 503) {
		const body = await response.json().catch(() => undefined);
		if (body?.runtimeConfig?.ok === false) return;
	}
	if (!response.ok) {
		fail(
			`Privacy Erasure Worker readiness must pass before provisioning auth secrets; ${readyUrl.href} returned HTTP ${response.status}`,
		);
	}
};

const putSecret = (name) => {
	if (isDryRun) {
		console.log(`Would provision ${name}`);
		return;
	}
	const result = spawnSync("wrangler", ["secret", "put", name], {
		input: process.env[name],
		shell: true,
		stdio: ["pipe", "inherit", "inherit"],
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
	console.log(`Provisioned ${name}`);
};

for (const name of REQUIRED_SECRETS) {
	assertStrong(name);
}
assertAdminOidcClientSecret();
assertHttpsUrl("CINAAUTH_DELIVERY_WEBHOOK_URL");
assertHttpsUrl("CINAAUTH_ERASURE_WEBHOOK_URL");
assertPaired(
	"CLOUDFLARE_TURNSTILE_SITE_KEY",
	"CLOUDFLARE_TURNSTILE_SECRET_KEY",
);
if (hasValue("GOOGLE_CLIENT_SECRET") && !hasValue("GOOGLE_CLIENT_ID")) {
	fail("GOOGLE_CLIENT_SECRET requires GOOGLE_CLIENT_ID");
}
assertPaired("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET");
assertConfiguredTogether([
	"STRIPE_SECRET_KEY",
	"STRIPE_WEBHOOK_SECRET",
	"STRIPE_DEFAULT_PRICE_ID",
	"CINAAUTH_ENTITLEMENT_CONFIG",
]);
await checkDeliveryReady();
await checkErasureReady();

for (const name of REQUIRED_SECRETS) {
	putSecret(name);
}
for (const name of OPTIONAL_SECRETS) {
	if (hasValue(name)) {
		putSecret(name);
	}
}

console.log("Auth Worker secret provisioning complete.");
