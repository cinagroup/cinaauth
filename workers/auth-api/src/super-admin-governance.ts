import type { CinaAuthDatabase } from "./database";
import {
	assertDatabaseInvariantReady,
	SUPER_ADMIN_INVARIANT_DEFINITION,
} from "./database-invariants";

const SUPER_ADMIN_ROLE = "super_admin";
export const SUPER_ADMIN_GOVERNANCE_QUEUE_LOCK_KEY =
	"cinaauth:super-admin-governance:queue:v1";
const GOVERNANCE_LOCK_TIMEOUT_MS = 10_000;
const MAX_SCIM_BEARER_LENGTH = 4_096;
const SCIM_DELETE_RATE_LIMIT = { window: 60, max: 60 } as const;

const ADMIN_GOVERNANCE_PATHS = new Map<string, ReadonlySet<string>>([
	[
		"POST",
		new Set([
			"/api/auth/admin/set-role",
			"/api/auth/admin/update-user",
			"/api/auth/admin/remove-user",
			"/api/auth/delete-user",
			"/api/auth/delete-anonymous-user",
		]),
	],
	["GET", new Set(["/api/auth/delete-user/callback"])],
]);

const SESSION_DELETION_PATHS = new Set([
	"/api/auth/delete-user",
	"/api/auth/delete-user/callback",
	"/api/auth/delete-anonymous-user",
]);
const SESSION_GOVERNANCE_PATHS = new Set([
	"/api/auth/admin/set-role",
	"/api/auth/admin/update-user",
	"/api/auth/admin/remove-user",
	...SESSION_DELETION_PATHS,
]);
const SCIM_USER_DELETE_PREFIX = "/api/auth/scim/v2/Users/";

type SuperAdminSession = {
	user: {
		id: string;
		role?: string | null;
	};
};

type SuperAdminCountRow = {
	count: number | string;
};

type SuperAdminGovernanceRequestOptions = {
	request: Request;
	openDatabase: () => CinaAuthDatabase;
	getSession: () => Promise<SuperAdminSession | null>;
	handle: () => Promise<Response>;
	consumeSCIMRateLimit?: (
		key: string,
		rule: { window: number; max: number },
	) => Promise<{ allowed: boolean; retryAfter: number | null }>;
	onFailure?: (error: unknown) => void;
};

const hasExactSuperAdminRole = (role: string | null | undefined) =>
	role?.split(",").includes(SUPER_ADMIN_ROLE) === true;

const canonicalizeGovernancePath = (pathname: string) => {
	if (pathname === "/") return pathname;
	return pathname.replace(/\/+$/, "") || "/";
};

const isSCIMUserDeletePath = (pathname: string, method: string) => {
	if (method.toUpperCase() !== "DELETE") return false;
	const canonicalPathname = canonicalizeGovernancePath(pathname);
	if (!canonicalPathname.startsWith(SCIM_USER_DELETE_PREFIX)) return false;
	const userId = canonicalPathname.slice(SCIM_USER_DELETE_PREFIX.length);
	return userId.length > 0 && !userId.includes("/");
};

const getPlausibleSCIMBearer = (request: Request) => {
	const match = request.headers
		.get("Authorization")
		?.match(/^Bearer[\t ]+([^\s]+)[\t ]*$/i);
	const encoded = match?.[1];
	if (
		!encoded ||
		encoded.length > MAX_SCIM_BEARER_LENGTH ||
		!/^[A-Za-z0-9_-]+={0,2}$/.test(encoded)
	) {
		return undefined;
	}

	const unpadded = encoded.replace(/=+$/, "");
	if (unpadded.length % 4 === 1) return undefined;
	const standard = unpadded.replace(/-/g, "+").replace(/_/g, "/");
	const padded = standard.padEnd(
		standard.length + ((4 - (standard.length % 4)) % 4),
		"=",
	);
	try {
		const bytes = Uint8Array.from(atob(padded), (character) =>
			character.charCodeAt(0),
		);
		const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		const [secret, providerId] = decoded.split(":");
		return secret && providerId ? encoded : undefined;
	} catch {
		return undefined;
	}
};

/**
 * Identifies the production routes capable of removing a `super_admin` role.
 * Recovery from impersonation intentionally remains outside this boundary.
 */
export const requiresSuperAdminGovernance = (
	pathname: string,
	method: string,
) => {
	const normalizedMethod = method.toUpperCase();
	const canonicalPathname = canonicalizeGovernancePath(pathname);
	if (
		ADMIN_GOVERNANCE_PATHS.get(normalizedMethod)?.has(canonicalPathname) ===
		true
	) {
		return true;
	}
	return isSCIMUserDeletePath(canonicalPathname, normalizedMethod);
};

const withSuperAdminGovernanceLock = async <T>(
	database: CinaAuthDatabase,
	operation: () => Promise<T>,
): Promise<T> => {
	const client = await database.connect();
	let transactionStarted = false;
	try {
		await client.query("BEGIN");
		transactionStarted = true;
		await client.query(
			`SET LOCAL statement_timeout = '${GOVERNANCE_LOCK_TIMEOUT_MS}ms'`,
		);
		await client.query(
			"SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
			[SUPER_ADMIN_GOVERNANCE_QUEUE_LOCK_KEY],
		);
		const result = await operation();
		await client.query("COMMIT");
		transactionStarted = false;
		return result;
	} catch (error) {
		if (transactionStarted) {
			await client.query("ROLLBACK").catch(() => undefined);
		}
		throw error;
	} finally {
		client.release();
	}
};

