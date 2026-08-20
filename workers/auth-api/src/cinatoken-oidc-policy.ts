import { ADMIN_CONSOLE_ROLES } from "@cinaauth/auth-web-contract";
import { CINATOKEN_OIDC_CLIENT_ID } from "./cinatoken-oidc-client";

const CINATOKEN_ADMIN_ROLES = new Set<string>(ADMIN_CONSOLE_ROLES);

export const CINATOKEN_OIDC_SESSION_RATE_LIMIT = {
	window: 60,
	max: 10,
} as const;

export const CINATOKEN_ROLE_VERIFY_RATE_LIMIT = {
	window: 60,
	max: 600,
} as const;

export const hasAuthorizedCinatokenRole = (role: string | null | undefined) =>
	typeof role === "string" &&
	role
		.split(",")
		.map((candidate) => candidate.trim())
		.some((candidate) => CINATOKEN_ADMIN_ROLES.has(candidate));

const audienceContains = (audience: unknown, expected: string) =>
	audience === expected ||
	(Array.isArray(audience) && audience.some((value) => value === expected));

export const isCinatokenAccessToken = (
	claims: { aud?: unknown; azp?: unknown },
	applicationOrigin: string,
) =>
	audienceContains(claims.aud, applicationOrigin) &&
	claims.azp === CINATOKEN_OIDC_CLIENT_ID;
