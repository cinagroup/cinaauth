import assert from "node:assert/strict";
import test from "node:test";
import { parseCloudflareDeploymentTarget } from "./cloudflare-deployment-target.mjs";

test("production selects the top-level Wrangler configuration without an env flag", () => {
	const args = ["--dry-run", "--deployment-target", "production", "--verbose"];
	const env = {
		CLOUDFLARE_API_TOKEN: "test-only-token",
		CLOUDFLARE_ENV: "",
		KEEP_ME: "preserved",
	};

	const result = parseCloudflareDeploymentTarget({ args, env });

	assert.deepEqual(result, {
		deploymentTarget: "production",
		wranglerArgs: [],
		passthroughArgs: ["--dry-run", "--verbose"],
		childEnv: {
			CLOUDFLARE_API_TOKEN: "test-only-token",
			KEEP_ME: "preserved",
		},
	});
	assert.deepEqual(args, [
		"--dry-run",
		"--deployment-target",
		"production",
		"--verbose",
	]);
	assert.deepEqual(env, {
		CLOUDFLARE_API_TOKEN: "test-only-token",
		CLOUDFLARE_ENV: "",
		KEEP_ME: "preserved",
	});
	assert.doesNotMatch(result.wranglerArgs.join(" "), /production/);
});

test("siwe-staging maps only to Wrangler's staging environment", () => {
	const result = parseCloudflareDeploymentTarget({
		args: ["--deployment-target=siwe-staging", "--dry-run"],
		env: { KEEP_ME: "preserved" },
	});

	assert.deepEqual(result, {
		deploymentTarget: "siwe-staging",
		wranglerArgs: ["--env", "staging"],
		passthroughArgs: ["--dry-run"],
		childEnv: { KEEP_ME: "preserved" },
	});
});

test("requires exactly one non-empty known deployment target", () => {
	const cases = [
		{
			name: "missing flag",
			args: [],
			message: /exactly one --deployment-target/i,
		},
		{
			name: "missing separate value",
			args: ["--deployment-target"],
			message: /requires production or siwe-staging/,
		},
		{
			name: "empty separate value",
			args: ["--deployment-target", ""],
			message: /requires production or siwe-staging/,
		},
		{
			name: "empty equals value",
			args: ["--deployment-target="],
			message: /requires production or siwe-staging/,
		},
		{
			name: "unknown value",
			args: ["--deployment-target", "preview"],
			message: /must be production or siwe-staging/,
		},
		{
			name: "duplicate separate flags",
			args: [
				"--deployment-target",
				"production",
				"--deployment-target",
				"siwe-staging",
			],
			message: /exactly one --deployment-target/i,
		},
		{
			name: "duplicate mixed forms",
			args: [
				"--deployment-target=production",
				"--deployment-target",
				"production",
			],
			message: /exactly one --deployment-target/i,
		},
	];

	for (const { name, args, message } of cases) {
		assert.throws(
			() => parseCloudflareDeploymentTarget({ args, env: {} }),
			message,
			name,
		);
	}
});

test("rejects Wrangler flags that can escape the selected target", () => {
	const forbiddenFlags = ["--env", "--config", "--cwd", "--name", "--env-file"];

	for (const flag of forbiddenFlags) {
		for (const escapedArg of [flag, `${flag}=operator-value`]) {
			assert.throws(
				() =>
					parseCloudflareDeploymentTarget({
						args: ["--deployment-target", "siwe-staging", escapedArg],
						env: {},
					}),
				new RegExp(`${flag.replaceAll("-", "\\-")} is not allowed`),
				escapedArg,
			);
		}
	}
});

test("rejects every non-empty CLOUDFLARE_ENV value without revealing it", () => {
	for (const value of ["production", "staging", " "]) {
		assert.throws(
			() =>
				parseCloudflareDeploymentTarget({
					args: ["--deployment-target", "production"],
					env: { CLOUDFLARE_ENV: value },
				}),
			(error) => {
				assert.equal(error instanceof Error, true);
				assert.match(error.message, /CLOUDFLARE_ENV must be unset or empty/);
				assert.doesNotMatch(error.message, new RegExp(`^${value}$`));
				return true;
			},
		);
	}
});

test("checks ambient CLOUDFLARE_ENV when a consumer omits the env option", () => {
	const originalValue = process.env.CLOUDFLARE_ENV;
	const sentinel = "ambient-environment-must-not-leak";
	process.env.CLOUDFLARE_ENV = sentinel;

	try {
		assert.throws(
			() =>
				parseCloudflareDeploymentTarget({
					args: ["--deployment-target", "production"],
				}),
			(error) => {
				assert.equal(error instanceof Error, true);
				assert.match(error.message, /CLOUDFLARE_ENV must be unset or empty/);
				assert.doesNotMatch(error.message, new RegExp(sentinel));
				return true;
			},
		);
	} finally {
		if (originalValue === undefined) {
			Reflect.deleteProperty(process.env, "CLOUDFLARE_ENV");
		} else {
			process.env.CLOUDFLARE_ENV = originalValue;
		}
	}
});

test("rejects non-array arguments and non-object environments", () => {
	assert.throws(
		() => parseCloudflareDeploymentTarget({ args: "production", env: {} }),
		/args must be an array/,
	);
	assert.throws(
		() => parseCloudflareDeploymentTarget({ args: [], env: null }),
		/env must be an object/,
	);
});
