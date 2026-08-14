import {
	hasAdminControlPermission,
	isValidAdminOidcClientSecret,
} from "@cinaauth/auth-web-contract";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type {
	AdminConfigurationAction,
	AdminConfigurationService,
} from "./admin-configuration";
import { handleAdminConfiguration } from "./admin-configuration";
import {
	ensureAdminOidcClient,
	isAdminOidcAuthorizationRequest,
} from "./admin-oidc-client";
import {
	getAdminVerificationServerApi,
	handleAdminSendVerification,
} from "./admin-send-verification";
import {
	DEFAULT_AUDIT_RETENTION_DAYS,
	getAuditRetentionPolicy,
} from "./audit-retention";
import type { Auth } from "./auth";
import {
	createAuth,
	getProductionSocialProviders,
	runWithExecutionCtx,
	SECURITY_FRESH_AGE_SECONDS,
} from "./auth";
import {
	AUTH_DISCOVERY_PATHS,
	createCanonicalDiscoveryRequest,
	isAuthHandlerRequestPath,
} from "./auth-routing";
import { getAuthCapabilities } from "./capabilities";
import {
	CLOUDFLARE_ACCESS_JWKS_PATH,
	normalizeCloudflareAccessJwks,
} from "./cloudflare-access-jwks";
import {
	D1_CUTOVER_MARKER_NAME,
	D1_CUTOVER_MARKER_TABLE,
	migrateLegacyD1ToPostgres,
	previewLegacyD1Migration,
} from "./d1-migration";
import { createDatabase, isHyperdrive } from "./database";
import type { DatabaseInvariantReadiness } from "./database-invariants";
import {
	DATABASE_INVARIANT_IDS,
	getDatabaseInvariantReadiness,
	installDatabaseInvariants,
} from "./database-invariants";
import type { DeliveryMessage } from "./delivery";
import {
	getDeliveryProviderCapabilities,
	getRequiredDeliveryProvider,
	handleDeliveryBatch,
} from "./delivery";
import type { EntitlementRequestPolicy } from "./entitlement-enforcement";
import {
	evaluateEntitlementAccess,
	getEntitlementRequestPolicy,
} from "./entitlement-enforcement";
import {
	getEntitlementCapacityLockKey,
	withEntitlementCapacityLock,
} from "./entitlement-lock";
import type { EntitlementSubscription } from "./entitlements";
import {
	getBillingRuntimeConfiguration,
	loadEntitlementSnapshot,
} from "./entitlements";
import type { CloudflareBindings } from "./env";
import type { ImpersonationMutationAuditBody } from "./impersonation-mutation-guard";
import { createImpersonationMutationGuardMiddleware } from "./impersonation-mutation-guard";
import { parseProductionGenericOAuthConfig } from "./oauth-config";
import {
	ensureOidcDemoClient,
	isOidcDemoAuthorizationRequest,
	normalizeOidcDemoAuthorizationResponse,
} from "./oidc-demo-client";
import { createAuthPlugins, TRUSTED_ORIGIN_HOSTS } from "./plugins";
import type { PrivacyExportMessage } from "./privacy-export";
import {
	handlePrivacyExportBatch,
	hasPrivacyExportRuntime,
	PRIVACY_EXPORT_QUEUE_NAME,
	sweepExpiredPrivacyExports,
} from "./privacy-export";
import { handleProviderNamespaceGovernedRequest } from "./provider-namespace-governance";
import { createDurableObjectRateLimitStorage } from "./rate-limit-storage";
import { resolveAuthRuntimeSecrets } from "./runtime-secrets";
import {
	migrateLegacySCIMProviderOwnership,
	parseSCIMOwnershipMigrationInput,
} from "./scim-ownership-migration";
import { getActiveSecretsStoreReadiness } from "./secrets-store-readiness";
import { createSiweRequestBodyLimitMiddleware } from "./siwe-request-body-limit";
import { handleSuperAdminGovernedRequest } from "./super-admin-governance";

export { RateLimitDurableObject } from "./rate-limit";

type AppEnv = {
	Bindings: CloudflareBindings;
	Variables: {
		auth: Auth;
		runtimeEnv: CloudflareBindings;
		activeSecretsUnavailable: boolean;
	};
};

const app = new Hono<AppEnv>();

type RateLimitConfig = {
	enabled?: boolean;
	window?: number;
	max?: number;
	storage?: string;
	customStorage?: unknown;
	customRules?: unknown;
};

/** Return whether a verified role may inspect the runtime rate-limit posture. */
export const canReadAdminRateLimitConfig = (
	role: string | null | undefined,
): boolean => hasAdminControlPermission(role, "security.policy.read");

type MigrationTable = {
	table: string;
	fields?: Record<string, unknown>;
};

type MigrationFeature = "organization-advanced" | undefined;

type MigrationFeatureSelection =
	| { feature: MigrationFeature }
	| { error: "invalid_migration_feature" };

type DatabaseTableRow = {
	name: string;
};

type CutoverMarkerRow = {
	complete: boolean;
};

type OrganizationMemberRoleRow = {
	role: string;
};

type EntitlementSubscriptionRow = {
	plan: string;
	status: "active" | "trialing";
	periodEnd: Date | string | null;
	cancelAtPeriodEnd: boolean | null;
	seats: number | null;
};

type CountRow = {
	count: number | string;
};

type OrganizationSubjectRow = {
	organizationId: string;
};

type SSOProviderSubjectRow = {
	organizationId: string | null;
	userId: string | null;
};

type InvitationSubjectRow = {
	organizationId: string;
	email: string;
	status: string;
};

type VersionMetadataSnapshot = {
	id: string | null;
	tag: string | null;
	timestamp: string | null;
};

type RuntimeConfigIssue =
	| "active_secrets_store_unavailable"
	| "missing_cinaauth_secret"
	| "weak_cinaauth_secret"
	| "missing_cinaadmin_oidc_client_secret"
	| "weak_cinaadmin_oidc_client_secret"
	| "missing_cinaadmin_oidc_bridge_secret"
	| "weak_cinaadmin_oidc_bridge_secret"
	| "missing_hyperdrive_binding"
	| "missing_legacy_d1_binding"
	| "missing_version_metadata"
	| "missing_cinaauth_migration_token"
	| "weak_cinaauth_migration_token"
	| "missing_delivery_queue"
	| "missing_delivery_service"
	| "missing_erasure_service"
	| "missing_delivery_webhook_url"
	| "invalid_delivery_webhook_url"
	| "missing_delivery_webhook_secret"
	| "weak_delivery_webhook_secret"
	| "missing_privacy_export_queue"
	| "missing_privacy_export_bucket"
	| "missing_privacy_export_key"
	| "weak_privacy_export_key"
	| "missing_erasure_webhook_url"
	| "invalid_erasure_webhook_url"
	| "missing_erasure_webhook_secret"
	| "weak_erasure_webhook_secret"
	| "invalid_cinaauth_cutover_state"
	| "invalid_cinaauth_url";

const REQUIRED_DATABASE_TABLES = [
	"user",
	"session",
	"account",
	"verification",
	D1_CUTOVER_MARKER_TABLE,
] as const;
const DATABASE_INVARIANT_TABLES = [
	"user",
	"account",
	"ssoProvider",
	"scimProvider",
] as const;
const DATABASE_READINESS_TABLES = [
	...new Set([...REQUIRED_DATABASE_TABLES, ...DATABASE_INVARIANT_TABLES]),
];

export const hasDatabaseInvariantTables = (tableNames: Iterable<string>) => {
	const present = new Set(tableNames);
	return DATABASE_INVARIANT_TABLES.every((table) => present.has(table));
};

const reportedRuntimeConfigIssues = new Set<string>();

let cutoverReadinessCache:
	| {
			versionId: string;
			checkedAt: number;
			ready: boolean;
	  }
	| undefined;

const MAINTENANCE_PATHS = new Set([
	"/",
	"/api/ready",
	"/api/migrate",
	"/api/migrate/d1",
	"/api/migrate/scim-provider-ownership",
]);

const FRESH_SESSION_MUTATION_PATHS = new Set([
	// Initiating an external account-linking flow changes the current user's
	// sign-in credentials after its provider callback completes.
	"/api/auth/link-social",
	"/api/auth/oauth2/link",
	// Removing a sign-in credential is a high-risk self-service mutation.
	"/api/auth/passkey/delete-passkey",
	// High-risk global Admin mutations. Keep stop-impersonating outside this
	// list so an impersonated session can always recover the original admin
	// session even after the step-up window expires.
	"/api/auth/admin/create-user",
	"/api/auth/admin/revoke-user-session",
	"/api/auth/admin/revoke-user-sessions",
	"/api/auth/admin/ban-user",
	"/api/auth/admin/unban-user",
	"/api/auth/admin/remove-user",
	"/api/auth/admin/set-role",
	"/api/auth/admin/update-user",
	"/api/auth/admin/set-user-password",
	"/api/auth/admin/reset-2fa",
	"/api/auth/admin/unbind-wallet",
	"/api/auth/admin/delete-user-passkey",
	"/api/auth/admin/update-user-passkey",
	"/api/auth/admin/impersonate-user",
	"/api/auth/api-key/create",
	"/api/auth/api-key/update",
	"/api/auth/api-key/delete",
	"/api/auth/organization/create",
	"/api/auth/organization/update",
	"/api/auth/organization/delete",
	"/api/auth/organization/invite-member",
	"/api/auth/organization/cancel-invitation",
	"/api/auth/organization/remove-member",
	"/api/auth/organization/update-member-role",
	"/api/auth/organization/leave",
	"/api/auth/organization/create-role",
	"/api/auth/organization/update-role",
	"/api/auth/organization/delete-role",
	"/api/auth/organization/create-team",
	"/api/auth/organization/update-team",
	"/api/auth/organization/remove-team",
	"/api/auth/organization/add-team-member",
	"/api/auth/organization/remove-team-member",
	"/api/auth/sso/register",
	"/api/auth/sso/update-provider",
	"/api/auth/sso/delete-provider",
	"/api/auth/sso/request-domain-verification",
	"/api/auth/sso/verify-domain",
	"/api/auth/scim/generate-token",
	"/api/auth/scim/delete-provider-connection",
	"/api/auth/oauth2/register",
	"/api/auth/oauth2/create-client",
	"/api/auth/oauth2/update-client",
	"/api/auth/oauth2/client/rotate-secret",
	"/api/auth/oauth2/delete-client",
	"/api/auth/oauth2/update-consent",
	"/api/auth/oauth2/delete-consent",
	"/api/auth/subscription/upgrade",
	"/api/auth/subscription/cancel",
	"/api/auth/subscription/restore",
	"/api/auth/subscription/billing-portal",
]);

