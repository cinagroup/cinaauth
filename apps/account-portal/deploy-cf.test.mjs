import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { isMain, runAccountPortalCloudflareDeploy } from "./deploy-cf.mjs";

const productionArgs = ["--deployment-target", "production"];

test("keeps the Windows production deployment command exact and sanitizes its environment", () => {
	const calls = [];
	const env = {
		CLOUDFLARE_ENV: "",
		KEEP_ME: "preserved",
		npm_execpath: "C:\\pnpm\\pnpm.cjs",
	};

	const result = runAccountPortalCloudflareDeploy({
		args: productionArgs,
		env,
		nodeExecutable: "C:\\node\\node.exe",
		resolvePlatform: () => "win32",
		execFile: (...call) => calls.push(call),
	});

	assert.equal(result, undefined);
	assert.deepEqual(calls, [
		[
			"C:\\node\\node.exe",
			["C:\\pnpm\\pnpm.cjs", "exec", "wrangler", "deploy"],
			{
				env: {
					KEEP_ME: "preserved",
					OPEN_NEXT_DEPLOY: "true",
					npm_execpath: "C:\\pnpm\\pnpm.cjs",
				},
				stdio: "inherit",
			},
		],
	]);
	assert.deepEqual(env, {
		CLOUDFLARE_ENV: "",
		KEEP_ME: "preserved",
		npm_execpath: "C:\\pnpm\\pnpm.cjs",
	});
});

test("keeps the non-Windows production OpenNext command exact without an env flag", () => {
	const calls = [];

	runAccountPortalCloudflareDeploy({
		args: ["--deployment-target=production"],
		env: {
			CLOUDFLARE_ENV: "",
			KEEP_ME: "preserved",
			npm_execpath: "/opt/pnpm/pnpm.cjs",
		},
		nodeExecutable: "/usr/bin/node",
		resolvePlatform: () => "linux",
		execFile: (...call) => calls.push(call),
	});

	assert.deepEqual(calls, [
		[
			"/usr/bin/node",
			["/opt/pnpm/pnpm.cjs", "exec", "opennextjs-cloudflare", "deploy"],
			{
				env: {
					KEEP_ME: "preserved",
					npm_execpath: "/opt/pnpm/pnpm.cjs",
				},
				stdio: "inherit",
			},
		],
	]);
});

test("parses the deployment target before reading pnpm, resolving platform, or executing", () => {
	const events = [];
	const childEnv = new Proxy(
		{ npm_execpath: "/pnpm.cjs" },
		{
			get(target, property, receiver) {
				if (property === "npm_execpath") events.push("pnpm");
				return Reflect.get(target, property, receiver);
			},
		},
	);

	runAccountPortalCloudflareDeploy({
		args: productionArgs,
		env: {},
		parseDeploymentTarget: () => {
			events.push("parse");
			return {
				deploymentTarget: "production",
				wranglerArgs: [],
				passthroughArgs: [],
				childEnv,
			};
		},
		resolvePlatform: () => {
			events.push("platform");
			return "linux";
		},
		execFile: () => events.push("exec"),
	});

	assert.deepEqual(events, ["parse", "pnpm", "platform", "pnpm", "exec"]);
});

test("rejects every passthrough argument before reading pnpm, platform, or executing", () => {
	const events = [];

	assert.throws(
		() =>
			runAccountPortalCloudflareDeploy({
				args: [...productionArgs, "--dry-run"],
				env: {},
				resolvePlatform: () => {
					events.push("platform");
					return "linux";
				},
				execFile: () => events.push("exec"),
			}),
		/passthrough arguments are not allowed/i,
	);

	assert.equal(events.includes("platform"), false);
	assert.equal(events.includes("exec"), false);
});

test("fails closed for siwe-staging before reading pnpm, platform, or executing", () => {
	const events = [];

	assert.throws(
		() =>
			runAccountPortalCloudflareDeploy({
				args: ["--deployment-target", "siwe-staging"],
				env: {},
				resolvePlatform: () => {
					events.push("platform");
					return "linux";
				},
				execFile: () => events.push("exec"),
			}),
		/siwe-staging.*not deployable.*inventory.*env\.staging/i,
	);

	assert.equal(events.includes("platform"), false);
	assert.equal(events.includes("exec"), false);
});

test("checks pnpm only after a valid production target and before platform resolution", () => {
	let platformResolved = false;

	assert.throws(
		() =>
			runAccountPortalCloudflareDeploy({
				args: productionArgs,
				env: { CLOUDFLARE_ENV: "" },
				resolvePlatform: () => {
					platformResolved = true;
					return "linux";
				},
				execFile: () => assert.fail("must not execute"),
			}),
		/deploy:cf must be started through pnpm/,
	);
	assert.equal(platformResolved, false);
});

test("propagates the exact execution error", () => {
	const sentinel = new Error("exec failed");

	assert.throws(
		() =>
			runAccountPortalCloudflareDeploy({
				args: productionArgs,
				env: { npm_execpath: "/pnpm.cjs" },
				nodeExecutable: "/node",
				resolvePlatform: () => "linux",
				execFile: () => {
					throw sentinel;
				},
			}),
		(error) => error === sentinel,
	);
});

test("isMain compares the invoked script with the module URL", () => {
	const scriptPath = resolve("fixtures", "deploy-cf.mjs");
	const moduleUrl = pathToFileURL(scriptPath);

	assert.equal(
		isMain({
			argv1: scriptPath,
			moduleUrl,
		}),
		true,
	);
	assert.equal(
		isMain({
			argv1: resolve("fixtures", "other.mjs"),
			moduleUrl,
		}),
		false,
	);
	assert.equal(isMain({ argv1: undefined, moduleUrl }), false);
});
