import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import { SECURITY_FRESH_AGE_SECONDS } from "./auth";
import type { CinaAuthDatabase } from "./database";
import type { CloudflareBindings } from "./env";
import {
	genericOAuthRedirectURI,
	isValidGenericOAuthProvider,
	parseProductionGenericOAuthConfig,
} from "./oauth-config";
import {
	getConfiguredSocialProviders,
	isSocialCatalogId,
	isSocialClientId,
	isSocialClientSecret,
	SOCIAL_PROVIDER_CATALOG,
} from "./social-provider-catalog";
import {
	invalidateSocialSignInCache,
	readSocialProviderRows,
	readSocialSignInSettings,
} from "./social-provider-store";
import { MAX_SOCIAL_PROVIDER_LIMIT } from "./social-sign-in-invariant";

export type AdminSocialSession = {
	user: { id: string; role: string | null | undefined };
	session: {
		createdAt: Date | string;
		impersonatedBy: string | null | undefined;
	};
};

export type AdminSocialAuditEvent = {
	action: string;
	phase: "intent" | "outcome";
	result: "success" | "failure";
	actorId: string;
	metadata: Record<string, unknown>;
};

export type AdminSocialProvidersDependencies = {
	env: CloudflareBindings;
	database: CinaAuthDatabase;
	getSession: () => Promise<AdminSocialSession | null>;
	consumeRateLimit?: (
		key: string,
		rule: { window: number; max: number },
	) => Promise<{ allowed: boolean; retryAfter: number | null }>;
	writeAuditEvent: (event: AdminSocialAuditEvent) => Promise<void>;
	logEvent: (event: {
		level: "warn" | "error";
		message: string;
		code?: string;
		actorId?: string;
	}) => void;
};

export type AdminSocialStatus = 200 | 400 | 401 | 403 | 404 | 409 | 429 | 503;

export type AdminSocialResult = {
	status: AdminSocialStatus;
	body: unknown;
	retryAfter?: number;
};

const GENERIC_PROVIDER_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const MAX_GENERIC_PROVIDERS = 20;

const ADMIN_SOCIAL_PROVIDER_RATE_LIMIT_RULE = {
	window: 300,
	max: 10,
} as const;

const adminSocialRateLimitKey = (actorId: string) =>
	`admin-social-provider:${actorId}`;

