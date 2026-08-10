import { describe, expect, it } from "vitest";
import { canUseDeveloperOAuthClients } from "../src/plugins";

describe("developer OAuth client policy", () => {
	it("requires a verified non-anonymous user and an authenticated session", () => {
		expect(
			canUseDeveloperOAuthClients({
				session: { id: "session-id" },
				user: { emailVerified: true, isAnonymous: false },
			}),
		).toBe(true);
		expect(
			canUseDeveloperOAuthClients({
				session: { id: "session-id" },
				user: { emailVerified: false, isAnonymous: false },
			}),
		).toBe(false);
		expect(
			canUseDeveloperOAuthClients({
				session: { id: "session-id" },
				user: { emailVerified: true, isAnonymous: true },
			}),
		).toBe(false);
		expect(
			canUseDeveloperOAuthClients({
				session: undefined,
				user: { emailVerified: true, isAnonymous: false },
			}),
		).toBe(false);
	});
});
