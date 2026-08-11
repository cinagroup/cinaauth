import { createAuthMiddleware } from "@cinaauth/core/api";
import { APIError } from "@cinaauth/core/error";
import { getSessionFromCtx } from "../../api";
import { getEndpointResponse } from "../../utils/plugin-helper";

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
		session?: unknown;
		adapter: {
			create: (args: {
				model: string;
				data: Record<string, unknown>;
			}) => Promise<unknown>;
		};
	};
}

function readUnknownField(value: unknown, field: string): unknown {
	if (!value || typeof value !== "object") return null;
	return (value as Record<string, unknown>)[field];
}

function readStringField(value: unknown, field: string): string | null {
	const candidate = readUnknownField(value, field);
	return typeof candidate === "string" && candidate.length > 0
		? candidate
		: null;
}

interface OrganizationAuditContext {
	body?: unknown;
	context: {
		session?: unknown;
	};
}

/** Resolve the authoritative tenant target for organization audit capture. */
export function resolveOrganizationAuditTarget(
	ctx: OrganizationAuditContext,
	response: unknown,
	action?: string,
): string | null {
	const responseOrganizationId = readStringField(response, "organizationId");
	if (responseOrganizationId) return responseOrganizationId;

	const bodyOrganizationId = readStringField(ctx.body, "organizationId");
	if (bodyOrganizationId) return bodyOrganizationId;

	const activeOrganizationId = readStringField(
		readUnknownField(ctx.context.session, "session"),
		"activeOrganizationId",
	);
	if (activeOrganizationId) return activeOrganizationId;

	return action === "org.create" ? readStringField(response, "id") : null;
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
	const sessionUser = readUnknownField(ctx.context.session, "user");
	return {
		actorId: readStringField(sessionUser, "id"),
		actorRole: readStringField(sessionUser, "role"),
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
				// The adapter generates the id; do not pass one (Kysely warns and
				// ignores it). See capture tests for the id-less write path.
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
 * Resolve the result of an endpoint for audit capture without assuming every
 * successful response is `200 application/json`. SCIM creates use 201 and the
 * audit export returns CSV, while 204 responses legitimately have no body.
 */
export async function resolveAuditCaptureResponse<T>(ctx: {
	context: { returned?: unknown };
}): Promise<{ ok: boolean; response: T | null }> {
	const returned = ctx.context.returned;
	if (returned instanceof Response) {
		if (!returned.ok) return { ok: false, response: null };
		const contentType =
			returned.headers.get("content-type")?.toLowerCase() ?? "";
		if (returned.status === 204 || !contentType.includes("json")) {
			return { ok: true, response: null };
		}
		try {
			return {
				ok: true,
				response: (await returned.clone().json()) as T,
			};
		} catch {
			// The endpoint completed successfully; malformed or empty response data
			// only means target enrichment is unavailable for this audit row.
			return { ok: true, response: null };
		}
	}
	const response = await getEndpointResponse<T>(ctx);
	return { ok: response !== null, response };
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
interface CaptureMapping {
	category: string;
	action: string;
}

export const CAPTURE_PATH_MAP: Record<string, CaptureMapping> = {
	// core auth
	"/sign-in/email": { category: "auth", action: "user.login" },
	"/sign-in/social": { category: "auth", action: "user.login_social" },
	"/sign-up/email": { category: "auth", action: "user.register" },
	"/sign-out": { category: "auth", action: "user.logout" },
	"/change-password": { category: "auth", action: "user.password_change" },
	"/delete-user": { category: "identity", action: "user.account_delete" },
	"/link-social": { category: "identity", action: "identity.link" },
	"/oauth2/link": { category: "identity", action: "identity.link" },
	"/unlink-account": { category: "identity", action: "identity.unlink" },
	"/revoke-session": { category: "session", action: "session.revoke" },
	"/revoke-sessions": { category: "session", action: "session.revoke_all" },
	"/revoke-other-sessions": {
		category: "session",
		action: "session.revoke_others",
	},
	// passkey plugin
	"/passkey/verify-registration": {
		category: "authenticator",
		action: "passkey.create",
	},
	"/passkey/delete-passkey": {
		category: "authenticator",
		action: "passkey.delete",
	},
	"/passkey/update-passkey": {
		category: "authenticator",
		action: "passkey.update",
	},
	// API key plugin
	"/api-key/create": { category: "credential", action: "api_key.create" },
	"/api-key/update": { category: "credential", action: "api_key.update" },
	"/api-key/delete": { category: "credential", action: "api_key.delete" },
	// two-factor plugin
	"/two-factor/enable": { category: "auth", action: "user.2fa_enable" },
	"/two-factor/disable": { category: "auth", action: "user.2fa_disable" },
	// email-otp plugin
	"/email-otp/send-verification-otp": {
		category: "auth",
		action: "user.otp_send",
	},
	"/email-otp/verify-email": { category: "auth", action: "user.otp_verify" },
	// siwe plugin (wallet bind)
	"/siwe/verify": { category: "wallet", action: "siwe.bind" },
	"/siwe/link-wallet": { category: "wallet", action: "siwe.bind" },
	"/siwe/set-primary-wallet": {
		category: "wallet",
		action: "siwe.set_primary",
	},
	"/siwe/unlink-wallet": { category: "wallet", action: "siwe.unbind" },
	// privacy-center plugin
	"/privacy/export": { category: "privacy", action: "privacy.export" },
	// organization plugin mutations
	"/organization/create": { category: "org", action: "org.create" },
	"/organization/update": { category: "org", action: "org.update" },
	"/organization/delete": { category: "org", action: "org.delete" },
	"/organization/invite-member": {
		category: "org",
		action: "org.member_invite",
	},
	"/organization/cancel-invitation": {
		category: "org",
		action: "org.invitation_cancel",
	},
	"/organization/accept-invitation": {
		category: "org",
		action: "org.invitation_accept",
	},
	"/organization/reject-invitation": {
		category: "org",
		action: "org.invitation_reject",
	},
	"/organization/remove-member": {
		category: "org",
		action: "org.member_remove",
	},
	"/organization/update-member-role": {
		category: "org",
		action: "org.member_role_update",
	},
	"/organization/leave": { category: "org", action: "org.member_leave" },
	"/organization/create-role": {
		category: "org",
		action: "org.role_create",
	},
	"/organization/update-role": {
		category: "org",
		action: "org.role_update",
	},
	"/organization/delete-role": {
		category: "org",
		action: "org.role_delete",
	},
	"/organization/create-team": {
		category: "org",
		action: "org.team_create",
	},
	"/organization/update-team": {
		category: "org",
		action: "org.team_update",
	},
	"/organization/remove-team": {
		category: "org",
		action: "org.team_delete",
	},
	"/organization/add-team-member": {
		category: "org",
		action: "org.team_member_add",
	},
	"/organization/remove-team-member": {
		category: "org",
		action: "org.team_member_remove",
	},
	// admin plugin mutations
	"/admin/set-role": { category: "admin", action: "admin.set_role" },
	"/admin/create-user": { category: "admin", action: "admin.user_create" },
	"/admin/update-user": { category: "admin", action: "admin.user_update" },
	"/admin/ban-user": { category: "admin", action: "admin.user_ban" },
	"/admin/unban-user": { category: "admin", action: "admin.user_unban" },
	"/admin/remove-user": { category: "admin", action: "admin.user_delete" },
	"/admin/set-user-password": {
		category: "admin",
		action: "admin.user_set_password",
	},
	"/admin/impersonate-user": { category: "admin", action: "admin.impersonate" },
	"/admin/stop-impersonating": {
		category: "admin",
		action: "admin.stop_impersonating",
	},
	"/admin/delete-user-passkey": {
		category: "authenticator",
		action: "admin.passkey_revoke",
	},
	"/admin/update-user-passkey": {
		category: "authenticator",
		action: "admin.passkey_update",
	},
	"/admin/reset-2fa": {
		category: "admin",
		action: "admin.user_reset_2fa",
	},
	"/admin/revoke-user-session": {
		category: "session",
		action: "session.revoke",
	},
	"/admin/revoke-user-sessions": {
		category: "session",
		action: "session.revoke_all",
	},
	// SSO provider and verified-domain administration. Sign-in initiation is
	// intentionally excluded: a redirect being issued is not a completed login.
	"/sso/register": {
		category: "integration",
		action: "sso.provider_create",
	},
	"/sso/update-provider": {
		category: "integration",
		action: "sso.provider_update",
	},
	"/sso/delete-provider": {
		category: "integration",
		action: "sso.provider_delete",
	},
	"/sso/request-domain-verification": {
		category: "integration",
		action: "sso.domain_verification_request",
	},
	"/sso/verify-domain": {
		category: "integration",
		action: "sso.domain_verify",
	},
	// SCIM connection lifecycle. User provisioning routes are method-sensitive
	// and therefore live in CAPTURE_METHOD_PATH_MAP below.
	"/scim/generate-token": {
		category: "credential",
		action: "scim.token_generate",
	},
	"/scim/delete-provider-connection": {
		category: "integration",
		action: "scim.connection_delete",
	},
	// Subscription operations currently exposed by the Stripe plugin and used
	// by the account/admin applications when the deployment enables billing.
	"/subscription/upgrade": {
		category: "billing",
		action: "subscription.upgrade",
	},
	"/subscription/cancel": {
		category: "billing",
		action: "subscription.cancel",
	},
	"/subscription/restore": {
		category: "billing",
		action: "subscription.restore",
	},
	"/subscription/billing-portal": {
		category: "billing",
		action: "subscription.billing_portal",
	},
	// This is the Auth plugin's real CSV endpoint. CSV produced solely inside an
	// application proxy must instead write explicitly through POST /audit/log.
	"/audit/export": { category: "audit", action: "audit.export_csv" },
};

/**
 * Routes whose path is shared by read and write operations. The HTTP method is
 * part of the allow-list key so a SCIM GET can never be recorded as a mutation.
 */
export const CAPTURE_METHOD_PATH_MAP: Record<string, CaptureMapping> = {
	"POST /scim/v2/Users": {
		category: "provisioning",
		action: "scim.user_create",
	},
	"PUT /scim/v2/Users/:userId": {
		category: "provisioning",
		action: "scim.user_update",
	},
	"PATCH /scim/v2/Users/:userId": {
		category: "provisioning",
		action: "scim.user_update",
	},
	"DELETE /scim/v2/Users/:userId": {
		category: "provisioning",
		action: "scim.user_delete",
	},
};

/**
 * Resolve a request path to its audit mapping, or null if not on the
 * capture whitelist. Accepts undefined for type-safety with cinaauth's hook
 * matcher context (whose `path` may be undefined).
 */
export function matchCapturePath(
	path: string | undefined,
	method?: string,
): CaptureMapping | null {
	if (!path) return null;
	if (method) {
		const methodMapping =
			CAPTURE_METHOD_PATH_MAP[`${method.toUpperCase()} ${path}`];
		if (methodMapping) return methodMapping;
	}
	return CAPTURE_PATH_MAP[path] ?? null;
}
