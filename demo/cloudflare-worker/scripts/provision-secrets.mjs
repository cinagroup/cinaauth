import { spawnSync } from "node:child_process";

const REQUIRED_SECRETS = [
	"CINAAUTH_SECRET",
	"CINAAUTH_MIGRATION_TOKEN",
	"CINAAUTH_DELIVERY_WEBHOOK_URL",
	"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
];

const OPTIONAL_SECRETS = [
	"OAUTH_PAIRWISE_SECRET",
	"GENERIC_OAUTH_CONFIG",
	"GOOGLE_CLIENT_ID",
	"CLOUDFLARE_TURNSTILE_SECRET_KEY",
	"STRIPE_SECRET_KEY",
	"STRIPE_WEBHOOK_SECRET",
	"STRIPE_DEFAULT_PRICE_ID",
	"STRIPE_DEFAULT_PLAN_NAME",
	"CINAUTH_ADMIN_SERVICE_KEY",
];

const isDryRun = process.argv.includes("--dry-run");
const skipDeliveryReadyCheck =
	process.env.CINAAUTH_SKIP_DELIVERY_READY_CHECK === "1";

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
	if (
		(name === "CINAAUTH_SECRET" ||
			name === "CINAAUTH_MIGRATION_TOKEN" ||
			name === "CINAAUTH_DELIVERY_WEBHOOK_SECRET") &&
		process.env[name].length < 32
	) {
		fail(`${name} must be at least 32 characters`);
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
assertHttpsUrl("CINAAUTH_DELIVERY_WEBHOOK_URL");
await checkDeliveryReady();

for (const name of REQUIRED_SECRETS) {
	putSecret(name);
}
for (const name of OPTIONAL_SECRETS) {
	if (hasValue(name)) {
		putSecret(name);
	}
}

console.log("Auth Worker secret provisioning complete.");
