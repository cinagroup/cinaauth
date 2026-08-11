import type { EntitlementSnapshot } from "@cinaauth/auth-web-contract";
import { describe, expect, it } from "vitest";
import { getBillingActionState, getBillingUiState } from "./billing-console";

const entitlementSnapshot = (
	mode: EntitlementSnapshot["mode"],
): EntitlementSnapshot => ({ mode }) as EntitlementSnapshot;

describe("billing console", () => {
	it("fails paid checkout closed when billing is unavailable", () => {
		expect(
			getBillingActionState({
				action: "checkout",
				billingEnabled: false,
				label: "Get started",
			}),
		).toEqual({ enabled: false, label: "Billing unavailable" });
	});

	it("keeps free signup and enterprise contact available", () => {
		expect(
			getBillingActionState({
				action: "signup",
				billingEnabled: false,
				label: "Start for free",
			}),
		).toEqual({ enabled: true, label: "Start for free" });
		expect(
			getBillingActionState({
				action: "contact",
				billingEnabled: false,
				label: "Contact sales",
			}),
		).toEqual({ enabled: true, label: "Contact sales" });
	});

	it("enables checkout only after the server advertises billing", () => {
		expect(
			getBillingActionState({
				action: "checkout",
				billingEnabled: true,
				label: "Get started",
			}),
		).toEqual({ enabled: true, label: "Get started" });
	});

	it("requires billing capability and a subscription-mode entitlement snapshot", () => {
		expect(
			getBillingUiState({
				billingCapability: true,
				entitlements: entitlementSnapshot("subscription"),
			}),
		).toEqual({ billingEnabled: true, status: "subscription" });
		expect(
			getBillingUiState({
				billingCapability: true,
				entitlements: entitlementSnapshot("unmetered"),
			}),
		).toEqual({ billingEnabled: false, status: "unmetered" });
		expect(
			getBillingUiState({ billingCapability: true, entitlements: null }),
		).toEqual({ billingEnabled: false, status: "unavailable" });
	});
});
