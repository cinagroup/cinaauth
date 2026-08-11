import { oauthProvider } from "@cinaauth/oauth-provider";
import { jwt } from "cinaauth/plugins/jwt";
import { getTestInstance } from "cinaauth/test";
import { describe, expect, it } from "vitest";
import {
	AUTH_DISCOVERY_PATHS,
	createCanonicalDiscoveryRequest,
	isAuthHandlerRequestPath,
	OAUTH_AUTHORIZATION_SERVER_PATH,
	OPENID_CONFIGURATION_PATH,
} from "../src/auth-routing";

describe("Auth issuer routing", () => {
	it("creates Auth for canonical and compatibility discovery paths", () => {
		for (const path of AUTH_DISCOVERY_PATHS) {
			expect(isAuthHandlerRequestPath(path)).toBe(true);
		}
		expect(isAuthHandlerRequestPath("/api/auth/sign-in/email")).toBe(true);
		expect(
			isAuthHandlerRequestPath(
				"/api/admin/configuration/delivery/status",
			),
		).toBe(true);
		expect(isAuthHandlerRequestPath("/api/ready")).toBe(false);
	});

	it.each([
		[`/api/auth${OPENID_CONFIGURATION_PATH}`, OPENID_CONFIGURATION_PATH],
		[
			`/api/auth${OAUTH_AUTHORIZATION_SERVER_PATH}`,
			OAUTH_AUTHORIZATION_SERVER_PATH,
		],
	])("rewrites %s to %s", (input, expected) => {
		const request = createCanonicalDiscoveryRequest(
			new Request(`https://auth.cinaseek.ai${input}?client=cloudflare`, {
				headers: { Accept: "application/json" },
			}),
		);

		expect(new URL(request.url).pathname).toBe(expected);
		expect(new URL(request.url).search).toBe("?client=cloudflare");
		expect(request.headers.get("accept")).toBe("application/json");
	});

	it("leaves canonical discovery requests unchanged", () => {
		const request = new Request(
			`https://auth.cinaseek.ai${OPENID_CONFIGURATION_PATH}`,
		);
		expect(createCanonicalDiscoveryRequest(request)).toBe(request);
	});

	it("serves equivalent ES256 OIDC metadata and JWKS through both paths", async () => {
		const issuer = "https://auth.cinaseek.ai";
		const { auth } = await getTestInstance({
			baseURL: issuer,
			plugins: [
				jwt({
					jwks: { keyPairConfig: { alg: "ES256" } },
					jwt: { issuer },
				}),
				oauthProvider({
					loginPage: "https://accounts.cinaseek.ai/sign-in",
					consentPage: "https://accounts.cinaseek.ai/oauth/consent",
					silenceWarnings: {
						oauthAuthServerConfig: true,
						openidConfig: true,
					},
				}),
			],
		});
		const paths = [
			OPENID_CONFIGURATION_PATH,
			`/api/auth${OPENID_CONFIGURATION_PATH}`,
		];
		const metadataResponses = await Promise.all(
			paths.map((path) =>
				auth.handler(
					createCanonicalDiscoveryRequest(new Request(`${issuer}${path}`)),
				),
			),
		);

		for (const response of metadataResponses) {
			expect(response.status).toBe(200);
			const metadata = (await response.json()) as {
				issuer: string;
				jwks_uri: string;
				id_token_signing_alg_values_supported: string[];
			};
			expect(metadata).toMatchObject({
				issuer,
				jwks_uri: `${issuer}/api/auth/jwks`,
				id_token_signing_alg_values_supported: ["ES256"],
			});
		}

		const jwksResponse = await auth.handler(
			new Request(`${issuer}/api/auth/jwks`),
		);
		expect(jwksResponse.status).toBe(200);
		expect(await jwksResponse.json()).toMatchObject({
			keys: [expect.objectContaining({ alg: "ES256", crv: "P-256" })],
		});
	});
});
