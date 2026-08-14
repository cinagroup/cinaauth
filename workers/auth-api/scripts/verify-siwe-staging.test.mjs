import assert from "node:assert/strict";
import { test } from "node:test";

import {
	parseProductionReownIdentityDigest,
	parseStagingReownIdentityDigest,
	parseVerificationArguments,
	runVerification,
} from "./verify-siwe-staging.mjs";

test("defaults to the non-deployable foundation gate", () => {
	assert.deepEqual(parseVerificationArguments([]), { mode: "foundation" });
	assert.deepEqual(parseVerificationArguments(["--foundation"]), {
		mode: "foundation",
	});
});

test("accepts one explicit inventory path for contract validation", () => {
	assert.deepEqual(
		parseVerificationArguments([
			"--inventory",
			"workers/auth-api/deployment/siwe-staging.inventory.json",
		]),
		{
			mode: "inventory",
			inventoryPath: "workers/auth-api/deployment/siwe-staging.inventory.json",
		},
	);
});

test("rejects ambiguous, missing, and future deployment arguments", () => {
	for (const args of [
		["--foundation", "--inventory", "inventory.json"],
		["--inventory"],
		["--inventory", "a.json", "--inventory", "b.json"],
		["--require-ready", "--inventory", "inventory.json"],
		["--env", "staging"],
	]) {
		assert.throws(() => parseVerificationArguments(args), /Usage:/);
	}
});

test("requires a valid production Reown digest for real inventory validation", () => {
	assert.throws(
		() => parseProductionReownIdentityDigest({}),
		/digest is required/,
	);
	assert.throws(
		() =>
			parseProductionReownIdentityDigest({
				SIWE_PRODUCTION_REOWN_PROJECT_ID_SHA256: "not-a-digest",
			}),
		/digest is invalid/,
	);
	assert.deepEqual(
		parseProductionReownIdentityDigest({
			SIWE_PRODUCTION_REOWN_PROJECT_ID_SHA256: "a".repeat(64),
		}),
		["a".repeat(64)],
	);
});

test("requires a valid staging Reown digest for inventory identity binding", () => {
	assert.throws(
		() => parseStagingReownIdentityDigest({}),
		/digest is required/,
	);
	assert.throws(
		() =>
			parseStagingReownIdentityDigest({
				SIWE_STAGING_REOWN_PROJECT_ID_SHA256: "0".repeat(64),
			}),
		/digest is invalid/,
	);
	assert.equal(
		parseStagingReownIdentityDigest({
			SIWE_STAGING_REOWN_PROJECT_ID_SHA256: "b".repeat(64),
		}),
		"b".repeat(64),
	);
});

test("the inventory CLI fails before reading a file when the production identity digest is absent", () => {
	const errors = [];
	const exitCode = runVerification({
		args: ["--inventory", "does-not-exist.json"],
		environment: {},
		writeOutput: () => undefined,
		writeError: (message) => errors.push(message),
	});

	assert.equal(exitCode, 1);
	assert.deepEqual(errors, [
		"Production Reown identity digest is required for inventory validation",
	]);
});

test("the inventory CLI rejects a production Reown identity collision without logging the digest", () => {
	const sharedDigest = "c".repeat(64);
	const errors = [];
	const exitCode = runVerification({
		args: ["--inventory", "synthetic-inventory.json"],
		environment: {
			SIWE_PRODUCTION_REOWN_PROJECT_ID_SHA256: sharedDigest,
			SIWE_STAGING_REOWN_PROJECT_ID_SHA256: sharedDigest,
		},
		loadInventory: () => ({
			identities: { reown: { projectIdSha256: sharedDigest } },
		}),
		writeOutput: () => undefined,
		writeError: (message) => errors.push(message),
	});

	assert.equal(exitCode, 1);
	assert.match(
		errors.join("\n"),
		/\[production-collision\] identities\.reown\.projectIdSha256/,
	);
	assert.doesNotMatch(errors.join("\n"), new RegExp(sharedDigest));
});
