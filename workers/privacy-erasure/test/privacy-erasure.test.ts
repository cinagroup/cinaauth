import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErasureCoordinator } from "../src/coordinator";
import type { PrivacyErasureEnv } from "../src/env";
import worker from "../src/index";
import {
	assessRuntime,
	parseTargets,
	signBody,
	verifyBodySignature,
} from "../src/protocol";

const inboundSecret = `test-inbound-${"i".repeat(40)}`;
const storageSecret = `test-storage-${"s".repeat(40)}`;
const stagedInboundSecret = inboundSecret;
const operationId = "a".repeat(44);
const targetsJson = JSON.stringify([
	{
		id: "support-system",
		url: "https://support.example.test/privacy/erase",
		secret: `test-support-${"a".repeat(40)}`,
	},
	{
		id: "commerce-system",
		url: "https://commerce.example.test/privacy/erase",
		secret: `test-commerce-${"b".repeat(40)}`,
	},
]);

const createSecretsStoreSecret = (
	get: () => Promise<string> = async () => stagedInboundSecret,
) =>
	({
		get: vi.fn(get),
	}) as unknown as SecretsStoreSecret;

type SqlValue = ArrayBuffer | string | number | null;
type SqlRow = Record<string, SqlValue>;

const createSqlState = () => {
	const database = new Database(":memory:");
	let initialization = Promise.resolve();
	const sql = {
		exec<T extends SqlRow>(query: string, ...bindings: unknown[]) {
			const normalized = query.trim().toUpperCase();
			let rows: T[] = [];
			if (bindings.length === 0 && !normalized.startsWith("SELECT")) {
				database.exec(query);
			} else {
				const statement = database.prepare(query);
				if (statement.reader) {
					rows = statement.all(...bindings) as T[];
				} else {
					statement.run(...bindings);
				}
			}
			return {
				toArray: () => rows,
				one: () => {
					if (rows.length !== 1 || !rows[0]) {
						throw new Error(`Expected one SQLite row, received ${rows.length}`);
					}
					return rows[0];
				},
			};
		},
	};
	const stateValue = {
		storage: { sql },
		blockConcurrencyWhile<T>(callback: () => Promise<T>) {
			const current = callback();
			initialization = current.then(() => undefined);
			return current;
		},
	};
	return {
		database,
		state: stateValue as DurableObjectState,
		waitForInitialization: () => initialization,
	};
};

type CoordinatorEntry = {
	coordinator: ErasureCoordinator;
	database: Database.Database;
	waitForInitialization: () => Promise<void>;
};

const createHarness = (overrides: Partial<PrivacyErasureEnv> = {}) => {
	const entries = new Map<string, CoordinatorEntry>();
	let testEnv: PrivacyErasureEnv;
	const namespace = {
		getByName(name: string) {
			let entry = entries.get(name);
			if (!entry) {
				const sqlState = createSqlState();
				entry = {
					coordinator: new ErasureCoordinator(sqlState.state, testEnv),
					database: sqlState.database,
					waitForInitialization: sqlState.waitForInitialization,
				};
				entries.set(name, entry);
			}
			const selected = entry;
			return {
				async processOperation(
					operation: Parameters<ErasureCoordinator["processOperation"]>[0],
					targets: Parameters<ErasureCoordinator["processOperation"]>[1],
				) {
					await selected.waitForInitialization();
					return selected.coordinator.processOperation(operation, targets);
				},
			} as DurableObjectStub<ErasureCoordinator>;
		},
	} as DurableObjectNamespace<ErasureCoordinator>;
	testEnv = {
		CINAAUTH_ERASURE_WEBHOOK_SECRET: inboundSecret,
		CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2: createSecretsStoreSecret(),
		CINAAUTH_ERASURE_STORAGE_SECRET: storageSecret,
		CINAAUTH_ERASURE_TARGETS: targetsJson,
		CINAAUTH_ERASURE_ALLOWED_HOSTS:
			"commerce.example.test,support.example.test",
		CINAAUTH_ERASURE_CONFIG_KEK_STORE: createSecretsStoreSecret(
			async () => `test-config-kek-${"k".repeat(40)}`,
		),
		VERSION_METADATA: {
			id: "test-worker-version",
			tag: "test",
			timestamp: "2026-08-10T00:00:00.000Z",
		},
		ERASURE_COORDINATOR: namespace,
		ERASURE_CONFIG: {
			getByName: () => ({
				status: async () => ({
					revision: 0,
					structuralReady: true,
					operationalReady: false,
					source: "none",
					active: null,
					next: null,
					previous: null,
				}),
				checkEncryptionKey: async () => ({ ok: true as const }),
				activeTargets: async () => null,
			}),
		} as unknown as PrivacyErasureEnv["ERASURE_CONFIG"],
		...overrides,
	} as PrivacyErasureEnv;
	return { env: testEnv, entries };
};

