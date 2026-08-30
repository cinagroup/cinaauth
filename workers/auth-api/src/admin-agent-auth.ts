import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import type { PoolClient, QueryResultRow } from "pg";
import { AGENT_AUTH_ADMIN_POLICY } from "./agent-auth-policy";
import { SECURITY_FRESH_AGE_SECONDS } from "./auth";
import type { CinaAuthDatabase } from "./database";

export type AdminAgentAuthSession = {
	user: { id: string; role: string | null | undefined };
	session: {
		createdAt: Date | string;
		impersonatedBy: string | null | undefined;
	};
};

export type AdminAgentAuthAuditEvent = {
	action: string;
	phase: "intent" | "outcome";
	result: "success" | "failure";
	actorId: string;
	metadata: Record<string, unknown>;
};

export type AdminAgentAuthDependencies = {
	database: CinaAuthDatabase;
	getSession: () => Promise<AdminAgentAuthSession | null>;
	consumeRateLimit?: (
		key: string,
		rule: { window: number; max: number },
	) => Promise<{ allowed: boolean; retryAfter: number | null }>;
	writeAuditEvent: (event: AdminAgentAuthAuditEvent) => Promise<void>;
	logEvent: (event: {
		level: "warn" | "error";
		message: string;
		code?: string;
		actorId?: string;
	}) => void;
};

export type AdminAgentAuthResource = "agent" | "host" | "grant" | "approval";

export type AdminAgentAuthMutation = {
	resource: AdminAgentAuthResource;
	id: string;
};

export type AdminAgentAuthStatus = 200 | 400 | 401 | 403 | 404 | 429 | 503;

export type AdminAgentAuthResult = {
	status: AdminAgentAuthStatus;
	body: unknown;
	retryAfter?: number;
};

type SummaryRow = QueryResultRow & {
	agentCount: number;
	activeAgentCount: number;
	hostCount: number;
	activeHostCount: number;
	grantCount: number;
	pendingApprovalCount: number;
};

type ApprovalRow = QueryResultRow & {
	capabilities: unknown;
	[key: string]: unknown;
};

const MAX_INVENTORY_LIMIT = 100;
const DEFAULT_INVENTORY_LIMIT = 50;
const RESOURCE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MUTATION_RATE_LIMIT = { window: 300, max: 20 } as const;

const success = (data: unknown): AdminAgentAuthResult => ({
	status: 200,
	body: { ok: true, data },
});

const failure = (
	status: Exclude<AdminAgentAuthStatus, 200>,
	code: string,
	message: string,
): AdminAgentAuthResult => ({
	status,
	body: { ok: false, error: { code, message, status } },
});

const normalizeLimit = (limit: number | undefined) =>
	Number.isSafeInteger(limit) && (limit ?? 0) > 0
		? Math.min(limit ?? DEFAULT_INVENTORY_LIMIT, MAX_INVENTORY_LIMIT)
		: DEFAULT_INVENTORY_LIMIT;

const isFreshSession = (createdAt: Date | string, now = Date.now()) => {
	const createdAtMs = new Date(createdAt).getTime();
	return (
		Number.isFinite(createdAtMs) &&
		now - createdAtMs >= 0 &&
		now - createdAtMs < SECURITY_FRESH_AGE_SECONDS * 1000
	);
};

const parseCapabilityList = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === "string");
	}
	if (typeof value !== "string" || value.length === 0) return [];
	try {
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed)
			? parsed.filter((item): item is string => typeof item === "string")
			: [];
	} catch {
		return [];
	}
};

const getReadSession = async (
	dependencies: Pick<AdminAgentAuthDependencies, "getSession">,
): Promise<AdminAgentAuthSession | AdminAgentAuthResult> => {
	const session = await dependencies.getSession();
	if (!session) return failure(401, "UNAUTHORIZED", "Authentication required");
	if (
		!hasAdminControlPermission(session.user.role, "integration.agent-auth.read")
	) {
		return failure(403, "FORBIDDEN", "Permission denied");
	}
	return session;
};

