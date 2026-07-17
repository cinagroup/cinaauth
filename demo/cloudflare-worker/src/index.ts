import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Auth } from "./auth";
import { createAuth, runWithExecutionCtx } from "./auth";
import { handleDeliveryBatch, type DeliveryMessage } from "./delivery";
import type { CloudflareBindings } from "./env";
import { createAuthPlugins, TRUSTED_ORIGIN_HOSTS } from "./plugins";

const app = new Hono<{
	Bindings: CloudflareBindings;
	Variables: {
		auth: Auth;
	};
}>();

type RateLimitConfig = {
	enabled?: boolean;
	window?: number;
	max?: number;
	storage?: string;
	customRules?: unknown;
};

type MigrationTable = {
	table: string;
	fields?: Record<string, unknown>;
};

type DatabaseTableRow = {
	name: string;
};

type VersionMetadataSnapshot = {
	id: string | null;
	tag: string | null;
	timestamp: string | null;
};

type RuntimeConfigIssue =
	| "missing_cinaauth_secret"
	| "weak_cinaauth_secret"
	| "missing_d1_binding"
	| "missing_version_metadata"
	| "missing_cinaauth_migration_token"
	| "weak_cinaauth_migration_token"
	| "missing_delivery_queue"
	| "missing_delivery_webhook_url"
	| "invalid_delivery_webhook_url"
	| "missing_delivery_webhook_secret"
	| "weak_delivery_webhook_secret"
	| "invalid_cinaauth_url";

const REQUIRED_DATABASE_TABLES = [
	"user",
	"session",
	"account",
	"verification",
	"rateLimit",
] as const;

const reportedRuntimeConfigIssues = new Set<string>();

const withNoStore = (response: Response) => {
	response.headers.set("Cache-Control", "no-store");
	return response;
};

const isTrustedOrigin = (origin: string) => {
	try {
		const url = new URL(origin);
		// Explicit allowlist (see TRUSTED_ORIGIN_HOSTS in plugins.ts) rather than a
		// *.cinagroup.com suffix match, so a forgotten/takeover-prone subdomain
		// cannot make credentialed cross-origin calls against the auth API.
		return url.protocol === "https:" && TRUSTED_ORIGIN_HOSTS.has(url.hostname);
	} catch {
		return false;
	}
};

const isHttpsUrl = (value: string | undefined) => {
	if (!value) return false;
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
};

const isD1Database = (value: unknown): value is D1Database =>
	typeof (value as D1Database | undefined)?.prepare === "function";

export const isVersionMetadata = (
	value: unknown,
): value is WorkerVersionMetadata => {
	const metadata = value as WorkerVersionMetadata | undefined;
	return typeof metadata?.id === "string" && typeof metadata.tag === "string";
};

const isDeliveryQueue = (
	value: unknown,
): value is Queue<DeliveryMessage> =>
	typeof (value as Queue<DeliveryMessage> | undefined)?.send === "function";

const parseBearerToken = (authorization: string | undefined) => {
	if (!authorization) return undefined;
	const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
	return match?.[1];
};

const sha256 = async (value: string) =>
	new Uint8Array(
		await crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(value),
		),
	);

export const secureEqual = async (
	actual: string | undefined,
	expected: string | undefined,
) => {
	if (!actual || !expected) return false;
	const [actualHash, expectedHash] = await Promise.all([
		sha256(actual),
		sha256(expected),
	]);
	let diff = actualHash.length ^ expectedHash.length;
	for (let i = 0; i < actualHash.length; i++) {
		diff |= actualHash[i]! ^ expectedHash[i]!;
	}
	return diff === 0;
};

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

export const getVersionMetadata = (
	env: CloudflareBindings,
): VersionMetadataSnapshot => {
	if (!isVersionMetadata(env.VERSION_METADATA)) {
		return {
			id: null,
			tag: null,
			timestamp: null,
		};
	}

	const timestamp = env.VERSION_METADATA.timestamp;
	return {
		id: env.VERSION_METADATA.id,
		tag: env.VERSION_METADATA.tag,
		timestamp: timestamp ? String(timestamp) : null,
	};
};

