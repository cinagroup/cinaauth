import type { PoolClient } from "pg";
import type { CinaAuthDatabase } from "./database";
import { getProviderNamespaceInvariantReadiness } from "./provider-namespace-invariant";

const PROVIDER_NAMESPACE_LOCK_PREFIX = "cinaauth:provider-namespace:v1";
const PROVIDER_NAMESPACE_LOCK_TIMEOUT_MS = 10_000;
const PROVIDER_NAMESPACE_RATE_LIMIT = { window: 60, max: 30 } as const;
const RESERVED_PRODUCTION_PROVIDER_IDS = new Set(["google", "github"]);
const PROVIDER_NAMESPACE_MUTATION_PATHS = new Set([
	"/api/auth/sso/register",
	"/api/auth/scim/generate-token",
	"/api/migrate/scim-provider-ownership",
]);

type ProviderNamespaceRateLimitResult = {
	allowed: boolean;
	retryAfter: number | null;
};

type ProviderNamespaceStateRow = {
	hasAccount: boolean;
	hasTargetProvider: boolean;
};

type ProviderNamespaceRequestOptions = {
	request: Request;
	/** Supplies the already-validated id when an operations route consumed JSON. */
	providerId?: string;
	/** Current production social/Generic OAuth ids that must stay account-owned. */
	configuredProviderIds?: readonly string[];
	openDatabase: () => CinaAuthDatabase;
	handle: () => Promise<Response>;
	consumeRateLimit?: (
		key: string,
		rule: { window: number; max: number },
	) => Promise<ProviderNamespaceRateLimitResult>;
	onFailure?: (error: unknown) => void;
};

const canonicalizeProviderNamespacePath = (pathname: string) =>
	pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname;

/** Identifies only provider-id namespace creation/claim sinks. */
export const requiresProviderNamespaceGovernance = (
	pathname: string,
	method: string,
): boolean =>
	method.toUpperCase() === "POST" &&
	PROVIDER_NAMESPACE_MUTATION_PATHS.has(
		canonicalizeProviderNamespacePath(pathname),
	);

const readStrictTopLevelProviderId = async (
	request: Request,
): Promise<string | undefined> => {
	try {
		const body: unknown = await request.clone().json();
		if (
			typeof body !== "object" ||
			body === null ||
			Array.isArray(body) ||
			!Object.prototype.hasOwnProperty.call(body, "providerId")
		) {
			return undefined;
		}
		const providerId = (body as Record<string, unknown>).providerId;
		return typeof providerId === "string" ? providerId : undefined;
	} catch {
		return undefined;
	}
};

