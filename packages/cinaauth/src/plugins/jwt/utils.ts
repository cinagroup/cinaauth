import type { GenericEndpointContext } from "@cinaauth/core";
import { exportJWK, generateKeyPair } from "jose";
import { symmetricEncrypt } from "../../crypto";
import type { TimeString } from "../../utils/time";
import { sec } from "../../utils/time";
import { getJwksAdapter } from "./adapter";
import type { JWSAlgorithms, Jwk, JwtOptions } from "./types";

const JWS_ALGORITHMS = new Set<JWSAlgorithms>([
	"EdDSA",
	"ES256",
	"ES512",
	"PS256",
	"RS256",
]);

const isJwsAlgorithm = (value: unknown): value is JWSAlgorithms =>
	typeof value === "string" && JWS_ALGORITHMS.has(value as JWSAlgorithms);

/** Resolves a stored key's signing algorithm, including legacy rows without alg. */
export const getJwkAlgorithm = (key: Jwk): JWSAlgorithms | undefined => {
	if (isJwsAlgorithm(key.alg)) return key.alg;
	try {
		const publicKey = JSON.parse(key.publicKey) as Record<string, unknown>;
		if (isJwsAlgorithm(publicKey.alg)) return publicKey.alg;
		if (publicKey.kty === "OKP" && publicKey.crv === "Ed25519") {
			return "EdDSA";
		}
		if (publicKey.kty === "EC" && publicKey.crv === "P-256") {
			return "ES256";
		}
		if (publicKey.kty === "EC" && publicKey.crv === "P-521") {
			return "ES512";
		}
	} catch {
		return undefined;
	}
	return undefined;
};

/**
 * Converts an expirationTime to ISO seconds expiration time (the format of JWT exp)
 *
 * See https://github.com/panva/jose/blob/main/src/lib/jwt_claims_set.ts#L245
 *
 * @param expirationTime - see options.jwt.expirationTime
 * @param iat - the iat time to consolidate on
 * @returns
 */
export function toExpJWT(
	expirationTime: number | Date | string,
	iat: number,
): number {
	if (typeof expirationTime === "number") {
		return expirationTime;
	} else if (expirationTime instanceof Date) {
		return Math.floor(expirationTime.getTime() / 1000);
	} else {
		return iat + sec(expirationTime as TimeString);
	}
}

export async function generateExportedKeyPair(
	options?: JwtOptions | undefined,
) {
	const { alg, ...cfg } = options?.jwks?.keyPairConfig ?? {
		alg: "EdDSA",
		crv: "Ed25519",
	};
	const { publicKey, privateKey } = await generateKeyPair(alg, {
		...cfg,
		extractable: true,
	});

	const publicWebKey = { ...(await exportJWK(publicKey)), alg };
	const privateWebKey = await exportJWK(privateKey);

	return { publicWebKey, privateWebKey, alg, cfg };
}

/**
 * Creates a Jwk on the database
 *
 * @param ctx
 * @param options
 * @returns
 */
export async function createJwk(
	ctx: GenericEndpointContext,
	options?: JwtOptions | undefined,
) {
	const { publicWebKey, privateWebKey, alg, cfg } =
		await generateExportedKeyPair(options);

	const stringifiedPrivateWebKey = JSON.stringify(privateWebKey);
	const privateKeyEncryptionEnabled =
		!options?.jwks?.disablePrivateKeyEncryption;
	const jwk: Omit<Jwk, "id"> = {
		alg,
		...(cfg && "crv" in cfg
			? {
					crv: (cfg as { crv: (typeof jwk)["crv"] }).crv,
				}
			: {}),
		publicKey: JSON.stringify(publicWebKey),
		privateKey: privateKeyEncryptionEnabled
			? JSON.stringify(
					await symmetricEncrypt({
						key: ctx.context.secretConfig,
						data: stringifiedPrivateWebKey,
					}),
				)
			: stringifiedPrivateWebKey,
		createdAt: new Date(),
		...(options?.jwks?.rotationInterval
			? {
					expiresAt: new Date(
						Date.now() + options.jwks.rotationInterval * 1000,
					),
				}
			: {}),
	};

	const adapter = getJwksAdapter(ctx.context.adapter, options);
	const key = await adapter.createJwk(ctx, jwk as Jwk);

	return key;
}

async function resolveCurrentJwk(
	ctx: GenericEndpointContext,
	options?: JwtOptions | undefined,
	preloadedKeys?: readonly Jwk[] | undefined,
) {
	const adapter = getJwksAdapter(ctx.context.adapter, options);
	const keys = preloadedKeys ?? (await adapter.getAllKeys(ctx)) ?? [];
	const now = new Date();
	const configuredAlgorithm = options?.jwks?.keyPairConfig?.alg;
	let resolvedKeys = [...keys];
	if (configuredAlgorithm) {
		const incompatibleKeys = keys.filter(
			(key) =>
				getJwkAlgorithm(key) !== configuredAlgorithm &&
				(!key.expiresAt || key.expiresAt > now),
		);
		const expiredKeysById = new Map(
			await Promise.all(
				incompatibleKeys.map(
					async (key) =>
						[
							key.id,
							{
								...key,
								...((await adapter.expireJwk(ctx, key.id, now)) ?? {}),
								id: key.id,
								expiresAt: now,
							},
						] as const,
				),
			),
		);
		resolvedKeys = keys.map((key) => expiredKeysById.get(key.id) ?? key);
	}
	let currentKey = resolvedKeys
		.filter(
			(candidate) =>
				configuredAlgorithm === undefined ||
				getJwkAlgorithm(candidate) === configuredAlgorithm,
		)
		.slice()
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
	if (!currentKey || (currentKey.expiresAt && currentKey.expiresAt < now)) {
		currentKey = await createJwk(ctx, options);
	}
	return {
		currentKey,
		keys: resolvedKeys.some((key) => key.id === currentKey.id)
			? resolvedKeys
			: [...resolvedKeys, currentKey],
	};
}

/** Returns a usable key and rotates when the configured algorithm changes. */
export async function getOrCreateCurrentJwk(
	ctx: GenericEndpointContext,
	options?: JwtOptions | undefined,
) {
	return (await resolveCurrentJwk(ctx, options)).currentKey;
}

/** Resolves the current key and the updated key set from one preloaded read. */
export async function getOrCreateCurrentJwkWithKeys(
	ctx: GenericEndpointContext,
	options: JwtOptions | undefined,
	preloadedKeys: readonly Jwk[],
) {
	return resolveCurrentJwk(ctx, options, preloadedKeys);
}