const GENERIC_CONFIG_EXTRA_KEYS = [
	"scopes",
	"issuer",
	"requireIssuerValidation",
	"pkce",
	"disableImplicitSignUp",
	"disableSignUp",
	"overrideUserInfo",
	"responseType",
	"responseMode",
	"authentication",
	"accessType",
	"accessTokenExpiresIn",
	"authorizationUrlParams",
	"tokenUrlParams",
	"discoveryHeaders",
	"authorizationHeaders",
	"prompt",
	"discoveryUrl",
	"authorizationUrl",
	"tokenUrl",
	"userInfoUrl",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (
	value: Record<string, unknown>,
	keys: readonly string[],
) => {
	const actual = Object.keys(value).sort();
	const expected = [...keys].sort();
	return (
		actual.length === expected.length &&
		actual.every((key, index) => key === expected[index])
	);
};

const jsonNoStore = (
	status: AdminSocialStatus,
	body: unknown,
): AdminSocialResult => ({
	status,
	body,
});

const failure = (
	status: AdminSocialStatus,
	code: string,
	message: string,
): AdminSocialResult => ({
	status,
	body: { ok: false, error: { code, message, status } },
});

const isFreshSession = (createdAt: Date | string, now = Date.now()) => {
	const createdAtMs = new Date(createdAt).getTime();
	return (
		Number.isFinite(createdAtMs) &&
		now - createdAtMs >= 0 &&
		now - createdAtMs < SECURITY_FRESH_AGE_SECONDS * 1000
	);
};

type GuardedMutation =
	| {
			session: AdminSocialSession;
	  }
	| AdminSocialResult;

const guardMutation = async (
	dependencies: AdminSocialProvidersDependencies,
	origin: string | null,
	allowedOrigin: string,
): Promise<GuardedMutation> => {
	const session = await dependencies.getSession();
	if (!session) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_social_providers.rejected",
			code: "UNAUTHORIZED",
		});
		return failure(401, "UNAUTHORIZED", "Authentication required");
	}
	if (
		!hasAdminControlPermission(
			session.user.role,
			"integration.social-provider.manage",
		)
	) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_social_providers.rejected",
			code: "FORBIDDEN",
			actorId: session.user.id,
		});
		return failure(403, "FORBIDDEN", "Permission denied");
	}
	if (session.session.impersonatedBy) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_social_providers.rejected",
			code: "IMPERSONATION_NOT_ALLOWED",
			actorId: session.user.id,
		});
		return failure(
			403,
			"IMPERSONATION_NOT_ALLOWED",
			"Configuration changes are unavailable while impersonating",
		);
	}
	if (origin !== allowedOrigin) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_social_providers.rejected",
			code: "INVALID_ORIGIN",
			actorId: session.user.id,
		});
		return failure(403, "INVALID_ORIGIN", "Invalid request origin");
	}
	if (!isFreshSession(session.session.createdAt)) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_social_providers.rejected",
			code: "SESSION_NOT_FRESH",
			actorId: session.user.id,
		});
		return failure(403, "SESSION_NOT_FRESH", "Recent authentication required");
	}
	if (!dependencies.consumeRateLimit) {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_social_providers.rejected",
			code: "RATE_LIMIT_UNAVAILABLE",
			actorId: session.user.id,
		});
		return failure(
			503,
			"RATE_LIMIT_UNAVAILABLE",
			"Rate limiter is unavailable",
		);
	}
	const limit = await dependencies.consumeRateLimit(
		adminSocialRateLimitKey(session.user.id),
		ADMIN_SOCIAL_PROVIDER_RATE_LIMIT_RULE,
	);
	if (!limit.allowed) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_social_providers.rejected",
			code: "RATE_LIMITED",
			actorId: session.user.id,
		});
		return {
			...failure(429, "RATE_LIMITED", "Too many configuration changes"),
			retryAfter: limit.retryAfter ?? undefined,
		};
	}
	return { session };
};

const writeAudit = async (
	dependencies: AdminSocialProvidersDependencies,
	event: AdminSocialAuditEvent,
) => {
	try {
		await dependencies.writeAuditEvent(event);
	} catch {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_social_providers.audit_failed",
			actorId: event.actorId,
		});
	}
};

const claimProviderNamespace = async (
	database: CinaAuthDatabase,
	providerId: string,
) => {
	await database.query(
		`INSERT INTO "cinaauth_provider_namespace" ("provider_id", "kind")
		VALUES ($1, 'account')
		ON CONFLICT ("provider_id") DO NOTHING`,
		[providerId],
	);
};

type PublicProviderSummary = {
	id: string;
	kind: "social" | "generic";
	configured: boolean;
	enabled: boolean;
	source: "database" | "environment" | "none";
	clientId: string | null;
	entry?: Record<string, unknown>;
};

