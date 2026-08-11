import {
	ADMIN_CONSOLE_ROLES,
	ADMIN_OIDC_AUTH_TIME_HEADER,
	ADMIN_OIDC_CLIENT_ID,
	ADMIN_OIDC_ORIGIN,
} from "@cinaauth/auth-web-contract";
import type { CinaAuthPlugin } from "cinaauth";
import { createAuthEndpoint } from "cinaauth/api";
import { setSessionCookie } from "cinaauth/cookies";
import { verifyJWT } from "cinaauth/plugins/jwt";
import type { CloudflareBindings } from "./env";
import { createDurableObjectRateLimitStorage } from "./rate-limit-storage";

const ADMIN_ROLES = new Set<string>(ADMIN_CONSOLE_ROLES);
const MINIMUM_SECRET_LENGTH = 32;
export const ADMIN_OIDC_BRIDGE_RATE_LIMIT = { window: 60, max: 10 } as const;

/** Extracts an OAuth Bearer token without accepting alternate schemes. */
export const extractBearerToken = (authorization: string | null) => {
	if (!authorization?.startsWith("Bearer ")) return null;
	const token = authorization.slice("Bearer ".length).trim();
	return token || null;
};

/** Returns true when at least one current user role is an Admin Console role. */
export const hasAuthorizedAdminRole = (role: string | null | undefined) =>
	typeof role === "string" &&
	role.split(",").some((candidate) => ADMIN_ROLES.has(candidate));

const audienceContains = (audience: unknown, expected: string) =>
	audience === expected ||
	(Array.isArray(audience) && audience.some((value) => value === expected));

/** Enforces that an access token was minted for and to the fixed Admin client. */
export const isAdminAccessToken = (
	claims: { aud?: unknown; azp?: unknown },
	adminOrigin = ADMIN_OIDC_ORIGIN,
) =>
	audienceContains(claims.aud, adminOrigin) &&
	claims.azp === ADMIN_OIDC_CLIENT_ID;

const digest = async (value: string) =>
	new Uint8Array(
		await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
	);

/** Compares the private Service Binding bridge secret in fixed-size form. */
export const verifyBridgeSecret = async (
	provided: string | null,
	configured: string | undefined,
) => {
	if (!configured || configured.length < MINIMUM_SECRET_LENGTH || !provided) {
		return false;
	}
	const [actual, expected] = await Promise.all([
		digest(provided),
		digest(configured),
	]);
	let difference = 0;
	for (let index = 0; index < expected.length; index += 1) {
		difference |= actual[index]! ^ expected[index]!;
	}
	return difference === 0;
};

/**
 * Converts a trusted bridge auth_time into the Admin session security clock.
 * Missing, malformed, epoch, or future values intentionally become stale.
 */
export const resolveAdminAuthenticationTime = (
	value: string | null,
	now = Date.now(),
): Date => {
	if (!value || !/^[0-9]+$/u.test(value)) return new Date(0);
	const seconds = Number(value);
	const milliseconds = seconds * 1000;
	if (
		!Number.isSafeInteger(seconds) ||
		seconds <= 0 ||
		!Number.isSafeInteger(milliseconds) ||
		milliseconds > now
	) {
		return new Date(0);
	}
	return new Date(milliseconds);
};

/** Creates the private OAuth-to-CinaAuth session bridge for CinaAdmin. */
export const adminOidcBridge = (env: CloudflareBindings): CinaAuthPlugin => ({
	id: "cinaadmin-oidc-bridge",
	endpoints: {
		createAdminOidcSession: createAuthEndpoint(
			"/admin-oidc/session",
			{ method: "POST" },
			async (ctx) => {
				const headers = ctx.request?.headers ?? ctx.headers;
				if (
					!(await verifyBridgeSecret(
						headers?.get("x-cinaadmin-bridge-secret") ?? null,
						env.CINAADMIN_OIDC_BRIDGE_SECRET,
					))
				) {
					throw ctx.error("FORBIDDEN", { message: "Admin bridge denied" });
				}

				const accessToken = extractBearerToken(
					headers?.get("authorization") ?? null,
				);
				if (!accessToken) {
					throw ctx.error("UNAUTHORIZED", { message: "Bearer token required" });
				}

				const issuer = env.CINAAUTH_URL || "https://auth.cinaseek.ai";
				const claims = await verifyJWT(accessToken, {
					jwks: { keyPairConfig: { alg: "ES256" } },
					jwt: { issuer, audience: ADMIN_OIDC_ORIGIN },
				});
				if (!claims) {
					throw ctx.error("UNAUTHORIZED", { message: "Invalid access token" });
				}
				const scopes = new Set(
					typeof claims.scope === "string" ? claims.scope.split(" ") : [],
				);
				if (!isAdminAccessToken(claims) || !scopes.has("openid")) {
					throw ctx.error("FORBIDDEN", { message: "Admin token required" });
				}
				const consumeRateLimit =
					createDurableObjectRateLimitStorage(env).consume;
				if (!consumeRateLimit) {
					throw ctx.error("INTERNAL_SERVER_ERROR", {
						message: "Admin rate limiter unavailable",
					});
				}
				const rateLimit = await consumeRateLimit(
					`admin-oidc-bridge|${claims.sub}`,
					ADMIN_OIDC_BRIDGE_RATE_LIMIT,
				);
				if (!rateLimit.allowed) {
					throw ctx.error("TOO_MANY_REQUESTS", {
						message: "Too many Admin session requests",
					});
				}

				const user = await ctx.context.internalAdapter.findUserById(claims.sub);
				const adminUser = user as
					| (typeof user & { banned?: boolean; role?: string | null })
					| null;
				if (
					!adminUser ||
					adminUser.banned === true ||
					!hasAuthorizedAdminRole(adminUser.role)
				) {
					throw ctx.error("FORBIDDEN", {
						message: "Administrator role required",
					});
				}

				const authenticationTime = resolveAdminAuthenticationTime(
					headers?.get(ADMIN_OIDC_AUTH_TIME_HEADER) ?? null,
				);
				const session = await ctx.context.internalAdapter.createSession(
					adminUser.id,
					undefined,
					{ createdAt: authenticationTime },
					true,
				);
				if (!session) {
					throw ctx.error("INTERNAL_SERVER_ERROR", {
						message: "Unable to create Admin session",
					});
				}
				await setSessionCookie(ctx, { session, user: adminUser });
				return ctx.json({
					ok: true,
					user: {
						id: adminUser.id,
						email: adminUser.email,
						role: adminUser.role,
					},
				});
			},
		),
	},
});