const makeRequest = async (
	overrides: {
		operationId?: string;
		subject?: { id: string; email: string };
		signature?: string;
	} = {},
) => {
	const selectedOperationId = overrides.operationId ?? operationId;
	const body = JSON.stringify({
		schemaVersion: 1,
		action: "erase-subject",
		operationId: selectedOperationId,
		subject: overrides.subject ?? {
			id: "user-sensitive-123",
			email: "sensitive@example.com",
		},
	});
	const signature =
		overrides.signature ?? `v1=${await signBody(body, inboundSecret)}`;
	return new Request(
		"https://cinaauth-erasure.cinagroup.com/cinaauth/privacy/erase",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CinaAuth-Operation-Id": selectedOperationId,
				"X-CinaAuth-Signature": signature,
			},
			body,
		},
	);
};

const dispatch = async (request: Request, env: PrivacyErasureEnv) =>
	worker.fetch(request, env, {} as ExecutionContext);

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("privacy erasure runtime contract", () => {
	it("fails closed when no downstream erasure target is configured", () => {
		expect(
			assessRuntime({
				webhookSecret: inboundSecret,
				storageSecret,
				targetsJson: "[]",
			}),
		).toEqual({ ok: false, issues: ["targets_empty"], targetIds: [] });
	});

	it("rejects duplicate, insecure, or weak target definitions", () => {
		expect(() =>
			parseTargets(
				JSON.stringify([
					{
						id: "support",
						url: "http://support.example.test/erase",
						secret: "short",
					},
				]),
			),
		).toThrow("invalid");
		expect(() =>
			parseTargets(
				JSON.stringify([
					{
						id: "support",
						url: "https://support.example.test/erase",
						secret: "x".repeat(32),
					},
					{
						id: "support",
						url: "https://other.example.test/erase",
						secret: "y".repeat(32),
					},
				]),
			),
		).toThrow("duplicate target id");
	});

	it("verifies the exact raw body with a constant-time HMAC comparison", async () => {
		const body = JSON.stringify({ stable: true });
		const signature = `v1=${await signBody(body, inboundSecret)}`;
		await expect(
			verifyBodySignature(body, signature, inboundSecret),
		).resolves.toBe(true);
		await expect(
			verifyBodySignature(`${body} `, signature, inboundSecret),
		).resolves.toBe(false);
	});
});

