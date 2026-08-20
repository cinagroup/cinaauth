import type { CinaAuthPlugin } from "cinaauth";
import { createAuthEndpoint } from "cinaauth/api";
import { verifyJWT } from "cinaauth/plugins/jwt";
import { extractBearerToken, verifyBridgeSecret } from "./admin-oidc-bridge";
import {
	CINATOKEN_OIDC_SESSION_RATE_LIMIT,
	CINATOKEN_ROLE_VERIFY_RATE_LIMIT,
	hasAuthorizedCinatokenRole,
	isCinatokenAccessToken,
} from "./cinatoken-oidc-policy";
import type { CloudflareBindings } from "./env";
import { createDurableObjectRateLimitStorage } from "./rate-limit-storage";

type CinatokenBridgeUser = {
	id: string;
	email?: string | null;
	banned?: boolean;
	role?: string | null;
};

const findEligibleUser = async (
	adapter: { findUserById: (subject: string) => Promise<unknown> },
	subject: string,
) => {
	const candidate = (await adapter.findUserById(
		subject,
	)) as CinatokenBridgeUser | null;
	return candidate &&
		candidate.banned !== true &&
		hasAuthorizedCinatokenRole(candidate.role)
		? candidate
		: null;
};

const parseSubject = (body: unknown): string | null => {
	if (typeof body !== "object" || body === null || Array.isArray(body))
		return null;
	const subject = (body as Record<string, unknown>).subject;
	return typeof subject === "string" &&
		subject.length > 0 &&
		subject.length <= 256
		? subject
		: null;
};

/** Creates private OAuth-session and live-role bridges for cinatoken. */
export const cinatokenOidcBridge = (
	env: CloudflareBindings,
	issuer: string,
	applicationOrigin: string,
): CinaAuthPlugin => ({
	id: "cinatoken-oidc-bridge",
	endpoints: {
		createCinatokenOidcSession: createAuthEndpoint(
			"/cinatoken-oidc/session",
			{ method: "POST" },
			async (ctx) => {
				const headers = ctx.request?.headers ?? ctx.headers;
				if (
					!(await verifyBridgeSecret(
						headers?.get("x-cinatoken-bridge-secret") ?? null,
						env.CINATOKEN_OIDC_BRIDGE_SECRET,
					))
				) {
					throw ctx.error("FORBIDDEN", { message: "cinatoken bridge denied" });
				}
				const accessToken = extractBearerToken(
					headers?.get("authorization") ?? null,
				);
				if (!accessToken) {
					throw ctx.error("UNAUTHORIZED", { message: "Bearer token required" });
				}
				const claims = await verifyJWT(accessToken, {
					jwks: { keyPairConfig: { alg: "ES256" } },
					jwt: { issuer, audience: applicationOrigin },
				});
				if (!claims) {
					throw ctx.error("UNAUTHORIZED", { message: "Invalid access token" });
				}
				const scopes = new Set(
					typeof claims.scope === "string" ? claims.scope.split(" ") : [],
				);
				if (
					!isCinatokenAccessToken(claims, applicationOrigin) ||
					!scopes.has("openid")
				) {
					throw ctx.error("FORBIDDEN", { message: "cinatoken token required" });
				}
				const consumeRateLimit =
					createDurableObjectRateLimitStorage(env).consume;
				if (!consumeRateLimit) {
					throw ctx.error("INTERNAL_SERVER_ERROR", {
						message: "cinatoken rate limiter unavailable",
					});
				}
				const rateLimit = await consumeRateLimit(
					`cinatoken-oidc-session|${claims.sub}`,
					CINATOKEN_OIDC_SESSION_RATE_LIMIT,
				);
				if (!rateLimit.allowed) {
					throw ctx.error("TOO_MANY_REQUESTS", {
						message: "Too many cinatoken session requests",
					});
				}
				const user = await findEligibleUser(
					ctx.context.internalAdapter,
					claims.sub,
				);
				if (!user) {
					throw ctx.error("FORBIDDEN", {
						message: "Administrator role required",
					});
				}
				return ctx.json({
					ok: true,
					user: { id: user.id, email: user.email, role: user.role },
				});
			},
		),
		verifyCinatokenRole: createAuthEndpoint(
			"/cinatoken-oidc/verify",
			{ method: "POST" },
			async (ctx) => {
				const headers = ctx.request?.headers ?? ctx.headers;
				if (
					!(await verifyBridgeSecret(
						headers?.get("x-cinatoken-bridge-secret") ?? null,
						env.CINATOKEN_OIDC_BRIDGE_SECRET,
					))
				) {
					throw ctx.error("FORBIDDEN", { message: "cinatoken bridge denied" });
				}
				const subject = parseSubject(ctx.body);
				if (!subject) {
					throw ctx.error("BAD_REQUEST", { message: "Valid subject required" });
				}
				const consumeRateLimit =
					createDurableObjectRateLimitStorage(env).consume;
				if (!consumeRateLimit) {
					throw ctx.error("INTERNAL_SERVER_ERROR", {
						message: "cinatoken rate limiter unavailable",
					});
				}
				const rateLimit = await consumeRateLimit(
					`cinatoken-role-verify|${subject}`,
					CINATOKEN_ROLE_VERIFY_RATE_LIMIT,
				);
				if (!rateLimit.allowed) {
					throw ctx.error("TOO_MANY_REQUESTS", {
						message: "Too many cinatoken role checks",
					});
				}
				const user = await findEligibleUser(
					ctx.context.internalAdapter,
					subject,
				);
				if (!user) {
					throw ctx.error("FORBIDDEN", {
						message: "Administrator role required",
					});
				}
				return ctx.json({
					ok: true,
					user: { id: user.id, email: user.email, role: user.role },
				});
			},
		),
	},
});
