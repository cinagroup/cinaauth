import { describe, expect, it } from "vitest";
import {
	CLOUDFLARE_ACCESS_JWKS_PATH,
	normalizeCloudflareAccessJwks,
} from "../src/cloudflare-access-jwks";

describe("Cloudflare Access JWKS", () => {
	it("uses a stable dedicated endpoint", () => {
		expect(CLOUDFLARE_ACCESS_JWKS_PATH).toBe(
			"/api/auth/jwks/cloudflare-access",
		);
	});

	it("publishes only usable ES256 signing keys", () => {
		expect(
			normalizeCloudflareAccessJwks({
				keys: [
					{
						alg: "EdDSA",
						crv: "Ed25519",
						kid: "legacy",
						kty: "OKP",
						x: "legacy-x",
					},
					{
						alg: "ES256",
						crv: "P-256",
						kid: "current",
						kty: "EC",
						x: "current-x",
						y: "current-y",
					},
					{
						alg: "ES256",
						crv: "P-256",
						kty: "EC",
						x: "missing-kid",
					},
				],
			}),
		).toEqual({
			keys: [
				{
					alg: "ES256",
					crv: "P-256",
					kid: "current",
					kty: "EC",
					use: "sig",
					x: "current-x",
					y: "current-y",
				},
			],
		});
	});

	it.each([undefined, null, [], {}, { keys: "invalid" }])(
		"fails closed for malformed input %#",
		(value) => {
			expect(normalizeCloudflareAccessJwks(value)).toEqual({ keys: [] });
		},
	);
});