/** Read-safe listing of every configurable provider plus the sign-in settings. */
export const handleAdminGetSocialProviders = async (
	dependencies: Pick<
		AdminSocialProvidersDependencies,
		"env" | "database" | "getSession" | "logEvent"
	>,
): Promise<AdminSocialResult> => {
	const session = await dependencies.getSession();
	if (!session) {
		return failure(401, "UNAUTHORIZED", "Authentication required");
	}
	if (
		!hasAdminControlPermission(
			session.user.role,
			"integration.social-provider.read",
		)
	) {
		return failure(403, "FORBIDDEN", "Permission denied");
	}

	const rows = await readSocialProviderRows(dependencies.database).catch(() => {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_social_providers.read_failed",
			actorId: session.user.id,
		});
		return [];
	});
	const settings = await readSocialSignInSettings(dependencies.database).catch(
		() => ({
			socialProviderLimit: MAX_SOCIAL_PROVIDER_LIMIT,
		}),
	);

	const rowsById = new Map(rows.map((row) => [row.providerId, row]));
	const envSocial = getConfiguredSocialProviders(dependencies.env, "");
	const providers: PublicProviderSummary[] = [];

	for (const entry of SOCIAL_PROVIDER_CATALOG) {
		const row = rowsById.get(entry.id);
		if (row) {
			providers.push({
				id: entry.id,
				kind: "social",
				configured: Boolean(row.clientId) && Boolean(row.clientSecret),
				enabled: row.enabled,
				source: "database",
				clientId: row.clientId || null,
			});
			continue;
		}
		const fromEnv = entry.optionKey in envSocial;
		providers.push({
			id: entry.id,
			kind: "social",
			configured: fromEnv,
			enabled: fromEnv,
			source: fromEnv ? "environment" : "none",
			clientId: fromEnv
				? (
						envSocial[entry.optionKey as keyof typeof envSocial] as {
							clientId: string;
						}
					).clientId
				: null,
		});
	}

	const envGeneric = parseProductionGenericOAuthConfig(
		dependencies.env.GENERIC_OAUTH_CONFIG,
		"",
	);
	const envGenericIds = new Set(
		envGeneric.map((provider) => provider.providerId),
	);
	for (const row of rows) {
		if (row.kind !== "generic") continue;
		const extras = row.config ?? {};
		providers.push({
			id: row.providerId,
			kind: "generic",
			configured: Boolean(row.clientId),
			enabled: row.enabled,
			source: "database",
			clientId: row.clientId || null,
			entry: extras,
		});
		envGenericIds.delete(row.providerId);
	}
	for (const providerId of envGenericIds) {
		const provider = envGeneric.find(
			(candidate) => candidate.providerId === providerId,
		);
		providers.push({
			id: providerId,
			kind: "generic",
			configured: true,
			enabled: true,
			source: "environment",
			clientId: provider?.clientId ?? null,
			entry: {},
		});
	}

	return jsonNoStore(200, {
		ok: true,
		data: {
			catalog: SOCIAL_PROVIDER_CATALOG.map(({ id, displayName }) => ({
				id,
				displayName,
			})),
			providers,
			settings,
		},
	});
};

/**
 * Stage or update one provider's credentials. Social entries need a catalog id
 * plus a client credential pair; generic entries are validated against the same
 * production contract as the environment configuration. Secrets are never
 * returned and never written to the audit log.
 */
