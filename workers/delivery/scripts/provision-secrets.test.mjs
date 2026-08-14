import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isMain, runDeliverySecretProvisioning } from "./provision-secrets.mjs";

const scriptFile = fileURLToPath(
	new URL("./provision-secrets.mjs", import.meta.url),
);
const productionArgs = ["--deployment-target", "production"];

const createEnv = () => ({
	CLOUDFLARE_ENV: "",
	CINAAUTH_DELIVERY_WEBHOOK_SECRET: "delivery-webhook-secret-value-0001",
	KEEP_ME: "preserved",
});

const createHarness = () => {
	const calls = [];
	const messages = [];
	let resolveCount = 0;
	return {
		calls,
		messages,
		get resolveCount() {
			return resolveCount;
		},
		options: {
			log: (message) => messages.push(message),
			resolveWranglerCli: () => {
				resolveCount += 1;
				return "C:\\test-only\\wrangler.js";
			},
			spawnSyncImpl: (command, args, options) => {
				calls.push({ command, args, options });
				return { status: 0 };
			},
		},
	};
};

test("requires a deployment target before validating secrets or causing side effects", () => {
	const harness = createHarness();

	assert.throws(
		() =>
			runDeliverySecretProvisioning({
				args: [],
				env: {},
				...harness.options,
			}),
		/exactly one --deployment-target/i,
	);
	assert.equal(harness.resolveCount, 0);
	assert.deepEqual(harness.calls, []);
	assert.deepEqual(harness.messages, []);
});

test("rejects ambient Cloudflare environment selection without leaking it", () => {
	const harness = createHarness();
	const ambientValue = "must-not-appear";

	assert.throws(
		() =>
			runDeliverySecretProvisioning({
				args: productionArgs,
				env: { CLOUDFLARE_ENV: ambientValue },
				...harness.options,
			}),
		(error) => {
			assert.equal(error instanceof Error, true);
			assert.match(error.message, /CLOUDFLARE_ENV must be unset or empty/);
			assert.doesNotMatch(error.message, new RegExp(ambientValue));
			return true;
		},
	);
	assert.equal(harness.resolveCount, 0);
	assert.deepEqual(harness.calls, []);
	assert.deepEqual(harness.messages, []);
});

test("fails closed for siwe-staging before validation, resolution, spawn, or log", () => {
	const harness = createHarness();

	assert.throws(
		() =>
			runDeliverySecretProvisioning({
				args: ["--deployment-target", "siwe-staging"],
				env: {},
				...harness.options,
			}),
		/siwe-staging.*not available/i,
	);
	assert.equal(harness.resolveCount, 0);
	assert.deepEqual(harness.calls, []);
	assert.deepEqual(harness.messages, []);
});

test("rejects siwe-staging before resolving injected side-effect dependencies", () => {
	let dependencyReads = 0;
	const options = {
		args: ["--deployment-target", "siwe-staging"],
		env: {},
		get log() {
			dependencyReads += 1;
			throw new Error("log dependency must not be read");
		},
		get resolveWranglerCli() {
			dependencyReads += 1;
			throw new Error("resolver dependency must not be read");
		},
		get spawnSyncImpl() {
			dependencyReads += 1;
			throw new Error("spawn dependency must not be read");
		},
	};

	assert.throws(
		() => runDeliverySecretProvisioning(options),
		/siwe-staging.*not available/i,
	);
	assert.equal(dependencyReads, 0);
});

test("rejects target escapes, unknown arguments, and duplicate supported flags", () => {
	const cases = [
		[...productionArgs, "--env", "staging"],
		[...productionArgs, "--config=operator.jsonc"],
		[...productionArgs, "--verbose"],
		[...productionArgs, "positional"],
		[...productionArgs, "--dry-run", "--dry-run"],
	];

	for (const args of cases) {
		const harness = createHarness();
		assert.throws(() =>
			runDeliverySecretProvisioning({
				args,
				env: createEnv(),
				...harness.options,
			}),
		);
		assert.equal(harness.resolveCount, 0, args.join(" "));
		assert.deepEqual(harness.calls, [], args.join(" "));
		assert.deepEqual(harness.messages, [], args.join(" "));
	}
});

