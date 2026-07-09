import { createAuthEndpoint } from "@cinaauth/core/api";
import type { CleanedWhere } from "@cinaauth/core/db/adapter";
import { APIError } from "@cinaauth/core/error";
import * as z from "zod";
import { writeAuditLog } from "../audit-log/capture";
import { ADMIN_ERROR_CODES } from "./error-codes";
import { hasPermission } from "./has-permission";
import { adminMiddleware } from "./routes";
import type { AdminOptions } from "./types";

/** Build a fully-populated CleanedWhere eq clause (case-sensitive). */
function eq(field: string, value: string | number | boolean): CleanedWhere {
	return { field, operator: "eq", value, connector: "AND", mode: "sensitive" };
}

/** Case-insensitive eq — for wallet address matching (stored checksummed,
 *  callers may pass lowercase). */
function eqCI(field: string, value: string): CleanedWhere {
	return {
		field,
		operator: "eq",
		value,
		connector: "AND",
		mode: "insensitive",
	};
}

const listWalletsQuerySchema = z.object({
	userId: z.string(),
});

/**
 * ### Endpoint
 *
 * GET `/admin/list-user-wallets`
 *
 * List a user's bound SIWE wallets, enriched with binding IP/site from the
 * audit log (`siwe.bind` rows). Requires the `wallet:list` permission.
 *
 * **server:** `auth.api.listUserWallets`
 */
export const listUserWallets = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/list-user-wallets",
		{
			method: "GET",
			use: [adminMiddleware],
			query: listWalletsQuerySchema,
			metadata: {
				openapi: {
					operationId: "listUserWallets",
					summary: "List a user's SIWE wallets",
				},
			},
		},
		async (ctx) => {
			const ok = hasPermission({
				userId: ctx.context.session.user.id,
				role: ctx.context.session.user.role,
				options: opts,
				permissions: { wallet: ["list"] },
			});
			if (!ok) {
				throw APIError.from(
					"FORBIDDEN",
					ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_LIST_USER_WALLETS,
				);
			}

			const { userId } = ctx.query;
			const wallets = await ctx.context.adapter.findMany<{
				address: string;
				chainId: number;
				isPrimary: boolean;
				createdAt: Date | string;
			}>({
				model: "walletAddress",
				limit: 1000,
				where: [eq("userId", userId)],
			});

			// Enrich with binding IP/site from audit-log siwe.bind rows.
			const binds = await (async () => {
				try {
					return await ctx.context.adapter.findMany<{
						actorIp: string | null;
						actorSite: string | null;
						timestamp: Date | string;
						metadata: string | null;
					}>({
						model: "auditLog",
						limit: 1000,
						where: [eq("action", "siwe.bind"), eq("targetId", userId)],
					});
				} catch {
					return [];
				}
			})();
			const bindMeta = new Map<
				string,
				{ ip: string | null; site: string | null; at: Date | null }
			>();
			for (const b of binds) {
				try {
					const meta = b.metadata
						? (JSON.parse(b.metadata) as { address?: string })
						: {};
					if (meta.address) {
						bindMeta.set(String(meta.address).toLowerCase(), {
							ip: b.actorIp ?? null,
							site: b.actorSite ?? null,
							at:
								b.timestamp instanceof Date
									? b.timestamp
									: new Date(b.timestamp),
						});
					}
				} catch {
					/* ignore malformed metadata */
				}
			}

			const rows = wallets.map((w) => {
				const m = bindMeta.get(String(w.address).toLowerCase());
				return {
					address: w.address,
					chainId: w.chainId,
					isPrimary: w.isPrimary,
					boundAt:
						w.createdAt instanceof Date ? w.createdAt : new Date(w.createdAt),
					boundIp: m?.ip ?? null,
					boundSite: m?.site ?? null,
				};
			});
			return ctx.json({ wallets: rows });
		},
	);

const unbindWalletBodySchema = z.object({
	userId: z.string(),
	address: z
		.string()
		.regex(/^0[xX][a-fA-F0-9]{40}$/i)
		.length(42),
	chainId: z.number().int().positive(),
});

/**
 * ### Endpoint
 *
 * POST `/admin/unbind-wallet`
 *
 * Force-unbind a wallet: delete the `walletAddress` row and matching SIWE
 * `account` row, then write a `siwe.unbind` audit row. Requires the
 * `wallet:unbind` permission.
 *
 * **server:** `auth.api.unbindWallet`
 */
export const unbindWallet = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/unbind-wallet",
		{
			method: "POST",
			use: [adminMiddleware],
			body: unbindWalletBodySchema,
			metadata: {
				openapi: {
					operationId: "unbindWallet",
					summary: "Force-unbind a SIWE wallet",
				},
			},
		},
		async (ctx) => {
			const ok = hasPermission({
				userId: ctx.context.session.user.id,
				role: ctx.context.session.user.role,
				options: opts,
				permissions: { wallet: ["unbind"] },
			});
			if (!ok) {
				throw APIError.from(
					"FORBIDDEN",
					ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_UNBIND_WALLETS,
				);
			}

			const { userId, address, chainId } = ctx.body;

			// Delete the walletAddress row (case-insensitive on address: stored
			// checksummed, callers may pass lowercase).
			await ctx.context.adapter.delete({
				model: "walletAddress",
				where: [
					eq("userId", userId),
					eqCI("address", address),
					eq("chainId", chainId),
				],
			});

			// Delete the matching SIWE account row (accountId "<address>:<chainId>").
			// Best-effort: account table shape may vary across configs.
			try {
				await ctx.context.adapter.delete({
					model: "account",
					where: [
						eq("providerId", "siwe"),
						eq("accountId", `${address}:${chainId}`),
					],
				});
			} catch {
				/* account row absent or shape differs — ignore */
			}

			// Audit the unbind (non-blocking).
			await writeAuditLog(ctx, {
				category: "wallet",
				action: "siwe.unbind",
				result: "success",
				actorId: ctx.context.session.user.id,
				actorRole: ctx.context.session.user.role ?? null,
				targetType: "wallet",
				targetId: userId,
				metadata: { address, chainId },
			});

			return ctx.json({ ok: true });
		},
	);