export const getRuntimeConfigIssues = (
	env: CloudflareBindings,
): RuntimeConfigIssue[] => {
	const issues: RuntimeConfigIssue[] = [];
	const authSecret =
		typeof env.CINAAUTH_SECRET === "string" ? env.CINAAUTH_SECRET : "";

	if (!authSecret) {
		issues.push("missing_cinaauth_secret");
	} else if (authSecret.length < 32) {
		issues.push("weak_cinaauth_secret");
	}

	if (!isD1Database(env.DB)) {
		issues.push("missing_d1_binding");
	}

	if (!isVersionMetadata(env.VERSION_METADATA)) {
		issues.push("missing_version_metadata");
	}

	if (!env.CINAAUTH_MIGRATION_TOKEN) {
		issues.push("missing_cinaauth_migration_token");
	} else if (env.CINAAUTH_MIGRATION_TOKEN.length < 32) {
		issues.push("weak_cinaauth_migration_token");
	}

	if (!isDeliveryQueue(env.CINAAUTH_DELIVERY_QUEUE)) {
		issues.push("missing_delivery_queue");
	}

	if (!env.CINAAUTH_DELIVERY_WEBHOOK_URL) {
		issues.push("missing_delivery_webhook_url");
	} else if (!isHttpsUrl(env.CINAAUTH_DELIVERY_WEBHOOK_URL)) {
		issues.push("invalid_delivery_webhook_url");
	}

	if (!env.CINAAUTH_DELIVERY_WEBHOOK_SECRET) {
		issues.push("missing_delivery_webhook_secret");
	} else if (env.CINAAUTH_DELIVERY_WEBHOOK_SECRET.length < 32) {
		issues.push("weak_delivery_webhook_secret");
	}

	if (!isHttpsUrl(env.CINAAUTH_URL || "https://auth.cinagroup.com")) {
		issues.push("invalid_cinaauth_url");
	}

	return issues;
};

const logRuntimeConfigIssuesOnce = (
	issues: RuntimeConfigIssue[],
	env: CloudflareBindings,
) => {
	const version = getVersionMetadata(env);
	const key = `${version.id ?? "unknown"}:${issues.join(",")}`;
	if (reportedRuntimeConfigIssues.has(key)) {
		return;
	}
	reportedRuntimeConfigIssues.add(key);
	console.error(
		JSON.stringify({
			level: "error",
			message: "cinaauth.runtime_config_invalid",
			issues,
			version,
		}),
	);
};

export const isAuthorizedMigrationRequest = async (
	headers: Headers,
	env: CloudflareBindings,
) => {
	const provided =
		headers.get("x-cinaauth-migration-token") ||
		parseBearerToken(headers.get("authorization") ?? undefined);

	return secureEqual(provided, env.CINAAUTH_MIGRATION_TOKEN);
};

const getMigrationPlan = async (env: CloudflareBindings) => {
	const { getMigrations } = await import("cinaauth/db/migration");
	const migrations = await getMigrations({
		database: env.DB,
		plugins: createAuthPlugins(env),
	});
	const created = (migrations.toBeCreated as MigrationTable[]).map(
		(table) => table.table,
	);
	const added = (migrations.toBeAdded as MigrationTable[]).map((table) => ({
		table: table.table,
		fields: Object.keys(table.fields ?? {}),
	}));

	return {
		...migrations,
		summary: {
			pendingCount:
				created.length +
				added.reduce((sum, table) => sum + table.fields.length, 0),
			created,
			added,
			requiredTables: [...REQUIRED_DATABASE_TABLES],
		},
	};
};

const getDatabaseReadiness = async (env: CloudflareBindings) => {
	if (!isD1Database(env.DB)) {
		return {
			ok: false,
			requiredTables: [...REQUIRED_DATABASE_TABLES],
			presentTables: [],
			missingTables: [...REQUIRED_DATABASE_TABLES],
		};
	}

	const placeholders = REQUIRED_DATABASE_TABLES.map(() => "?").join(",");
	const result = await env.DB.prepare(
		`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders}) ORDER BY name;`,
	)
		.bind(...REQUIRED_DATABASE_TABLES)
		.all<DatabaseTableRow>();
	const presentTables = new Set(
		(result.results ?? []).map((row) => row.name),
	);
	const missingTables = REQUIRED_DATABASE_TABLES.filter(
		(table) => !presentTables.has(table),
	);

	return {
		ok: missingTables.length === 0,
		requiredTables: [...REQUIRED_DATABASE_TABLES],
		presentTables: [...presentTables],
		missingTables,
	};
};