test("production dry run validates and names secrets without resolving or spawning", () => {
	const harness = createHarness();
	const env = createEnv();

	runDeliverySecretProvisioning({
		args: [...productionArgs, "--dry-run"],
		env,
		...harness.options,
	});

	assert.equal(harness.resolveCount, 0);
	assert.deepEqual(harness.calls, []);
	assert.match(
		harness.messages.join("\n"),
		/Would provision CINAAUTH_DELIVERY_WEBHOOK_SECRET/,
	);
	assert.doesNotMatch(
		harness.messages.join("\n"),
		new RegExp(env.CINAAUTH_DELIVERY_WEBHOOK_SECRET),
	);
});

test("production writes secrets through local Wrangler stdin and the top-level config", () => {
	const harness = createHarness();
	const env = {
		...createEnv(),
		RESEND_API_KEY: "resend-secret-value",
		RESEND_EMAIL_FROM: "CinaAuth <auth@example.com>",
	};

	runDeliverySecretProvisioning({
		args: productionArgs,
		env,
		...harness.options,
	});

	assert.equal(harness.resolveCount, 1);
	assert.equal(harness.calls.length, 3);
	for (const call of harness.calls) {
		assert.equal(call.command, process.execPath);
		assert.equal(call.args[0], "C:\\test-only\\wrangler.js");
		assert.deepEqual(call.args.slice(1, 3), ["secret", "put"]);
		assert.doesNotMatch(call.args.join(" "), /--env|production/);
		assert.equal(call.options.shell, undefined);
		assert.deepEqual(call.options.stdio, ["pipe", "inherit", "inherit"]);
		assert.equal(Object.hasOwn(call.options.env, "CLOUDFLARE_ENV"), false);
		assert.equal(call.options.env.KEEP_ME, "preserved");
	}
	assert.deepEqual(
		harness.calls.map((call) => call.args[3]),
		["CINAAUTH_DELIVERY_WEBHOOK_SECRET", "RESEND_API_KEY", "RESEND_EMAIL_FROM"],
	);
	assert.deepEqual(
		harness.calls.map((call) => call.options.input),
		[
			`${env.CINAAUTH_DELIVERY_WEBHOOK_SECRET}\n`,
			`${env.RESEND_API_KEY}\n`,
			`${env.RESEND_EMAIL_FROM}\n`,
		],
	);
	for (const secret of [
		env.CINAAUTH_DELIVERY_WEBHOOK_SECRET,
		env.RESEND_API_KEY,
		env.RESEND_EMAIL_FROM,
	]) {
		assert.doesNotMatch(
			harness.calls.flatMap((call) => call.args).join(" "),
			new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
		);
		assert.doesNotMatch(
			harness.messages.join("\n"),
			new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
		);
	}
});

test("does not expose Wrangler startup error details", () => {
	const marker = "sensitive-local-path-or-argument";
	const harness = createHarness();

	assert.throws(
		() =>
			runDeliverySecretProvisioning({
				args: productionArgs,
				env: createEnv(),
				...harness.options,
				spawnSyncImpl: () => ({
					error: new Error(marker),
					status: null,
				}),
			}),
		(error) => {
			assert.equal(error instanceof Error, true);
			assert.equal(
				error.message,
				"Failed to start Wrangler for CINAAUTH_DELIVERY_WEBHOOK_SECRET",
			);
			assert.doesNotMatch(error.message, new RegExp(marker));
			return true;
		},
	);
});

test("exports main detection and never calls process.exit", () => {
	assert.equal(typeof isMain, "boolean");
	assert.doesNotMatch(readFileSync(scriptFile, "utf8"), /process\.exit\s*\(/);
});