const FRESH_SESSION_GET_PATHS = new Set(["/api/auth/audit/export"]);

const canonicalizeProtectedPath = (pathname: string) =>
	pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname;

const withNoStore = (response: Response) => {
	response.headers.set("Cache-Control", "no-store");
	return response;
};

/** Returns true only for non-future sessions inside the sensitive-action window. */
export const isFreshSecuritySession = (
	createdAt: Date | string,
	now = Date.now(),
	freshAgeSeconds = SECURITY_FRESH_AGE_SECONDS,
) => {
	const createdAtMs = new Date(createdAt).getTime();
	const age = now - createdAtMs;
	return (
		Number.isFinite(createdAtMs) && age >= 0 && age < freshAgeSeconds * 1000
	);
};

/** Classifies privileged operations that require a recent sign-in. */
export const requiresFreshSessionForMutation = (
	pathname: string,
	method: string,
) => {
	const normalizedMethod = method.toUpperCase();
	const canonicalPathname = canonicalizeProtectedPath(pathname);
	return (
		(normalizedMethod === "POST" &&
			FRESH_SESSION_MUTATION_PATHS.has(canonicalPathname)) ||
		(normalizedMethod === "GET" &&
			FRESH_SESSION_GET_PATHS.has(canonicalPathname))
	);
};

type FreshSessionMutationRejection = {
	status: 401 | 403;
	code: "UNAUTHORIZED" | "SESSION_NOT_FRESH";
	message: "Authentication required" | "Recent authentication required";
};

/**
 * Returns the authoritative session rejection for a protected mutation.
 * Unclassified paths are intentionally ignored, including ordinary reads and
 * impersonation exit.
 */
export const getFreshSessionMutationRejection = (
	pathname: string,
	method: string,
	createdAt: Date | string | undefined,
	now = Date.now(),
): FreshSessionMutationRejection | undefined => {
	if (!requiresFreshSessionForMutation(pathname, method)) return undefined;
	if (createdAt === undefined) {
		return {
			status: 401,
			code: "UNAUTHORIZED",
			message: "Authentication required",
		};
	}
	if (!isFreshSecuritySession(createdAt, now)) {
		return {
			status: 403,
			code: "SESSION_NOT_FRESH",
			message: "Recent authentication required",
		};
	}
	return undefined;
};

const MAX_ENTITLEMENT_REQUEST_BODY_BYTES = 64 * 1024;
const SAFE_SUBJECT_ID_PATTERN = /^[^\u0000-\u001f\u007f]{1,256}$/;

type EntitlementSubject = {
	type: "user" | "organization";
	id: string;
};

type EntitlementSubjectResolution =
	| {
			success: true;
			subject: EntitlementSubject;
			usageReferenceId: string;
	  }
	| {
			success: false;
			code:
				| "ENTITLEMENT_REQUEST_BODY_INVALID"
				| "ENTITLEMENT_SUBJECT_NOT_FOUND";
	  };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const cancelRequestBody = async (request: Request, reason: string) => {
	try {
		await request.body?.cancel(reason);
	} catch {
		// Rejection is already final; cancellation is best-effort cleanup.
	}
};

export const readBoundedJsonBody = async (
	request: Request,
): Promise<Record<string, unknown> | undefined> => {
	const declaredLength = Number(request.headers.get("content-length"));
	if (
		Number.isFinite(declaredLength) &&
		declaredLength > MAX_ENTITLEMENT_REQUEST_BODY_BYTES
	) {
		await cancelRequestBody(
			request,
			"Request body exceeds the configured limit",
		);
		return undefined;
	}

	let inspectionBody: ReadableStream<Uint8Array> | null;
	try {
		inspectionBody = request.clone().body;
	} catch {
		return undefined;
	}
	if (!inspectionBody) return undefined;

	const reader = inspectionBody.getReader();
	const chunks: Uint8Array[] = [];
	let byteLength = 0;
	try {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) break;
			byteLength += chunk.value.byteLength;
			if (byteLength > MAX_ENTITLEMENT_REQUEST_BODY_BYTES) {
				const clonedCancellation = reader
					.cancel("Request body exceeds the configured limit")
					.catch(() => undefined);
				await cancelRequestBody(
					request,
					"Request body exceeds the configured limit",
				);
				await clonedCancellation;
				return undefined;
			}
			chunks.push(chunk.value);
		}
	} catch {
		const clonedCancellation = reader
			.cancel("Request body could not be read")
			.catch(() => undefined);
		await cancelRequestBody(request, "Request body could not be read");
		await clonedCancellation;
		return undefined;
	} finally {
		reader.releaseLock();
	}

	const bytes = new Uint8Array(byteLength);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	try {
		const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
		if (isRecord(parsed)) return parsed;
	} catch {
		// Fall through to cancel the preserved body for a rejected request.
	}
	await cancelRequestBody(request, "Request body must be a JSON object");
	return undefined;
};

const getSafeSubjectId = (
	value: unknown,
	optional = false,
): string | undefined => {
	if (value === undefined && optional) return undefined;
	if (typeof value !== "string") return undefined;
	const normalized = value.trim();
	return SAFE_SUBJECT_ID_PATTERN.test(normalized) ? normalized : undefined;
};

const queryActiveEntitlementSubscriptions = async (
	database: ReturnType<typeof createDatabase>,
	subjectId: string,
) => {
	const result = await database.query<EntitlementSubscriptionRow>(
		'SELECT "plan", "status", "periodEnd", "cancelAtPeriodEnd", "seats" FROM "subscription" WHERE "referenceId" = $1 AND "status" IN (\'active\', \'trialing\') ORDER BY "updatedAt" DESC LIMIT 2',
		[subjectId],
	);
	return result.rows satisfies EntitlementSubscription[];
};

const hasOrganizationMembership = async (
	database: ReturnType<typeof createDatabase>,
	organizationId: string,
	userId: string,
) => {
	const membership = await database.query<OrganizationMemberRoleRow>(
		'SELECT "role" FROM "member" WHERE "organizationId" = $1 AND "userId" = $2 LIMIT 1',
		[organizationId, userId],
	);
	return membership.rows.length > 0;
};

const resolveEntitlementSubject = async ({
	policy,
	request,
	userId,
	userEmail,
	activeOrganizationId,
	database,
}: {
	policy: EntitlementRequestPolicy;
	request: Request;
	userId: string;
	userEmail: string;
	activeOrganizationId?: string | null;
	database: ReturnType<typeof createDatabase>;
}): Promise<EntitlementSubjectResolution> => {
	if (policy.subjectSource === "user") {
		return {
			success: true,
			subject: { type: "user", id: userId },
			usageReferenceId: userId,
		};
	}

	if (policy.subjectSource === "organization-query") {
		const values = new URL(request.url).searchParams.getAll("organizationId");
		const organizationId =
			values.length === 1 ? getSafeSubjectId(values[0]) : undefined;
		return organizationId
			? {
					success: true,
					subject: { type: "organization", id: organizationId },
					usageReferenceId: organizationId,
				}
			: { success: false, code: "ENTITLEMENT_REQUEST_BODY_INVALID" };
	}

	const body = await readBoundedJsonBody(request);
	if (!body) {
		return { success: false, code: "ENTITLEMENT_REQUEST_BODY_INVALID" };
	}

	if (
		policy.subjectSource === "organization-body" ||
		policy.subjectSource === "organization-or-user-body"
	) {
		const requestedOrganizationId = getSafeSubjectId(body.organizationId, true);
		if (body.organizationId !== undefined && !requestedOrganizationId) {
			return { success: false, code: "ENTITLEMENT_REQUEST_BODY_INVALID" };
		}
		const organizationId =
			requestedOrganizationId ||
			(policy.subjectSource === "organization-body"
				? getSafeSubjectId(activeOrganizationId, true)
				: undefined);
		if (organizationId) {
			return {
				success: true,
				subject: { type: "organization", id: organizationId },
				usageReferenceId: organizationId,
			};
		}
		if (policy.subjectSource === "organization-or-user-body") {
			return {
				success: true,
				subject: { type: "user", id: userId },
				usageReferenceId: userId,
			};
		}
		return { success: false, code: "ENTITLEMENT_REQUEST_BODY_INVALID" };
	}

	if (policy.subjectSource === "team-body") {
		const teamId = getSafeSubjectId(body.teamId);
		if (!teamId) {
			return { success: false, code: "ENTITLEMENT_REQUEST_BODY_INVALID" };
		}
		const team = await database.query<OrganizationSubjectRow>(
			'SELECT "organizationId" FROM "team" WHERE "id" = $1 LIMIT 1',
			[teamId],
		);
		const organizationId = team.rows[0]?.organizationId;
		return organizationId
			? {
					success: true,
					subject: { type: "organization", id: organizationId },
					usageReferenceId: teamId,
				}
			: { success: false, code: "ENTITLEMENT_SUBJECT_NOT_FOUND" };
	}

	if (policy.subjectSource === "invitation-body") {
		const invitationId = getSafeSubjectId(body.invitationId);
		if (!invitationId) {
			return { success: false, code: "ENTITLEMENT_REQUEST_BODY_INVALID" };
		}
		const invitation = await database.query<InvitationSubjectRow>(
			'SELECT "organizationId", "email", "status" FROM "invitation" WHERE "id" = $1 LIMIT 1',
			[invitationId],
		);
		const row = invitation.rows[0];
		if (
			!row ||
			row.status !== "pending" ||
			row.email.trim().toLowerCase() !== userEmail.trim().toLowerCase()
		) {
			return { success: false, code: "ENTITLEMENT_SUBJECT_NOT_FOUND" };
		}
		return {
			success: true,
			subject: { type: "organization", id: row.organizationId },
			usageReferenceId: row.organizationId,
		};
	}

	const providerId = getSafeSubjectId(body.providerId);
	if (!providerId) {
		return { success: false, code: "ENTITLEMENT_REQUEST_BODY_INVALID" };
	}
	const provider = await database.query<SSOProviderSubjectRow>(
		'SELECT "organizationId", "userId" FROM "ssoProvider" WHERE "providerId" = $1 LIMIT 1',
		[providerId],
	);
	const row = provider.rows[0];
	if (!row) return { success: false, code: "ENTITLEMENT_SUBJECT_NOT_FOUND" };
	if (row.organizationId) {
		return {
			success: true,
			subject: { type: "organization", id: row.organizationId },
			usageReferenceId: row.organizationId,
		};
	}
	if (row.userId === userId) {
		return {
			success: true,
			subject: { type: "user", id: userId },
			usageReferenceId: userId,
		};
	}
	return { success: false, code: "ENTITLEMENT_SUBJECT_NOT_FOUND" };
};