const getMutationSession = async (
	dependencies: AdminAgentAuthDependencies,
	origin: string | null,
	allowedOrigin: string,
): Promise<AdminAgentAuthSession | AdminAgentAuthResult> => {
	const session = await dependencies.getSession();
	if (!session) return failure(401, "UNAUTHORIZED", "Authentication required");
	if (
		!hasAdminControlPermission(
			session.user.role,
			"integration.agent-auth.manage",
		)
	) {
		return failure(403, "FORBIDDEN", "Permission denied");
	}
	if (session.session.impersonatedBy) {
		return failure(
			403,
			"IMPERSONATION_NOT_ALLOWED",
			"Agent Auth changes are unavailable while impersonating",
		);
	}
	if (origin !== allowedOrigin) {
		return failure(403, "INVALID_ORIGIN", "Invalid request origin");
	}
	if (!isFreshSession(session.session.createdAt)) {
		return failure(403, "SESSION_NOT_FRESH", "Recent authentication required");
	}
	if (!dependencies.consumeRateLimit) {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_agent_auth.rejected",
			code: "RATE_LIMIT_UNAVAILABLE",
			actorId: session.user.id,
		});
		return failure(
			503,
			"RATE_LIMIT_UNAVAILABLE",
			"Rate limiter is unavailable",
		);
	}
	const rateLimit = await dependencies.consumeRateLimit(
		`admin-agent-auth:${session.user.id}`,
		MUTATION_RATE_LIMIT,
	);
	if (!rateLimit.allowed) {
		return {
			...failure(429, "RATE_LIMITED", "Too many Agent Auth changes"),
			retryAfter: rateLimit.retryAfter ?? undefined,
		};
	}
	return session;
};

const writeAudit = async (
	dependencies: AdminAgentAuthDependencies,
	event: AdminAgentAuthAuditEvent,
) => {
	try {
		await dependencies.writeAuditEvent(event);
	} catch {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_agent_auth.audit_failed",
			actorId: event.actorId,
		});
	}
};

