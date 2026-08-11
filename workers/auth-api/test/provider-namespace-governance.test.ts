import { describe, expect, it, vi } from "vitest";
import type { CinaAuthDatabase } from "../src/database";
import {
	handleProviderNamespaceGovernedRequest,
	requiresProviderNamespaceGovernance,
} from "../src/provider-namespace-governance";

type QueryCall = { text: string; values: readonly unknown[] };

const createDeferred = () => {
	let resolve!: () => void;
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
};

const createSerialDatabaseDouble = (
	failLock = false,
	namespaceState: { hasAccount: boolean; hasTargetProvider: boolean } = {
		hasAccount: false,
		hasTargetProvider: false,
	},
	invariantReady = true,
) => {
	const lockTails = new Map<string, Promise<void>>();
	const calls: QueryCall[] = [];
	const release = vi.fn();
	const end = vi.fn(async () => undefined);
	const database = {
		connect: async () => {
			let releaseHeldLock: (() => void) | undefined;
			return {
				query: async (text: string, values: readonly unknown[] = []) => {
					calls.push({ text, values });
					if (text.includes("pg_advisory_xact_lock")) {
						if (failLock) throw new Error("simulated lock timeout");
						const lockKey = String(values[0]);
						const previous = lockTails.get(lockKey) ?? Promise.resolve();
						const current = new Promise<void>((resolve) => {
							releaseHeldLock = resolve;
						});
						lockTails.set(lockKey, current);
						await previous;
					}
					if (text === "COMMIT" || text === "ROLLBACK") {
						releaseHeldLock?.();
					}
					if (text.includes("cinaauth_provider_namespace_invariant_ready")) {
						return { rows: [{ ready: invariantReady }] };
					}
					if (text.includes('AS "hasConflict"')) {
						return { rows: [{ hasConflict: false }] };
					}
					if (text.includes('AS "hasAccount"')) {
						return { rows: [namespaceState] };
					}
					return { rows: [] };
				},
				release,
			};
		},
		end,
	} as unknown as CinaAuthDatabase;
	return { calls, database, end, release };
};

const request = (pathname: string, body?: unknown, method = "POST") =>
	new Request(`https://auth.cinaseek.ai${pathname}`, {
		method,
		...(body === undefined
			? {}
			: {
					body: typeof body === "string" ? body : JSON.stringify(body),
					headers: { "content-type": "application/json" },
				}),
	});

const allowRateLimit = async () => ({ allowed: true, retryAfter: null });

describe("provider namespace governance classifier", () => {
	it("matches exactly the three production mutation sinks and safe trailing slashes", () => {
		for (const pathname of [
			"/api/auth/sso/register",
			"/api/auth/scim/generate-token",
			"/api/migrate/scim-provider-ownership",
			"/api/auth/sso/register/",
			"/api/auth/scim/generate-token///",
			"/api/migrate/scim-provider-ownership/",
		]) {
			expect(requiresProviderNamespaceGovernance(pathname, "POST")).toBe(true);
		}

		for (const [pathname, method] of [
			["/api/auth/sso/register", "GET"],
			["/api/auth/scim/generate-token", "PUT"],
			["/api/migrate/scim-provider-ownership", "PATCH"],
			["/api/auth/sso/register/extra", "POST"],
			["/api/auth/scim/generate-token-other", "POST"],
			["/api/auth/sso/update-provider", "POST"],
		] as const) {
			expect(requiresProviderNamespaceGovernance(pathname, method)).toBe(false);
		}
	});
});