const getEntitlementUsage = async (
	database: ReturnType<typeof createDatabase>,
	policy: EntitlementRequestPolicy,
	subjectId: string,
	usageReferenceId: string,
) => {
	if (!policy.usageSource) return undefined;
	const queryByUsage = {
		"api-keys": {
			text: 'SELECT COUNT(*)::int AS "count" FROM "apikey" WHERE "referenceId" = $1',
			value: subjectId,
		},
		"oauth-clients": {
			text: 'SELECT COUNT(*)::int AS "count" FROM "oauthClient" WHERE "userId" = $1',
			value: subjectId,
		},
		"organization-members": {
			text: 'SELECT COUNT(*)::int AS "count" FROM "member" WHERE "organizationId" = $1',
			value: subjectId,
		},
		teams: {
			text: 'SELECT COUNT(*)::int AS "count" FROM "team" WHERE "organizationId" = $1',
			value: subjectId,
		},
		"team-members": {
			text: 'SELECT COUNT(*)::int AS "count" FROM "teamMember" WHERE "teamId" = $1',
			value: usageReferenceId,
		},
		"dynamic-roles": {
			text: 'SELECT COUNT(*)::int AS "count" FROM "organizationRole" WHERE "organizationId" = $1',
			value: subjectId,
		},
	} satisfies Record<
		NonNullable<EntitlementRequestPolicy["usageSource"]>,
		{ text: string; value: string }
	>;
	const query = queryByUsage[policy.usageSource];
	const result = await database.query<CountRow>(query.text, [query.value]);
	const count = Number(result.rows[0]?.count);
	return Number.isSafeInteger(count) && count >= 0 ? count : undefined;
};

const isTrustedOrigin = (origin: string) => {
	try {
		const url = new URL(origin);
		// Explicit allowlist (see TRUSTED_ORIGIN_HOSTS in plugins.ts) rather than a
		// *.cinagroup.com suffix match, so a forgotten/takeover-prone subdomain
		// cannot make credentialed cross-origin calls against the auth API.
		return url.protocol === "https:" && TRUSTED_ORIGIN_HOSTS.has(url.hostname);
	} catch {
		return false;
	}
};

const isHttpsUrl = (value: string | undefined) => {
	if (!value) return false;
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
};

export const isVersionMetadata = (
	value: unknown,
): value is WorkerVersionMetadata => {
	const metadata = value as WorkerVersionMetadata | undefined;
	return typeof metadata?.id === "string" && typeof metadata.tag === "string";
};

const isDeliveryQueue = (value: unknown): value is Queue<DeliveryMessage> =>
	typeof (value as Queue<DeliveryMessage> | undefined)?.send === "function";

const isFetcher = (value: unknown): value is Fetcher =>
	typeof (value as Fetcher | undefined)?.fetch === "function";

const isPrivacyExportQueue = (
	value: unknown,
): value is Queue<PrivacyExportMessage> =>
	typeof (value as Queue<PrivacyExportMessage> | undefined)?.send ===
	"function";

const isR2Bucket = (value: unknown): value is R2Bucket =>
	typeof (value as R2Bucket | undefined)?.put === "function" &&
	typeof (value as R2Bucket | undefined)?.get === "function";

const isD1Database = (value: unknown): value is D1Database =>
	typeof (value as D1Database | undefined)?.prepare === "function";

export const getCutoverState = (env: CloudflareBindings) =>
	env.CINAAUTH_CUTOVER_STATE === "live" ? "live" : "maintenance";

export const getConfiguredAccountProviderIds = (env: CloudflareBindings) => [
	...new Set([
		...Object.keys(getProductionSocialProviders(env)),
		...parseProductionGenericOAuthConfig(env.GENERIC_OAUTH_CONFIG).map(
			(provider) => provider.providerId,
		),
	]),
];

const parseBearerToken = (authorization: string | undefined) => {
	if (!authorization) return undefined;
	const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
	return match?.[1];
};

const sha256 = async (value: string) =>
	new Uint8Array(
		await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
	);

export const secureEqual = async (
	actual: string | undefined,
	expected: string | undefined,
) => {
	if (!actual || !expected) return false;
	const [actualHash, expectedHash] = await Promise.all([
		sha256(actual),
		sha256(expected),
	]);
	let diff = actualHash.length ^ expectedHash.length;
	for (let i = 0; i < actualHash.length; i++) {
		diff |= actualHash[i]! ^ expectedHash[i]!;
	}
	return diff === 0;
};

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

export const getVersionMetadata = (
	env: CloudflareBindings,
): VersionMetadataSnapshot => {
	if (!isVersionMetadata(env.VERSION_METADATA)) {
		return {
			id: null,
			tag: null,
			timestamp: null,
		};
	}

	const timestamp = env.VERSION_METADATA.timestamp;
	return {
		id: env.VERSION_METADATA.id,
		tag: env.VERSION_METADATA.tag,
		timestamp: timestamp ? String(timestamp) : null,
	};
};

export const getRuntimeConfigIssues = (
	env: CloudflareBindings,
): RuntimeConfigIssue[] => {
	const issues: RuntimeConfigIssue[] = [];
	const authSecret =
		typeof env.CINAAUTH_SECRET === "string" ? env.CINAAUTH_SECRET : "";

	if (!authSecret) {
		issues.push("missing_cinaauth_secret");
	} else if (authSecret.length < 32) {
		issues.push("weak_cinaauth_secret");
	}
	if (!env.CINAADMIN_OIDC_CLIENT_SECRET) {
		issues.push("missing_cinaadmin_oidc_client_secret");
	} else if (!isValidAdminOidcClientSecret(env.CINAADMIN_OIDC_CLIENT_SECRET)) {
		issues.push("weak_cinaadmin_oidc_client_secret");
	}
	if (!env.CINAADMIN_OIDC_BRIDGE_SECRET) {
		issues.push("missing_cinaadmin_oidc_bridge_secret");
	} else if (env.CINAADMIN_OIDC_BRIDGE_SECRET.length < 32) {
		issues.push("weak_cinaadmin_oidc_bridge_secret");
	}

	if (!isHyperdrive(env.HYPERDRIVE)) {
		issues.push("missing_hyperdrive_binding");
	}
	if (!isD1Database(env.LEGACY_D1)) {
		issues.push("missing_legacy_d1_binding");
	}

	if (!isVersionMetadata(env.VERSION_METADATA)) {
		issues.push("missing_version_metadata");
	}

	if (!env.CINAAUTH_MIGRATION_TOKEN) {
		issues.push("missing_cinaauth_migration_token");
	} else if (env.CINAAUTH_MIGRATION_TOKEN.length < 32) {
		issues.push("weak_cinaauth_migration_token");
	}

	if (!isDeliveryQueue(env.CINAAUTH_DELIVERY_QUEUE)) {
		issues.push("missing_delivery_queue");
	}
	if (!isFetcher(env.CINAAUTH_DELIVERY_SERVICE)) {
		issues.push("missing_delivery_service");
	}
	if (!isFetcher(env.CINAAUTH_ERASURE_SERVICE)) {
		issues.push("missing_erasure_service");
	}

	if (!env.CINAAUTH_DELIVERY_WEBHOOK_URL) {
		issues.push("missing_delivery_webhook_url");
	} else if (!isHttpsUrl(env.CINAAUTH_DELIVERY_WEBHOOK_URL)) {
		issues.push("invalid_delivery_webhook_url");
	}

	if (!env.CINAAUTH_DELIVERY_WEBHOOK_SECRET) {
		issues.push("missing_delivery_webhook_secret");
	} else if (env.CINAAUTH_DELIVERY_WEBHOOK_SECRET.length < 32) {
		issues.push("weak_delivery_webhook_secret");
	}

	if (!isPrivacyExportQueue(env.CINAAUTH_PRIVACY_EXPORT_QUEUE)) {
		issues.push("missing_privacy_export_queue");
	}
	if (!isR2Bucket(env.CINAAUTH_PRIVACY_EXPORTS)) {
		issues.push("missing_privacy_export_bucket");
	}
	if (!env.CINAAUTH_PRIVACY_EXPORT_KEY) {
		issues.push("missing_privacy_export_key");
	} else if (env.CINAAUTH_PRIVACY_EXPORT_KEY.length < 32) {
		issues.push("weak_privacy_export_key");
	}

	const hasErasureUrl = Boolean(env.CINAAUTH_ERASURE_WEBHOOK_URL);
	const hasErasureSecret = Boolean(env.CINAAUTH_ERASURE_WEBHOOK_SECRET);
	if (hasErasureUrl || hasErasureSecret) {
		if (!hasErasureUrl) {
			issues.push("missing_erasure_webhook_url");
		} else if (!isHttpsUrl(env.CINAAUTH_ERASURE_WEBHOOK_URL)) {
			issues.push("invalid_erasure_webhook_url");
		}
		if (!hasErasureSecret) {
			issues.push("missing_erasure_webhook_secret");
		} else if (env.CINAAUTH_ERASURE_WEBHOOK_SECRET!.length < 32) {
			issues.push("weak_erasure_webhook_secret");
		}
	}

	if (
		env.CINAAUTH_CUTOVER_STATE !== "maintenance" &&
		env.CINAAUTH_CUTOVER_STATE !== "live"
	) {
		issues.push("invalid_cinaauth_cutover_state");
	}

	if (!isHttpsUrl(env.CINAAUTH_URL || "https://auth.cinaseek.ai")) {
		issues.push("invalid_cinaauth_url");
	}

	return issues;
};

