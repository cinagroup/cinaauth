import { getTestInstance } from "cinaauth/test";
import { describe, expect, it } from "vitest";
import { sso } from ".";

describe("SSO runtime authorization", () => {
	it("denies a resolved provider before redirecting to the IdP", async () => {
		let authorization:
			| { providerId: string; flow: "sign-in" | "callback" }
			| undefined;
		const { auth } = await getTestInstance({
			plugins: [
				sso({
					defaultSSO: [
						{
							domain: "example.com",
							providerId: "blocked-provider",
							oidcConfig: {
								issuer: "https://idp.example.com",
								pkce: true,
								clientId: "client-id",
								clientSecret: "client-secret",
								discoveryEndpoint:
									"https://idp.example.com/.well-known/openid-configuration",
								authorizationEndpoint: "https://idp.example.com/authorize",
							},
						},
					],
					authorizeProvider: ({ provider, flow }) => {
						authorization = { providerId: provider.providerId, flow };
						return false;
					},
				}),
			],
		});

		const response = await auth.api.signInSSO({
			body: {
				providerId: "blocked-provider",
				callbackURL: "/dashboard",
			},
			asResponse: true,
		});
		expect(response.status).toBe(403);
		expect(authorization).toEqual({
			providerId: "blocked-provider",
			flow: "sign-in",
		});
	});
});