/** Return the public-safe Agent Auth policy and recent operational inventory. */
export const handleAdminGetAgentAuth = async (
	dependencies: Pick<
		AdminAgentAuthDependencies,
		"database" | "getSession" | "logEvent"
	>,
	requestedLimit?: number,
): Promise<AdminAgentAuthResult> => {
	const session = await getReadSession(dependencies);
	if ("status" in session) return session;
	const limit = normalizeLimit(requestedLimit);
	try {
		const [
			summaryResult,
			agentsResult,
			hostsResult,
			grantsResult,
			approvalsResult,
		] = await Promise.all([
			dependencies.database.query<SummaryRow>(
				`SELECT
						(SELECT COUNT(*)::int FROM "agent") AS "agentCount",
						(SELECT COUNT(*)::int FROM "agent" WHERE "status" = 'active') AS "activeAgentCount",
						(SELECT COUNT(*)::int FROM "agentHost") AS "hostCount",
						(SELECT COUNT(*)::int FROM "agentHost" WHERE "status" = 'active') AS "activeHostCount",
						(SELECT COUNT(*)::int FROM "agentCapabilityGrant" WHERE "status" = 'active') AS "grantCount",
						(SELECT COUNT(*)::int FROM "approvalRequest" WHERE "status" = 'pending' AND "expiresAt" > CURRENT_TIMESTAMP) AS "pendingApprovalCount"`,
			),
			dependencies.database.query(
				`SELECT
						"agent"."id", "agent"."name", "agent"."userId" AS "userId",
						"user"."name" AS "ownerName", "user"."email" AS "ownerEmail",
						"agent"."hostId" AS "hostId", "host"."name" AS "hostName",
						"agent"."status", "agent"."mode",
						"agent"."lastUsedAt" AS "lastUsedAt",
						"agent"."activatedAt" AS "activatedAt",
						"agent"."expiresAt" AS "expiresAt",
						"agent"."createdAt" AS "createdAt",
						"agent"."updatedAt" AS "updatedAt",
						(SELECT COUNT(*)::int FROM "agentCapabilityGrant" AS "grant" WHERE "grant"."agentId" = "agent"."id" AND "grant"."status" = 'active') AS "grantCount",
						(SELECT COUNT(*)::int FROM "approvalRequest" AS "approval" WHERE "approval"."agentId" = "agent"."id" AND "approval"."status" = 'pending' AND "approval"."expiresAt" > CURRENT_TIMESTAMP) AS "pendingApprovalCount"
					 FROM "agent" AS "agent"
					 LEFT JOIN "user" AS "user" ON "user"."id" = "agent"."userId"
					 LEFT JOIN "agentHost" AS "host" ON "host"."id" = "agent"."hostId"
					 ORDER BY "agent"."createdAt" DESC
					 LIMIT $1`,
				[limit],
			),
			dependencies.database.query(
				`SELECT
						"host"."id", "host"."name", "host"."userId" AS "userId",
						"user"."name" AS "ownerName", "user"."email" AS "ownerEmail",
						"host"."status", "host"."lastUsedAt" AS "lastUsedAt",
						"host"."activatedAt" AS "activatedAt",
						"host"."expiresAt" AS "expiresAt",
						"host"."createdAt" AS "createdAt",
						"host"."updatedAt" AS "updatedAt",
						(SELECT COUNT(*)::int FROM "agent" WHERE "agent"."hostId" = "host"."id") AS "agentCount"
					 FROM "agentHost" AS "host"
					 LEFT JOIN "user" AS "user" ON "user"."id" = "host"."userId"
					 ORDER BY "host"."createdAt" DESC
					 LIMIT $1`,
				[limit],
			),
			dependencies.database.query(
				`SELECT
						"grant"."id", "grant"."agentId" AS "agentId",
						"agent"."name" AS "agentName", "grant"."capability",
						"grant"."status", "grant"."grantedBy" AS "grantedBy",
						"grant"."deniedBy" AS "deniedBy", "grant"."reason",
						"grant"."expiresAt" AS "expiresAt",
						"grant"."createdAt" AS "createdAt",
						"grant"."updatedAt" AS "updatedAt"
					 FROM "agentCapabilityGrant" AS "grant"
					 LEFT JOIN "agent" AS "agent" ON "agent"."id" = "grant"."agentId"
					 ORDER BY "grant"."createdAt" DESC
					 LIMIT $1`,
				[limit],
			),
			dependencies.database.query<ApprovalRow>(
				`SELECT
						"approval"."id", "approval"."agentId" AS "agentId",
						"agent"."name" AS "agentName", "approval"."hostId" AS "hostId",
						"host"."name" AS "hostName", "approval"."userId" AS "userId",
						"user"."name" AS "ownerName", "user"."email" AS "ownerEmail",
						"approval"."method", "approval"."status", "approval"."capabilities",
						"approval"."expiresAt" AS "expiresAt",
						"approval"."createdAt" AS "createdAt",
						"approval"."updatedAt" AS "updatedAt"
					 FROM "approvalRequest" AS "approval"
					 LEFT JOIN "agent" AS "agent" ON "agent"."id" = "approval"."agentId"
					 LEFT JOIN "agentHost" AS "host" ON "host"."id" = "approval"."hostId"
					 LEFT JOIN "user" AS "user" ON "user"."id" = "approval"."userId"
					 WHERE "approval"."status" = 'pending' AND "approval"."expiresAt" > CURRENT_TIMESTAMP
					 ORDER BY "approval"."createdAt" DESC
					 LIMIT $1`,
				[limit],
			),
		]);
		const summary = summaryResult.rows[0] ?? {
			agentCount: 0,
			activeAgentCount: 0,
			hostCount: 0,
			activeHostCount: 0,
			grantCount: 0,
			pendingApprovalCount: 0,
		};
		return success({
			policy: AGENT_AUTH_ADMIN_POLICY,
			summary,
			agents: agentsResult.rows,
			hosts: hostsResult.rows,
			grants: grantsResult.rows,
			approvals: approvalsResult.rows.map(({ capabilities, ...approval }) => ({
				...approval,
				capabilities: parseCapabilityList(capabilities),
			})),
			limit,
		});
	} catch {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_agent_auth.read_failed",
			actorId: session.user.id,
		});
		return failure(
			503,
			"AGENT_AUTH_INVENTORY_UNAVAILABLE",
			"Agent Auth inventory is unavailable",
		);
	}
};

const mutateAgent = async (client: PoolClient, id: string) => {
	const target = await client.query<{ id: string }>(
		`UPDATE "agent" SET "status" = 'revoked', "updatedAt" = CURRENT_TIMESTAMP
		 WHERE "id" = $1 AND "status" IN ('active', 'pending', 'claimed')
		 RETURNING "id"`,
		[id],
	);
	if (!target.rows[0]) return false;
	await client.query(
		`UPDATE "agentCapabilityGrant"
		 SET "status" = 'revoked', "reason" = 'admin_revoked', "updatedAt" = CURRENT_TIMESTAMP
		 WHERE "agentId" = $1 AND "status" IN ('active', 'pending')`,
		[id],
	);
	await client.query(
		`UPDATE "approvalRequest" SET "status" = 'denied', "updatedAt" = CURRENT_TIMESTAMP
		 WHERE "agentId" = $1 AND "status" = 'pending'`,
		[id],
	);
	return true;
};

