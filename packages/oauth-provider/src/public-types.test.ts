import type {
	AuthMethod,
	GrantType,
	OAuthOptions,
	TokenEndpointAuthMethod,
} from "@cinaauth/oauth-provider";
import { describe, expectTypeOf, it } from "vitest";

describe("public oauth-provider types", () => {
	/**
	 * @see https://github.com/cinagroup/cinaauth/issues/9378
	 */
	it("exports option helper types from the package entrypoint", () => {
		expectTypeOf<OAuthOptions["grantTypes"]>().toEqualTypeOf<
			GrantType[] | undefined
		>();
		expectTypeOf<TokenEndpointAuthMethod>().toEqualTypeOf<
			AuthMethod | "none"
		>();
	});
});
