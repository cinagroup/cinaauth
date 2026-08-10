import type { EntitlementSnapshot } from "@cinaauth/auth-web-contract";

export type BillingPlanAction = "signup" | "checkout" | "contact";

export const getBillingUiState = ({
	billingCapability,
	entitlements,
}: {
	billingCapability: boolean;
	entitlements: EntitlementSnapshot | null;
}) => ({
	billingEnabled: billingCapability && entitlements?.mode === "subscription",
	status:
		entitlements === null
			? ("unavailable" as const)
			: entitlements.mode === "unmetered"
				? ("unmetered" as const)
				: ("subscription" as const),
});

export const getBillingActionState = ({
	action,
	billingEnabled,
	label,
}: {
	action: BillingPlanAction;
	billingEnabled: boolean;
	label: string;
}) => ({
	enabled: action !== "checkout" || billingEnabled,
	label:
		action === "checkout" && !billingEnabled ? "Billing unavailable" : label,
});
