import { createAuthMiddleware } from "@cinaauth/core/api";
import { randomUUID } from "node:crypto";
import { getSessionFromCtx } from "../../api";
import { APIError } from "@cinaauth/core/error";

/**
 * Context shape for audit capture: enough to read request headers and the
 * resolved session. cinaauth's hook/endpoint contexts all satisfy this.
 *
 * Note: the raw generic `create({model, data})` lives on `adapter`, not
 * `internalAdapter` (the latter only exposes model-specific helpers like
 * `createUser`/`findUserById`). See the siwe plugin's `ctx.context.adapter`
 * usage for the established pattern.
 */
interface AuditCtx {
	request?: Request | Headers | null;
	context: {
		session?: {
			user?: { id?: string | null; role?: string | null } | null;
		} | null;
		adapter: {
			create: (args: {
				model: string;
				data: Record<string, unknown>;
			}) => Promise<unknown>;
		};
	};
}

/**
 * Extract actor context (id/role/IP/UA) from a request ctx.
 * IP is read from Cloudflare's `cf-connecting-ip` (with `x-forwarded-for`
 * fallback) since the audit service runs behind Cloudflare.
 */
export function extractActorFromCtx(ctx: AuditCtx): {
	actorId: string | null;
	actorRole: string | null;
	actorIp: string | null;
	actorUa: string | null;
} {
	const headers =
		ctx.request instanceof Headers
			? ctx.request
			: (ctx.request as Request | null)?.headers;
	const sessionUser = ctx.context.session?.user ?? null;
	return {
		actorId: sessionUser?.id ?? null,
		actorRole: sessionUser?.role ?? null,
		actorIp:
			headers?.get("cf-connecting-ip") ??
			headers?.get("x-forwarded-for") ??
			null,
		actorUa: headers?.get("user-agent") ?? null,
	};
}

/**
 * Write one audit log row. **Best-effort, non-blocking**: failures are logged
 * to stderr only and never thrown, so audit availability can never break the
 * auth flow it is recording.
 */
export async function writeAuditLog(
	ctx: AuditCtx,
	entry: {
		category: string;
		action: string;
		result: "success" | "failure";
		actorId?: string | null;
		actorRole?: string | null;
		actorIp?: string | null;
		actorUa?: string | null;
		actorSite?: string | null;
		targetType?: string | null;
		targetId?: string | null;
		metadata?: Record<string, unknown> | null;
	},
): Promise<void> {
	try {
		await ctx.context.adapter.create({
			model: "auditLog",
			data: {
				id: randomUUID(),
				timestamp: new Date(),
				actorId: entry.actorId ?? null,
				actorRole: entry.actorRole ?? null,
				actorIp: entry.actorIp ?? null,
				actorUa: entry.actorUa ?? null,
				actorSite: entry.actorSite ?? null,
				category: entry.category,
				action: entry.action,
				targetType: entry.targetType ?? null,
				targetId: entry.targetId ?? null,
				result: entry.result,
				metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
			},
		});
	} catch (err) {
		console.error("[audit-log] non-blocking write failed:", err);
	}
}

/**
 * Session-enforcing middleware for audit endpoints. Mirrors the admin plugin's
 * `adminMiddleware` shape (ensures a valid session or throws UNAUTHORIZED)
 * without reaching into the admin plugin's private symbols. Per-endpoint
 * `hasPermission` checks still apply role gating.
 */
export const auditSessionMiddleware = createAuthMiddleware(async (ctx) => {
	const session = await getSessionFromCtx(ctx);
	if (!session) {
		throw APIError.fromStatus("UNAUTHORIZED");
	}
	return { session } as {
		session: {
			user: { id: string; role?: string | null };
		};
	};
});
