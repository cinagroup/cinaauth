import {
	ENTITLEMENT_FEATURES,
	ENTITLEMENT_LIMITS,
} from "@cinaauth/auth-web-contract";
import { describe, expect, it, vi } from "vitest";
import {
	getRuntimeEntitlementLimit,
	isRuntimeEntitlementFeatureEnabled,
} from "../src/entitlement-runtime";
import type { CloudflareBindings } from "../src/env";

const completePolicy = JSON.stringify({
	version: 1,
	defaultPlan: "pro",
	plans: {
		pro: {
			features: Object.fromEntries(
				ENTITLEMENT_FEATURES.map((feature) => [feature, true]),
			),
			limits: Object.fromEntries(
				ENTITLEMENT_LIMITS.map((limit) => [limit, null]),
			),
		},
	},
});

describe("runtime entitlement decisions", () => {
	it("uses honest deployment defaults without touching storage", async () => {
		const env = {} as CloudflareBindings;
		const subject = { type: "organization" as const, id: "organization-1" };
		await expect(
			isRuntimeEntitlementFeatureEnabled(env, subject, "sso"),
		).resolves.toBe(true);
		await expect(
			getRuntimeEntitlementLimit(env, subject, "organizationMembers"),
		).resolves.toBe(100);
		await expect(
			getRuntimeEntitlementLimit(env, subject, "apiKeys"),
		).resolves.toBe(1_000_000_000);
	});

	it("fails closed when billing is active but storage is unavailable", async () => {
		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const env = {
			STRIPE_SECRET_KEY: "stripe-secret",
			STRIPE_WEBHOOK_SECRET: "webhook-secret",
			STRIPE_DEFAULT_PRICE_ID: "price_pro",
			STRIPE_DEFAULT_PLAN_NAME: "pro",
			CINAAUTH_ENTITLEMENT_CONFIG: completePolicy,
		} as CloudflareBindings;
		const subject = { type: "user" as const, id: "user-1" };
		await expect(
			isRuntimeEntitlementFeatureEnabled(env, subject, "apiKeys"),
		).resolves.toBe(false);
		await expect(
			getRuntimeEntitlementLimit(env, subject, "apiKeys"),
		).resolves.toBe(0);
		expect(error).toHaveBeenCalledTimes(2);
		error.mockRestore();
	});
});