const mutateHost = async (client: PoolClient, id: string) => {
	const target = await client.query<{ id: string }>(
		`UPDATE "agentHost" SET "status" = 'revoked', "updatedAt" = CURRENT_TIMESTAMP
		 WHERE "id" = $1 AND "status" IN ('active', 'pending', 'pending_enrollment')
		 RETURNING "id"`,
		[id],
	);
	if (!target.rows[0]) return false;
	await client.query(
		`UPDATE "agentCapabilityGrant"
		 SET "status" = 'revoked', "reason" = 'admin_host_revoked', "updatedAt" = CURRENT_TIMESTAMP
		 WHERE "agentId" IN (SELECT "id" FROM "agent" WHERE "hostId" = $1)
			AND "status" IN ('active', 'pending')`,
		[id],
	);
	await client.query(
		`UPDATE "approvalRequest" SET "status" = 'denied', "updatedAt" = CURRENT_TIMESTAMP
		 WHERE ("hostId" = $1 OR "agentId" IN (SELECT "id" FROM "agent" WHERE "hostId" = $1))
			AND "status" = 'pending'`,
		[id],
	);
	await client.query(
		`UPDATE "agent" SET "status" = 'revoked', "updatedAt" = CURRENT_TIMESTAMP
		 WHERE "hostId" = $1 AND "status" <> 'revoked'`,
		[id],
	);
	return true;
};

const mutateGrant = async (client: PoolClient, id: string) => {
	const target = await client.query<{ id: string }>(
		`UPDATE "agentCapabilityGrant"
		 SET "status" = 'revoked', "reason" = 'admin_revoked', "updatedAt" = CURRENT_TIMESTAMP
		 WHERE "id" = $1 AND "status" IN ('active', 'pending')
		 RETURNING "id"`,
		[id],
	);
	return Boolean(target.rows[0]);
};

const mutateApproval = async (client: PoolClient, id: string) => {
	const target = await client.query<{ id: string }>(
		`UPDATE "approvalRequest" SET "status" = 'denied', "updatedAt" = CURRENT_TIMESTAMP
		 WHERE "id" = $1 AND "status" = 'pending' RETURNING "id"`,
		[id],
	);
	return Boolean(target.rows[0]);
};

const runMutation = (
	client: PoolClient,
	mutation: AdminAgentAuthMutation,
): Promise<boolean> => {
	switch (mutation.resource) {
		case "agent":
			return mutateAgent(client, mutation.id);
		case "host":
			return mutateHost(client, mutation.id);
		case "grant":
			return mutateGrant(client, mutation.id);
		case "approval":
			return mutateApproval(client, mutation.id);
	}
};

/** Revoke an Agent Auth resource, or deny a pending approval request. */
export const handleAdminAgentAuthMutation = async (
	dependencies: AdminAgentAuthDependencies,
	origin: string | null,
	allowedOrigin: string,
	mutation: AdminAgentAuthMutation,
): Promise<AdminAgentAuthResult> => {
	const session = await getMutationSession(dependencies, origin, allowedOrigin);
	if ("status" in session) return session;
	if (!RESOURCE_ID_PATTERN.test(mutation.id)) {
		return failure(
			400,
			"INVALID_AGENT_AUTH_ID",
			"Invalid Agent Auth resource ID",
		);
	}
	const action = mutation.resource === "approval" ? "deny" : "revoke";
	const auditEvent = {
		action: `integration.agent-auth.${mutation.resource}.${action}`,
		actorId: session.user.id,
		metadata: { resource: mutation.resource, targetId: mutation.id },
	} as const;
	await writeAudit(dependencies, {
		...auditEvent,
		phase: "intent",
		result: "success",
	});

	let client: PoolClient | null = null;
	try {
		client = await dependencies.database.connect();
		await client.query("BEGIN");
		const found = await runMutation(client, mutation);
		if (!found) {
			await client.query("ROLLBACK");
			await writeAudit(dependencies, {
				...auditEvent,
				phase: "outcome",
				result: "failure",
			});
			return failure(
				404,
				"AGENT_AUTH_RESOURCE_NOT_FOUND",
				"Agent Auth resource was not found or is no longer actionable",
			);
		}
		await client.query("COMMIT");
		await writeAudit(dependencies, {
			...auditEvent,
			phase: "outcome",
			result: "success",
		});
		return success({
			resource: mutation.resource,
			id: mutation.id,
			status: mutation.resource === "approval" ? "denied" : "revoked",
		});
	} catch {
		if (client) await client.query("ROLLBACK").catch(() => undefined);
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_agent_auth.mutation_failed",
			actorId: session.user.id,
		});
		await writeAudit(dependencies, {
			...auditEvent,
			phase: "outcome",
			result: "failure",
		});
		return failure(
			503,
			"AGENT_AUTH_MUTATION_FAILED",
			"Agent Auth change could not be completed",
		);
	} finally {
		client?.release();
	}
};
