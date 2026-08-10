import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateOidcProtocol } from "./check-oidc-production.mjs";

const origin = "https://auth.cinaseek.ai";
const metadata = {
	issuer: origin,
	jwks_uri: `${origin}/api/auth/jwks`,
	authorization_endpoint: `${origin}/api/auth/oauth2/authorize`,
	token_endpoint: `${origin}/api/auth/oauth2/token`,
	userinfo_endpoint: `${origin}/api/auth/oauth2/userinfo`,
	id_token_signing_alg_values_supported: ["ES256"],
};
const jwks = {
	keys: [{ kty: "EC", crv: "P-256", alg: "ES256", kid: "key-1" }],
};

describe("OIDC production protocol checks", () => {
	it("accepts equivalent discovery aliases and an ES256 key", () => {
		assert.deepEqual(
			evaluateOidcProtocol({
				origin,
				canonical: metadata,
				alias: { ...metadata },
				jwks,
			}),
			[],
		);
	});

	it("rejects an EdDSA-only deployment and a divergent alias", () => {
		const failures = evaluateOidcProtocol({
			origin,
			canonical: {
				...metadata,
				id_token_signing_alg_values_supported: ["EdDSA"],
			},
			alias: { ...metadata, issuer: "https://wrong.example" },
			jwks: {
				keys: [{ kty: "OKP", crv: "Ed25519", alg: "EdDSA" }],
			},
		});

		assert.match(failures.join("\n"), /advertise ES256/);
		assert.match(failures.join("\n"), /must not advertise EdDSA/);
		assert.match(failures.join("\n"), /compatibility alias differs/);
		assert.match(failures.join("\n"), /EC P-256/);
	});
});
