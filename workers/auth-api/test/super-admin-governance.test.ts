import { describe, expect, it, vi } from "vitest";
import type { CinaAuthDatabase } from "../src/database";
import { SUPER_ADMIN_DATABASE_INVARIANT_LOCK_KEY } from "../src/super-admin-database-invariant";
import {
	handleSuperAdminGovernedRequest,
	requiresSuperAdminGovernance,
	SUPER_ADMIN_GOVERNANCE_QUEUE_LOCK_KEY,
} from "../src/super-admin-governance";

type QueryResult = {
	rows: Array<{ count?: number | string; ready?: boolean }>;
};

const createSerialDatabaseDouble = (
	superAdminCount = 2,
	invariantReady = true,
) => {
	let lockTail = Promise.resolve();
	const queries: string[] = [];
	const releases: Array<() => void> = [];
	const database = {
		connect: async () => {
			let releaseHeldLock: (() => void) | undefined;
			return {
				query: async (text: string): Promise<QueryResult> => {
					queries.push(text);
					if (text.includes("pg_advisory_xact_lock")) {
						const previous = lockTail;
						lockTail = new Promise<void>((resolve) => {
							releaseHeldLock = resolve;
						});
						await previous;
					}
					if (text === "COMMIT" || text === "ROLLBACK") {
						releaseHeldLock?.();
					}
					return { rows: [] };
				},
				release: () => releases.push(() => undefined),
			};
		},
		query: async (text: string): Promise<QueryResult> => {
			queries.push(text);
			if (text.includes("AS ready")) {
				return { rows: [{ ready: invariantReady }] };
			}
			return { rows: [{ count: superAdminCount }] };
		},
		end: vi.fn(async () => undefined),
	} as unknown as CinaAuthDatabase;
	return { database, queries, releases };
};

const request = (path: string, method = "POST") =>
	new Request(`https://auth.cinaseek.ai${path}`, { method });

const getAuthenticatedAdminSession = async () => ({
	user: { id: "admin", role: "super_admin" },
});

const scimDeleteRequest = (
	authorization: string | null = `Bearer ${btoa("secret:provider")}`,
) =>
	new Request("https://auth.cinaseek.ai/api/auth/scim/v2/Users/user-id", {
		method: "DELETE",
		headers: {
			...(authorization ? { Authorization: authorization } : {}),
			"CF-Connecting-IP": "203.0.113.10",
		},
	});