const getSelfDeletionRejection = async (
	database: CinaAuthDatabase,
	session: SuperAdminSession | null,
) => {
	if (!hasExactSuperAdminRole(session?.user.role)) return undefined;

	const result = await database.query<SuperAdminCountRow>(
		`SELECT COUNT(*)::int AS "count"
		 FROM "user"
		 WHERE $1 = ANY(string_to_array(COALESCE("role", ''), ','))`,
		[SUPER_ADMIN_ROLE],
	);
	const count = Number(result.rows[0]?.count);
	if (!Number.isSafeInteger(count) || count < 0) {
		throw new Error("Invalid super-admin count returned by PostgreSQL");
	}
	if (count > 1) return undefined;

	return Response.json(
		{
			code: "YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN",
			message: "You cannot remove or demote the last super admin",
		},
		{
			status: 400,
			headers: { "Cache-Control": "no-store" },
		},
	);
};

const governanceUnavailable = () =>
	Response.json(
		{
			code: "ADMIN_GOVERNANCE_UNAVAILABLE",
			message: "Administrator governance is temporarily unavailable",
		},
		{
			status: 503,
			headers: { "Cache-Control": "no-store" },
		},
	);

const governanceRateLimited = (retryAfter: number | null) => {
	const normalizedRetryAfter =
		typeof retryAfter === "number" && Number.isFinite(retryAfter)
			? Math.max(0, Math.ceil(retryAfter))
			: SCIM_DELETE_RATE_LIMIT.window;
	return Response.json(
		{
			code: "ADMIN_GOVERNANCE_RATE_LIMITED",
			message: "Administrator governance rate limit exceeded",
		},
		{
			status: 429,
			headers: {
				"Cache-Control": "no-store",
				"Retry-After": String(normalizedRetryAfter),
			},
		},
	);
};

const getSCIMRateLimitKey = (request: Request) => {
	const clientAddress =
		request.headers.get("CF-Connecting-IP")?.trim() || "unknown";
	return `super-admin-governance:scim-delete:ip:${clientAddress}`;
};

const reportGovernanceFailure = (
	error: unknown,
	onFailure: ((error: unknown) => void) | undefined,
) => {
	try {
		onFailure?.(error);
	} catch {
		// Logging must never turn a fail-closed response into an exception.
	}
	return governanceUnavailable();
};

/**
 * Serializes every production sink that can remove a `super_admin` role.
 *
 * The dedicated advisory lock queues production Worker requests so the core
 * plugin can return its stable API errors. A distinct PostgreSQL trigger lock
 * enforces the final invariant in the actual mutation transaction, including
 * if this queue connection is lost while the handler uses another connection.
 * Self-service account deletion is rechecked here so the endpoint and callback
 * remain inside the same cross-isolate coordination boundary.
 */
export const handleSuperAdminGovernedRequest = async ({
	request,
	openDatabase,
	getSession,
	handle,
	consumeSCIMRateLimit,
	onFailure,
}: SuperAdminGovernanceRequestOptions): Promise<Response> => {
	const pathname = new URL(request.url).pathname;
	if (!requiresSuperAdminGovernance(pathname, request.method)) {
		return handle();
	}
	const canonicalPathname = canonicalizeGovernancePath(pathname);

	if (SESSION_GOVERNANCE_PATHS.has(canonicalPathname)) {
		try {
			if (!(await getSession())) return handle();
		} catch (error) {
			return reportGovernanceFailure(error, onFailure);
		}
	}

	if (isSCIMUserDeletePath(canonicalPathname, request.method)) {
		if (!getPlausibleSCIMBearer(request)) return handle();
		try {
			if (!consumeSCIMRateLimit) {
				throw new Error("SCIM governance rate limiter is unavailable");
			}
			const rateLimit = await consumeSCIMRateLimit(
				getSCIMRateLimitKey(request),
				SCIM_DELETE_RATE_LIMIT,
			);
			if (!rateLimit.allowed) {
				return governanceRateLimited(rateLimit.retryAfter);
			}
		} catch (error) {
			return reportGovernanceFailure(error, onFailure);
		}
	}

	let database: CinaAuthDatabase | undefined;
	try {
		const activeDatabase = openDatabase();
		database = activeDatabase;
		await assertDatabaseInvariantReady(
			activeDatabase,
			SUPER_ADMIN_INVARIANT_DEFINITION,
		);
		return await withSuperAdminGovernanceLock(activeDatabase, async () => {
			if (SESSION_DELETION_PATHS.has(canonicalPathname)) {
				const rejection = await getSelfDeletionRejection(
					activeDatabase,
					await getSession(),
				);
				if (rejection) return rejection;
			}
			return handle();
		});
	} catch (error) {
		return reportGovernanceFailure(error, onFailure);
	} finally {
		await database?.end().catch(() => undefined);
	}
};
