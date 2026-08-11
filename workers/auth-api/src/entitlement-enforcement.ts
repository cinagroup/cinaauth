import type {
	EntitlementFeature,
	EntitlementLimit,
	EntitlementSnapshot,
} from "@cinaauth/auth-web-contract";

export type EntitlementSubjectSource =
	| "user"
	| "organization-body"
	| "organization-query"
	| "organization-or-user-body"
	| "team-body"
	| "sso-provider-body"
	| "invitation-body";

export type EntitlementUsageSource =
	| "api-keys"
	| "dynamic-roles"
	| "organization-members"
	| "oauth-clients"
	| "team-members"
	| "teams";

export type EntitlementRequestPolicy = {
	feature?: EntitlementFeature;
	limit?: EntitlementLimit;
	subjectSource: EntitlementSubjectSource;
	usageSource?: EntitlementUsageSource;
};

const requestPolicies = new Map<string, EntitlementRequestPolicy>([
	[
		"POST /api/auth/api-key/create",
		{
			feature: "apiKeys",
			limit: "apiKeys",
			subjectSource: "user",
			usageSource: "api-keys",
		},
	],
	[
		"POST /api/auth/oauth2/register",
		{
			feature: "oauthClients",
			limit: "oauthClients",
			subjectSource: "user",
			usageSource: "oauth-clients",
		},
	],
	[
		"POST /api/auth/oauth2/create-client",
		{
			feature: "oauthClients",
			limit: "oauthClients",
			subjectSource: "user",
			usageSource: "oauth-clients",
		},
	],
	[
		"POST /api/auth/oauth2/update-client",
		{ feature: "oauthClients", subjectSource: "user" },
	],
	[
		"POST /api/auth/oauth2/client/rotate-secret",
		{ feature: "oauthClients", subjectSource: "user" },
	],
	[
		"POST /api/auth/organization/create-team",
		{
			feature: "teams",
			limit: "teams",
			subjectSource: "organization-body",
			usageSource: "teams",
		},
	],
	[
		"POST /api/auth/organization/update-team",
		{ feature: "teams", subjectSource: "team-body" },
	],
	[
		"POST /api/auth/organization/add-team-member",
		{
			feature: "teams",
			limit: "teamMembers",
			subjectSource: "team-body",
			usageSource: "team-members",
		},
	],
	[
		"POST /api/auth/organization/accept-invitation",
		{
			limit: "organizationMembers",
			subjectSource: "invitation-body",
			usageSource: "organization-members",
		},
	],
	[
		"POST /api/auth/organization/add-member",
		{
			limit: "organizationMembers",
			subjectSource: "organization-body",
			usageSource: "organization-members",
		},
	],
	[
		"POST /api/auth/organization/create-role",
		{
			feature: "dynamicRoles",
			limit: "dynamicRoles",
			subjectSource: "organization-body",
			usageSource: "dynamic-roles",
		},
	],
	[
		"POST /api/auth/organization/update-role",
		{ feature: "dynamicRoles", subjectSource: "organization-body" },
	],
	[
		"POST /api/auth/sso/register",
		{ feature: "sso", subjectSource: "organization-or-user-body" },
	],
	[
		"POST /api/auth/sso/update-provider",
		{ feature: "sso", subjectSource: "sso-provider-body" },
	],
	[
		"POST /api/auth/sso/request-domain-verification",
		{ feature: "sso", subjectSource: "sso-provider-body" },
	],
	[
		"POST /api/auth/sso/verify-domain",
		{ feature: "sso", subjectSource: "sso-provider-body" },
	],
	[
		"POST /api/auth/scim/generate-token",
		{ feature: "scim", subjectSource: "organization-or-user-body" },
	],
	[
		"GET /api/auth/audit/organization",
		{
			feature: "organizationAudit",
			subjectSource: "organization-query",
		},
	],
]);

/** Classifies Auth requests that are governed by commercial feature policy. */
export const getEntitlementRequestPolicy = (
	pathname: string,
	method: string,
) => {
	const canonicalPathname =
		pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname;
	return requestPolicies.get(`${method.toUpperCase()} ${canonicalPathname}`);
};

export type EntitlementAccessResult =
	| { success: true }
	| {
			success: false;
			code: "ENTITLEMENT_FEATURE_DISABLED";
			feature: EntitlementFeature;
	  }
	| {
			success: false;
			code: "ENTITLEMENT_USAGE_UNAVAILABLE";
			limit: EntitlementLimit;
	  }
	| {
			success: false;
			code: "ENTITLEMENT_LIMIT_REACHED";
			limit: EntitlementLimit;
			current: number;
			maximum: number;
	  };

/** Evaluates a feature and its optional finite usage ceiling. */
export const evaluateEntitlementAccess = (
	snapshot: EntitlementSnapshot,
	policy: Pick<EntitlementRequestPolicy, "feature" | "limit">,
	currentUsage?: number,
): EntitlementAccessResult => {
	if (policy.feature && !snapshot.features[policy.feature]) {
		return {
			success: false,
			code: "ENTITLEMENT_FEATURE_DISABLED",
			feature: policy.feature,
		};
	}
	if (!policy.limit) return { success: true };

	const maximum = snapshot.limits[policy.limit];
	if (maximum === null) return { success: true };
	if (
		typeof currentUsage !== "number" ||
		!Number.isInteger(currentUsage) ||
		currentUsage < 0
	) {
		return {
			success: false,
			code: "ENTITLEMENT_USAGE_UNAVAILABLE",
			limit: policy.limit,
		};
	}
	if (currentUsage >= maximum) {
		return {
			success: false,
			code: "ENTITLEMENT_LIMIT_REACHED",
			limit: policy.limit,
			current: currentUsage,
			maximum,
		};
	}
	return { success: true };
};
