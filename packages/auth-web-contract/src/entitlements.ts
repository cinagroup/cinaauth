export const ENTITLEMENT_FEATURES = [
	"sso",
	"scim",
	"organizationAudit",
	"teams",
	"dynamicRoles",
	"oauthClients",
	"apiKeys",
] as const;

export const ENTITLEMENT_LIMITS = [
	"organizationMembers",
	"teams",
	"teamMembers",
	"dynamicRoles",
	"oauthClients",
	"apiKeys",
	"auditRetentionDays",
] as const;

export type EntitlementFeature = (typeof ENTITLEMENT_FEATURES)[number];
export type EntitlementLimit = (typeof ENTITLEMENT_LIMITS)[number];

export type EntitlementFeatures = Record<EntitlementFeature, boolean>;
export type EntitlementLimits = Record<EntitlementLimit, number | null>;

export type EntitlementSnapshot = {
	version: 1;
	subject: {
		type: "user" | "organization";
		id: string;
	};
	mode: "unmetered" | "subscription";
	plan: {
		id: string;
		source: "deployment-default" | "stripe-subscription";
		subscriptionStatus: "active" | "trialing" | null;
		periodEnd: string | null;
		cancelAtPeriodEnd: boolean;
		seats: number | null;
	};
	features: EntitlementFeatures;
	limits: EntitlementLimits;
	evaluatedAt: string;
};
