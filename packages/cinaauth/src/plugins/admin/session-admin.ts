import { createAuthEndpoint } from "@cinaauth/core/api";
import type { CleanedWhere } from "@cinaauth/core/db/adapter";
import { APIError } from "@cinaauth/core/error";
import * as z from "zod";
import { ADMIN_ERROR_CODES } from "./error-codes";
import { hasPermission } from "./has-permission";
import { adminMiddleware } from "./routes";
import type { AdminOptions } from "./types";

const listAllSessionsQuerySchema = z.object({
	limit: z.union([z.string(), z.number()]).optional(),
	offset: z.union([z.string(), z.number()]).optional(),
	userId: z.string().min(1).optional(),
	activeOnly: z.enum(["true", "false"]).optional().default("true"),
});

const revokeUserSessionByIdBodySchema = z.object({
	sessionId: z.string().min(1),
});

const eq = (field: string, value: string): CleanedWhere => ({
	field,
	operator: "eq",
	value,
	connector: "AND",
	mode: "sensitive",
});

const gte = (field: string, value: Date): CleanedWhere => ({
	field,
	operator: "gte",
	value,
	connector: "AND",
	mode: "sensitive",
});

function requireSessionPermission(
	opts: AdminOptions,
	ctx: { context: { session: { user: { id: string; role?: string } } } },
	permission: "list" | "revoke",
): void {
	const allowed = hasPermission({
		userId: ctx.context.session.user.id,
		role: ctx.context.session.user.role,
		options: opts,
		permissions: { session: [permission] },
	});
	if (allowed) return;

	throw APIError.from(
		"FORBIDDEN",
		permission === "list"
			? ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS
			: ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS,
	);
}

/**
 * ### Endpoint
 *
 * GET `/admin/list-all-sessions`
 *
 * Returns a paginated platform-wide session inventory without exposing
 * bearer session tokens. Requires the admin `session:list` permission.
 *
 * **server:** `auth.api.listAllSessions`
 *
 * **client:** `authClient.admin.listAllSessions`
 */
export const listAllSessions = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/list-all-sessions",
		{
			method: "GET",
			use: [adminMiddleware],
			query: listAllSessionsQuerySchema,
			metadata: {
				openapi: {
					operationId: "adminListAllSessions",
					summary: "List all sessions",
					description:
						"List platform sessions without returning bearer session tokens",
				},
			},
		},
		async (ctx) => {
			requireSessionPermission(opts, ctx, "list");
			const requestedLimit = Number(ctx.query?.limit ?? 50);
			const requestedOffset = Number(ctx.query?.offset ?? 0);
			const limit = Number.isFinite(requestedLimit)
				? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)
				: 50;
			const offset = Number.isFinite(requestedOffset)
				? Math.max(Math.trunc(requestedOffset), 0)
				: 0;
			const where: CleanedWhere[] = [];
			if (ctx.query?.userId) where.push(eq("userId", ctx.query.userId));
			if (ctx.query?.activeOnly !== "false") {
				where.push(gte("expiresAt", new Date()));
			}

			const [sessions, total] = await Promise.all([
				ctx.context.adapter.findMany<{
					id: string;
					userId: string;
					createdAt: Date | string;
					expiresAt: Date | string;
					ipAddress?: string | null;
					userAgent?: string | null;
					impersonatedBy?: string | null;
				}>({
					model: "session",
					limit,
					offset,
					select: [
						"id",
						"userId",
						"createdAt",
						"expiresAt",
						"ipAddress",
						"userAgent",
						"impersonatedBy",
					],
					sortBy: { field: "createdAt", direction: "desc" },
					where: where.length > 0 ? where : undefined,
				}),
				ctx.context.adapter.count({
					model: "session",
					where: where.length > 0 ? where : undefined,
				}),
			]);

			return ctx.json({
				sessions: sessions.map((session) => ({
					id: session.id,
					userId: session.userId,
					createdAt: session.createdAt,
					expiresAt: session.expiresAt,
					ipAddress: session.ipAddress ?? null,
					userAgent: session.userAgent ?? null,
					impersonatedBy: session.impersonatedBy ?? null,
				})),
				total,
				limit,
				offset,
			});
		},
	);

/**
 * ### Endpoint
 *
 * POST `/admin/revoke-user-session-by-id`
 *
 * Revokes one session by its non-secret database id. The bearer token is
 * resolved and consumed only on the server. Requires `session:revoke`.
 *
 * **server:** `auth.api.revokeUserSessionById`
 *
 * **client:** `authClient.admin.revokeUserSessionById`
 */
export const revokeUserSessionById = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/revoke-user-session-by-id",
		{
			method: "POST",
			use: [adminMiddleware],
			body: revokeUserSessionByIdBodySchema,
			metadata: {
				openapi: {
					operationId: "adminRevokeUserSessionById",
					summary: "Revoke one session by id",
				},
			},
		},
		async (ctx) => {
			requireSessionPermission(opts, ctx, "revoke");
			const session = await ctx.context.adapter.findOne<{ token: string }>({
				model: "session",
				where: [eq("id", ctx.body.sessionId)],
				select: ["token"],
			});
			if (session) {
				await ctx.context.internalAdapter.deleteSession(session.token);
			}
			return ctx.json({ success: true });
		},
	);
