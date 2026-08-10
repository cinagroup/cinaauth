import type { BillingRuntimeConfiguration } from "./entitlements";

export const DEFAULT_AUDIT_RETENTION_DAYS = 90;

export type AuditRetentionPolicy =
	| {
			mode: "deployment-default";
			defaultDays: typeof DEFAULT_AUDIT_RETENTION_DAYS;
	  }
	| {
			mode: "subscription";
			defaultPlan: string;
			plans: Array<{ planId: string; days: number | null }>;
	  };

/** Resolves the data lifecycle policy from the same config used for access. */
export const getAuditRetentionPolicy = (
	billing: BillingRuntimeConfiguration | undefined,
): AuditRetentionPolicy => {
	if (!billing) {
		return {
			mode: "deployment-default",
			defaultDays: DEFAULT_AUDIT_RETENTION_DAYS,
		};
	}
	return {
		mode: "subscription",
		defaultPlan: billing.entitlements.defaultPlan,
		plans: Object.entries(billing.entitlements.plans).map(
			([planId, policy]) => ({
				planId,
				days: policy.limits.auditRetentionDays,
			}),
		),
	};
};