export const handleAdminUpsertSocialProvider = async (
	dependencies: AdminSocialProvidersDependencies,
	origin: string | null,
	allowedOrigin: string,
	readBody: () => Promise<{ ok: true; body: unknown } | { ok: false }>,
): Promise<AdminSocialResult> => {
	const guard = await guardMutation(dependencies, origin, allowedOrigin);
	if ("status" in guard) return guard;
	const actorId = guard.session.user.id;

	const bodyResult = await readBody();
	if (!bodyResult.ok) {
		return failure(400, "INVALID_JSON", "Request body must be valid JSON");
	}
	const body = bodyResult.body;
	if (!isRecord(body) || body.kind !== "social") {
		return parseAndUpsertGenericProvider(dependencies, actorId, body);
	}
	if (
		!hasExactKeys(body, [
			"kind",
			"providerId",
			"clientId",
			"clientSecret",
			"enabled",
		]) ||
		typeof body.providerId !== "string" ||
		!isSocialCatalogId(body.providerId) ||
		!isSocialClientId(body.clientId) ||
		!isSocialClientSecret(body.clientSecret) ||
		typeof body.enabled !== "boolean"
	) {
		return failure(
			400,
			"INVALID_SOCIAL_PROVIDER",
			"Invalid social provider configuration",
		);
	}
	const providerId = body.providerId;
	const metadata = { providerId, kind: "social", enabled: body.enabled };
	await writeAudit(dependencies, {
		action: "integration.social-provider.upsert",
		phase: "intent",
		result: "success",
		actorId,
		metadata,
	});
	try {
		await dependencies.database.query(
			`INSERT INTO "cinaauth_social_provider"
				("provider_id", "kind", "client_id", "client_secret", "enabled", "config", "updated_at", "updated_by")
			VALUES ($1, 'social', $2, $3, $4, NULL, CURRENT_TIMESTAMP, $5)
			ON CONFLICT ("provider_id") DO UPDATE SET
				"kind" = 'social',
				"client_id" = EXCLUDED."client_id",
				"client_secret" = EXCLUDED."client_secret",
				"enabled" = EXCLUDED."enabled",
				"config" = NULL,
				"updated_at" = CURRENT_TIMESTAMP,
				"updated_by" = EXCLUDED."updated_by"`,
			[providerId, body.clientId, body.clientSecret, body.enabled, actorId],
		);
		await claimProviderNamespace(dependencies.database, providerId);
	} catch {
		await writeAudit(dependencies, {
			action: "integration.social-provider.upsert",
			phase: "outcome",
			result: "failure",
			actorId,
			metadata,
		});
		return failure(
			503,
			"SOCIAL_PROVIDER_STORE_UNAVAILABLE",
			"Configuration store is unavailable",
		);
	}
	invalidateSocialSignInCache();
	await writeAudit(dependencies, {
		action: "integration.social-provider.upsert",
		phase: "outcome",
		result: "success",
		actorId,
		metadata,
	});
	return jsonNoStore(200, { ok: true, data: metadata });
};

