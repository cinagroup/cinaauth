import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
	isMain,
	runPrivacyErasureSecretProvisioning,
} from "./provision-secrets.mjs";

const scriptFile = fileURLToPath(
	new URL("./provision-secrets.mjs", import.meta.url),
);
const productionArgs = ["--deployment-target", "production"];

const createEnv = () => ({
	CLOUDFLARE_ENV: "",
	CINAAUTH_ERASURE_STORAGE_SECRET: "privacy-storage-secret-value-00001",
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
			runPrivacyErasureSecretProvisioning({
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
			runPrivacyErasureSecretProvisioning({
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
			runPrivacyErasureSecretProvisioning({
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
		() => runPrivacyErasureSecretProvisioning(options),
		/siwe-staging.*not available/i,
	);
	assert.equal(dependencyReads, 0);
});

test("rejects target escapes, unknown arguments, and duplicate supported flags", () => {
	const cases = [
		[...productionArgs, "--env=staging"],
		[...productionArgs, "--name", "operator-worker"],
		[...productionArgs, "--verbose"],
		[...productionArgs, "positional"],
		[...productionArgs, "--dry-run", "--dry-run"],
		[...productionArgs, "--include-legacy-webhook", "--include-legacy-webhook"],
		[...productionArgs, "--include-legacy-targets", "--include-legacy-targets"],
	];

	for (const args of cases) {
		const harness = createHarness();
		assert.throws(() =>
			runPrivacyErasureSecretProvisioning({
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

test("production dry run validates selected secrets without resolving or spawning", () => {
	const harness = createHarness();
	const env = {
		...createEnv(),
		CINAAUTH_ERASURE_WEBHOOK_SECRET: "privacy-webhook-secret-value-00001",
		CINAAUTH_ERASURE_TARGETS: JSON.stringify([
			{ url: "https://privacy-target.example/erase" },
		]),
	};

	runPrivacyErasureSecretProvisioning({
		args: [
			...productionArgs,
			"--dry-run",
			"--include-legacy-webhook",
			"--include-legacy-targets",
		],
		env,
		...harness.options,
	});

	assert.equal(harness.resolveCount, 0);
	assert.deepEqual(harness.calls, []);
	for (const name of [
		"CINAAUTH_ERASURE_STORAGE_SECRET",
		"CINAAUTH_ERASURE_WEBHOOK_SECRET",
		"CINAAUTH_ERASURE_TARGETS",
	]) {
		assert.match(harness.messages.join("\n"), new RegExp(name));
	}
	for (const secret of [
		env.CINAAUTH_ERASURE_STORAGE_SECRET,
		env.CINAAUTH_ERASURE_WEBHOOK_SECRET,
		env.CINAAUTH_ERASURE_TARGETS,
	]) {
		assert.doesNotMatch(
			harness.messages.join("\n"),
			new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
		);
	}
});

test("production writes selected secrets through local Wrangler stdin and top-level config", () => {
	const harness = createHarness();
	const env = {
		...createEnv(),
		CINAAUTH_ERASURE_WEBHOOK_SECRET: "privacy-webhook-secret-value-00001",
	};

	runPrivacyErasureSecretProvisioning({
		args: [...productionArgs, "--include-legacy-webhook"],
		env,
		...harness.options,
	});

	assert.equal(harness.resolveCount, 1);
	assert.equal(harness.calls.length, 2);
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
		["CINAAUTH_ERASURE_STORAGE_SECRET", "CINAAUTH_ERASURE_WEBHOOK_SECRET"],
	);
	assert.deepEqual(
		harness.calls.map((call) => call.options.input),
		[
			`${env.CINAAUTH_ERASURE_STORAGE_SECRET}\n`,
			`${env.CINAAUTH_ERASURE_WEBHOOK_SECRET}\n`,
		],
	);
	for (const secret of [
		env.CINAAUTH_ERASURE_STORAGE_SECRET,
		env.CINAAUTH_ERASURE_WEBHOOK_SECRET,
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
			runPrivacyErasureSecretProvisioning({
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
				"Failed to start Wrangler for CINAAUTH_ERASURE_STORAGE_SECRET",
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
