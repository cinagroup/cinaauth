import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runProvisionSecrets } from "./provision-secrets.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const scriptFile = join(scriptDir, "provision-secrets.mjs");
const optionalSecretNames = [
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

const createCoreEnv = () => {
	const env = {
		...process.env,
		CINAAUTH_SECRET: "a".repeat(32),
		CINAAUTH_MIGRATION_TOKEN: "b".repeat(32),
		CINAAUTH_DELIVERY_WEBHOOK_URL:
			"https://cinaauth-delivery.cinagroup.com/cinaauth/delivery",
		CINAAUTH_PRIVACY_EXPORT_KEY: "c".repeat(32),
	};
	for (const legacyName of [
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		"CINAAUTH_ERASURE_WEBHOOK_SECRET",
		"CINAADMIN_OIDC_CLIENT_SECRET",
		"CINAADMIN_OIDC_BRIDGE_SECRET",
	]) {
		delete env[legacyName];
	}
	for (const optionalName of optionalSecretNames) delete env[optionalName];
	return env;
};

test("dry-run provisions only Auth-owned Worker secrets when V2 bindings are active", () => {
	const result = spawnSync(process.execPath, [scriptFile, "--dry-run"], {
		cwd: scriptDir,
		encoding: "utf8",
		env: createCoreEnv(),
	});

	assert.equal(result.status, 0, result.stderr);
	for (const name of [
		"CINAAUTH_SECRET",
		"CINAAUTH_MIGRATION_TOKEN",
		"CINAAUTH_DELIVERY_WEBHOOK_URL",
		"CINAAUTH_PRIVACY_EXPORT_KEY",
		"CINAAUTH_ERASURE_WEBHOOK_URL",
	]) {
		assert.match(
			result.stdout,
			new RegExp(`Would provision ${name}(?:\\r?\\n|$)`),
		);
	}
	for (const legacyName of [
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		"CINAAUTH_ERASURE_WEBHOOK_SECRET",
		"CINAADMIN_OIDC_CLIENT_SECRET",
		"CINAADMIN_OIDC_BRIDGE_SECRET",
	]) {
		assert.doesNotMatch(result.stdout, new RegExp(legacyName));
	}
});

test("provisioner does not probe child operational readiness", () => {
	const source = readFileSync(scriptFile, "utf8");
	assert.doesNotMatch(source, /fetch\s*\(/);
	assert.doesNotMatch(source, /allow-erasure-not-ready/);
	assert.doesNotMatch(source, /CINAAUTH_SKIP_DELIVERY_READY_CHECK/);
});

test("writes required and configured optional values in one stdin bulk call", () => {
	const env = {
		...createCoreEnv(),
		OAUTH_PAIRWISE_SECRET: "optional-pairwise-value",
	};
	const calls = [];
	const messages = [];
	const wranglerCli = "C:\\test-only\\wrangler.js";

	runProvisionSecrets({
		args: [],
		env,
		log: (message) => messages.push(message),
		spawnSyncImpl: (command, args, options) => {
			calls.push({ command, args, options });
			return { status: 0 };
		},
		wranglerCli,
	});

	assert.equal(calls.length, 1);
	assert.equal(calls[0].command, process.execPath);
	assert.deepEqual(calls[0].args, [wranglerCli, "secret", "bulk"]);
	assert.deepEqual(calls[0].options.stdio, ["pipe", "inherit", "inherit"]);
	assert.deepEqual(JSON.parse(calls[0].options.input), {
		CINAAUTH_SECRET: env.CINAAUTH_SECRET,
		CINAAUTH_MIGRATION_TOKEN: env.CINAAUTH_MIGRATION_TOKEN,
		CINAAUTH_DELIVERY_WEBHOOK_URL: env.CINAAUTH_DELIVERY_WEBHOOK_URL,
		CINAAUTH_PRIVACY_EXPORT_KEY: env.CINAAUTH_PRIVACY_EXPORT_KEY,
		CINAAUTH_ERASURE_WEBHOOK_URL:
			"https://cinaauth-erasure.cinagroup.com/cinaauth/privacy/erase",
		OAUTH_PAIRWISE_SECRET: env.OAUTH_PAIRWISE_SECRET,
	});
	assert.doesNotMatch(calls[0].args.join(" "), /optional-pairwise-value/);
	assert.doesNotMatch(messages.join("\n"), /optional-pairwise-value/);
});

test("pins the erasure webhook to the canonical production endpoint", () => {
	const env = {
		...createCoreEnv(),
		CINAAUTH_ERASURE_WEBHOOK_URL:
			"https://operator-controlled.example/cinaauth/privacy/erase",
	};
	const calls = [];
	const messages = [];

	runProvisionSecrets({
		args: [],
		env,
		log: (message) => messages.push(message),
		spawnSyncImpl: (command, args, options) => {
			calls.push({ command, args, options });
			return { status: 0 };
		},
		wranglerCli: "C:\\test-only\\wrangler.js",
	});

	assert.equal(calls.length, 1);
	assert.equal(
		JSON.parse(calls[0].options.input).CINAAUTH_ERASURE_WEBHOOK_URL,
		"https://cinaauth-erasure.cinagroup.com/cinaauth/privacy/erase",
	);
	assert.doesNotMatch(calls[0].options.input, /operator-controlled\.example/);
	assert.doesNotMatch(messages.join("\n"), /operator-controlled\.example/);
});