const withProviderNamespaceLock = async <T>(
	database: CinaAuthDatabase,
	providerId: string,
	operation: (client: PoolClient) => Promise<T>,
): Promise<T> => {
	const client = await database.connect();
	let transactionStarted = false;
	try {
		await client.query("BEGIN");
		transactionStarted = true;
		await client.query(
			`SET LOCAL statement_timeout = '${PROVIDER_NAMESPACE_LOCK_TIMEOUT_MS}ms'`,
		);
		await client.query(
			"SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
			[`${PROVIDER_NAMESPACE_LOCK_PREFIX}:${providerId}`],
		);
		const result = await operation(client);
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

const providerNamespaceUnavailable = () =>
	Response.json(
		{
			code: "PROVIDER_NAMESPACE_UNAVAILABLE",
			message: "Provider namespace is temporarily unavailable",
		},
		{
			status: 503,
			headers: { "Cache-Control": "no-store" },
		},
	);

const providerNamespaceRateLimited = (retryAfter: number | null) => {
	const normalizedRetryAfter =
		typeof retryAfter === "number" && Number.isFinite(retryAfter)
			? Math.max(0, Math.ceil(retryAfter))
			: PROVIDER_NAMESPACE_RATE_LIMIT.window;
	return Response.json(
		{
			code: "PROVIDER_NAMESPACE_RATE_LIMITED",
			message: "Provider namespace mutation rate limit exceeded",
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

const providerIdReserved = () =>
	Response.json(
		{
			code: "PROVIDER_ID_RESERVED",
			message: "Provider id is reserved for a production social provider",
		},
		{
			status: 400,
			headers: { "Cache-Control": "no-store" },
		},
	);

const providerIdCollision = () =>
	Response.json(
		{
			code: "PROVIDER_ID_COLLISION",
			message: "Provider id is already used by another account provider",
		},
		{
			status: 409,
			headers: { "Cache-Control": "no-store" },
		},
	);

const getHistoricalAccountCollision = async (
	client: PoolClient,
	canonicalPathname: string,
	providerId: string,
): Promise<Response | undefined> => {
	const query =
		canonicalPathname === "/api/auth/sso/register"
			? `SELECT
				EXISTS(SELECT 1 FROM "account" WHERE "providerId" = $1) AS "hasAccount",
				EXISTS(SELECT 1 FROM "ssoProvider" WHERE "providerId" = $1) AS "hasTargetProvider"`
			: canonicalPathname === "/api/auth/scim/generate-token"
				? `SELECT
					EXISTS(SELECT 1 FROM "account" WHERE "providerId" = $1) AS "hasAccount",
					EXISTS(SELECT 1 FROM "scimProvider" WHERE "providerId" = $1) AS "hasTargetProvider"`
				: undefined;
	if (!query) return undefined;

	const result = await client.query<ProviderNamespaceStateRow>(query, [
		providerId,
	]);
	const row = result.rows[0];
	if (
		!row ||
		typeof row.hasAccount !== "boolean" ||
		typeof row.hasTargetProvider !== "boolean"
	) {
		throw new Error("Invalid provider namespace state returned by PostgreSQL");
	}
	return row.hasAccount && !row.hasTargetProvider
		? providerIdCollision()
		: undefined;
};

const getProviderNamespaceRateLimitKey = (
	request: Request,
	canonicalPathname: string,
) => {
	const clientAddress =
		request.headers.get("CF-Connecting-IP")?.trim().slice(0, 128) || "unknown";
	return `provider-namespace:${canonicalPathname}:ip:${clientAddress}`;
};

const reportProviderNamespaceFailure = (
	error: unknown,
	onFailure: ((error: unknown) => void) | undefined,
) => {
	try {
		onFailure?.(error);
	} catch {
		// Logging must never weaken the fail-closed response.
	}
	return providerNamespaceUnavailable();
};

/**
 * Serializes the production mutations that claim the shared account-provider
 * identifier namespace. A strict top-level provider id selects the advisory
 * lock; every valid claim first consumes a fixed IP+route Durable Object bucket
 * so random identifiers cannot amplify Hyperdrive lock traffic. Request
 * secrets are neither lock material nor logged by this boundary.
 */
export const handleProviderNamespaceGovernedRequest = async ({
	request,
	providerId: suppliedProviderId,
	configuredProviderIds = [],
	openDatabase,
	handle,
	consumeRateLimit,
	onFailure,
}: ProviderNamespaceRequestOptions): Promise<Response> => {
	const pathname = new URL(request.url).pathname;
	if (!requiresProviderNamespaceGovernance(pathname, request.method)) {
		return handle();
	}
	const canonicalPathname = canonicalizeProviderNamespacePath(pathname);
	const providerId =
		suppliedProviderId ?? (await readStrictTopLevelProviderId(request));
	// The authoritative endpoint retains its original validation semantics for
	// missing/non-string/nested provider ids and no coordination resources open.
	if (providerId === undefined) return handle();

	if (RESERVED_PRODUCTION_PROVIDER_IDS.has(providerId)) {
		return providerIdReserved();
	}

	try {
		if (!consumeRateLimit) {
			throw new Error("Provider namespace rate limiter is unavailable");
		}
		const rateLimit = await consumeRateLimit(
			getProviderNamespaceRateLimitKey(request, canonicalPathname),
			PROVIDER_NAMESPACE_RATE_LIMIT,
		);
		if (!rateLimit.allowed) {
			return providerNamespaceRateLimited(rateLimit.retryAfter);
		}
	} catch (error) {
		return reportProviderNamespaceFailure(error, onFailure);
	}

	let database: CinaAuthDatabase | undefined;
	try {
		const activeDatabase = openDatabase();
		database = activeDatabase;
		return await withProviderNamespaceLock(
			activeDatabase,
			providerId,
			async (client) => {
				const invariant = await getProviderNamespaceInvariantReadiness(
					client,
					configuredProviderIds,
				);
				if (!invariant.ready) {
					throw new Error(
						"Provider namespace database invariant is unavailable",
					);
				}
				return (
					(await getHistoricalAccountCollision(
						client,
						canonicalPathname,
						providerId,
					)) ?? handle()
				);
			},
		);
	} catch (error) {
		return reportProviderNamespaceFailure(error, onFailure);
	} finally {
		await database?.end().catch(() => undefined);
	}
};
