import type {
	EntitlementFeature,
	EntitlementLimit,
	EntitlementSnapshot,
} from "@cinaauth/auth-web-contract";
import { APIError, isAPIError } from "cinaauth/api";
import type { CinaAuthDatabase } from "./database";
import { createDatabase } from "./database";
import {
	getEntitlementCapacityLockKey,
	withEntitlementCapacityLock,
} from "./entitlement-lock";
import type { EntitlementSubscription } from "./entitlements";
import {
	getBillingRuntimeConfiguration,
	loadEntitlementSnapshot,
	MAX_ENTITLEMENT_LIMIT,
} from "./entitlements";
import type { CloudflareBindings } from "./env";

type RuntimeEntitlementSubscriptionRow = {
	plan: string;
	status: "active" | "trialing";
	periodEnd: Date | string | null;
	cancelAtPeriodEnd: boolean | null;
	seats: number | null;
};

export type RuntimeEntitlementSubject = EntitlementSnapshot["subject"];

const loadRuntimeEntitlementSnapshotWithDatabase = async (
	env: CloudflareBindings,
	subject: RuntimeEntitlementSubject,
	database?: CinaAuthDatabase,
) => {
	const billing = getBillingRuntimeConfiguration(env);
	return loadEntitlementSnapshot({
		subject,
		billing,
		loadSubscriptions: async () => {
			if (!billing) return [];
			if (!database) {
				throw new Error("Entitlement database is unavailable");
			}
			const result = await database.query<RuntimeEntitlementSubscriptionRow>(
				'SELECT "plan", "status", "periodEnd", "cancelAtPeriodEnd", "seats" FROM "subscription" WHERE "referenceId" = $1 AND "status" IN (\'active\', \'trialing\') ORDER BY "updatedAt" DESC LIMIT 2',
				[subject.id],
			);
			return result.rows satisfies EntitlementSubscription[];
		},
	});
};

/** Loads a plugin-safe entitlement snapshot from webhook-synchronized state. */
export const loadRuntimeEntitlementSnapshot = async (
	env: CloudflareBindings,
	subject: RuntimeEntitlementSubject,
) => {
	if (!getBillingRuntimeConfiguration(env)) {
		return loadRuntimeEntitlementSnapshotWithDatabase(env, subject);
	}

	const database = createDatabase(env);
	try {
		return await loadRuntimeEntitlementSnapshotWithDatabase(
			env,
			subject,
			database,
		);
	} finally {
		await database.end().catch(() => undefined);
	}
};

const throwEntitlementStorageUnavailable = (): never => {
	throw new APIError("SERVICE_UNAVAILABLE", {
		code: "ENTITLEMENT_STORAGE_UNAVAILABLE",
		message: "Entitlement policy is temporarily unavailable",
	});
};

/**
 * Serializes an organization-member mutation and performs the authoritative
 * count while the PostgreSQL advisory lock is held.
 */
export const withRuntimeOrganizationMemberCapacity = async <T>(
	env: CloudflareBindings,
	organizationId: string,
	userId: string | undefined,
	operation: () => Promise<T>,
): Promise<T> => {
	const subject = { type: "organization" as const, id: organizationId };
	let database: CinaAuthDatabase | undefined;
	try {
		const activeDatabase = createDatabase(env);
		database = activeDatabase;
		return await withEntitlementCapacityLock(
			activeDatabase,
			getEntitlementCapacityLockKey({
				subjectType: subject.type,
				subjectId: subject.id,
				limit: "organizationMembers",
			}),
			async () => {
				if (userId) {
					const existing = await activeDatabase.query<{ exists: boolean }>(
						'SELECT EXISTS(SELECT 1 FROM "member" WHERE "organizationId" = $1 AND "userId" = $2) AS "exists"',
						[organizationId, userId],
					);
					if (existing.rows[0]?.exists === true) return operation();
				}
				const loaded = await loadRuntimeEntitlementSnapshotWithDatabase(
					env,
					subject,
					activeDatabase,
				);
				if (!loaded.success) return throwEntitlementStorageUnavailable();
				const maximum = loaded.snapshot.limits.organizationMembers;
				if (maximum !== null) {
					const result = await activeDatabase.query<{
						count: number | string;
					}>(
						'SELECT COUNT(*)::int AS "count" FROM "member" WHERE "organizationId" = $1',
						[organizationId],
					);
					const current = Number(result.rows[0]?.count);
					if (!Number.isSafeInteger(current) || current < 0) {
						throwEntitlementStorageUnavailable();
					}
					if (current >= maximum) {
						throw new APIError("CONFLICT", {
							code: "ENTITLEMENT_LIMIT_REACHED",
							message:
								"The current plan organization member limit has been reached",
							limit: "organizationMembers",
							current,
							maximum,
						});
					}
				}
				return operation();
			},
		);
	} catch (error) {
		if (isAPIError(error)) throw error;
		logRuntimeDecisionFailure(subject, "organizationMembers", error);
		return throwEntitlementStorageUnavailable();
	} finally {
		await database?.end().catch(() => undefined);
	}
};

const logRuntimeDecisionFailure = (
	subject: RuntimeEntitlementSubject,
	capability: EntitlementFeature | EntitlementLimit,
	error: unknown,
) => {
	console.error(
		JSON.stringify({
			level: "error",
			message: "cinaauth.runtime_entitlement.failed",
			subjectType: subject.type,
			subjectId: subject.id,
			capability,
			error: error instanceof Error ? error.message : String(error),
		}),
	);
};

/** Fails closed when a runtime feature decision cannot be loaded. */
export const isRuntimeEntitlementFeatureEnabled = async (
	env: CloudflareBindings,
	subject: RuntimeEntitlementSubject,
	feature: EntitlementFeature,
) => {
	try {
		const loaded = await loadRuntimeEntitlementSnapshot(env, subject);
		return loaded.success && loaded.snapshot.features[feature];
	} catch (error) {
		logRuntimeDecisionFailure(subject, feature, error);
		return false;
	}
};

/**
 * Resolves a numeric plugin limit. A configured `null` maps to the maximum
 * accepted policy value; storage or mapping failures map to zero.
 */
export const getRuntimeEntitlementLimit = async (
	env: CloudflareBindings,
	subject: RuntimeEntitlementSubject,
	limit: EntitlementLimit,
) => {
	try {
		const loaded = await loadRuntimeEntitlementSnapshot(env, subject);
		if (!loaded.success) return 0;
		return loaded.snapshot.limits[limit] ?? MAX_ENTITLEMENT_LIMIT;
	} catch (error) {
		logRuntimeDecisionFailure(subject, limit, error);
		return 0;
	}
};