describe("provider namespace advisory lock", () => {
	it("does not inspect or open PostgreSQL for unrelated or invalid requests", async () => {
		for (const mutationRequest of [
			request("/api/auth/sso/update-provider", { providerId: "unrelated" }),
			request("/api/auth/sso/register", { nested: { providerId: "nested" } }),
			request("/api/auth/scim/generate-token", { providerId: 42 }),
			request("/api/auth/sso/register", "not-json"),
		]) {
			const openDatabase = vi.fn(() => {
				throw new Error("must not open");
			});
			const consumeRateLimit = vi.fn(allowRateLimit);
			const upstream = new Response("original handler");

			const response = await handleProviderNamespaceGovernedRequest({
				request: mutationRequest,
				openDatabase,
				consumeRateLimit,
				handle: async () => upstream,
			});

			expect(response).toBe(upstream);
			expect(openDatabase).not.toHaveBeenCalled();
			expect(consumeRateLimit).not.toHaveBeenCalled();
		}
	});

	it("permanently reserves Google and GitHub before DO, DB, or handler work", async () => {
		for (const pathname of [
			"/api/auth/sso/register",
			"/api/auth/scim/generate-token",
		]) {
			for (const providerId of ["google", "github"]) {
				const openDatabase = vi.fn();
				const consumeRateLimit = vi.fn(allowRateLimit);
				const handle = vi.fn(async () => new Response("must not run"));
				const response = await handleProviderNamespaceGovernedRequest({
					request: request(pathname, { providerId, clientSecret: "secret" }),
					openDatabase,
					consumeRateLimit,
					handle,
				});

				expect(response.status).toBe(400);
				expect(response.headers.get("cache-control")).toBe("no-store");
				expect(await response.json()).toEqual({
					code: "PROVIDER_ID_RESERVED",
					message: "Provider id is reserved for a production social provider",
				});
				expect(openDatabase).not.toHaveBeenCalled();
				expect(consumeRateLimit).not.toHaveBeenCalled();
				expect(handle).not.toHaveBeenCalled();
			}
		}
	});

	it("rejects historical account-provider collisions before either online sink", async () => {
		for (const pathname of [
			"/api/auth/sso/register",
			"/api/auth/scim/generate-token",
		]) {
			const { database } = createSerialDatabaseDouble(false, {
				hasAccount: true,
				hasTargetProvider: false,
			});
			const handle = vi.fn(async () => new Response("must not run"));
			const response = await handleProviderNamespaceGovernedRequest({
				request: request(pathname, { providerId: "retired-generic-oauth" }),
				openDatabase: () => database,
				consumeRateLimit: allowRateLimit,
				handle,
			});

			expect(response.status).toBe(409);
			expect(response.headers.get("cache-control")).toBe("no-store");
			expect(await response.json()).toEqual({
				code: "PROVIDER_ID_COLLISION",
				message: "Provider id is already used by another account provider",
			});
			expect(handle).not.toHaveBeenCalled();
		}
	});

	it("preserves authoritative rotation and duplicate semantics for an existing target row", async () => {
		for (const pathname of [
			"/api/auth/scim/generate-token",
			"/api/auth/sso/register",
		]) {
			const { database } = createSerialDatabaseDouble(false, {
				hasAccount: true,
				hasTargetProvider: true,
			});
			const upstream = new Response("authoritative handler", { status: 418 });
			const response = await handleProviderNamespaceGovernedRequest({
				request: request(pathname, { providerId: "existing-target" }),
				openDatabase: () => database,
				consumeRateLimit: allowRateLimit,
				handle: async () => upstream,
			});

			expect(response).toBe(upstream);
			expect(response.status).toBe(418);
		}
	});

	it("shows the original cross-table race and serializes the same provider id", async () => {
		const vulnerableSSO = new Set<string>();
		const vulnerableSCIM = new Set<string>();
		const vulnerableWrite = async (target: Set<string>, other: Set<string>) => {
			const available =
				!target.has("shared-provider") && !other.has("shared-provider");
			await Promise.resolve();
			if (available) target.add("shared-provider");
		};
		await Promise.all([
			vulnerableWrite(vulnerableSSO, vulnerableSCIM),
			vulnerableWrite(vulnerableSCIM, vulnerableSSO),
		]);
		expect(vulnerableSSO.has("shared-provider")).toBe(true);
		expect(vulnerableSCIM.has("shared-provider")).toBe(true);

		const protectedSSO = new Set<string>();
		const protectedSCIM = new Set<string>();
		const { database } = createSerialDatabaseDouble();
		const governedWrite = (
			pathname: string,
			target: Set<string>,
			other: Set<string>,
		) =>
			handleProviderNamespaceGovernedRequest({
				request: request(pathname, { providerId: "shared-provider" }),
				openDatabase: () => database,
				consumeRateLimit: allowRateLimit,
				handle: async () => {
					if (target.has("shared-provider") || other.has("shared-provider")) {
						return new Response("collision", { status: 409 });
					}
					await Promise.resolve();
					target.add("shared-provider");
					return new Response("created", { status: 201 });
				},
			});

		const responses = await Promise.all([
			governedWrite("/api/auth/sso/register", protectedSSO, protectedSCIM),
			governedWrite(
				"/api/auth/scim/generate-token",
				protectedSCIM,
				protectedSSO,
			),
		]);

		expect(responses.map((response) => response.status).sort()).toEqual([
			201, 409,
		]);
		expect(
			Number(protectedSSO.has("shared-provider")) +
				Number(protectedSCIM.has("shared-provider")),
		).toBe(1);
	});

	it("allows different provider ids to proceed in parallel", async () => {
		const { database } = createSerialDatabaseDouble();
		const releaseFirst = createDeferred();
		const firstEntered = createDeferred();
		const secondEntered = createDeferred();
		const first = handleProviderNamespaceGovernedRequest({
			request: request("/api/auth/sso/register", { providerId: "provider-a" }),
			openDatabase: () => database,
			consumeRateLimit: allowRateLimit,
			handle: async () => {
				firstEntered.resolve();
				await releaseFirst.promise;
				return new Response("first");
			},
		});
		await firstEntered.promise;

		const second = handleProviderNamespaceGovernedRequest({
			request: request("/api/auth/scim/generate-token", {
				providerId: "provider-b",
			}),
			openDatabase: () => database,
			consumeRateLimit: allowRateLimit,
			handle: async () => {
				secondEntered.resolve();
				return new Response("second");
			},
		});
		await expect(
			Promise.race([
				secondEntered.promise.then(() => "entered"),
				new Promise<string>((resolve) =>
					setTimeout(() => resolve("timed-out"), 250),
				),
			]),
		).resolves.toBe("entered");
		releaseFirst.resolve();
		await Promise.all([first, second]);
	});

	it("uses one provider-derived lock without reading or locking on secrets", async () => {
		const { calls, database } = createSerialDatabaseDouble();
		const consumeRateLimit = vi.fn(allowRateLimit);
		const mutationRequest = request("/api/auth/sso/register", {
			providerId: "enterprise-oidc",
			clientSecret: "never-lock-or-log-this-secret",
		});
		const response = await handleProviderNamespaceGovernedRequest({
			request: mutationRequest,
			openDatabase: () => database,
			consumeRateLimit,
			handle: async () => new Response("ok"),
		});

		expect(response.status).toBe(200);
		expect(mutationRequest.bodyUsed).toBe(false);
		const lock = calls.find((call) =>
			call.text.includes("pg_advisory_xact_lock"),
		);
		expect(lock?.values).toEqual([
			"cinaauth:provider-namespace:v1:enterprise-oidc",
		]);
		expect(JSON.stringify(calls)).not.toContain(
			"never-lock-or-log-this-secret",
		);
		expect(consumeRateLimit).toHaveBeenCalledWith(
			"provider-namespace:/api/auth/sso/register:ip:unknown",
			{ window: 60, max: 30 },
		);
		expect(JSON.stringify(consumeRateLimit.mock.calls)).not.toContain(
			"enterprise-oidc",
		);
	});

	it("rate limits before PostgreSQL and fails closed when the DO is unavailable", async () => {
		const openDatabase = vi.fn();
		const handle = vi.fn(async () => new Response("must not run"));
		const limited = await handleProviderNamespaceGovernedRequest({
			request: request("/api/auth/sso/register", { providerId: "limited" }),
			openDatabase,
			consumeRateLimit: async () => ({ allowed: false, retryAfter: 7.2 }),
			handle,
		});
		expect(limited.status).toBe(429);
		expect(limited.headers.get("cache-control")).toBe("no-store");
		expect(limited.headers.get("retry-after")).toBe("8");
		expect(openDatabase).not.toHaveBeenCalled();
		expect(handle).not.toHaveBeenCalled();

		for (const consumeRateLimit of [
			undefined,
			async () => {
				throw new Error("RATE_LIMITER binding unavailable");
			},
		]) {
			const unavailable = await handleProviderNamespaceGovernedRequest({
				request: request("/api/auth/scim/generate-token", {
					providerId: "provider-do-failure",
				}),
				openDatabase,
				consumeRateLimit,
				handle,
			});
			expect(unavailable.status).toBe(503);
			expect(unavailable.headers.get("cache-control")).toBe("no-store");
		}
		expect(openDatabase).not.toHaveBeenCalled();
		expect(handle).not.toHaveBeenCalled();
	});

	it("blocks only governed mutations until the database invariant is installed", async () => {
		const { database } = createSerialDatabaseDouble(
			false,
			{ hasAccount: false, hasTargetProvider: false },
			false,
		);
		const handle = vi.fn(async () => new Response("must not run"));
		const response = await handleProviderNamespaceGovernedRequest({
			request: request("/api/auth/sso/register", {
				providerId: "pre-migration-window",
			}),
			openDatabase: () => database,
			consumeRateLimit: allowRateLimit,
			handle,
		});

		expect(response.status).toBe(503);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(handle).not.toHaveBeenCalled();
	});

	it("checks current configured provider ids against persistent registry coverage", async () => {
		const { calls, database } = createSerialDatabaseDouble();
		const response = await handleProviderNamespaceGovernedRequest({
			request: request("/api/auth/scim/generate-token", {
				providerId: "new-scim-provider",
			}),
			configuredProviderIds: ["configured-generic"],
			openDatabase: () => database,
			consumeRateLimit: allowRateLimit,
			handle: async () => new Response("ok"),
		});

		expect(response.status).toBe(200);
		const coverage = calls.find((call) =>
			call.text.includes('AS "hasConflict"'),
		);
		expect(coverage?.values[0]).toContain("configured-generic");
	});

	it("fails closed with no-store when PostgreSQL or the advisory lock is unavailable", async () => {
		const unavailable = await handleProviderNamespaceGovernedRequest({
			request: request("/api/auth/sso/register", { providerId: "unavailable" }),
			openDatabase: () => {
				throw new Error("Hyperdrive unavailable");
			},
			consumeRateLimit: allowRateLimit,
			handle: async () => new Response("must not run"),
		});
		expect(unavailable.status).toBe(503);
		expect(unavailable.headers.get("cache-control")).toBe("no-store");

		const { calls, database, end, release } = createSerialDatabaseDouble(true);
		const handle = vi.fn(async () => new Response("must not run"));
		const lockTimeout = await handleProviderNamespaceGovernedRequest({
			request: request("/api/auth/scim/generate-token", {
				providerId: "lock-timeout",
			}),
			openDatabase: () => database,
			consumeRateLimit: allowRateLimit,
			handle,
		});
		expect(lockTimeout.status).toBe(503);
		expect(lockTimeout.headers.get("cache-control")).toBe("no-store");
		expect(handle).not.toHaveBeenCalled();
		expect(calls.map((call) => call.text)).toContain("ROLLBACK");
		expect(release).toHaveBeenCalledOnce();
		expect(end).toHaveBeenCalledOnce();
	});

	it("passes through a normal upstream Response, including 5xx status and headers", async () => {
		const { calls, database } = createSerialDatabaseDouble();
		const upstream = new Response("upstream contract", {
			status: 500,
			headers: { "X-Upstream": "preserved" },
		});
		const response = await handleProviderNamespaceGovernedRequest({
			request: request("/api/migrate/scim-provider-ownership", "consumed"),
			providerId: "legacy-provider",
			openDatabase: () => database,
			consumeRateLimit: allowRateLimit,
			handle: async () => upstream,
		});

		expect(response).toBe(upstream);
		expect(response.status).toBe(500);
		expect(response.headers.get("x-upstream")).toBe("preserved");
		expect(await response.text()).toBe("upstream contract");
		expect(calls.map((call) => call.text)).toContain("COMMIT");
		expect(calls.map((call) => call.text)).not.toContain("ROLLBACK");
	});
});
