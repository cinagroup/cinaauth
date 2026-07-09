import { createAuthEndpoint } from "@cinaauth/core/api";
import type { CleanedWhere } from "@cinaauth/core/db/adapter";
import { APIError } from "@cinaauth/core/error";
import * as z from "zod";
import { ADMIN_ERROR_CODES } from "./error-codes";
import { hasPermission } from "./has-permission";
import { adminMiddleware } from "./routes";
import type { AdminOptions } from "./types";

/** Build a fully-populated CleanedWhere eq clause. */
function eq(field: string, value: string | number | boolean): CleanedWhere {
	return { field, operator: "eq", value, connector: "AND", mode: "sensitive" };
}

/** Build a fully-populated CleanedWhere gte clause. */
function gte(field: string, value: Date): CleanedWhere {
	return { field, operator: "gte", value, connector: "AND", mode: "sensitive" };
}

/** Throw FORBIDDEN if the session role lacks stats:read. */
function requireStatsRead(
	opts: AdminOptions,
	ctx: { context: { session: { user: { id: string; role?: string } } } },
): void {
	const ok = hasPermission({
		userId: ctx.context.session.user.id,
		role: ctx.context.session.user.role,
		options: opts,
		permissions: { stats: ["read"] },
	});
	if (!ok) {
		throw APIError.from(
			"FORBIDDEN",
			ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_LIST_USERS,
		);
	}
}

/** Count rows in a model, returning 0 if the model's table is absent (the
 *  owning plugin — e.g. organization — may not be installed). */
async function safeCount(
	adapter: {
		count: (args: { model: string; where?: CleanedWhere[] }) => Promise<number>;
	},
	model: string,
	where?: CleanedWhere[],
): Promise<number> {
	try {
		return await adapter.count({ model, where });
	} catch {
		return 0;
	}
}

const DAY_MS = 86_400_000;

/**
 * ### Endpoint
 *
 * GET `/admin/stats/overview`
 *
 * Aggregated totals for the admin dashboard plus login-channel distribution
 * (email/password, github, siwe), derived from the account table's
 * `providerId`. Requires the `stats:read` permission.
 *
 * **server:** `auth.api.statsOverview`
 */
export const statsOverview = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/stats/overview",
		{
			method: "GET",
			use: [adminMiddleware],
			metadata: {
				openapi: {
					operationId: "statsOverview",
					summary: "Dashboard overview stats",
				},
			},
		},
		async (ctx) => {
			requireStatsRead(opts, ctx);
			const adapter = ctx.context.adapter;
			const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);

			const [
				totalUsers,
				newUsers30d,
				activeSessions,
				organizationCount,
				bannedCount,
				usersWithout2FA,
				accounts,
			] = await Promise.all([
				safeCount(adapter, "user"),
				safeCount(adapter, "user", [gte("createdAt", thirtyDaysAgo)]),
				safeCount(adapter, "session"),
				safeCount(adapter, "organization"),
				safeCount(adapter, "user", [eq("banned", true)]),
				safeCount(adapter, "user", [eq("twoFactorEnabled", false)]),
				adapter.findMany<{ providerId: string }>({
					model: "account",
					limit: 100000,
					select: ["providerId"],
				}),
			]);

			const loginChannels = { emailPassword: 0, github: 0, siwe: 0 };
			for (const acc of accounts) {
				if (acc.providerId === "credential") loginChannels.emailPassword += 1;
				else if (acc.providerId === "github") loginChannels.github += 1;
				else if (acc.providerId === "siwe") loginChannels.siwe += 1;
			}

			return ctx.json({
				totalUsers,
				newUsers30d,
				activeSessions,
				organizationCount,
				bannedCount,
				usersWithout2FA,
				loginChannels,
			});
		},
	);

const signupsQuerySchema = z.object({
	range: z.enum(["7d", "30d"]).optional().default("30d"),
});

/**
 * ### Endpoint
 *
 * GET `/admin/stats/signups`
 *
 * Daily signup counts for the last 7 or 30 days (trend line). Requires
 * `stats:read`.
 *
 * **server:** `auth.api.statsSignups`
 */
export const statsSignups = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/stats/signups",
		{
			method: "GET",
			use: [adminMiddleware],
			query: signupsQuerySchema,
			metadata: {
				openapi: {
					operationId: "statsSignups",
					summary: "Signup trend",
				},
			},
		},
		async (ctx) => {
			requireStatsRead(opts, ctx);
			const days = ctx.query?.range === "7d" ? 7 : 30;
			const since = new Date(Date.now() - days * DAY_MS);
			const users = await ctx.context.adapter.findMany<{
				createdAt: Date | string;
			}>({
				model: "user",
				limit: 100000,
				select: ["createdAt"],
				where: [gte("createdAt", since)],
			});
			// Pre-seed all days in the window with 0 so the chart has no gaps.
			const buckets = new Map<string, number>();
			for (let i = days - 1; i >= 0; i--) {
				buckets.set(
					new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10),
					0,
				);
			}
			for (const u of users) {
				const ts =
					u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt);
				const key = ts.toISOString().slice(0, 10);
				if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
			}
			return ctx.json({
				range: days === 7 ? "7d" : "30d",
				data: [...buckets.entries()].map(([date, count]) => ({
					date,
					count,
				})),
			});
		},
	);

/**
 * ### Endpoint
 *
 * GET `/admin/stats/security-today`
 *
 * Today's security metrics from the audit log: failed logins, OTP send
 * requests, and risk-category events. Falls back to 0 when the audit-log
 * plugin (and thus the `auditLog` table) is not installed. Requires
 * `stats:read`.
 *
 * **server:** `auth.api.statsSecurityToday`
 */
export const statsSecurityToday = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/stats/security-today",
		{
			method: "GET",
			use: [adminMiddleware],
			metadata: {
				openapi: {
					operationId: "statsSecurityToday",
					summary: "Today's security metrics",
				},
			},
		},
		async (ctx) => {
			requireStatsRead(opts, ctx);
			const since = new Date();
			since.setHours(0, 0, 0, 0);
			const adapter = ctx.context.adapter;

			// The auditLog table only exists if the audit-log plugin is loaded.
			// Treat a missing table as "no data" (0) rather than erroring.
			const safeCount = async (filters: CleanedWhere[]): Promise<number> => {
				try {
					const rows = await adapter.findMany({
						model: "auditLog",
						limit: 100000,
						where: [...filters, gte("timestamp", since)],
					});
					return rows.length;
				} catch {
					return 0;
				}
			};

			const [failedLogins, otpRequests, geoAnomaly] = await Promise.all([
				safeCount([eq("action", "user.login"), eq("result", "failure")]),
				safeCount([eq("action", "user.otp_send")]),
				safeCount([eq("category", "risk")]),
			]);

			return ctx.json({
				failedLoginsToday: failedLogins,
				otpRequestsToday: otpRequests,
				geoAnomalyCount: geoAnomaly,
			});
		},
	);