describe("privacy erasure Worker and Durable Object", () => {
	it("prefers a validated dynamic ACTIVE target set over legacy targets", async () => {
		const dynamicTarget = {
			id: "dynamic-system",
			url: "https://dynamic.example.test/privacy/erase",
			secret: `test-dynamic-${"d".repeat(40)}`,
		};
		const now = "2026-08-11T00:00:00.000Z";
		const harness = createHarness({
			CINAAUTH_ERASURE_ALLOWED_HOSTS:
				"commerce.example.test,support.example.test,dynamic.example.test",
			ERASURE_CONFIG: {
				getByName: () => ({
					status: async () => ({
						revision: 3,
						structuralReady: true,
						operationalReady: true,
						source: "dynamic",
						active: {
							version: 1,
							targetIds: [dynamicTarget.id],
							targetCount: 1,
							configured: true,
							validated: true,
							createdAt: now,
							testedAt: now,
							activatedAt: now,
						},
						next: null,
						previous: null,
					}),
					checkEncryptionKey: async () => ({ ok: true as const }),
					activeTargets: async () => [dynamicTarget],
				}),
			} as unknown as PrivacyErasureEnv["ERASURE_CONFIG"],
		});
		const targetFetch = vi.fn(async (_input: RequestInfo | URL) =>
			Response.json({
				status: "completed",
				completedAt: "2026-08-10T23:59:00.000Z",
				evidenceId: "dynamic-evidence",
			}),
		);
		vi.stubGlobal("fetch", targetFetch);

		const response = await dispatch(
			await makeRequest({ operationId: "z".repeat(44) }),
			harness.env,
		);
		expect(response.status).toBe(200);
		expect(targetFetch).toHaveBeenCalledOnce();
		expect(String(targetFetch.mock.calls[0]?.[0])).toBe(dynamicTarget.url);
	});

	it("rejects unsigned and malformed ingress before calling a target", async () => {
		const harness = createHarness();
		const targetFetch = vi.fn();
		vi.stubGlobal("fetch", targetFetch);

		const response = await dispatch(
			await makeRequest({ signature: `v1=${"A".repeat(44)}` }),
			harness.env,
		);
		expect(response.status).toBe(401);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(targetFetch).not.toHaveBeenCalled();
	});

	it("persists completed targets and returns the same evidence without replay", async () => {
		const harness = createHarness();
		const targetFetch = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const body = String(init?.body);
				const targetId = new Headers(init?.headers).get("x-cinaauth-target-id");
				const target = parseTargets(
					harness.env.CINAAUTH_ERASURE_TARGETS ?? "",
				).find((item) => item.id === targetId);
				expect(target).toBeDefined();
				expect(String(input)).toBe(target?.url);
				expect(
					await verifyBodySignature(
						body,
						new Headers(init?.headers).get("x-cinaauth-signature"),
						target?.secret ?? "",
					),
				).toBe(true);
				return Response.json({
					status: "completed",
					completedAt: "2026-08-09T17:00:00.000Z",
					evidenceId: `raw-provider-evidence-${targetId}`,
				});
			},
		);
		vi.stubGlobal("fetch", targetFetch);

		const first = await dispatch(await makeRequest(), harness.env);
		const firstBody = await first.json<{
			status: string;
			completedAt: string;
			evidenceId: string;
		}>();
		expect(first.status).toBe(200);
		expect(firstBody.status).toBe("completed");
		expect(firstBody.evidenceId).toMatch(/^cinaauth-erasure-v1:/);
		expect(firstBody.evidenceId).not.toContain("raw-provider-evidence");

		const second = await dispatch(await makeRequest(), harness.env);
		expect(second.status).toBe(200);
		expect(await second.json()).toEqual(firstBody);
		expect(targetFetch).toHaveBeenCalledTimes(2);

		const database = harness.entries.get(operationId)?.database;
		expect(database).toBeDefined();
		const operationRows = database
			?.prepare(
				`SELECT subject_digest AS subjectDigest,
					evidence_id AS evidenceId
				 FROM erasure_operations`,
			)
			.all();
		const targetRows = database
			?.prepare(
				`SELECT evidence_digest AS evidenceDigest
				 FROM erasure_targets`,
			)
			.all();
		expect(JSON.stringify(operationRows)).not.toContain("user-sensitive-123");
		expect(JSON.stringify(operationRows)).not.toContain(
			"sensitive@example.com",
		);
		expect(JSON.stringify(targetRows)).not.toContain("raw-provider-evidence");
		expect(operationRows?.[0]).toMatchObject({
			subjectDigest: expect.stringMatching(/^hmac-sha256:/),
		});
	});

	it("retries only pending targets and preserves completed work", async () => {
		const harness = createHarness();
		const calls = new Map<string, number>();
		const pendingOperationId = "b".repeat(44);
		const targetFetch = vi.fn(
			async (_input: RequestInfo | URL, init?: RequestInit) => {
				const targetId = new Headers(init?.headers).get("x-cinaauth-target-id");
				if (!targetId) return new Response(null, { status: 400 });
				const next = (calls.get(targetId) ?? 0) + 1;
				calls.set(targetId, next);
				if (targetId === "commerce-system" && next === 1) {
					return new Response(null, {
						status: 202,
						headers: { "Retry-After": "15" },
					});
				}
				return Response.json({
					status: "completed",
					completedAt: "2026-08-09T17:05:00.000Z",
					evidenceId: `${targetId}-complete-${next}`,
				});
			},
		);
		vi.stubGlobal("fetch", targetFetch);

		const first = await dispatch(
			await makeRequest({ operationId: pendingOperationId }),
			harness.env,
		);
		expect(first.status).toBe(202);
		expect(first.headers.get("retry-after")).toBe("30");

		const second = await dispatch(
			await makeRequest({ operationId: pendingOperationId }),
			harness.env,
		);
		expect(second.status).toBe(200);
		expect(calls.get("support-system")).toBe(1);
		expect(calls.get("commerce-system")).toBe(2);
	});

	it("blocks a pending operation when a target URL changes under the same id", async () => {
		const harness = createHarness();
		const changedOperationId = "u".repeat(44);
		const targetFetch = vi.fn(
			async () =>
				new Response(null, { status: 202, headers: { "Retry-After": "30" } }),
		);
		vi.stubGlobal("fetch", targetFetch);

		const first = await dispatch(
			await makeRequest({ operationId: changedOperationId }),
			harness.env,
		);
		expect(first.status).toBe(202);

		const changedTargets = parseTargets(targetsJson).map((target) =>
			target.id === "support-system"
				? {
						...target,
						url: "https://support-v2.example.test/privacy/erase",
					}
				: target,
		);
		harness.env.CINAAUTH_ERASURE_ALLOWED_HOSTS =
			"commerce.example.test,support.example.test,support-v2.example.test";
		harness.env.CINAAUTH_ERASURE_TARGETS = JSON.stringify(changedTargets);
		const conflict = await dispatch(
			await makeRequest({ operationId: changedOperationId }),
			harness.env,
		);
		expect(conflict.status).toBe(409);
		expect(await conflict.json()).toMatchObject({ code: "TARGET_SET_CHANGED" });
		expect(targetFetch).toHaveBeenCalledTimes(2);
	});

	it("rejects operation reuse for another subject", async () => {
		const harness = createHarness();
		const conflictOperationId = "c".repeat(44);
		const targetFetch = vi.fn(async () =>
			Response.json({
				status: "completed",
				completedAt: "2026-08-09T17:10:00.000Z",
				evidenceId: "completed-once",
			}),
		);
		vi.stubGlobal("fetch", targetFetch);

		expect(
			(
				await dispatch(
					await makeRequest({ operationId: conflictOperationId }),
					harness.env,
				)
			).status,
		).toBe(200);
		const conflict = await dispatch(
			await makeRequest({
				operationId: conflictOperationId,
				subject: {
					id: "different-user",
					email: "different@example.com",
				},
			}),
			harness.env,
		);
		expect(conflict.status).toBe(409);
		expect(targetFetch).toHaveBeenCalledTimes(2);
	});

	it("fails closed on malformed downstream evidence", async () => {
		const harness = createHarness();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => Response.json({ status: "completed" })),
		);
		const response = await dispatch(
			await makeRequest({ operationId: "d".repeat(44) }),
			harness.env,
		);
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({
			success: false,
			code: "ERASURE_TARGET_UNAVAILABLE",
		});
	});

	it("exposes target IDs only to an authorized readiness check", async () => {
		const harness = createHarness();
		const publicReady = await dispatch(
			new Request("https://cinaauth-erasure.cinagroup.com/ready"),
			harness.env,
		);
		const publicBody = await publicReady.json<{
			runtimeConfig: Record<string, unknown>;
		}>();
		expect(publicBody.runtimeConfig).toEqual({
			ok: true,
			structuralReady: true,
			operationalReady: true,
			source: "legacy",
		});

		const authorizedReady = await dispatch(
			new Request("https://cinaauth-erasure.cinagroup.com/ready", {
				headers: { Authorization: `Bearer ${inboundSecret}` },
			}),
			harness.env,
		);
		expect(authorizedReady.status).toBe(200);
		expect(await authorizedReady.json()).toMatchObject({
			runtimeConfig: {
				ok: true,
				structuralReady: true,
				operationalReady: true,
				source: "legacy",
				targetIds: ["commerce-system", "support-system"],
			},
			webhookAuthentication: {
				active: true,
				ok: true,
				source: "secrets-store-v2",
				issues: [],
			},
		});
	});

	it("fails closed when the active Store V2 read throws while V1 remains healthy", async () => {
		const get = async () => {
			throw new Error("Secrets Store unavailable");
		};
		const harness = createHarness({
			CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2: createSecretsStoreSecret(get),
		});

		const response = await dispatch(
			new Request("https://cinaauth-erasure.cinagroup.com/ready", {
				headers: { Authorization: `Bearer ${inboundSecret}` },
			}),
			harness.env,
		);
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({
			success: false,
			code: "ERASURE_WEBHOOK_SECRET_UNAVAILABLE",
		});
	});
});
