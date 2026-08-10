import { describe, expect, it } from "vitest";
import { subscriptions } from "../src/schema";

describe("subscription schema", () => {
	it("indexes the reference used by entitlement and retention lookups", () => {
		expect(subscriptions.subscription.fields.referenceId.index).toBe(true);
	});
});
