/** Canonical production origin for the public CinaAuth OIDC acceptance client. */
export const OIDC_DEMO_ORIGIN = "https://oidc-demo.cinaseek.ai";

/** Canonical issuer used by the public CinaAuth OIDC acceptance client. */
export const OIDC_DEMO_ISSUER = "https://auth.cinaseek.ai";

/** Stable first-party public client identifier managed as deployment infrastructure. */
export const OIDC_DEMO_CLIENT_ID = "cinaauth-oidc-demo";

/** Exact authorization-code redirect URI registered for the acceptance client. */
export const OIDC_DEMO_REDIRECT_URI = `${OIDC_DEMO_ORIGIN}/callback`;

/** Exact post-logout URI registered for the acceptance client. */
export const OIDC_DEMO_POST_LOGOUT_URI = OIDC_DEMO_ORIGIN;
