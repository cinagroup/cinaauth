import {
	ENTITLEMENT_FEATURES,
	ENTITLEMENT_LIMITS,
} from "@cinaauth/auth-web-contract";
import { describe, expect, it } from "vitest";
import {
	createUnmeteredEntitlementSnapshot,
	evaluateEntitlementSnapshot,
	getBillingRuntimeConfiguration,
	loadEntitlementSnapshot,
	parseEntitlementConfig,
	selectEntitlementSubscription,
} from "../src/entitlements";

const policy = (enabled: boolean, limit: number | null) => ({
	features: Object.fromEntries(
		ENTITLEMENT_FEATURES.map((feature) => [feature, enabled]),
	),
	limits: Object.fromEntries(ENTITLEMENT_LIMITS.map((key) => [key, limit])),
});

const configValue = () =>
	JSON.stringify({
		version: 1,
		defaultPlan: "free",
		plans: {
			free: policy(false, 3),
			pro: policy(true, null),
		},
	});

describe("entitlement policy", () => {
	it("requires a complete, versioned policy with every feature and limit", () => {
		const config = parseEntitlementConfig(configValue());
		expect(config?.defaultPlan).toBe("free");
		expect(config?.plans.pro?.features.sso).toBe(true);

		expect(parseEntitlementConfig("not-json")).toBeUndefined();
		expect(
			parseEntitlementConfig(
				JSON.stringify({
					version: 1,
					defaultPlan: "free",
					plans: {
						free: { features: { sso: true }, limits: {} },
					},
				}),
			),
		).toBeUndefined();
	});

	it("enables billing only when Stripe Price and mapped policy agree", () => {
		expect(
			getBillingRuntimeConfiguration({
				STRIPE_SECRET_KEY: "stripe-secret",
				STRIPE_WEBHOOK_SECRET: "webhook-secret",
				STRIPE_DEFAULT_PRICE_ID: "price_pro",
				STRIPE_DEFAULT_PLAN_NAME: "pro",
				CINAAUTH_ENTITLEMENT_CONFIG: configValue(),
			}),
		).toMatchObject({ priceId: "price_pro", stripePlanName: "pro" });

		expect(
			getBillingRuntimeConfiguration({
				STRIPE_SECRET_KEY: "stripe-secret",
				STRIPE_WEBHOOK_SECRET: "webhook-secret",
				STRIPE_DEFAULT_PRICE_ID: "price_pro",
				STRIPE_DEFAULT_PLAN_NAME: "enterprise",
				CINAAUTH_ENTITLEMENT_CONFIG: configValue(),
			}),
		).toBeUndefined();
	});

	it("keeps the pre-billing deployment explicitly unmetered", () => {
		const snapshot = createUnmeteredEntitlementSnapshot(
			{ type: "user", id: "user-1" },
			new Date("2026-08-10T00:00:00.000Z"),
		);
		expect(snapshot).toMatchObject({
			mode: "unmetered",
			plan: { id: "unmetered", subscriptionStatus: null },
			features: { sso: true, scim: true },
			limits: {
				organizationMembers: 100,
				teams: 50,
				teamMembers: 100,
				dynamicRoles: 25,
				apiKeys: null,
				auditRetentionDays: 90,
			},
		});
	});

	it("loads the authoritative snapshot without querying storage in unmetered mode", async () => {
		let storageReads = 0;
		const loaded = await loadEntitlementSnapshot({
			subject: { type: "user", id: "user-1" },
			billing: undefined,
			loadSubscriptions: async () => {
				storageReads += 1;
				return [];
			},
			now: new Date("2026-08-10T00:00:00.000Z"),
		});

		expect(storageReads).toBe(0);
		expect(loaded).toMatchObject({
			success: true,
			snapshot: { mode: "unmetered", plan: { id: "unmetered" } },
		});
	});

	it("loads one mapped subscription and fails closed on ambiguous state", async () => {
		const billing = getBillingRuntimeConfiguration({
			STRIPE_SECRET_KEY: "stripe-secret",
			STRIPE_WEBHOOK_SECRET: "webhook-secret",
			STRIPE_DEFAULT_PRICE_ID: "price_pro",
			STRIPE_DEFAULT_PLAN_NAME: "pro",
			CINAAUTH_ENTITLEMENT_CONFIG: configValue(),
		});
		expect(billing).toBeDefined();
		if (!billing) return;

		await expect(
			loadEntitlementSnapshot({
				subject: { type: "organization", id: "organization-1" },
				billing,
				loadSubscriptions: async () => [
					{ plan: "pro", status: "active" },
				],
			}),
		).resolves.toMatchObject({
			success: true,
			snapshot: { mode: "subscription", plan: { id: "pro" } },
		});

		await expect(
			loadEntitlementSnapshot({
				subject: { type: "organization", id: "organization-1" },
				billing,
				loadSubscriptions: async () => [
					{ plan: "pro", status: "active" },
					{ plan: "free", status: "trialing" },
				],
			}),
		).resolves.toEqual({
			success: false,
			code: "ENTITLEMENT_SUBSCRIPTION_AMBIGUOUS",
		});
	});

	it("uses webhook-synchronized active subscriptions and rejects unknown plans", () => {
		const config = parseEntitlementConfig(configValue());
		expect(config).toBeDefined();
		if (!config) return;

		expect(
			evaluateEntitlementSnapshot({
				subject: { type: "organization", id: "organization-1" },
				config,
				subscription: {
					plan: "pro",
					status: "active",
					periodEnd: "2026-09-10T00:00:00.000Z",
					seats: 12,
				},
				now: new Date("2026-08-10T00:00:00.000Z"),
			}),
		).toMatchObject({
			success: true,
			snapshot: {
				mode: "subscription",
				plan: {
					id: "pro",
					source: "stripe-subscription",
					seats: 12,
				},
				features: { sso: true },
			},
		});

		expect(
			evaluateEntitlementSnapshot({
				subject: { type: "user", id: "user-1" },
				config,
				subscription: { plan: "unknown", status: "active" },
			}),
		).toEqual({ success: false, code: "ENTITLEMENT_PLAN_UNMAPPED" });
	});

	it("fails closed when multiple active subscriptions are ambiguous", () => {
		expect(selectEntitlementSubscription([])).toEqual({
			success: true,
			subscription: undefined,
		});
		expect(
			selectEntitlementSubscription([
				{ plan: "pro", status: "active" },
				{ plan: "enterprise", status: "trialing" },
			]),
		).toEqual({
			success: false,
			code: "ENTITLEMENT_SUBSCRIPTION_AMBIGUOUS",
		});
	});
});