describe("super-admin deployment governance", () => {
	it("uses a queue key that cannot deadlock the mutation-transaction invariant", () => {
		expect(SUPER_ADMIN_GOVERNANCE_QUEUE_LOCK_KEY).not.toBe(
			SUPER_ADMIN_DATABASE_INVARIANT_LOCK_KEY,
		);
	});

	it("covers every role-removal and account-deletion sink but not recovery", () => {
		for (const [path, method] of [
			["/api/auth/admin/set-role", "POST"],
			["/api/auth/admin/update-user", "POST"],
			["/api/auth/admin/remove-user", "POST"],
			["/api/auth/delete-user", "POST"],
			["/api/auth/delete-user/callback", "GET"],
			["/api/auth/delete-anonymous-user", "POST"],
			["/api/auth/scim/v2/Users/scim-user-id", "DELETE"],
			["/api/auth/admin/set-role/", "POST"],
			["/api/auth/delete-user/callback///", "GET"],
			["/api/auth/scim/v2/Users/scim-user-id/", "DELETE"],
		] as const) {
			expect(requiresSuperAdminGovernance(path, method)).toBe(true);
		}

		expect(
			requiresSuperAdminGovernance(
				"/api/auth/admin/stop-impersonating/",
				"POST",
			),
		).toBe(false);
		expect(
			requiresSuperAdminGovernance("/api/auth/admin/set-role", "GET"),
		).toBe(false);
		expect(
			requiresSuperAdminGovernance("/api/auth/scim/v2/Users/", "DELETE"),
		).toBe(false);
		expect(
			requiresSuperAdminGovernance("/api/auth/admin/set-role/extra/", "POST"),
		).toBe(false);
	});

	it.each([
		["/api/auth/delete-user", "POST"],
		["/api/auth/delete-user/callback", "GET"],
		["/api/auth/delete-anonymous-user", "POST"],
		["/api/auth/admin/set-role/", "POST"],
	] as const)("does not acquire governance storage for an unauthenticated %s request", async (path, method) => {
		const openDatabase = vi.fn(() => {
			throw new Error("must not open");
		});
		const upstream = Response.json({ code: "UNAUTHORIZED" }, { status: 401 });

		const response = await handleSuperAdminGovernedRequest({
			request: request(path, method),
			openDatabase,
			getSession: async () => null,
			handle: async () => upstream,
		});

		expect(response).toBe(upstream);
		expect(openDatabase).not.toHaveBeenCalled();
	});

	it("fails closed before storage when authoritative session lookup fails", async () => {
		const openDatabase = vi.fn(() => {
			throw new Error("must not open");
		});
		const handle = vi.fn(async () => new Response("mutated"));
		const response = await handleSuperAdminGovernedRequest({
			request: request("/api/auth/admin/set-role"),
			openDatabase,
			getSession: async () => {
				throw new Error("session storage unavailable");
			},
			handle,
		});

		expect(response.status).toBe(503);
		expect(openDatabase).not.toHaveBeenCalled();
		expect(handle).not.toHaveBeenCalled();
	});

	it.each([
		null,
		"Bearer definitely-not-base64!",
	])("does not acquire governance storage for a missing or malformed SCIM bearer", async (authorization) => {
		const openDatabase = vi.fn(() => {
			throw new Error("must not open");
		});
		const upstream = Response.json(
			{ detail: "Invalid SCIM token" },
			{ status: 401 },
		);

		const response = await handleSuperAdminGovernedRequest({
			request: scimDeleteRequest(authorization),
			openDatabase,
			getSession: async () => null,
			handle: async () => upstream,
		});

		expect(response).toBe(upstream);
		expect(openDatabase).not.toHaveBeenCalled();
	});

	it("rate limits plausible SCIM deletion before opening governance storage", async () => {
		const openDatabase = vi.fn(() => {
			throw new Error("must not open");
		});
		const consumeSCIMRateLimit = vi.fn(async () => ({
			allowed: false,
			retryAfter: 17,
		}));

		const response = await handleSuperAdminGovernedRequest({
			request: scimDeleteRequest(),
			openDatabase,
			getSession: async () => null,
			handle: async () => new Response("deleted"),
			consumeSCIMRateLimit,
		});

		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("17");
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(openDatabase).not.toHaveBeenCalled();
		expect(consumeSCIMRateLimit).toHaveBeenCalledTimes(1);
		expect(consumeSCIMRateLimit.mock.calls[0]![0]).not.toContain("secret");
	});

	it("fails closed when the pre-lock SCIM rate limiter is unavailable", async () => {
		const openDatabase = vi.fn(() => {
			throw new Error("must not open");
		});
		const consumeSCIMRateLimit = vi.fn(async () => {
			throw new Error("RATE_LIMITER binding unavailable");
		});

		const response = await handleSuperAdminGovernedRequest({
			request: scimDeleteRequest(),
			openDatabase,
			getSession: async () => null,
			handle: async () => new Response("deleted"),
			consumeSCIMRateLimit,
		});

		expect(response.status).toBe(503);
		expect(openDatabase).not.toHaveBeenCalled();
		expect(consumeSCIMRateLimit).toHaveBeenCalledOnce();
	});

	it("keeps a plausible padded SCIM bearer inside the serialized boundary", async () => {
		const { database, queries } = createSerialDatabaseDouble();
		const consumeSCIMRateLimit = vi.fn(async () => ({
			allowed: true,
			retryAfter: null,
		}));
		const handle = vi.fn(async () => new Response(null, { status: 204 }));

		const response = await handleSuperAdminGovernedRequest({
			request: scimDeleteRequest(),
			openDatabase: () => database,
			getSession: async () => null,
			handle,
			consumeSCIMRateLimit,
		});

		expect(response.status).toBe(204);
		expect(handle).toHaveBeenCalledOnce();
		expect(consumeSCIMRateLimit).toHaveBeenCalledOnce();
		expect(
			queries.some((query) => query.includes("pg_advisory_xact_lock")),
		).toBe(true);
	});

	it("keeps stop-impersonating available without opening the governance database", async () => {
		const openDatabase = vi.fn(() => {
			throw new Error("must not open");
		});
		const upstream = new Response("recovered", {
			headers: { "Set-Cookie": "session=admin" },
		});

		const response = await handleSuperAdminGovernedRequest({
			request: request("/api/auth/admin/stop-impersonating"),
			openDatabase,
			getSession: async () => null,
			handle: async () => upstream,
		});

		expect(response).toBe(upstream);
		expect(openDatabase).not.toHaveBeenCalled();
		expect(response.headers.get("Set-Cookie")).toBe("session=admin");
	});

	it("holds one PostgreSQL advisory lock across concurrent auth-handler I/O", async () => {
		const { database, queries } = createSerialDatabaseDouble();
		const events: string[] = [];
		let releaseFirst: (() => void) | undefined;
		const firstGate = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});
		const openDatabase = vi.fn(() => database);
		const first = handleSuperAdminGovernedRequest({
			request: request("/api/auth/admin/set-role"),
			openDatabase,
			getSession: getAuthenticatedAdminSession,
			handle: async () => {
				events.push("first:start");
				await firstGate;
				events.push("first:end");
				return new Response("first");
			},
		});

		while (!events.includes("first:start")) await Promise.resolve();
		const second = handleSuperAdminGovernedRequest({
			request: request("/api/auth/admin/remove-user"),
			openDatabase,
			getSession: getAuthenticatedAdminSession,
			handle: async () => {
				events.push("second:start");
				return new Response("second");
			},
		});
		await Promise.resolve();
		expect(events).toEqual(["first:start"]);

		releaseFirst?.();
		await Promise.all([first, second]);
		expect(events).toEqual(["first:start", "first:end", "second:start"]);
		expect(
			queries.filter((query) => query.includes("pg_advisory_xact_lock")),
		).toHaveLength(2);
	});

	it("closes the two-target stale-count race that can remove both super_admin users", async () => {
		const vulnerableAdmins = new Set(["first", "second"]);
		const vulnerableMutation = async (target: string) => {
			const hasAnother = [...vulnerableAdmins].some((id) => id !== target);
			await Promise.resolve();
			if (hasAnother) vulnerableAdmins.delete(target);
		};
		await Promise.all([
			vulnerableMutation("first"),
			vulnerableMutation("second"),
		]);
		expect(vulnerableAdmins.size).toBe(0);

		const protectedAdmins = new Set(["first", "second"]);
		const { database } = createSerialDatabaseDouble();
		const governedMutation = (target: string, path: string) =>
			handleSuperAdminGovernedRequest({
				request: request(path),
				openDatabase: () => database,
				getSession: getAuthenticatedAdminSession,
				handle: async () => {
					const hasAnother = [...protectedAdmins].some((id) => id !== target);
					await Promise.resolve();
					if (!hasAnother) {
						return Response.json(
							{ code: "YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN" },
							{ status: 400 },
						);
					}
					protectedAdmins.delete(target);
					return Response.json({ success: true });
				},
			});

		const responses = await Promise.all([
			governedMutation("first", "/api/auth/admin/set-role"),
			governedMutation("second", "/api/auth/admin/remove-user"),
		]);

		expect(responses.map((response) => response.status).sort()).toEqual([
			200, 400,
		]);
		expect(protectedAdmins.size).toBe(1);
	});

	it("rejects direct deletion of the sole exact super_admin", async () => {
		const { database } = createSerialDatabaseDouble(1);
		const handle = vi.fn(async () => new Response("deleted"));
		const response = await handleSuperAdminGovernedRequest({
			request: request("/api/auth/delete-user"),
			openDatabase: () => database,
			getSession: async () => ({
				user: { id: "root", role: "user,super_admin" },
			}),
			handle,
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			code: "YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN",
		});
		expect(handle).not.toHaveBeenCalled();
	});

	it("rechecks the actual callback deletion sink", async () => {
		const { database } = createSerialDatabaseDouble(1);
		const handle = vi.fn(async () => new Response("deleted"));
		const response = await handleSuperAdminGovernedRequest({
			request: request("/api/auth/delete-user/callback", "GET"),
			openDatabase: () => database,
			getSession: async () => ({ user: { id: "root", role: "super_admin" } }),
			handle,
		});

		expect(response.status).toBe(400);
		expect(handle).not.toHaveBeenCalled();
	});

	it("preserves ordinary deletion and the exact comma-separated role contract", async () => {
		for (const role of ["user", "user, super_admin"]) {
			const { database, queries } = createSerialDatabaseDouble(1);
			const upstream = new Response("deleted", {
				headers: { "Set-Cookie": "session=; Max-Age=0" },
			});
			const response = await handleSuperAdminGovernedRequest({
				request: request("/api/auth/delete-user"),
				openDatabase: () => database,
				getSession: async () => ({ user: { id: "ordinary", role } }),
				handle: async () => upstream,
			});

			expect(response).toBe(upstream);
			expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
			expect(
				queries.some((query) => query.includes("SELECT COUNT(*)::int")),
			).toBe(false);
		}
	});

	it("allows one of multiple super_admin users to delete their own account", async () => {
		const { database } = createSerialDatabaseDouble(2);
		const handle = vi.fn(async () => new Response("deleted"));
		const response = await handleSuperAdminGovernedRequest({
			request: request("/api/auth/delete-user"),
			openDatabase: () => database,
			getSession: async () => ({ user: { id: "root", role: "super_admin" } }),
			handle,
		});

		expect(response.status).toBe(200);
		expect(handle).toHaveBeenCalledOnce();
	});

	it("fails closed with 503 when Hyperdrive is unavailable", async () => {
		const handle = vi.fn(async () => new Response("mutated"));
		const onFailure = vi.fn();
		const response = await handleSuperAdminGovernedRequest({
			request: request("/api/auth/admin/set-role"),
			openDatabase: () => {
				throw new Error("HYPERDRIVE binding is unavailable");
			},
			getSession: getAuthenticatedAdminSession,
			handle,
			onFailure,
		});

		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			code: "ADMIN_GOVERNANCE_UNAVAILABLE",
			message: "Administrator governance is temporarily unavailable",
		});
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(handle).not.toHaveBeenCalled();
		expect(onFailure).toHaveBeenCalledOnce();
	});

	it("fails closed before mutation when the database invariant is absent", async () => {
		const { database, queries } = createSerialDatabaseDouble(2, false);
		const handle = vi.fn(async () => new Response("mutated"));
		const response = await handleSuperAdminGovernedRequest({
			request: request("/api/auth/admin/set-role"),
			openDatabase: () => database,
			getSession: getAuthenticatedAdminSession,
			handle,
		});

		expect(response.status).toBe(503);
		expect(handle).not.toHaveBeenCalled();
		expect(queries.some((query) => query.includes("AS ready"))).toBe(true);
		expect(
			queries.some((query) => query.includes("pg_advisory_xact_lock")),
		).toBe(false);
	});

	it("fails closed before mutation when PostgreSQL cannot acquire the lock", async () => {
		const events: string[] = [];
		const database = {
			query: async () => ({ rows: [{ ready: true }] }),
			connect: async () => ({
				query: async (text: string) => {
					events.push(text);
					if (text.includes("pg_advisory_xact_lock")) {
						throw new Error("lock timeout");
					}
					return { rows: [] };
				},
				release: () => events.push("RELEASE"),
			}),
			end: async () => events.push("END"),
		} as unknown as CinaAuthDatabase;
		const handle = vi.fn(async () => new Response("mutated"));

		const response = await handleSuperAdminGovernedRequest({
			request: request("/api/auth/admin/remove-user"),
			openDatabase: () => database,
			getSession: getAuthenticatedAdminSession,
			handle,
		});

		expect(response.status).toBe(503);
		expect(handle).not.toHaveBeenCalled();
		expect(events).toContain("ROLLBACK");
		expect(events.slice(-2)).toEqual(["RELEASE", "END"]);
	});
});
