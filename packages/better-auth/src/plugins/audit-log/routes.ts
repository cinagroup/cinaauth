import { createAuthEndpoint } from "@cinaauth/core/api";
import type { CleanedWhere } from "@cinaauth/core/db/adapter";
import * as z from "zod";
import { APIError } from "@cinaauth/core/error";
import { getSessionFromCtx } from "../../api";
import { AUDIT_LOG_ERROR_CODES } from "./error-codes";
import type { AuditLogPluginOptions } from "./types";
import { auditSessionMiddleware, writeAuditLog } from "./capture";

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
			const conditions: CleanedWhere[] = [];
			if (q.start) {
				conditions.push(where("timestamp", "gte", new Date(q.start)));
			}
			if (q.end) {
				conditions.push(where("timestamp", "lte", new Date(q.end)));
			}
			const pushWhere = (
				field: string,
				value: string | undefined,
			): void => {
				if (value !== undefined && value !== "") {
					conditions.push(where(field, "eq", value));
				}
			};
			pushWhere("category", q.category);
			pushWhere("action", q.action);
			pushWhere("actorId", q.actorId);
			pushWhere("actorIp", q.actorIp);
			pushWhere("result", q.result);
			pushWhere("targetId", q.targetId);

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
