import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
	isMain,
	runPreservedSecretInventoryCheck,
} from "./check-cloudflare-preserved-secrets.mjs";

const scriptFile = fileURLToPath(
	new URL("./check-cloudflare-preserved-secrets.mjs", import.meta.url),
);

const createEnv = () => ({
	CLOUDFLARE_API_TOKEN: "cloudflare-api-token-marker",
	CLOUDFLARE_ACCOUNT_ID: "account-id",
});

const response = (result, status = 200) => ({
	ok: status >= 200 && status < 300,
	status,
	json: async () => ({ success: status >= 200 && status < 300, result }),
});

test("checks only preserved secret names with read-only Cloudflare requests", async () => {
	const calls = [];
	const messages = [];
	const secretValueMarker = "must-never-be-logged";
	await runPreservedSecretInventoryCheck({
		args: [],
		env: createEnv(),
		fetchImpl: async (url, init) => {
			calls.push({ url, init });
			if (url.includes("/cinaauth-api/")) {
				return response([
					{
						name: "CINAAUTH_SECRET",
						type: "secret_text",
						value: secretValueMarker,
					},
					{ name: "CINAAUTH_PRIVACY_EXPORT_KEY", type: "secret_text" },
				]);
			}
			return response([
				{ name: "CINAAUTH_ERASURE_STORAGE_SECRET", type: "secret_text" },
			]);
		},
		log: (message) => messages.push(message),
		sleepImpl: async () => {},
	});

	assert.equal(calls.length, 2);
	for (const call of calls) {
		assert.equal(call.init.method, "GET");
		assert.equal(Object.hasOwn(call.init, "body"), false);
		assert.equal(
			call.init.headers.Authorization,
			"Bearer cloudflare-api-token-marker",
		);
		assert.match(call.url, /\/accounts\/account-id\/workers\/scripts\//);
	}
	assert.deepEqual(messages, [
		"Cloudflare preserved Worker secret inventory passed.",
	]);
	assert.doesNotMatch(messages.join("\n"), new RegExp(secretValueMarker));
	assert.doesNotMatch(messages.join("\n"), /cloudflare-api-token-marker/);
});

test("fails closed when a preserved secret name is missing", async () => {
	await assert.rejects(
		() =>
			runPreservedSecretInventoryCheck({
				args: [],
				env: createEnv(),
				fetchImpl: async (url) =>
					url.includes("/cinaauth-api/")
						? response([{ name: "CINAAUTH_SECRET" }])
						: response([{ name: "CINAAUTH_ERASURE_STORAGE_SECRET" }]),
				sleepImpl: async () => {},
			}),
		/CINAAUTH_PRIVACY_EXPORT_KEY/,
	);
});

test("requires credentials before making a request", async () => {
	let calls = 0;
	await assert.rejects(
		() =>
			runPreservedSecretInventoryCheck({
				args: [],
				env: {},
				fetchImpl: async () => {
					calls += 1;
					return response([]);
				},
			}),
		/CLOUDFLARE_API_TOKEN or CF_API_TOKEN is required/,
	);
	assert.equal(calls, 0);
});

test("does not expose Cloudflare response bodies or request credentials", async () => {
	const responseMarker = "remote-sensitive-error-marker";
	let thrown;
	try {
		await runPreservedSecretInventoryCheck({
			args: [],
			env: createEnv(),
			fetchImpl: async () => ({
				ok: false,
				status: 403,
				json: async () => ({
					success: false,
					errors: [{ message: responseMarker }],
				}),
			}),
			sleepImpl: async () => {},
		});
	} catch (error) {
		thrown = error;
	}
	assert.ok(thrown instanceof Error);
	assert.match(thrown.message, /returned HTTP 403/);
	assert.doesNotMatch(thrown.message, new RegExp(responseMarker));
	assert.doesNotMatch(thrown.message, /cloudflare-api-token-marker/);
});

test("exports main detection and never calls process.exit", () => {
	assert.equal(typeof isMain, "boolean");
	assert.doesNotMatch(readFileSync(scriptFile, "utf8"), /process\.exit\s*\(/);
});