// Middleware
app.use(
	"*",
	cors({
		origin: (origin) =>
			origin && isTrustedOrigin(origin) ? origin : undefined,
		allowHeaders: [
			"Content-Type",
			"Authorization",
			"x-captcha-response",
			"x-cinaauth-migration-token",
			"electron-origin",
		],
		allowMethods: [
			"GET",
			"HEAD",
			"POST",
			"PUT",
			"PATCH",
			"DELETE",
			"OPTIONS",
		],
		exposeHeaders: ["set-auth-token", "set-auth-jwt", "WWW-Authenticate"],
		credentials: true,
	}),
);

// Create auth instance per request with current env bindings.
app.use("*", async (c, next) => {
	const runtimeConfigIssues = getRuntimeConfigIssues(c.env);
	if (runtimeConfigIssues.length > 0) {
		logRuntimeConfigIssuesOnce(runtimeConfigIssues, c.env);
		if (new URL(c.req.url).pathname === "/api/ready") {
			await next();
			return;
		}
		return withNoStore(c.json({ error: "Server misconfigured" }, 503));
	}

	// Run inside the ExecutionContext store so the cached auth instance's
	// background-task handler can reach ctx.waitUntil — including any task the
	// first-time instance construction (plugin init) might schedule.
	await runWithExecutionCtx(c.executionCtx, async () => {
		c.set("auth", createAuth(c.env));
		await next();
	});
});

// Rate-limit configuration endpoint (read-only, for the admin console's
// security-policy page). Must be registered BEFORE the /api/auth/* catch-all
// so Hono routes it here instead of delegating to the auth handler.
app.get("/api/auth/admin/rate-limit-config", async (c) => {
	const session = await c.var.auth.api.getSession({
		headers: c.req.raw.headers,
	});
	const role = (session?.user as { role?: string } | undefined)?.role;
	if (role !== "super_admin") {
		return withNoStore(c.json({ error: "Forbidden" }, 403));
	}
	const rl = (c.var.auth.options as { rateLimit?: RateLimitConfig }).rateLimit;
	return withNoStore(
		c.json({
			enabled: rl?.enabled ?? true,
			window: rl?.window ?? 10,
			max: rl?.max ?? 100,
			storage: rl?.storage ?? "memory",
			customRules: rl?.customRules ?? {},
		}),
	);
});

// Auth catch-all route handler
app.on(
	["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
	"/api/auth/*",
	(c) => c.var.auth.handler(c.req.raw),
);

// Health check
app.get("/", (c) =>
	withNoStore(
		c.json({
			name: "CinaAuth API",
			status: "running",
			version: "1.0.0",
		}),
	),
);

const assertAuthorizedMigrationRequest = async (
	headers: Headers,
	env: CloudflareBindings,
) => {
	if (await isAuthorizedMigrationRequest(headers, env)) {
		return undefined;
	}
	return new Response(JSON.stringify({ error: "Forbidden" }), {
		status: 403,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
};

// Deployment readiness endpoint (protected; safe to call from CI after deploy).
app.get("/api/ready", async (c) => {
	const forbidden = await assertAuthorizedMigrationRequest(
		c.req.raw.headers,
		c.env,
	);
	if (forbidden) return forbidden;

	const runtimeConfigIssues = getRuntimeConfigIssues(c.env);
	try {
		const database = await getDatabaseReadiness(c.env);
		const isReady = runtimeConfigIssues.length === 0 && database.ok;
		const version = getVersionMetadata(c.env);
		return withNoStore(
			c.json(
				{
					success: isReady,
					version,
					runtimeConfig: {
						ok: runtimeConfigIssues.length === 0,
						issues: runtimeConfigIssues,
					},
					database,
					delivery: {
						queue: isDeliveryQueue(c.env.CINAAUTH_DELIVERY_QUEUE),
						webhookUrl: isHttpsUrl(c.env.CINAAUTH_DELIVERY_WEBHOOK_URL),
						webhookSecret:
							typeof c.env.CINAAUTH_DELIVERY_WEBHOOK_SECRET === "string" &&
							c.env.CINAAUTH_DELIVERY_WEBHOOK_SECRET.length >= 32,
					},
					rateLimit: {
						storage: "database",
						requiredTable: "rateLimit",
					},
				},
				isReady ? 200 : 503,
			),
		);
	} catch (error) {
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.readiness.failed",
				error: errorMessage(error),
				version: getVersionMetadata(c.env),
			}),
		);
		return withNoStore(
			c.json(
				{
					success: false,
					error: "Readiness check failed",
					version: getVersionMetadata(c.env),
					runtimeConfig: {
						ok: runtimeConfigIssues.length === 0,
						issues: runtimeConfigIssues,
					},
				},
				503,
			),
		);
	}
});