const logRuntimeConfigIssuesOnce = (
	issues: RuntimeConfigIssue[],
	env: CloudflareBindings,
) => {
	const version = getVersionMetadata(env);
	const key = `${version.id ?? "unknown"}:${issues.join(",")}`;
	if (reportedRuntimeConfigIssues.has(key)) {
		return;
	}
	reportedRuntimeConfigIssues.add(key);
	console.error(
		JSON.stringify({
			level: "error",
			message: "cinaauth.runtime_config_invalid",
			issues,
			version,
		}),
	);
};

export const isAuthorizedMigrationRequest = async (
	headers: Headers,
	env: CloudflareBindings,
) => {
	const provided =
		headers.get("x-cinaauth-migration-token") ||
		parseBearerToken(headers.get("authorization") ?? undefined);

	return (
		(await secureEqual(provided, env.CINAAUTH_MIGRATION_TOKEN)) ||
		(await secureEqual(provided, env.CINAAUTH_D1_MIGRATION_TOKEN))
	);
};

/**
 * Selects the one intentionally exposed feature-schema migration. Unknown or
 * repeated values fail closed so this endpoint cannot become a generic plugin
 * composition surface.
 */
export const getMigrationFeatureSelection = (
	url: URL,
): MigrationFeatureSelection => {
	const values = url.searchParams.getAll("feature");
	if (values.length === 0) return { feature: undefined };
	if (values.length === 1 && values[0] === "organization-advanced") {
		return { feature: "organization-advanced" };
	}
	return { error: "invalid_migration_feature" };
};

const getMigrationPlan = async (
	env: CloudflareBindings,
	feature: MigrationFeature,
) => {
	const { getMigrations } = await import("cinaauth/db/migration");
	const database = createDatabase(env);
	const configuredProviderIds = getConfiguredAccountProviderIds(env);
	let migrations: Awaited<ReturnType<typeof getMigrations>>;
	try {
		migrations = await getMigrations({
			database,
			plugins: createAuthPlugins(env, {
				advancedOrganization: feature === "organization-advanced",
			}),
		});
	} catch (error) {
		await database.end();
		throw error;
	}
	const created = (migrations.toBeCreated as MigrationTable[]).map(
		(table) => table.table,
	);
	const added = (migrations.toBeAdded as MigrationTable[]).map((table) => ({
		table: table.table,
		fields: Object.keys(table.fields ?? {}),
	}));

	return {
		...migrations,
		installInvariants: () =>
			installDatabaseInvariants(database, configuredProviderIds),
		close: () => database.end(),
		summary: {
			pendingCount:
				created.length +
				added.reduce((sum, table) => sum + table.fields.length, 0),
			created,
			added,
			requiredTables: [...REQUIRED_DATABASE_TABLES],
			requiredInvariants: [...DATABASE_INVARIANT_IDS],
		},
	};
};

const getDatabaseReadiness = async (env: CloudflareBindings) => {
	const missingInvariants: DatabaseInvariantReadiness = {
		ok: false,
		required: [...DATABASE_INVARIANT_IDS],
		installed: [] as string[],
		missing: [...DATABASE_INVARIANT_IDS],
	};
	if (!isHyperdrive(env.HYPERDRIVE)) {
		return {
			ok: false,
			cutoverMarker: false,
			requiredTables: [...REQUIRED_DATABASE_TABLES],
			presentTables: [],
			missingTables: [...REQUIRED_DATABASE_TABLES],
			invariants: missingInvariants,
		};
	}

	const database = createDatabase(env);
	let rows: DatabaseTableRow[];
	let cutoverMarker = false;
	let invariants = missingInvariants;
	try {
		const result = await database.query<DatabaseTableRow>(
			`SELECT table_name AS name
			 FROM information_schema.tables
			 WHERE table_schema = ANY(current_schemas(false))
				AND table_name = ANY($1::text[])
			 ORDER BY table_name`,
			[DATABASE_READINESS_TABLES],
		);
		rows = result.rows;
		if (rows.some((row) => row.name === D1_CUTOVER_MARKER_TABLE)) {
			const markerResult = await database.query<CutoverMarkerRow>(
				`SELECT EXISTS(
					SELECT 1
					FROM "${D1_CUTOVER_MARKER_TABLE}"
					WHERE "name" = $1
				) AS complete`,
				[D1_CUTOVER_MARKER_NAME],
			);
			cutoverMarker = markerResult.rows[0]?.complete === true;
		}
		const presentTableNames = new Set(rows.map((row) => row.name));
		if (hasDatabaseInvariantTables(presentTableNames)) {
			invariants = await getDatabaseInvariantReadiness(
				database,
				getConfiguredAccountProviderIds(env),
			);
		}
	} finally {
		await database.end();
	}
	const presentTables = new Set(rows.map((row) => row.name));
	const missingTables = REQUIRED_DATABASE_TABLES.filter(
		(table) => !presentTables.has(table),
	);

	return {
		ok: missingTables.length === 0 && cutoverMarker && invariants.ok,
		cutoverMarker,
		requiredTables: [...REQUIRED_DATABASE_TABLES],
		presentTables: [...presentTables],
		missingTables,
		invariants,
	};
};

const isDatabaseCutoverReady = async (env: CloudflareBindings) => {
	const versionId = getVersionMetadata(env).id ?? "unknown";
	const now = Date.now();
	if (
		cutoverReadinessCache?.versionId === versionId &&
		now - cutoverReadinessCache.checkedAt < 5_000
	) {
		return cutoverReadinessCache.ready;
	}
	const ready = (await getDatabaseReadiness(env)).ok;
	cutoverReadinessCache = { versionId, checkedAt: now, ready };
	return ready;
};

// Middleware
app.use(
	"*",
	cors({
		origin: (origin) =>
			origin && isTrustedOrigin(origin) ? origin : undefined,
		allowHeaders: [
			"Content-Type",
			"Authorization",
			"x-captcha-response",
			"x-cinaauth-migration-token",
			"electron-origin",
		],
		allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		exposeHeaders: ["set-auth-token", "set-auth-jwt", "WWW-Authenticate"],
		credentials: true,
	}),
);

// Create auth instance per request with current env bindings.
app.use("*", async (c, next) => {
	const pathname = new URL(c.req.url).pathname;
	let runtimeEnv: CloudflareBindings;
	try {
		runtimeEnv = await resolveAuthRuntimeSecrets(c.env);
		c.set("activeSecretsUnavailable", false);
	} catch (error) {
		c.set("activeSecretsUnavailable", true);
		c.set("runtimeEnv", c.env);
		logRuntimeConfigIssuesOnce(["active_secrets_store_unavailable"], c.env);
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.active_secrets.unavailable",
				error: errorMessage(error),
				version: getVersionMetadata(c.env),
			}),
		);
		if (pathname === "/api/ready") {
			await next();
			return;
		}
		return withNoStore(c.json({ error: "Server misconfigured" }, 503));
	}
	c.set("runtimeEnv", runtimeEnv);
	const runtimeConfigIssues = getRuntimeConfigIssues(runtimeEnv);
	if (runtimeConfigIssues.length > 0) {
		logRuntimeConfigIssuesOnce(runtimeConfigIssues, c.env);
		if (pathname === "/api/ready") {
			await next();
			return;
		}
		return withNoStore(c.json({ error: "Server misconfigured" }, 503));
	}

	if (
		getCutoverState(c.env) === "maintenance" &&
		!MAINTENANCE_PATHS.has(pathname)
	) {
		return withNoStore(
			c.json(
				{ error: "Authentication service is in database maintenance" },
				503,
			),
		);
	}

	if (!isAuthHandlerRequestPath(pathname)) {
		await next();
		return;
	}

	try {
		if (!(await isDatabaseCutoverReady(c.env))) {
			return withNoStore(
				c.json({ error: "Authentication database cutover is incomplete" }, 503),
			);
		}
	} catch {
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.cutover_guard.failed",
				version: getVersionMetadata(c.env),
			}),
		);
		return withNoStore(
			c.json({ error: "Authentication database is unavailable" }, 503),
		);
	}

	const requiredDeliveryProvider = getRequiredDeliveryProvider(pathname);
	if (requiredDeliveryProvider) {
		const delivery = await getDeliveryProviderCapabilities(runtimeEnv);
		if (!delivery[requiredDeliveryProvider]) {
			return withNoStore(
				c.json(
					{
						success: false,
						code: "DELIVERY_PROVIDER_UNAVAILABLE",
						message: "The required delivery provider is unavailable",
					},
					503,
				),
			);
		}
	}

	// Run inside the ExecutionContext store so the request-scoped auth instance's
	// background-task handler can reach ctx.waitUntil — including any task the
	// first-time instance construction (plugin init) might schedule.
	await runWithExecutionCtx(c.executionCtx, async () => {
		c.set("auth", createAuth(runtimeEnv));
		await next();
	});
});

