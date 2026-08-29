import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
	resolve("src", "app", "(admin)", "billing", "page.tsx"),
	"utf8",
);

describe("Admin billing page contract", () => {
	it("uses the Stripe subscription identifier for cancellation", () => {
		expect(source).toContain("stripeSubscriptionId");
		expect(source).not.toContain("cancel(row.original.id)");
	});

	it("uses step-up-aware writes and labels the data as scoped", () => {
		expect(source).toContain("fetchAdminJson");
		expect(source).toContain("billing.scopeDescription");
		expect(source).toContain("billing.portal");
	});

	it("renders the unconfigured billing state and disables unavailable actions", () => {
		expect(source).toContain("billing.unavailable");
		expect(source).toContain("data?.available === false");
		expect(source).toContain("!billingAvailable");
	});

	it("selects organization scope only from the actor-scoped organizations BFF", () => {
		expect(source).toContain('"/api/admin/organizations"');
		expect(source).toContain("OrgDTO");
		expect(source).toContain("organizationId");
		expect(source).not.toContain("activeOrganizationId");
	});

	it("does not keep the obsolete wrapped Stripe list response assumption", () => {
		expect(source).not.toContain("payload.data?.subscriptions ?? []");
	});

	it("binds subscription cache and billing return URLs to the selected organization", () => {
		expect(source).toContain(
			'queryKey: ["subscriptions", scope, scopeReference]',
		);
		expect(source).toContain('scope === "organization"');
		expect(source).toContain("returnParameters");
		expect(source).toContain("organizationId");
	});
});