// Migration preview endpoint (protected; inspect before applying changes).
app.get("/api/migrate", async (c) => {
	const forbidden = await assertAuthorizedMigrationRequest(
		c.req.raw.headers,
		c.env,
	);
	if (forbidden) return forbidden;

	try {
		const { summary } = await getMigrationPlan(c.env);
		return withNoStore(
			c.json({
				success: true,
				mode: "preview",
				...summary,
			}),
		);
	} catch (error) {
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.migration.preview_failed",
				error: errorMessage(error),
				version: getVersionMetadata(c.env),
			}),
		);
		return withNoStore(
			c.json(
				{
					success: false,
					error: "Migration preview failed",
				},
				500,
			),
		);
	}
});

// Database migration endpoint (protected; run after deployment when plugins change).
app.post("/api/migrate", async (c) => {
	if (!(await isAuthorizedMigrationRequest(c.req.raw.headers, c.env))) {
		return withNoStore(c.json({ error: "Forbidden" }, 403));
	}

	try {
		const { runMigrations, summary } = await getMigrationPlan(c.env);
		await runMigrations();
		return withNoStore(
			c.json({
				success: true,
				mode: "apply",
				message: "Migrations applied successfully",
				...summary,
			}),
		);
	} catch (error) {
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.migration.failed",
				error: errorMessage(error),
				version: getVersionMetadata(c.env),
			}),
		);
		return withNoStore(
			c.json(
				{
					success: false,
					error: "Migration failed",
				},
				500,
			),
		);
	}
});

app.notFound((c) =>
	withNoStore(
		c.json(
			{
				error: "Not found",
			},
			404,
		),
	),
);

app.onError((error, c) => {
	console.error(
		JSON.stringify({
			level: "error",
			message: "cinaauth.request.failed",
			path: new URL(c.req.url).pathname,
			method: c.req.method,
			error: errorMessage(error),
			version: getVersionMetadata(c.env),
		}),
	);
	return withNoStore(
		c.json(
			{
				error: "Internal server error",
			},
			500,
		),
	);
});

const RETENTION_AUDIT_LOG_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

// Scheduled retention: D1 has no TTL and a 10GB hard cap, and neither the audit
// log nor abandoned sessions are pruned on the request path. Driven by the cron
// trigger in wrangler.json. Uses the framework adapter so date serialization
// matches how the rows were written.
const runRetention = async (env: CloudflareBindings) => {
	if (!isD1Database(env.DB)) {
		return;
	}
	const context = await createAuth(env).$context;
	const now = Date.now();
	const expiredSessions = await context.adapter.deleteMany({
		model: "session",
		where: [{ field: "expiresAt", value: new Date(now), operator: "lt" }],
	});
	const staleAuditLogs = await context.adapter.deleteMany({
		model: "auditLog",
		where: [
			{
				field: "timestamp",
				value: new Date(now - RETENTION_AUDIT_LOG_DAYS * DAY_MS),
				operator: "lt",
			},
		],
	});
	console.info(
		JSON.stringify({
			level: "info",
			message: "cinaauth.retention.swept",
			expiredSessions,
			staleAuditLogs,
			version: getVersionMetadata(env),
		}),
	);
};

export default {
	fetch: (request, env, ctx) => app.fetch(request, env, ctx),
	queue: handleDeliveryBatch,
	scheduled: (_event, env, ctx) => {
		ctx.waitUntil(
			runRetention(env).catch((error) => {
				console.error(
					JSON.stringify({
						level: "error",
						message: "cinaauth.retention.failed",
						error: errorMessage(error),
						version: getVersionMetadata(env),
					}),
				);
			}),
		);
	},
} satisfies ExportedHandler<CloudflareBindings, DeliveryMessage>;
