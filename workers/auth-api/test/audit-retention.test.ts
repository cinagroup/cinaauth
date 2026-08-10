import { describe, expect, it } from "vitest";
import {
	DEFAULT_AUDIT_RETENTION_DAYS,
	getAuditRetentionPolicy,
} from "../src/audit-retention";
import { getBillingRuntimeConfiguration } from "../src/entitlements";

const features = {
	sso: true,
	scim: true,
	organizationAudit: true,
	teams: true,
	dynamicRoles: true,
	oauthClients: true,
	apiKeys: true,
};

const limits = (auditRetentionDays: number | null) => ({
	organizationMembers: null,
	teams: null,
	teamMembers: null,
	dynamicRoles: null,
	oauthClients: null,
	apiKeys: null,
	auditRetentionDays,
});

describe("audit retention policy", () => {
	it("matches the unmetered public contract to the existing 90-day sweep", () => {
		expect(getAuditRetentionPolicy(undefined)).toEqual({
			mode: "deployment-default",
			defaultDays: DEFAULT_AUDIT_RETENTION_DAYS,
		});
	});

	it("preserves finite and unlimited plan retention independently", () => {
		const billing = getBillingRuntimeConfiguration({
			STRIPE_SECRET_KEY: "stripe-secret",
			STRIPE_WEBHOOK_SECRET: "webhook-secret",
			STRIPE_DEFAULT_PRICE_ID: "price_pro",
			STRIPE_DEFAULT_PLAN_NAME: "pro",
			CINAAUTH_ENTITLEMENT_CONFIG: JSON.stringify({
				version: 1,
				defaultPlan: "free",
				plans: {
					free: { features, limits: limits(30) },
					pro: { features, limits: limits(365) },
					enterprise: { features, limits: limits(null) },
				},
			}),
		});
		expect(billing).toBeDefined();
		expect(getAuditRetentionPolicy(billing)).toEqual({
			mode: "subscription",
			defaultPlan: "free",
			plans: [
				{ planId: "free", days: 30 },
				{ planId: "pro", days: 365 },
				{ planId: "enterprise", days: null },
			],
		});
	});
});