// This guard must be registered before every concrete /api/auth route. Hono
// composes matching handlers in registration order, so placing it beside the
// catch-all would not protect an earlier custom Auth handler.
app.use(
	"/api/auth/*",
	createImpersonationMutationGuardMiddleware<AppEnv>({
		getSession: async (c) => {
			const session = await c.var.auth.api.getSession({
				headers: c.req.raw.headers,
				query: { disableCookieCache: true },
			});
			if (!session) return null;
			return {
				user: { id: session.user.id },
				session: {
					impersonatedBy: (
						session.session as typeof session.session & {
							impersonatedBy?: string | null;
						}
					).impersonatedBy,
				},
			};
		},
		getAuditWriter: (c) => {
			const serviceKey = c.var.runtimeEnv.CINAUTH_ADMIN_SERVICE_KEY;
			const auditApi = c.var.auth.api as typeof c.var.auth.api & {
				logAudit?: (input: {
					headers: Headers;
					body: ImpersonationMutationAuditBody;
				}) => Promise<unknown>;
			};
			const logAudit = auditApi.logAudit;
			if (!serviceKey || typeof logAudit !== "function") {
				return undefined;
			}
			return {
				serviceKey,
				write: (input) => logAudit.call(auditApi, input),
			};
		},
		getVersion: (c) => getVersionMetadata(c.env),
		logEvent: (event) => {
			const serialized = JSON.stringify(event);
			if (event.level === "error") console.error(serialized);
			else console.warn(serialized);
		},
	}),
);

// Inspect the actual SIWE stream before every concrete Auth route. A cloned
// request keeps accepted bodies available to the downstream auth.handler.
app.use("/api/auth/*", createSiweRequestBodyLimitMiddleware<AppEnv>());

// Public, secret-free capability discovery. Login surfaces use this to avoid
// advertising providers that are not configured on the production Worker.
app.get("/api/auth/capabilities", async (c) => {
	const delivery = await getDeliveryProviderCapabilities(c.var.runtimeEnv);
	return withNoStore(c.json(getAuthCapabilities(c.env, delivery)));
});

// Cloudflare Access supports ES256 but can be strict about mixed-algorithm
// JWKS documents and explicit signing-key metadata. Keep the general JWKS
// unchanged while exposing a narrow compatibility view for this integration.
app.get(CLOUDFLARE_ACCESS_JWKS_PATH, async (c) => {
	const jwksUrl = new URL(c.req.url);
	jwksUrl.pathname = "/api/auth/jwks";
	jwksUrl.search = "";
	const upstream = await c.var.auth.handler(
		new Request(jwksUrl, {
			headers: { Accept: "application/json" },
		}),
	);
	if (!upstream.ok) return withNoStore(upstream);

	let normalized: ReturnType<typeof normalizeCloudflareAccessJwks>;
	try {
		normalized = normalizeCloudflareAccessJwks(await upstream.json());
	} catch {
		return withNoStore(
			c.json({ error: "Signing keys are temporarily unavailable" }, 503),
		);
	}
	if (normalized.keys.length === 0) {
		return withNoStore(
			c.json({ error: "No compatible signing key is available" }, 503),
		);
	}
	return withNoStore(c.json(normalized));
});

// Authenticated, no-store feature and limit snapshot. Stripe webhooks remain
// the subscription source of truth; this endpoint never calls Stripe inline.
app.get("/api/auth/entitlements", async (c) => {
	const session = await c.var.auth.api.getSession({
		headers: c.req.raw.headers,
		query: { disableCookieCache: true },
	});
	if (!session) {
		return withNoStore(
			c.json({ code: "UNAUTHORIZED", message: "Authentication required" }, 401),
		);
	}

	const organizationIds = new URL(c.req.url).searchParams.getAll(
		"organizationId",
	);
	if (organizationIds.length > 1) {
		return withNoStore(
			c.json(
				{ code: "INVALID_ORGANIZATION_ID", message: "Invalid organization" },
				400,
			),
		);
	}
	const organizationId = organizationIds[0]?.trim();
	if (
		organizationId !== undefined &&
		(organizationId.length === 0 ||
			organizationId.length > 128 ||
			/[\u0000-\u001f\u007f]/.test(organizationId))
	) {
		return withNoStore(
			c.json(
				{ code: "INVALID_ORGANIZATION_ID", message: "Invalid organization" },
				400,
			),
		);
	}

	const subject = organizationId
		? { type: "organization" as const, id: organizationId }
		: { type: "user" as const, id: session.user.id };
	const billing = getBillingRuntimeConfiguration(c.env);
	let database: ReturnType<typeof createDatabase> | undefined;
	try {
		if (organizationId || billing) database = createDatabase(c.env);
		if (
			organizationId &&
			!(await hasOrganizationMembership(
				database!,
				organizationId,
				session.user.id,
			))
		) {
			return withNoStore(
				c.json(
					{ code: "FORBIDDEN", message: "Organization access denied" },
					403,
				),
			);
		}

		const loaded = await loadEntitlementSnapshot({
			subject,
			billing,
			loadSubscriptions: async () =>
				queryActiveEntitlementSubscriptions(database!, subject.id),
		});
		if (!loaded.success) {
			return withNoStore(
				c.json(
					{
						code: loaded.code,
						message:
							loaded.code === "ENTITLEMENT_PLAN_UNMAPPED"
								? "Entitlement plan is not mapped"
								: "Entitlement subscription state is ambiguous",
					},
					503,
				),
			);
		}
		return withNoStore(c.json(loaded.snapshot));
	} catch (error) {
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.entitlements.failed",
				error: error instanceof Error ? error.message : String(error),
				version: getVersionMetadata(c.env),
			}),
		);
		return withNoStore(
			c.json(
				{
					code: "ENTITLEMENT_STORAGE_UNAVAILABLE",
					message: "Entitlements are temporarily unavailable",
				},
				503,
			),
		);
	} finally {
		await database?.end().catch(() => undefined);
	}
});

// Rate-limit configuration endpoint (read-only, for the admin console's
// security-policy page). Must be registered BEFORE the /api/auth/* catch-all
// so Hono routes it here instead of delegating to the auth handler.
app.get("/api/auth/admin/rate-limit-config", async (c) => {
	const session = await c.var.auth.api.getSession({
		headers: c.req.raw.headers,
	});
	const role = (session?.user as { role?: string } | undefined)?.role;
	if (!canReadAdminRateLimitConfig(role)) {
		return withNoStore(c.json({ error: "Forbidden" }, 403));
	}
	const rl = (c.var.auth.options as { rateLimit?: RateLimitConfig }).rateLimit;
	return withNoStore(
		c.json({
			enabled: rl?.enabled ?? true,
			window: rl?.window ?? 10,
			max: rl?.max ?? 100,
			storage: rl?.customStorage ? "durable-object" : (rl?.storage ?? "memory"),
			customRules: rl?.customRules ?? {},
		}),
	);
});

// Admin-triggered verification must not proxy the public delivery endpoints:
// all three are intentionally Turnstile-protected. This route authorizes the
// acting session, resolves the target internally, then invokes trusted server
// APIs that do not traverse the public HTTP captcha hook.
app.post("/api/auth/admin/send-verification", async (c) => {
	const auth = c.var.auth;
	const headers = c.req.raw.headers;
	const verificationApi = getAdminVerificationServerApi(auth.api);
	const rateLimitStorage = c.env.RATE_LIMITER
		? createDurableObjectRateLimitStorage(c.env)
		: null;
	const result = await handleAdminSendVerification(
		{
			serverApiAvailable: verificationApi !== null,
			getSession: async () => {
				const session = await auth.api.getSession({
					headers,
					query: { disableCookieCache: true },
				});
				if (!session) return null;
				return {
					user: {
						id: session.user.id,
						role: (session.user as { role?: string | null }).role,
					},
					session: { createdAt: session.session.createdAt },
				};
			},
			findUserById: async (userId) => {
				const context = await auth.$context;
				const user = await context.internalAdapter.findUserById(userId);
				if (!user) return null;
				return {
					id: user.id,
					email: user.email,
					phoneNumber: (user as { phoneNumber?: unknown }).phoneNumber,
				};
			},
			sendEmailOtp: async (input) => {
				if (!verificationApi) {
					throw new Error("Verification delivery API is unavailable");
				}
				await verificationApi.sendVerificationOTP({ body: input, headers });
			},
			sendMagicLink: async (input) => {
				if (!verificationApi) {
					throw new Error("Verification delivery API is unavailable");
				}
				await verificationApi.signInMagicLink({ body: input, headers });
			},
			sendPhoneOtp: async (input) => {
				if (!verificationApi) {
					throw new Error("Verification delivery API is unavailable");
				}
				await verificationApi.sendPhoneNumberOTP({ body: input, headers });
			},
			consumeRateLimit: rateLimitStorage?.consume,
			writeAuditEvent: async (event) => {
				if (!verificationApi) {
					throw new Error("Verification audit API is unavailable");
				}
				await verificationApi.logAudit({
					headers,
					body: {
						category: "identity",
						action: "identity.user.send_verification",
						result: "success",
						actorSite: "admin-console",
						targetType: "user",
						targetId: event.targetId,
						metadata: {
							actorId: event.actorId,
							channel: event.channel,
						},
					},
				});
			},
			logEvent: (event) => {
				const payload = JSON.stringify(event);
				if (event.level === "error") {
					console.error(payload);
				} else if (event.level === "warn") {
					console.warn(payload);
				} else {
					console.info(payload);
				}
			},
		},
		async () => {
			try {
				return { ok: true, body: await c.req.json() } as const;
			} catch {
				return { ok: false } as const;
			}
		},
	);
	const response = c.json(result.body, result.status);
	if (
		result.status === 429 &&
		result.retryAfter !== null &&
		result.retryAfter !== undefined
	) {
		response.headers.set("Retry-After", String(result.retryAfter));
		response.headers.set("X-Retry-After", String(result.retryAfter));
	}
	return withNoStore(response);
});

const ADMIN_CONFIGURATION_SERVICES = new Set<AdminConfigurationService>([
	"delivery",
	"erasure",
]);
const ADMIN_CONFIGURATION_ACTIONS = new Set<AdminConfigurationAction>([
	"status",
	"stage",
	"test",
	"activate",
	"rollback",
]);

