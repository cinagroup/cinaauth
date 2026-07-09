import { createAuthEndpoint } from "@cinaauth/core/api";
import type { CleanedWhere } from "@cinaauth/core/db/adapter";
import { APIError } from "@cinaauth/core/error";
import * as z from "zod";
import { getSessionFromCtx } from "../../api";
import { auditSessionMiddleware, writeAuditLog } from "./capture";
import { AUDIT_LOG_ERROR_CODES } from "./error-codes";
import type { AuditLogPluginOptions } from "./types";

type ResolvedOptions = Required<
	Pick<AuditLogPluginOptions, "allowedRoles" | "writeTokens">
> &
	Pick<AuditLogPluginOptions, "schema">;

/**
 * Build a fully-populated CleanedWhere clause. `CleanedWhere = Required<Where>`,
 * so connector/mode must be present even though they default at runtime.
 */
function where(
	field: string,
	operator: CleanedWhere["operator"],
	value: CleanedWhere["value"],
): CleanedWhere {
	return { field, operator, value, connector: "AND", mode: "sensitive" };
}

/**
 * Shared filter shape for both /audit/list and /audit/export. `start`/`end`
 * are ISO timestamps; the rest are exact-match filters.
 */
interface AuditFilters {
	start?: string | undefined;
	end?: string | undefined;
	category?: string | undefined;
	action?: string | undefined;
	actorId?: string | undefined;
	actorIp?: string | undefined;
	result?: "success" | "failure" | undefined;
	targetId?: string | undefined;
}

/**
 * Build the CleanedWhere[] for an audit query from the shared filter shape.
 * Empty/undefined values are skipped so they never over-constrain.
 */
function buildAuditWhere(f: AuditFilters): CleanedWhere[] {
	const conditions: CleanedWhere[] = [];
	if (f.start) conditions.push(where("timestamp", "gte", new Date(f.start)));
	if (f.end) conditions.push(where("timestamp", "lte", new Date(f.end)));
	const pushWhere = (field: string, value: string | undefined): void => {
		if (value !== undefined && value !== "") {
			conditions.push(where(field, "eq", value));
		}
	};
	pushWhere("category", f.category);
	pushWhere("action", f.action);
	pushWhere("actorId", f.actorId);
	pushWhere("actorIp", f.actorIp);
	pushWhere("result", f.result);
	pushWhere("targetId", f.targetId);
	return conditions;
}

