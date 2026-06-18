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

/**
 * Whitelist of core auth endpoints to capture via `hooks.after`, mapping each
 * endpoint path to the (category, action) of the audit row it should produce.
 * Paths are exact (verified against each plugin's route registration). This is
 * an explicit allow-list — NOT a catch-all — so future endpoints are never
 * audited by accident and cannot conflict.
 */
export const CAPTURE_PATH_MAP: Record<string, { category: string; action: string }> = {
	// core auth
	"/sign-in/email": { category: "auth", action: "user.login" },
	"/sign-in/social": { category: "auth", action: "user.login_social" },
	"/sign-up/email": { category: "auth", action: "user.register" },
	"/sign-out": { category: "auth", action: "user.logout" },
	"/change-password": { category: "auth", action: "user.password_change" },
	// two-factor plugin
	"/two-factor/enable": { category: "auth", action: "user.2fa_enable" },
	"/two-factor/disable": { category: "auth", action: "user.2fa_disable" },
	// email-otp plugin
	"/email-otp/send-verification-otp": { category: "auth", action: "user.otp_send" },
	"/email-otp/verify-email": { category: "auth", action: "user.otp_verify" },
	// siwe plugin (wallet bind)
	"/siwe/verify": { category: "wallet", action: "siwe.bind" },
	// admin plugin mutations
	"/admin/set-role": { category: "admin", action: "admin.set_role" },
	"/admin/create-user": { category: "admin", action: "admin.user_create" },
	"/admin/update-user": { category: "admin", action: "admin.user_update" },
	"/admin/ban-user": { category: "admin", action: "admin.user_ban" },
	"/admin/unban-user": { category: "admin", action: "admin.user_unban" },
	"/admin/remove-user": { category: "admin", action: "admin.user_delete" },
	"/admin/set-user-password": { category: "admin", action: "admin.user_set_password" },
	"/admin/impersonate-user": { category: "admin", action: "admin.impersonate" },
	"/admin/revoke-user-session": { category: "session", action: "session.revoke" },
	"/admin/revoke-user-sessions": { category: "session", action: "session.revoke_all" },
};

/**
 * Resolve a request path to its audit mapping, or null if not on the
 * capture whitelist. Accepts undefined for type-safety with cinaauth's hook
 * matcher context (whose `path` may be undefined).
 */
export function matchCapturePath(path: string | undefined): {
	category: string;
	action: string;
} | null {
	if (!path) return null;
	return CAPTURE_PATH_MAP[path] ?? null;
}
