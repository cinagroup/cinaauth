import type {
	EntitlementFeatures,
	EntitlementLimits,
	EntitlementSnapshot,
} from "@cinaauth/auth-web-contract";
import {
	ENTITLEMENT_FEATURES,
	ENTITLEMENT_LIMITS,
} from "@cinaauth/auth-web-contract";

const MAX_CONFIG_BYTES = 64 * 1024;
const MAX_PLANS = 20;
export const MAX_ENTITLEMENT_LIMIT = 1_000_000_000;
const PLAN_ID_PATTERN = /^[a-z][a-z0-9_-]{1,31}$/;

export type EntitlementPlanPolicy = {
	features: EntitlementFeatures;
	limits: EntitlementLimits;
};

export type EntitlementConfig = {
	version: 1;
	defaultPlan: string;
	plans: Record<string, EntitlementPlanPolicy>;
};

type BillingRuntimeEnv = {
	STRIPE_SECRET_KEY?: string;
	STRIPE_WEBHOOK_SECRET?: string;
	STRIPE_DEFAULT_PRICE_ID?: string;
	STRIPE_DEFAULT_PLAN_NAME?: string;
	CINAAUTH_ENTITLEMENT_CONFIG?: string;
};

export type BillingRuntimeConfiguration = {
	priceId: string;
	stripePlanName: string;
	entitlements: EntitlementConfig;
};

export type EntitlementSubscription = {
	plan: string;
	status: "active" | "trialing";
	periodEnd?: Date | string | null;
	cancelAtPeriodEnd?: boolean | null;
	seats?: number | null;
};

export const selectEntitlementSubscription = (
	subscriptions: EntitlementSubscription[],
):
	| { success: true; subscription: EntitlementSubscription | undefined }
	| { success: false; code: "ENTITLEMENT_SUBSCRIPTION_AMBIGUOUS" } =>
	subscriptions.length <= 1
		? { success: true, subscription: subscriptions[0] }
		: { success: false, code: "ENTITLEMENT_SUBSCRIPTION_AMBIGUOUS" };