// Secrets entered in the Admin console terminate at this authoritative route.
// The browser never receives a Cloudflare management token or a Service Binding;
// Auth validates, rate-limits, audits, signs, and forwards only fixed operations.
app.post("/api/admin/configuration/:service/:action", async (c) => {
	const serviceValue = c.req.param("service");
	const actionValue = c.req.param("action");
	if (
		!ADMIN_CONFIGURATION_SERVICES.has(
			serviceValue as AdminConfigurationService,
		) ||
		!ADMIN_CONFIGURATION_ACTIONS.has(actionValue as AdminConfigurationAction)
	) {
		return withNoStore(
			c.json(
				{
					ok: false,
					error: {
						code: "CONFIGURATION_ROUTE_NOT_FOUND",
						message: "Configuration route not found",
						status: 404,
					},
				},
				404,
			),
		);
	}
	const service = serviceValue as AdminConfigurationService;
	const action = actionValue as AdminConfigurationAction;
	const auth = c.var.auth;
	const headers = c.req.raw.headers;
	const rateLimitStorage = c.env.RATE_LIMITER
		? createDurableObjectRateLimitStorage(c.env)
		: null;
	const result = await handleAdminConfiguration({
		service,
		action,
		origin: headers.get("origin"),
		dependencies: {
			getSession: async () => {
				const session = await auth.api.getSession({
					headers,
					query: { disableCookieCache: true },
				});
				if (!session) return null;
				return {
					user: {
						id: session.user.id,
						role: (session.user as { role?: string | null }).role,
					},
					session: {
						createdAt: session.session.createdAt,
						impersonatedBy: (
							session.session as typeof session.session & {
								impersonatedBy?: string | null;
							}
						).impersonatedBy,
					},
				};
			},
			consumeRateLimit: rateLimitStorage?.consume,
			resolveSecret: async (selectedService) => {
				const secret =
					selectedService === "delivery"
						? c.var.runtimeEnv.CINAAUTH_DELIVERY_WEBHOOK_SECRET
						: c.var.runtimeEnv.CINAAUTH_ERASURE_WEBHOOK_SECRET;
				if (!secret || secret.length < 32) {
					throw new Error("Configuration service secret is unavailable");
				}
				return secret;
			},
			fetchService: async (selectedService, request) => {
				const binding =
					selectedService === "delivery"
						? c.env.CINAAUTH_DELIVERY_SERVICE
						: c.env.CINAAUTH_ERASURE_SERVICE;
				if (!isFetcher(binding)) {
					throw new Error("Configuration Service Binding is unavailable");
				}
				return binding.fetch(request);
			},
			writeAudit: async (event) => {
				const auditApi = auth.api as typeof auth.api & {
					logAudit?: (input: {
						headers: Headers;
						body: {
							category: string;
							action: string;
							result: "success" | "failure";
							actorSite: string;
							targetType: string;
							targetId: string;
							metadata: Record<string, unknown>;
						};
					}) => Promise<unknown>;
				};
				if (typeof auditApi.logAudit !== "function") {
					throw new Error("Configuration audit API is unavailable");
				}
				await auditApi.logAudit({
					headers,
					body: {
						category: event.service === "delivery" ? "integration" : "privacy",
						action: `configuration.${event.service}.${event.action}.${event.phase}`,
						result: event.phase === "failed" ? "failure" : "success",
						actorSite: "admin-console",
						targetType: "configuration",
						targetId: event.service,
						metadata: {
							actorId: event.actorId,
							expectedVersion: event.expectedVersion,
							...(event.resultVersion !== undefined
								? { resultVersion: event.resultVersion }
								: {}),
							...(event.resultRevision !== undefined
								? { resultRevision: event.resultRevision }
								: {}),
							...(event.failureCode !== undefined
								? { failureCode: event.failureCode }
								: {}),
							...(event.failureStatus !== undefined
								? { failureStatus: event.failureStatus }
								: {}),
						},
					},
				});
			},
			logEvent: (event) => {
				const serialized = JSON.stringify(event);
				if (event.level === "error") console.error(serialized);
				else if (event.level === "warn") console.warn(serialized);
				else console.info(serialized);
			},
		},
		readBody: async () => {
			if (!headers.get("content-type")?.startsWith("application/json")) {
				return { ok: false } as const;
			}
			const body = await readBoundedJsonBody(c.req.raw);
			return body
				? ({ ok: true, value: body } as const)
				: ({ ok: false } as const);
		},
	});
	const response = c.json(result.body, result.status);
	response.headers.set("Pragma", "no-cache");
	response.headers.set("X-Content-Type-Options", "nosniff");
	if (result.status === 429 && result.retryAfter) {
		response.headers.set("Retry-After", String(result.retryAfter));
		response.headers.set("X-Retry-After", String(result.retryAfter));
	}
	return withNoStore(response);
});

// Sensitive mutations require a fresh authoritative session. Commercial
// management paths evaluate the webhook-synchronized feature/limit policy
// before delegating to the public plugin endpoint contract.
app.use("/api/auth/*", async (c, next) => {
	const pathname = new URL(c.req.url).pathname;
	const requiresFreshSession = requiresFreshSessionForMutation(
		pathname,
		c.req.method,
	);
	const entitlementPolicy = getEntitlementRequestPolicy(pathname, c.req.method);
	if (!requiresFreshSession && !entitlementPolicy) {
		await next();
		return;
	}

	const session = await c.var.auth.api.getSession({
		headers: c.req.raw.headers,
		query: { disableCookieCache: true },
	});
	const freshSessionRejection = getFreshSessionMutationRejection(
		pathname,
		c.req.method,
		session?.session.createdAt,
	);
	if (freshSessionRejection) {
		return withNoStore(
			c.json(
				{
					code: freshSessionRejection.code,
					message: freshSessionRejection.message,
				},
				freshSessionRejection.status,
			),
		);
	}
	if (!session && entitlementPolicy) {
		return withNoStore(
			c.json({ code: "UNAUTHORIZED", message: "Authentication required" }, 401),
		);
	}
	if (!session) {
		await next();
		return;
	}
	if (!entitlementPolicy) {
		await next();
		return;
	}

	const billing = getBillingRuntimeConfiguration(c.env);
	let database: ReturnType<typeof createDatabase> | undefined;
	let downstreamFailure = false;
	try {
		database = createDatabase(c.env);
		const resolved = await resolveEntitlementSubject({
			policy: entitlementPolicy,
			request: c.req.raw,
			userId: session.user.id,
			userEmail: session.user.email,
			activeOrganizationId: (
				session.session as typeof session.session & {
					activeOrganizationId?: string | null;
				}
			).activeOrganizationId,
			database,
		});
		if (!resolved.success) {
			return withNoStore(
				c.json(
					{
						code: resolved.code,
						message:
							resolved.code === "ENTITLEMENT_SUBJECT_NOT_FOUND"
								? "Entitlement subject was not found"
								: "Invalid entitlement request",
					},
					resolved.code === "ENTITLEMENT_SUBJECT_NOT_FOUND" ? 404 : 400,
				),
			);
		}

		if (
			resolved.subject.type === "organization" &&
			entitlementPolicy.subjectSource !== "invitation-body" &&
			!(await hasOrganizationMembership(
				database,
				resolved.subject.id,
				session.user.id,
			))
		) {
			return withNoStore(
				c.json(
					{ code: "FORBIDDEN", message: "Organization access denied" },
					403,
				),
			);
		}

		const loaded = await loadEntitlementSnapshot({
			subject: resolved.subject,
			billing,
			loadSubscriptions: async () =>
				queryActiveEntitlementSubscriptions(database!, resolved.subject.id),
		});
		if (!loaded.success) {
			return withNoStore(
				c.json(
					{
						code: loaded.code,
						message: "Entitlement policy is temporarily unavailable",
					},
					503,
				),
			);
		}

		const hasFiniteLimit =
			entitlementPolicy.limit !== undefined &&
			loaded.snapshot.limits[entitlementPolicy.limit] !== null;
		const evaluateAndContinue = async () => {
			const currentUsage = hasFiniteLimit
				? await getEntitlementUsage(
						database!,
						entitlementPolicy,
						resolved.subject.id,
						resolved.usageReferenceId,
					)
				: undefined;
			const access = evaluateEntitlementAccess(
				loaded.snapshot,
				entitlementPolicy,
				currentUsage,
			);
			if (access.success) {
				try {
					await next();
				} catch (error) {
					downstreamFailure = true;
					throw error;
				}
			}
			return access;
		};
		const access = hasFiniteLimit
			? await withEntitlementCapacityLock(
					database,
					getEntitlementCapacityLockKey({
						subjectType: resolved.subject.type,
						subjectId: resolved.subject.id,
						limit: entitlementPolicy.limit!,
						usageReferenceId: resolved.usageReferenceId,
					}),
					evaluateAndContinue,
				)
			: await evaluateAndContinue();
		if (!access.success) {
			const message =
				access.code === "ENTITLEMENT_FEATURE_DISABLED"
					? "This feature is not available for the current plan"
					: access.code === "ENTITLEMENT_LIMIT_REACHED"
						? "The current plan limit has been reached"
						: "Entitlement usage is temporarily unavailable";
			return withNoStore(
				c.json(
					{ ...access, message },
					access.code === "ENTITLEMENT_FEATURE_DISABLED"
						? 403
						: access.code === "ENTITLEMENT_LIMIT_REACHED"
							? 409
							: 503,
				),
			);
		}
		return;
	} catch (error) {
		if (downstreamFailure) throw error;
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.entitlement_enforcement.failed",
				path: pathname,
				error: errorMessage(error),
				version: getVersionMetadata(c.env),
			}),
		);
		return withNoStore(
			c.json(
				{
					code: "ENTITLEMENT_STORAGE_UNAVAILABLE",
					message: "Entitlements are temporarily unavailable",
				},
				503,
			),
		);
	} finally {
		await database?.end().catch(() => undefined);
	}
});