const listAuditQuerySchema = z.object({
	limit: z.union([z.string(), z.number()]).optional(),
	offset: z.union([z.string(), z.number()]).optional(),
	start: z
		.string()
		.meta({ description: "ISO timestamp; rows with timestamp >= start" })
		.optional(),
	end: z
		.string()
		.meta({ description: "ISO timestamp; rows with timestamp <= end" })
		.optional(),
	category: z.string().optional(),
	action: z.string().optional(),
	actorId: z.string().optional(),
	actorIp: z.string().optional(),
	result: z.enum(["success", "failure"]).optional(),
	targetId: z.string().optional(),
	sortBy: z.string().optional().default("timestamp"),
	sortDirection: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * ### Endpoint
 *
 * GET `/audit/list`
 *
 * Paginated, filtered audit log query. Requires a session whose role is on the
 * plugin's `allowedRoles` whitelist.
 *
 * **server:** `auth.api.listAudit`
 */
export const listAudit = (opts: ResolvedOptions) =>
	createAuthEndpoint(
		"/audit/list",
		{
			method: "GET",
			use: [auditSessionMiddleware],
			query: listAuditQuerySchema,
		},
		async (ctx) => {
			if (!opts.allowedRoles.includes(ctx.context.session.user.role ?? "")) {
				throw APIError.from(
					"FORBIDDEN",
					AUDIT_LOG_ERROR_CODES.AUDIT_LOG_QUERY_NOT_ALLOWED,
				);
			}
			const q = ctx.query ?? {};
			const conditions = buildAuditWhere(q);

			const limit = Number(q.limit) || 50;
			const offset = Number(q.offset) || 0;
			const rows = await ctx.context.adapter.findMany<{
				id: string;
				timestamp: Date | string;
				category: string;
				action: string;
				result: string;
				actorId: string | null;
				actorRole: string | null;
				actorIp: string | null;
				actorUa: string | null;
				actorSite: string | null;
				targetType: string | null;
				targetId: string | null;
				metadata: string | null;
			}>({
				model: "auditLog",
				limit,
				offset,
				sortBy: {
					field: q.sortBy ?? "timestamp",
					direction: q.sortDirection ?? "desc",
				},
				where: conditions.length ? conditions : undefined,
			});
			const total = await ctx.context.adapter.count({
				model: "auditLog",
				where: conditions.length ? conditions : undefined,
			});
			return ctx.json({ rows, total, limit, offset });
		},
	);

const logAuditBodySchema = z.object({
	category: z.string(),
	action: z.string(),
	result: z.enum(["success", "failure"]),
	actorSite: z.string().optional(),
	targetType: z.string().optional(),
	targetId: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * ### Endpoint
 *
 * POST `/audit/log`
 *
 * Explicit audit write, used by the admin console proxy for console-only
 * actions (e.g. CSV export) that have no corresponding cinaauth endpoint.
 *
 * Auth: a bearer token listed in `writeTokens` OR a session whose role is on
 * `allowedRoles`. The actor (id/role/IP/UA) is recorded from the request.
 *
 * **server:** `auth.api.logAudit`
 */
export const logAudit = (opts: ResolvedOptions) =>
	createAuthEndpoint(
		"/audit/log",
		{
			method: "POST",
			body: logAuditBodySchema,
		},
		async (ctx) => {
			// Headers arrive via `ctx.request.headers` (HTTP) or `ctx.headers`
			// (server-side `auth.api.X({headers})` calls). Mirror the bearer
			// plugin's dual-access pattern.
			const authHeader =
				ctx.request?.headers?.get("authorization") ||
				ctx.headers?.get("authorization") ||
				"";
			const token = authHeader.startsWith("Bearer ")
				? authHeader.slice(7)
				: null;
			const hasWriteToken = !!token && opts.writeTokens.includes(token);
			let actorId: string | null = null;
			let actorRole: string | null = null;
			if (!hasWriteToken) {
				// Fall back to session + role check.
				const session = await getSessionFromCtx(ctx);
				const role = session?.user?.role ?? null;
				if (!role || !opts.allowedRoles.includes(role)) {
					throw APIError.from(
						"FORBIDDEN",
						AUDIT_LOG_ERROR_CODES.AUDIT_LOG_WRITE_NOT_ALLOWED,
					);
				}
				actorId = session?.user?.id ?? null;
				actorRole = role;
			}
			const headers = ctx.request?.headers ?? ctx.headers;
			await writeAuditLog(ctx, {
				category: ctx.body.category,
				action: ctx.body.action,
				result: ctx.body.result,
				actorId,
				actorRole,
				actorIp:
					headers?.get("cf-connecting-ip") ??
					headers?.get("x-forwarded-for") ??
					null,
				actorUa: headers?.get("user-agent") ?? null,
				actorSite: ctx.body.actorSite ?? null,
				targetType: ctx.body.targetType ?? null,
				targetId: ctx.body.targetId ?? null,
				metadata: ctx.body.metadata ?? null,
			});
			return ctx.json({ ok: true });
		},
	);

const exportAuditQuerySchema = z.object({
	start: z.string().optional(),
	end: z.string().optional(),
	category: z.string().optional(),
	action: z.string().optional(),
	actorId: z.string().optional(),
	actorIp: z.string().optional(),
	result: z.enum(["success", "failure"]).optional(),
	targetId: z.string().optional(),
});

/** RFC 4180 CSV field escaping. */
function csvEscape(value: unknown): string {
	const s = value == null ? "" : String(value);
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * ### Endpoint
 *
 * GET `/audit/export`
 *
 * Stream the filtered audit log as CSV (attachment). Same filters as
 * `/audit/list` minus pagination. Requires an `allowedRoles` session.
 *
 * **server:** `auth.api.exportAudit`
 */
export const exportAudit = (opts: ResolvedOptions) =>
	createAuthEndpoint(
		"/audit/export",
		{
			method: "GET",
			use: [auditSessionMiddleware],
			query: exportAuditQuerySchema,
		},
		async (ctx) => {
			if (!opts.allowedRoles.includes(ctx.context.session.user.role ?? "")) {
				throw APIError.from(
					"FORBIDDEN",
					AUDIT_LOG_ERROR_CODES.AUDIT_LOG_QUERY_NOT_ALLOWED,
				);
			}
			const conditions = buildAuditWhere(ctx.query ?? {});
			const rows = await ctx.context.adapter.findMany<{
				id: string;
				timestamp: Date | string;
				category: string;
				action: string;
				result: string;
				actorId: string | null;
				actorRole: string | null;
				actorIp: string | null;
				actorUa: string | null;
				actorSite: string | null;
				targetType: string | null;
				targetId: string | null;
				metadata: string | null;
			}>({
				model: "auditLog",
				limit: 100000,
				sortBy: { field: "timestamp", direction: "desc" },
				where: conditions.length ? conditions : undefined,
			});
			const header = [
				"id",
				"timestamp",
				"category",
				"action",
				"result",
				"actorId",
				"actorRole",
				"actorIp",
				"actorUa",
				"actorSite",
				"targetType",
				"targetId",
				"metadata",
			];
			const lines = [header.join(",")];
			for (const r of rows) {
				lines.push(
					[
						r.id,
						r.timestamp instanceof Date
							? r.timestamp.toISOString()
							: r.timestamp,
						r.category,
						r.action,
						r.result,
						r.actorId,
						r.actorRole,
						r.actorIp,
						r.actorUa,
						r.actorSite,
						r.targetType,
						r.targetId,
						r.metadata,
					]
						.map(csvEscape)
						.join(","),
				);
			}
			const csv = lines.join("\n");
			return new Response(csv, {
				headers: {
					"content-type": "text/csv; charset=utf-8",
					"content-disposition": `attachment; filename="audit-${Date.now()}.csv"`,
				},
			});
		},
	);

const alertsQuerySchema = z.object({
	windowHours: z.union([z.string(), z.number()]).optional().default(24),
	failThreshold: z.union([z.string(), z.number()]).optional().default(10),
});

/**
 * ### Endpoint
 *
 * GET `/audit/alerts`
 *
 * Risk aggregation: actors (by actorId, falling back to actorIp, then
 * "anonymous") whose failure count within `windowHours` meets `failThreshold`.
 * Requires an `allowedRoles` session.
 *
 * **server:** `auth.api.auditAlerts`
 */
export const auditAlerts = (opts: ResolvedOptions) =>
	createAuthEndpoint(
		"/audit/alerts",
		{
			method: "GET",
			use: [auditSessionMiddleware],
			query: alertsQuerySchema,
		},
		async (ctx) => {
			if (!opts.allowedRoles.includes(ctx.context.session.user.role ?? "")) {
				throw APIError.from(
					"FORBIDDEN",
					AUDIT_LOG_ERROR_CODES.AUDIT_LOG_QUERY_NOT_ALLOWED,
				);
			}
			const windowHoursRaw = Number(ctx.query?.windowHours ?? 24);
			const failThresholdRaw = Number(ctx.query?.failThreshold ?? 10);
			// Guard against non-numeric input producing NaN/Invalid Date.
			const windowHours = Number.isFinite(windowHoursRaw)
				? Math.max(1, windowHoursRaw)
				: 24;
			const failThreshold = Number.isFinite(failThresholdRaw)
				? Math.max(1, failThresholdRaw)
				: 10;
			const since = new Date(Date.now() - windowHours * 3_600_000);
			const fails = await ctx.context.adapter.findMany<{
				actorId: string | null;
				actorIp: string | null;
			}>({
				model: "auditLog",
				limit: 100000,
				where: [
					where("result", "eq", "failure"),
					where("timestamp", "gte", since),
				],
			});
			const counts = new Map<string, number>();
			for (const f of fails) {
				const key = f.actorId || f.actorIp || "anonymous";
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
			const flagged = [...counts.entries()]
				.filter(([, count]) => count >= failThreshold)
				.map(([actor, count]) => ({ actor, failures: count }));
			return ctx.json({ windowHours, failThreshold, flagged });
		},
	);
