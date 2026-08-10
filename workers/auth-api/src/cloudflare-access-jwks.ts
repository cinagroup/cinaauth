/** Public JWKS endpoint dedicated to the Cloudflare Access OIDC integration. */
export const CLOUDFLARE_ACCESS_JWKS_PATH =
	"/api/auth/jwks/cloudflare-access" as const;

type JsonWebKey = Record<string, unknown> & {
	alg?: unknown;
	crv?: unknown;
	kid?: unknown;
	kty?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isCurrentEs256SigningKey = (key: JsonWebKey) =>
	key.alg === "ES256" &&
	key.kty === "EC" &&
	key.crv === "P-256" &&
	typeof key.kid === "string" &&
	key.kid.length > 0;

/**
 * Publishes only the ES256 key family configured for production OIDC tokens.
 *
 * The general CinaAuth JWKS can retain legacy rotation keys for other clients.
 * Cloudflare Access receives a narrow set containing algorithms it supports and
 * an explicit signing-key declaration.
 */
export const normalizeCloudflareAccessJwks = (value: unknown) => {
	const keys =
		isRecord(value) && Array.isArray(value.keys)
			? value.keys
					.filter(isRecord)
					.filter(isCurrentEs256SigningKey)
					.map((key) => ({ ...key, use: "sig" as const }))
			: [];

	return { keys };
};