// The issuer is the Worker root while CinaAuth's API base path is /api/auth.
// Publish both standards-based root discovery and a compatibility API alias.
app.on(
	["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
	[...AUTH_DISCOVERY_PATHS],
	async (c) => {
		if (c.req.method !== "GET" && c.req.method !== "HEAD") {
			return new Response(null, {
				status: 405,
				headers: { Allow: "GET, HEAD" },
			});
		}
		return withNoStore(
			await c.var.auth.handler(createCanonicalDiscoveryRequest(c.req.raw)),
		);
	},
);

// Auth catch-all route handler
app.use("/api/auth/oauth2/authorize", async (c, next) => {
	const isAdminRequest = isAdminOidcAuthorizationRequest(c.req.raw);
	const isDemoRequest = isOidcDemoAuthorizationRequest(c.req.raw);
	if (!isAdminRequest && !isDemoRequest) {
		await next();
		return;
	}

	const database = createDatabase(c.env);
	try {
		if (isAdminRequest) {
			await ensureAdminOidcClient(
				database,
				c.var.runtimeEnv.CINAADMIN_OIDC_CLIENT_SECRET,
			);
		} else {
			await ensureOidcDemoClient(database);
		}
	} catch (error) {
		console.error(
			JSON.stringify({
				level: "error",
				message: isAdminRequest
					? "cinaauth.admin_oidc_client.reconcile_failed"
					: "cinaauth.oidc_demo_client.reconcile_failed",
				error: error instanceof Error ? error.message : String(error),
			}),
		);
		return withNoStore(
			c.json(
				{
					error: "temporarily_unavailable",
					error_description: isAdminRequest
						? "Admin OIDC client is temporarily unavailable"
						: "OIDC demo client is temporarily unavailable",
				},
				503,
			),
		);
	} finally {
		await database.end().catch(() => undefined);
	}

	await next();
	c.res = await normalizeOidcDemoAuthorizationResponse(c.res);
});

app.on(
	["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
	"/api/auth/*",
	async (c) =>
		withNoStore(
			await handleSuperAdminGovernedRequest({
				request: c.req.raw,
				openDatabase: () => createDatabase(c.env),
				consumeSCIMRateLimit: c.env.RATE_LIMITER
					? createDurableObjectRateLimitStorage(c.env).consume
					: undefined,
				getSession: async () => {
					const session = await c.var.auth.api.getSession({
						headers: c.req.raw.headers,
						query: { disableCookieCache: true },
					});
					if (!session) return null;
					return {
						user: {
							id: session.user.id,
							role: (session.user as { role?: string | null }).role,
						},
					};
				},
				handle: () =>
					handleProviderNamespaceGovernedRequest({
						request: c.req.raw,
						configuredProviderIds: getConfiguredAccountProviderIds(c.env),
						openDatabase: () => createDatabase(c.env),
						consumeRateLimit: c.env.RATE_LIMITER
							? createDurableObjectRateLimitStorage(c.env).consume
							: undefined,
						handle: () => c.var.auth.handler(c.req.raw),
						onFailure: () => {
							console.error(
								JSON.stringify({
									level: "error",
									message: "cinaauth.provider_namespace_governance.failed",
									path: new URL(c.req.url).pathname,
									version: getVersionMetadata(c.env),
								}),
							);
						},
					}),
				onFailure: (error) => {
					console.error(
						JSON.stringify({
							level: "error",
							message: "cinaauth.super_admin_governance.failed",
							path: new URL(c.req.url).pathname,
							error: errorMessage(error),
							version: getVersionMetadata(c.env),
						}),
					);
				},
			}),
		),
);

// Health check
app.get("/", (c) =>
	withNoStore(
		c.json({
			name: "CinaSeek Identity API",
			status: getCutoverState(c.env) === "live" ? "running" : "maintenance",
			version: "1.0.0",
		}),
	),
);

const assertAuthorizedMigrationRequest = async (
	headers: Headers,
	env: CloudflareBindings,
) => {
	if (await isAuthorizedMigrationRequest(headers, env)) {
		return undefined;
	}
	return new Response(JSON.stringify({ error: "Forbidden" }), {
		status: 403,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
};

// Deployment readiness endpoint (protected; safe to call from CI after deploy).
app.get("/api/ready", async (c) => {
	const forbidden = await assertAuthorizedMigrationRequest(
		c.req.raw.headers,
		c.env,
	);
	if (forbidden) return forbidden;

	const runtimeEnv = c.var.runtimeEnv;
	const runtimeConfigIssues = getRuntimeConfigIssues(runtimeEnv);
	if (c.var.activeSecretsUnavailable) {
		runtimeConfigIssues.unshift("active_secrets_store_unavailable");
	}
	try {
		const secretsStore = await getActiveSecretsStoreReadiness(c.env);
		const database = await getDatabaseReadiness(c.env);
		const cutoverState = getCutoverState(c.env);
		const isReady =
			runtimeConfigIssues.length === 0 &&
			secretsStore.ok &&
			database.ok &&
			cutoverState === "live";
		const version = getVersionMetadata(c.env);
		return withNoStore(
			c.json(
				{
					success: isReady,
					version,
					cutover: {
						state: cutoverState,
					},
					runtimeConfig: {
						ok: runtimeConfigIssues.length === 0,
						issues: runtimeConfigIssues,
					},
					secretsStore,
					database,
					delivery: {
						queue: isDeliveryQueue(c.env.CINAAUTH_DELIVERY_QUEUE),
						service: isFetcher(c.env.CINAAUTH_DELIVERY_SERVICE),
						webhookUrl: isHttpsUrl(runtimeEnv.CINAAUTH_DELIVERY_WEBHOOK_URL),
						webhookSecret:
							typeof runtimeEnv.CINAAUTH_DELIVERY_WEBHOOK_SECRET === "string" &&
							runtimeEnv.CINAAUTH_DELIVERY_WEBHOOK_SECRET.length >= 32,
					},
					privacyErasure: {
						service: isFetcher(c.env.CINAAUTH_ERASURE_SERVICE),
						webhookUrl: isHttpsUrl(runtimeEnv.CINAAUTH_ERASURE_WEBHOOK_URL),
						webhookSecret:
							typeof runtimeEnv.CINAAUTH_ERASURE_WEBHOOK_SECRET === "string" &&
							runtimeEnv.CINAAUTH_ERASURE_WEBHOOK_SECRET.length >= 32,
					},
					privacyExport: {
						queue: isPrivacyExportQueue(c.env.CINAAUTH_PRIVACY_EXPORT_QUEUE),
						bucket: isR2Bucket(c.env.CINAAUTH_PRIVACY_EXPORTS),
						customerEncryptionKey:
							typeof c.env.CINAAUTH_PRIVACY_EXPORT_KEY === "string" &&
							c.env.CINAAUTH_PRIVACY_EXPORT_KEY.length >= 32,
						retentionHours: 24,
					},
					rateLimit: {
						storage: "durable-object",
						binding: "RATE_LIMITER",
						loginRule: {
							path: "/sign-in/*",
							window: 60,
							max: 5,
						},
					},
				},
				isReady ? 200 : 503,
			),
		);
	} catch (error) {
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.readiness.failed",
				error: errorMessage(error),
				version: getVersionMetadata(c.env),
			}),
		);
		return withNoStore(
			c.json(
				{
					success: false,
					error: "Readiness check failed",
					version: getVersionMetadata(c.env),
					runtimeConfig: {
						ok: runtimeConfigIssues.length === 0,
						issues: runtimeConfigIssues,
					},
				},
				503,
			),
		);
	}
});

// Migration preview endpoint (protected; inspect before applying changes).
app.get("/api/migrate", async (c) => {
	const forbidden = await assertAuthorizedMigrationRequest(
		c.req.raw.headers,
		c.env,
	);
	if (forbidden) return forbidden;
	const selection = getMigrationFeatureSelection(new URL(c.req.url));
	if ("error" in selection) {
		return withNoStore(c.json({ error: selection.error }, 400));
	}

	try {
		const { summary, close } = await getMigrationPlan(c.env, selection.feature);
		try {
			const database = await getDatabaseReadiness(c.env);
			return withNoStore(
				c.json({
					success: true,
					mode: "preview",
					feature: selection.feature ?? null,
					invariants: database.invariants,
					...summary,
				}),
			);
		} finally {
			await close();
		}
	} catch (error) {
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.migration.preview_failed",
				error: errorMessage(error),
				version: getVersionMetadata(c.env),
			}),
		);
		return withNoStore(
			c.json(
				{
					success: false,
					error: "Migration preview failed",
				},
				500,
			),
		);
	}
});

// Database migration endpoint (protected; run after deployment when plugins change).
app.post("/api/migrate", async (c) => {
	if (!(await isAuthorizedMigrationRequest(c.req.raw.headers, c.env))) {
		return withNoStore(c.json({ error: "Forbidden" }, 403));
	}
	const selection = getMigrationFeatureSelection(new URL(c.req.url));
	if ("error" in selection) {
		return withNoStore(c.json({ error: selection.error }, 400));
	}

	try {
		const { runMigrations, installInvariants, summary, close } =
			await getMigrationPlan(c.env, selection.feature);
		try {
			await runMigrations();
			const invariants = await installInvariants();
			cutoverReadinessCache = undefined;
			return withNoStore(
				c.json({
					success: true,
					mode: "apply",
					feature: selection.feature ?? null,
					message: "Migrations applied successfully",
					invariants,
					...summary,
				}),
			);
		} finally {
			await close();
		}
	} catch (error) {
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.migration.failed",
				error: errorMessage(error),
				version: getVersionMetadata(c.env),
			}),
		);
		return withNoStore(
			c.json(
				{
					success: false,
					error: "Migration failed",
				},
				500,
			),
		);
	}
});

