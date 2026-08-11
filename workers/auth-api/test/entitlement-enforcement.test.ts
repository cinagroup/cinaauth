import type { EntitlementSnapshot } from "@cinaauth/auth-web-contract";
import {
	ENTITLEMENT_FEATURES,
	ENTITLEMENT_LIMITS,
} from "@cinaauth/auth-web-contract";
import { describe, expect, it } from "vitest";
import {
	evaluateEntitlementAccess,
	getEntitlementRequestPolicy,
} from "../src/entitlement-enforcement";

const snapshot = (): EntitlementSnapshot => ({
	version: 1,
	subject: { type: "organization", id: "organization-1" },
	mode: "subscription",
	plan: {
		id: "pro",
		source: "deployment-default",
		subscriptionStatus: null,
		periodEnd: null,
		cancelAtPeriodEnd: false,
		seats: null,
	},
	features: Object.fromEntries(
		ENTITLEMENT_FEATURES.map((feature) => [feature, true]),
	) as EntitlementSnapshot["features"],
	limits: Object.fromEntries(
		ENTITLEMENT_LIMITS.map((limit) => [limit, null]),
	) as EntitlementSnapshot["limits"],
	evaluatedAt: "2026-08-10T00:00:00.000Z",
});

describe("entitlement request enforcement", () => {
	it("maps commercial create and management paths without blocking cleanup", () => {
		expect(
			getEntitlementRequestPolicy("/api/auth/organization/create-team", "POST"),
		).toMatchObject({ feature: "teams", limit: "teams" });
		expect(
			getEntitlementRequestPolicy("/api/auth/sso/update-provider", "POST"),
		).toMatchObject({ feature: "sso" });
		expect(
			getEntitlementRequestPolicy("/api/auth/audit/organization", "GET"),
		).toMatchObject({ feature: "organizationAudit" });
		expect(
			getEntitlementRequestPolicy(
				"/api/auth/organization/accept-invitation",
				"POST",
			),
		).toEqual({
			limit: "organizationMembers",
			subjectSource: "invitation-body",
			usageSource: "organization-members",
		});
		expect(
			getEntitlementRequestPolicy("/api/auth/organization/add-member", "POST"),
		).toEqual({
			limit: "organizationMembers",
			subjectSource: "organization-body",
			usageSource: "organization-members",
		});

		for (const cleanupPath of [
			"/api/auth/organization/remove-team",
			"/api/auth/organization/remove-team-member",
			"/api/auth/organization/delete-role",
			"/api/auth/sso/delete-provider",
			"/api/auth/scim/delete-provider-connection",
			"/api/auth/oauth2/delete-client",
			"/api/auth/api-key/delete",
		]) {
			expect(getEntitlementRequestPolicy(cleanupPath, "POST")).toBeUndefined();
		}
	});

	it("keeps protected trailing-slash variants inside the exact policy boundary", () => {
		expect(
			getEntitlementRequestPolicy("/api/auth/sso/register///", "POST"),
		).toMatchObject({ feature: "sso" });
		expect(
			getEntitlementRequestPolicy(
				"/api/auth/scim/generate-token/extra",
				"POST",
			),
		).toBeUndefined();
	});

	it("fails closed when a feature is disabled", () => {
		const value = snapshot();
		value.features.sso = false;
		expect(evaluateEntitlementAccess(value, { feature: "sso" })).toEqual({
			success: false,
			code: "ENTITLEMENT_FEATURE_DISABLED",
			feature: "sso",
		});
	});

	it("allows unbounded limits and rejects a reached finite limit", () => {
		const value = snapshot();
		expect(
			evaluateEntitlementAccess(
				value,
				{ feature: "teams", limit: "teams" },
				500,
			),
		).toEqual({ success: true });

		value.limits.teams = 3;
		expect(
			evaluateEntitlementAccess(value, { feature: "teams", limit: "teams" }, 3),
		).toEqual({
			success: false,
			code: "ENTITLEMENT_LIMIT_REACHED",
			limit: "teams",
			current: 3,
			maximum: 3,
		});
	});

	it("rejects missing or invalid usage for a finite limit", () => {
		const value = snapshot();
		value.limits.apiKeys = 2;
		for (const current of [undefined, -1, 1.5]) {
			expect(
				evaluateEntitlementAccess(
					value,
					{ feature: "apiKeys", limit: "apiKeys" },
					current,
				),
			).toEqual({
				success: false,
				code: "ENTITLEMENT_USAGE_UNAVAILABLE",
				limit: "apiKeys",
			});
		}
	});

	it("supports limit-only policies for base organization capacity", () => {
		const value = snapshot();
		value.limits.organizationMembers = 2;
		expect(
			evaluateEntitlementAccess(value, { limit: "organizationMembers" }, 1),
		).toEqual({ success: true });
	});
});
