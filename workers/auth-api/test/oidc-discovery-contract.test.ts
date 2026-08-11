import { describe, expect, it } from "vitest";
import type { CloudflareBindings } from "../src/env";
import { createAuthPlugins } from "../src/plugins";

describe("OIDC discovery contract", () => {
	it("advertises the authentication claims emitted by Admin ID tokens", () => {
		const plugin = createAuthPlugins({} as CloudflareBindings).find(
			(candidate) => candidate.id === "oauth-provider",
		);

		expect(plugin?.options?.advertisedMetadata?.claims_supported).toEqual(
			expect.arrayContaining(["auth_time", "acr"]),
		);
	});
});