type EntitlementSubject = EntitlementSnapshot["subject"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (
	value: Record<string, unknown>,
	allowed: readonly string[],
) => {
	const allowedKeys = new Set(allowed);
	return Object.keys(value).every((key) => allowedKeys.has(key));
};

const parseFeatures = (value: unknown): EntitlementFeatures | undefined => {
	if (!isRecord(value) || !hasOnlyKeys(value, ENTITLEMENT_FEATURES)) {
		return undefined;
	}
	const entries = ENTITLEMENT_FEATURES.map(
		(feature) => [feature, value[feature]] as const,
	);
	if (entries.some(([, enabled]) => typeof enabled !== "boolean")) {
		return undefined;
	}
	return Object.fromEntries(entries) as EntitlementFeatures;
};

const parseLimits = (value: unknown): EntitlementLimits | undefined => {
	if (!isRecord(value) || !hasOnlyKeys(value, ENTITLEMENT_LIMITS)) {
		return undefined;
	}
	const entries = ENTITLEMENT_LIMITS.map(
		(limit) => [limit, value[limit]] as const,
	);
	if (
		entries.some(
			([, configured]) =>
				configured !== null &&
				(typeof configured !== "number" ||
					!Number.isInteger(configured) ||
					configured < 0 ||
					configured > MAX_ENTITLEMENT_LIMIT),
		)
	) {
		return undefined;
	}
	return Object.fromEntries(entries) as EntitlementLimits;
};

/** Parses the complete, versioned commercial policy without permissive defaults. */
export const parseEntitlementConfig = (
	raw: string | undefined,
): EntitlementConfig | undefined => {
	if (!raw || raw.length > MAX_CONFIG_BYTES) return undefined;
	try {
		const candidate: unknown = JSON.parse(raw);
		if (
			!isRecord(candidate) ||
			!hasOnlyKeys(candidate, ["version", "defaultPlan", "plans"]) ||
			candidate.version !== 1 ||
			typeof candidate.defaultPlan !== "string" ||
			!PLAN_ID_PATTERN.test(candidate.defaultPlan) ||
			!isRecord(candidate.plans)
		) {
			return undefined;
		}

		const planEntries = Object.entries(candidate.plans);
		if (planEntries.length === 0 || planEntries.length > MAX_PLANS) {
			return undefined;
		}

		const plans: Record<string, EntitlementPlanPolicy> = {};
		for (const [planId, value] of planEntries) {
			if (
				!PLAN_ID_PATTERN.test(planId) ||
				!isRecord(value) ||
				!hasOnlyKeys(value, ["features", "limits"])
			) {
				return undefined;
			}
			const features = parseFeatures(value.features);
			const limits = parseLimits(value.limits);
			if (!features || !limits) return undefined;
			plans[planId] = { features, limits };
		}

		if (!plans[candidate.defaultPlan]) return undefined;
		return {
			version: 1,
			defaultPlan: candidate.defaultPlan,
			plans,
		};
	} catch {
		return undefined;
	}
};

/** Resolves billing only when Stripe and its complete entitlement policy agree. */
export const getBillingRuntimeConfiguration = (
	env: BillingRuntimeEnv,
): BillingRuntimeConfiguration | undefined => {
	const priceId = env.STRIPE_DEFAULT_PRICE_ID?.trim();
	const stripePlanName = (env.STRIPE_DEFAULT_PLAN_NAME || "default").trim();
	const entitlements = parseEntitlementConfig(env.CINAAUTH_ENTITLEMENT_CONFIG);
	if (
		!env.STRIPE_SECRET_KEY ||
		!env.STRIPE_WEBHOOK_SECRET ||
		!priceId ||
		!PLAN_ID_PATTERN.test(stripePlanName) ||
		!entitlements?.plans[stripePlanName]
	) {
		return undefined;
	}
	return { priceId, stripePlanName, entitlements };
};

/** Indicates that checkout, webhook state, Price and policy are all configured. */
export const isBillingRuntimeReady = (env: BillingRuntimeEnv) =>
	Boolean(getBillingRuntimeConfiguration(env));

const allFeaturesEnabled = () =>
	Object.fromEntries(
		ENTITLEMENT_FEATURES.map((feature) => [feature, true]),
	) as EntitlementFeatures;

const deploymentDefaultLimits = (): EntitlementLimits =>
	({
		...Object.fromEntries(ENTITLEMENT_LIMITS.map((limit) => [limit, null])),
		// These are the organization plugin's existing deployment ceilings. Expose
		// them instead of claiming that pre-billing access is unlimited.
		organizationMembers: 100,
		teams: 50,
		teamMembers: 100,
		dynamicRoles: 25,
		// The scheduled retention job has always removed audit logs after 90 days.
		auditRetentionDays: 90,
	}) as EntitlementLimits;

/** Preserves the pre-billing product contract explicitly while checkout is disabled. */
export const createUnmeteredEntitlementSnapshot = (
	subject: EntitlementSubject,
	now = new Date(),
): EntitlementSnapshot => ({
	version: 1,
	subject,
	mode: "unmetered",
	plan: {
		id: "unmetered",
		source: "deployment-default",
		subscriptionStatus: null,
		periodEnd: null,
		cancelAtPeriodEnd: false,
		seats: null,
	},
	features: allFeaturesEnabled(),
	limits: deploymentDefaultLimits(),
	evaluatedAt: now.toISOString(),
});

/** Evaluates one authoritative plan snapshot from webhook-synchronized state. */
export const evaluateEntitlementSnapshot = ({
	subject,
	config,
	subscription,
	now = new Date(),
}: {
	subject: EntitlementSubject;
	config: EntitlementConfig;
	subscription?: EntitlementSubscription;
	now?: Date;
}):
	| { success: true; snapshot: EntitlementSnapshot }
	| { success: false; code: "ENTITLEMENT_PLAN_UNMAPPED" } => {
	const planId = subscription?.plan || config.defaultPlan;
	const policy = config.plans[planId];
	if (!policy) return { success: false, code: "ENTITLEMENT_PLAN_UNMAPPED" };

	const periodEnd = subscription?.periodEnd
		? new Date(subscription.periodEnd)
		: undefined;
	return {
		success: true,
		snapshot: {
			version: 1,
			subject,
			mode: "subscription",
			plan: {
				id: planId,
				source: subscription ? "stripe-subscription" : "deployment-default",
				subscriptionStatus: subscription?.status ?? null,
				periodEnd:
					periodEnd && Number.isFinite(periodEnd.getTime())
						? periodEnd.toISOString()
						: null,
				cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd === true,
				seats:
					typeof subscription?.seats === "number" &&
					Number.isInteger(subscription.seats) &&
					subscription.seats >= 0
						? subscription.seats
						: null,
			},
			features: policy.features,
			limits: policy.limits,
			evaluatedAt: now.toISOString(),
		},
	};
};

export type EntitlementLoadResult =
	| { success: true; snapshot: EntitlementSnapshot }
	| {
			success: false;
			code: "ENTITLEMENT_SUBSCRIPTION_AMBIGUOUS" | "ENTITLEMENT_PLAN_UNMAPPED";
	  };

/**
 * Loads one authoritative snapshot without making Stripe calls inline.
 * The caller supplies the webhook-synchronized subscription read so this
 * policy remains reusable across HTTP endpoints and Worker middleware.
 */
export const loadEntitlementSnapshot = async ({
	subject,
	billing,
	loadSubscriptions,
	now = new Date(),
}: {
	subject: EntitlementSubject;
	billing: BillingRuntimeConfiguration | undefined;
	loadSubscriptions: () => Promise<EntitlementSubscription[]>;
	now?: Date;
}): Promise<EntitlementLoadResult> => {
	if (!billing) {
		return {
			success: true,
			snapshot: createUnmeteredEntitlementSnapshot(subject, now),
		};
	}

	const selected = selectEntitlementSubscription(await loadSubscriptions());
	if (!selected.success) return selected;
	return evaluateEntitlementSnapshot({
		subject,
		config: billing.entitlements,
		subscription: selected.subscription,
		now,
	});
};