const parseAndUpsertGenericProvider = async (
	dependencies: AdminSocialProvidersDependencies,
	actorId: string,
	body: unknown,
): Promise<AdminSocialResult> => {
	if (!isRecord(body) || body.kind !== "generic") {
		return failure(400, "INVALID_PROVIDER", "Invalid provider payload");
	}
	const allowedKeys = [
		"kind",
		"providerId",
		"clientId",
		"clientSecret",
		"enabled",
		...GENERIC_CONFIG_EXTRA_KEYS,
	];
	if (
		typeof body.providerId !== "string" ||
		!GENERIC_PROVIDER_ID_PATTERN.test(body.providerId) ||
		isSocialCatalogId(body.providerId) ||
		!isSocialClientId(body.clientId) ||
		typeof body.enabled !== "boolean" ||
		(body.clientSecret !== undefined &&
			body.clientSecret !== "" &&
			!isSocialClientSecret(body.clientSecret))
	) {
		return failure(
			400,
			"INVALID_GENERIC_PROVIDER",
			"Invalid generic provider configuration",
		);
	}
	for (const key of Object.keys(body)) {
		if (!allowedKeys.includes(key)) {
			return failure(
				400,
				"INVALID_GENERIC_PROVIDER",
				"Invalid generic provider configuration",
			);
		}
	}
	if (
		!["kind", "providerId", "clientId", "enabled"].every((key) => key in body)
	) {
		return failure(
			400,
			"INVALID_GENERIC_PROVIDER",
			"Invalid generic provider configuration",
		);
	}

	const accountOrigin = new URL(
		dependencies.env.CINAAUTH_ACCOUNT_ORIGIN ?? "https://accounts.cinaseek.ai",
	).origin;
	const providerId = body.providerId;
	const extras: Record<string, unknown> = {};
	for (const key of GENERIC_CONFIG_EXTRA_KEYS) {
		if (body[key] !== undefined) extras[key] = body[key];
	}
	const clientSecret =
		typeof body.clientSecret === "string" && body.clientSecret.length > 0
			? body.clientSecret
			: "";
	const candidate = {
		providerId,
		clientId: body.clientId as string,
		clientSecret: clientSecret || undefined,
		redirectURI: genericOAuthRedirectURI(providerId, accountOrigin),
		...extras,
	};
	if (!isValidGenericOAuthProvider(candidate, accountOrigin)) {
		return failure(
			400,
			"INVALID_GENERIC_PROVIDER",
			"Invalid generic provider configuration",
		);
	}

	const metadata = { providerId, kind: "generic", enabled: body.enabled };
	await writeAudit(dependencies, {
		action: "integration.social-provider.upsert",
		phase: "intent",
		result: "success",
		actorId,
		metadata,
	});
	try {
		const existing = await dependencies.database.query<{ providerId: string }>(
			`SELECT "provider_id" AS "providerId" FROM "cinaauth_social_provider"
			WHERE "provider_id" = $1`,
			[providerId],
		);
		if (existing.rows.length === 0) {
			const count = await dependencies.database.query<{ total: number }>(
				`SELECT COUNT(*)::int AS "total" FROM "cinaauth_social_provider"
				WHERE "kind" = 'generic'`,
			);
			if ((count.rows[0]?.total ?? 0) >= MAX_GENERIC_PROVIDERS) {
				await writeAudit(dependencies, {
					action: "integration.social-provider.upsert",
					phase: "outcome",
					result: "failure",
					actorId,
					metadata,
				});
				return failure(
					409,
					"GENERIC_PROVIDER_LIMIT",
					"Generic provider limit reached",
				);
			}
		}
		await dependencies.database.query(
			`INSERT INTO "cinaauth_social_provider"
				("provider_id", "kind", "client_id", "client_secret", "enabled", "config", "updated_at", "updated_by")
			VALUES ($1, 'generic', $2, $3, $4, $5::jsonb, CURRENT_TIMESTAMP, $6)
			ON CONFLICT ("provider_id") DO UPDATE SET
				"kind" = 'generic',
				"client_id" = EXCLUDED."client_id",
				"client_secret" = EXCLUDED."client_secret",
				"enabled" = EXCLUDED."enabled",
				"config" = EXCLUDED."config",
				"updated_at" = CURRENT_TIMESTAMP,
				"updated_by" = EXCLUDED."updated_by"`,
			[
				providerId,
				body.clientId,
				clientSecret,
				body.enabled,
				JSON.stringify(extras),
				actorId,
			],
		);
		await claimProviderNamespace(dependencies.database, providerId);
	} catch {
		await writeAudit(dependencies, {
			action: "integration.social-provider.upsert",
			phase: "outcome",
			result: "failure",
			actorId,
			metadata,
		});
		return failure(
			503,
			"SOCIAL_PROVIDER_STORE_UNAVAILABLE",
			"Configuration store is unavailable",
		);
	}
	invalidateSocialSignInCache();
	await writeAudit(dependencies, {
		action: "integration.social-provider.upsert",
		phase: "outcome",
		result: "success",
		actorId,
		metadata,
	});
	return jsonNoStore(200, { ok: true, data: metadata });
};

/** Remove a database-staged provider; environment values become active again. */
export const handleAdminDeleteSocialProvider = async (
	dependencies: AdminSocialProvidersDependencies,
	origin: string | null,
	allowedOrigin: string,
	readBody: () => Promise<{ ok: true; body: unknown } | { ok: false }>,
): Promise<AdminSocialResult> => {
	const guard = await guardMutation(dependencies, origin, allowedOrigin);
	if ("status" in guard) return guard;
	const actorId = guard.session.user.id;

	const bodyResult = await readBody();
	if (!bodyResult.ok) {
		return failure(400, "INVALID_JSON", "Request body must be valid JSON");
	}
	const body = bodyResult.body;
	if (
		!isRecord(body) ||
		!hasExactKeys(body, ["providerId"]) ||
		typeof body.providerId !== "string" ||
		body.providerId.length === 0 ||
		body.providerId.length > 64
	) {
		return failure(400, "INVALID_PROVIDER", "Invalid provider id");
	}
	const metadata = { providerId: body.providerId, kind: "unknown" };
	await writeAudit(dependencies, {
		action: "integration.social-provider.delete",
		phase: "intent",
		result: "success",
		actorId,
		metadata,
	});
	let deleted = 0;
	try {
		const result = await dependencies.database.query(
			`DELETE FROM "cinaauth_social_provider" WHERE "provider_id" = $1`,
			[body.providerId],
		);
		deleted = result.rowCount ?? 0;
	} catch {
		await writeAudit(dependencies, {
			action: "integration.social-provider.delete",
			phase: "outcome",
			result: "failure",
			actorId,
			metadata,
		});
		return failure(
			503,
			"SOCIAL_PROVIDER_STORE_UNAVAILABLE",
			"Configuration store is unavailable",
		);
	}
	invalidateSocialSignInCache();
	await writeAudit(dependencies, {
		action: "integration.social-provider.delete",
		phase: "outcome",
		result: deleted > 0 ? "success" : "failure",
		actorId,
		metadata: { ...metadata, deleted },
	});
	if (deleted === 0) {
		return failure(404, "PROVIDER_NOT_FOUND", "Provider is not configured");
	}
	return jsonNoStore(200, { ok: true, data: metadata });
};

