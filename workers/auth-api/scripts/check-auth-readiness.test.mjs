import assert from "node:assert/strict";
import test from "node:test";
import { checkAuthReadiness } from "./check-auth-readiness.mjs";

const READY_URL = "https://auth.cinaseek.ai/api/ready";
const MIGRATION_TOKEN = "test-migration-token";

const validReadinessBody = {
	success: true,
	runtimeConfig: { ok: true },
	secretsStore: {
		active: true,
		source: "secrets-store-v2",
		ok: true,
		issues: [],
	},
	database: { ok: true },
	cutover: { state: "live" },
};

const createResponse = (body, status, headers = {}) =>
	new Response(body === undefined ? undefined : JSON.stringify(body), {
		status,
		headers,
	});

const runCheck = async ({ responses, migrationToken = MIGRATION_TOKEN }) => {
	const failures = [];
	const warnings = [];
	const calls = [];
	await checkAuthReadiness({
		origin: new URL("https://auth.cinaseek.ai"),
		migrationToken,
		publicFetch: async (url, init) => {
			calls.push({ url, init });
			return responses.shift();
		},
		fail: (message) => failures.push(message),
		warn: (message) => warnings.push(message),
	});
	return { calls, failures, warnings };
};

test("a public 404 cannot bypass the authorized readiness request", async () => {
	const result = await runCheck({
		responses: [createResponse(undefined, 404), createResponse(undefined, 404)],
	});

	assert.equal(result.calls.length, 2);
	assert.equal(result.calls[0].url, READY_URL);
	assert.equal(result.calls[1].url, READY_URL);
	assert.equal(
		result.calls[1].init.headers.Authorization,
		`Bearer ${MIGRATION_TOKEN}`,
	);
	assert.match(result.failures.join("\n"), /Public readiness.*HTTP 404/);
	assert.match(
		result.failures.join("\n"),
		/Authorized auth readiness.*HTTP 404/,
	);
});

test("any authorized readiness non-2xx response fails", async () => {
	const result = await runCheck({
		responses: [
			createResponse(undefined, 401),
			createResponse({ success: false }, 503),
		],
	});

	assert.match(
		result.failures.join("\n"),
		/Authorized auth readiness.*HTTP 503/,
	);
});

test("an unreachable authorized readiness response fails", async () => {
	const result = await runCheck({
		responses: [createResponse(undefined, 401), undefined],
	});

	assert.match(
		result.failures.join("\n"),
		/Authorized auth readiness is unreachable/,
	);
});

test("a protected endpoint with a valid authorized payload passes", async () => {
	const result = await runCheck({
		responses: [
			createResponse(undefined, 401),
			createResponse(validReadinessBody, 200, {
				"Cache-Control": "no-store",
			}),
		],
	});

	assert.deepEqual(result.failures, []);
	assert.deepEqual(result.warnings, []);
});

test("without a token the checker preserves the warning-only structural mode", async () => {
	const result = await runCheck({
		responses: [createResponse(undefined, 401)],
		migrationToken: null,
	});

	assert.equal(result.calls.length, 1);
	assert.deepEqual(result.failures, []);
	assert.match(
		result.warnings.join("\n"),
		/Authorized auth readiness was not checked/,
	);
});
