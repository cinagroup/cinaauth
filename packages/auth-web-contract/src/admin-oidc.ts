/** Canonical CinaAdmin origin and confidential OIDC client contract. */
export const ADMIN_OIDC_ORIGIN = "https://admin.cinaseek.ai";
export const ADMIN_OIDC_ISSUER = "https://auth.cinaseek.ai";
export const ADMIN_OIDC_CLIENT_ID = "cinaseek-admin-console";
/** Prefix enforced by the CinaAuth OAuth Provider for confidential client secrets. */
export const ADMIN_OIDC_CLIENT_SECRET_PREFIX = "cina_cs_";
/** Minimum entropy-bearing payload length after the client-secret prefix. */
export const ADMIN_OIDC_CLIENT_SECRET_MIN_PAYLOAD_LENGTH = 32;
export const ADMIN_OIDC_REDIRECT_URI = `${ADMIN_OIDC_ORIGIN}/api/auth/oidc/callback`;
export const ADMIN_OIDC_POST_LOGOUT_URI = `${ADMIN_OIDC_ORIGIN}/login`;
export const ADMIN_OIDC_RESOURCE = ADMIN_OIDC_ORIGIN;
export const ADMIN_OIDC_SCOPES = ["openid", "profile", "email"] as const;
/** Private bridge header carrying the already-validated ID Token auth_time. */
export const ADMIN_OIDC_AUTH_TIME_HEADER = "x-cinaadmin-auth-time";
/** Maximum accepted age of the authentication event for an Admin step-up. */
export const ADMIN_OIDC_STEP_UP_MAX_AGE_SECONDS = 5 * 60;

/** Returns whether an Admin client secret matches the provider wire contract. */
export const isValidAdminOidcClientSecret = (
	secret: string | null | undefined,
) =>
	typeof secret === "string" &&
	secret.startsWith(ADMIN_OIDC_CLIENT_SECRET_PREFIX) &&
	secret.length - ADMIN_OIDC_CLIENT_SECRET_PREFIX.length >=
		ADMIN_OIDC_CLIENT_SECRET_MIN_PAYLOAD_LENGTH;