/** Update how many federated options the sign-in page may advertise and whether email OTP login is allowed. */
export const handleAdminUpdateSignInSettings = async (
	dependencies: AdminSocialProvidersDependencies,
	origin: string | null,
	allowedOrigin: string,
	readBody: () => Promise<{ ok: true; body: unknown } | { ok: false }>,
): Promise<AdminSocialResult> => {
	const guard = await guardMutation(dependencies, origin, allowedOrigin);
	if ("status" in guard) return guard;
	const actorId = guard.session.user.id;

	const bodyResult = await readBody();
	if (!bodyResult.ok) {
		return failure(400, "INVALID_JSON", "Request body must be valid JSON");
	}
	const body = bodyResult.body;
	if (
		!isRecord(body) ||
		!hasExactKeys(body, ["socialProviderLimit", "emailOtpLoginEnabled"]) ||
		!Number.isSafeInteger(body.socialProviderLimit) ||
		(body.socialProviderLimit as number) < 0 ||
		(body.socialProviderLimit as number) > MAX_SOCIAL_PROVIDER_LIMIT ||
		typeof body.emailOtpLoginEnabled !== "boolean"
	) {
		return failure(400, "INVALID_SIGN_IN_SETTINGS", "Invalid sign-in settings");
	}
	const socialProviderLimit = body.socialProviderLimit as number;
	const emailOtpLoginEnabled = body.emailOtpLoginEnabled as boolean;
	const metadata = { socialProviderLimit, emailOtpLoginEnabled };
	await writeAudit(dependencies, {
		action: "integration.social-provider.settings",
		phase: "intent",
		result: "success",
		actorId,
		metadata,
	});
	try {
		const result = await dependencies.database.query(
			`UPDATE "cinaauth_sign_in_settings"
			SET "social_provider_limit" = $1, "email_otp_login_enabled" = $2,
				"updated_at" = CURRENT_TIMESTAMP, "updated_by" = $3
			WHERE "singleton" = TRUE`,
			[socialProviderLimit, emailOtpLoginEnabled, actorId],
		);
		if ((result.rowCount ?? 0) === 0) {
			await writeAudit(dependencies, {
				action: "integration.social-provider.settings",
				phase: "outcome",
				result: "failure",
				actorId,
				metadata,
			});
			return failure(
				503,
				"SOCIAL_PROVIDER_STORE_UNAVAILABLE",
				"Configuration store is unavailable",
			);
		}
	} catch {
		await writeAudit(dependencies, {
			action: "integration.social-provider.settings",
			phase: "outcome",
			result: "failure",
			actorId,
			metadata,
		});
		return failure(
			503,
			"SOCIAL_PROVIDER_STORE_UNAVAILABLE",
			"Configuration store is unavailable",
		);
	}
	invalidateSocialSignInCache();
	await writeAudit(dependencies, {
		action: "integration.social-provider.settings",
		phase: "outcome",
		result: "success",
		actorId,
		metadata,
	});
	return jsonNoStore(200, { ok: true, data: metadata });
};
