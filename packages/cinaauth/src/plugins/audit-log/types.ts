import type { CinaAuthPluginDBSchema } from "@cinaauth/core/db";
import type { AuditLogSchema } from "./schema";

export type AuditCategory =
	| "user"
	| "session"
	| "auth"
	| "admin"
	| "risk"
	| "wallet"
	| "org"
	| "apikey"
	| "identity"
	| "authenticator"
	| "credential"
	| "privacy"
	| "integration"
	| "provisioning"
	| "billing"
	| "audit";

export type AuditResult = "success" | "failure";

export interface AuditLogEntry {
	id?: string;
	timestamp?: Date;
	actorId?: string | null;
	actorRole?: string | null;
	actorIp?: string | null;
	actorUa?: string | null;
	actorSite?: string | null;
	category: AuditCategory;
	action: string;
	targetType?: string | null;
	targetId?: string | null;
	result: AuditResult;
	metadata?: Record<string, unknown> | null;
}

export interface AuditLogPluginOptions {
	/**
	 * Role whitelist: only these roles may query audit logs or write with an
	 * authoritative fresh session.
	 * Defaults to `["admin"]`.
	 */
	allowedRoles?: string[];
	/**
	 * Organization role whitelist for tenant-scoped audit queries.
	 * Defaults to `["owner", "admin"]`.
	 */
	organizationAllowedRoles?: string[];
	/**
	 * Extra bearer tokens allowed to write via the explicit `/audit/log`
	 * endpoint without a browser session (e.g. the admin console service key).
	 * Defaults to `[]`.
	 */
	writeTokens?: string[];
	schema?: Partial<CinaAuthPluginDBSchema>;
}

export type { AuditLogSchema };