// Claims one fail-closed legacy SCIM connection for a verified organization
// owner/admin. This is an operations-only data migration, not a public SCIM
// plugin endpoint. Omitting `apply: true` always performs a preview.
app.post("/api/migrate/scim-provider-ownership", async (c) => {
	if (!(await isAuthorizedMigrationRequest(c.req.raw.headers, c.env))) {
		console.warn(
			JSON.stringify({
				level: "warn",
				message: "cinaauth.scim_ownership_migration.forbidden",
				version: getVersionMetadata(c.env),
			}),
		);
		return withNoStore(c.json({ error: "Forbidden" }, 403));
	}

	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return withNoStore(c.json({ error: "Invalid JSON body" }, 400));
	}
	const reservedProviderIds = getConfiguredAccountProviderIds(c.env);
	const input = parseSCIMOwnershipMigrationInput(rawBody, reservedProviderIds);
	if (!input) {
		return withNoStore(
			c.json(
				{
					error:
						"providerId, organizationId, and ownerUserId are required; apply must be a boolean",
				},
				400,
			),
		);
	}

	return withNoStore(
		await handleProviderNamespaceGovernedRequest({
			request: c.req.raw,
			providerId: input.providerId,
			configuredProviderIds: getConfiguredAccountProviderIds(c.env),
			openDatabase: () => createDatabase(c.env),
			consumeRateLimit: c.env.RATE_LIMITER
				? createDurableObjectRateLimitStorage(c.env).consume
				: undefined,
			handle: async () => {
				const database = createDatabase(c.env);
				try {
					const result = await migrateLegacySCIMProviderOwnership(
						database,
						input,
						{
							reservedProviderIds,
							audit: {
								actorIp:
									c.req.header("cf-connecting-ip")?.slice(0, 128) ?? undefined,
								actorUa: c.req.header("user-agent")?.slice(0, 512) ?? undefined,
								actorSite: "auth.cinaseek.ai",
								versionId: getVersionMetadata(c.env).id ?? undefined,
							},
						},
					);
					if (result.status !== "provider_id_collision") {
						console.info(
							JSON.stringify({
								level: "info",
								message: "cinaauth.scim_ownership_migration.completed",
								mode: result.mode,
								status: result.status,
								providerId: result.providerId,
								organizationId: result.organizationId,
								ownerUserId: result.ownerUserId,
								accountCount: result.accountCount ?? null,
								tokenRotated: result.tokenRotated,
								version: getVersionMetadata(c.env),
							}),
						);
					}

					switch (result.status) {
						case "provider_id_collision":
							return c.json(result, 400);
						case "provider_not_found":
						case "organization_not_found":
						case "owner_not_found":
							return c.json(result, 404);
						case "owner_not_authorized":
							return c.json(result, 403);
						case "provider_has_accounts":
						case "provider_already_owned":
							return c.json(result, 409);
						default:
							return c.json(result);
					}
				} finally {
					await database.end().catch(() => undefined);
				}
			},
			onFailure: () => {
				console.error(
					JSON.stringify({
						level: "error",
						message: "cinaauth.provider_namespace_governance.failed",
						path: new URL(c.req.url).pathname,
						version: getVersionMetadata(c.env),
					}),
				);
			},
		}),
	);
});

const assertD1CutoverRequest = async (
	headers: Headers,
	env: CloudflareBindings,
) => {
	if (getCutoverState(env) !== "maintenance") {
		return new Response(
			JSON.stringify({ error: "D1 cutover requires maintenance mode" }),
			{
				status: 409,
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-store",
				},
			},
		);
	}
	const provided = parseBearerToken(headers.get("authorization") ?? undefined);
	if (await secureEqual(provided, env.CINAAUTH_D1_MIGRATION_TOKEN)) {
		return undefined;
	}
	return new Response(JSON.stringify({ error: "Forbidden" }), {
		status: 403,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
};

// One-time D1 snapshot preview. It requires a separate ephemeral token so the
// permanent schema-migration credential cannot overwrite a live PostgreSQL DB.
app.get("/api/migrate/d1", async (c) => {
	const blocked = await assertD1CutoverRequest(c.req.raw.headers, c.env);
	if (blocked) return blocked;

	const database = createDatabase(c.env);
	try {
		const preview = await previewLegacyD1Migration(c.env.LEGACY_D1, database);
		return withNoStore(
			c.json({
				success: true,
				mode: "preview",
				...preview,
			}),
		);
	} catch {
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.d1_migration.preview_failed",
				version: getVersionMetadata(c.env),
			}),
		);
		return withNoStore(
			c.json({ success: false, error: "D1 migration preview failed" }, 500),
		);
	} finally {
		await database.end();
	}
});

// Applies the maintenance-mode D1 snapshot transactionally and returns only
// per-table counts. No user, session, token, or key values leave the Worker.
app.post("/api/migrate/d1", async (c) => {
	const blocked = await assertD1CutoverRequest(c.req.raw.headers, c.env);
	if (blocked) return blocked;

	const database = createDatabase(c.env);
	try {
		const result = await migrateLegacyD1ToPostgres(c.env.LEGACY_D1, database);
		return withNoStore(
			c.json({
				success: true,
				mode: "apply",
				...result,
			}),
		);
	} catch {
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.d1_migration.failed",
				version: getVersionMetadata(c.env),
			}),
		);
		return withNoStore(
			c.json({ success: false, error: "D1 migration failed" }, 500),
		);
	} finally {
		await database.end();
	}
});

app.notFound((c) =>
	withNoStore(
		c.json(
			{
				error: "Not found",
			},
			404,
		),
	),
);

app.onError((error, c) => {
	console.error(
		JSON.stringify({
			level: "error",
			message: "cinaauth.request.failed",
			path: new URL(c.req.url).pathname,
			method: c.req.method,
			error: errorMessage(error),
			version: getVersionMetadata(c.env),
		}),
	);
	return withNoStore(
		c.json(
			{
				error: "Internal server error",
			},
			500,
		),
	);
});

const DAY_MS = 24 * 60 * 60 * 1000;

// Scheduled retention for audit logs and abandoned sessions. Uses the framework
// PostgreSQL adapter so date serialization matches how the rows were written.
const runRetention = async (env: CloudflareBindings) => {
	if (!isHyperdrive(env.HYPERDRIVE) || getCutoverState(env) !== "live") {
		return;
	}
	if (!(await isDatabaseCutoverReady(env))) {
		return;
	}
	const context = await createAuth(env).$context;
	const now = Date.now();
	const expiredSessions = await context.adapter.deleteMany({
		model: "session",
		where: [{ field: "expiresAt", value: new Date(now), operator: "lt" }],
	});
	const billing = getBillingRuntimeConfiguration(env);
	const retention = getAuditRetentionPolicy(billing);
	let staleAuditLogs = 0;
	if (retention.mode === "deployment-default") {
		staleAuditLogs = await context.adapter.deleteMany({
			model: "auditLog",
			where: [
				{
					field: "timestamp",
					value: new Date(now - retention.defaultDays * DAY_MS),
					operator: "lt",
				},
			],
		});
	} else {
		const database = createDatabase(env);
		const client = await database.connect();
		try {
			await client.query("BEGIN");
			const nonOrganization = await client.query(
				'DELETE FROM "auditLog" WHERE ("targetType" IS DISTINCT FROM \'organization\' OR "targetId" IS NULL) AND "timestamp" < $1',
				[new Date(now - DEFAULT_AUDIT_RETENTION_DAYS * DAY_MS)],
			);
			staleAuditLogs += nonOrganization.rowCount ?? 0;

			for (const plan of retention.plans) {
				if (plan.days === null) continue;
				const organizationLogs = await client.query(
					'DELETE FROM "auditLog" AS "audit" WHERE "audit"."targetType" = \'organization\' AND "audit"."timestamp" < $1 AND (SELECT CASE WHEN COUNT(*) = 0 THEN $2 WHEN COUNT(*) = 1 THEN MAX("subscription"."plan") ELSE NULL END FROM "subscription" WHERE "subscription"."referenceId" = "audit"."targetId" AND "subscription"."status" IN (\'active\', \'trialing\')) = $3',
					[
						new Date(now - plan.days * DAY_MS),
						retention.defaultPlan,
						plan.planId,
					],
				);
				staleAuditLogs += organizationLogs.rowCount ?? 0;
			}
			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK").catch(() => undefined);
			throw error;
		} finally {
			client.release();
			await database.end().catch(() => undefined);
		}
	}
	console.info(
		JSON.stringify({
			level: "info",
			message: "cinaauth.retention.swept",
			expiredSessions,
			staleAuditLogs,
			retentionMode: retention.mode,
			version: getVersionMetadata(env),
		}),
	);
};

type WorkerQueueMessage = DeliveryMessage | PrivacyExportMessage;

const handleQueueBatch = async (
	batch: MessageBatch<WorkerQueueMessage>,
	env: CloudflareBindings,
) => {
	const runtimeEnv = await resolveAuthRuntimeSecrets(env);
	if (batch.queue === PRIVACY_EXPORT_QUEUE_NAME) {
		await handlePrivacyExportBatch(
			batch as MessageBatch<PrivacyExportMessage>,
			runtimeEnv,
			async () => createAuth(runtimeEnv).$context,
		);
		return;
	}
	await handleDeliveryBatch(batch as MessageBatch<DeliveryMessage>, runtimeEnv);
};

export default {
	fetch: (request, env, ctx) => app.fetch(request, env, ctx),
	queue: handleQueueBatch,
	scheduled: (_event, env, ctx) => {
		ctx.waitUntil(
			resolveAuthRuntimeSecrets(env)
				.then(runRetention)
				.catch((error) => {
					console.error(
						JSON.stringify({
							level: "error",
							message: "cinaauth.retention.failed",
							error: errorMessage(error),
							version: getVersionMetadata(env),
						}),
					);
				}),
		);
		if (hasPrivacyExportRuntime(env)) {
			ctx.waitUntil(
				sweepExpiredPrivacyExports(env)
					.then((deletedObjects) => {
						console.info(
							JSON.stringify({
								level: "info",
								message: "cinaauth.privacy_export.retention_swept",
								deletedObjects,
								version: getVersionMetadata(env),
							}),
						);
					})
					.catch((error) => {
						console.error(
							JSON.stringify({
								level: "error",
								message: "cinaauth.privacy_export.retention_failed",
								error: errorMessage(error),
								version: getVersionMetadata(env),
							}),
						);
					}),
			);
		}
	},
} satisfies ExportedHandler<CloudflareBindings, WorkerQueueMessage>;
