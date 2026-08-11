import { describe, expectTypeOf, it } from "vitest";
import type { AuditCategory } from "./types";

type RuntimeAuditCategory =
	| "user"
	| "session"
	| "auth"
	| "admin"
	| "risk"
	| "wallet"
	| "org"
	| "apikey"
	| "identity"
	| "authenticator"
	| "credential"
	| "privacy"
	| "integration"
	| "provisioning"
	| "billing"
	| "audit";

describe("AuditCategory public contract", () => {
	it("matches every category emitted by the built-in capture map", () => {
		expectTypeOf<AuditCategory>().toEqualTypeOf<RuntimeAuditCategory>();
	});
});
