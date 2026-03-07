# Enhancements found in: src\api\server-TUF-Laptop.rs
# Size difference: +220 bytes
# Analysis date: 10/04/2025 08:03:16

## Line 6 difference:
Working: use crate::api::{ApiState, admin, auth, health, mfa, middleware, oauth, users};
TUF-Laptop: use crate::api::{ApiState, admin, auth, health, mfa, middleware, oauth, oauth_advanced, users};

## Line 110 difference:
Working:             // OAuth 2.0 Advanced Features (RFC 7662, RFC 9126) - TODO: Implement
TUF-Laptop:             // OAuth 2.0 Advanced Features (RFC 7662, RFC 9126)

## Line 111 difference:
Working:             // .route("/api/v1/oauth/introspect", post(oauth_advanced::introspect_token))
TUF-Laptop:             .route(

## Line 112 difference:
Working:             // .route("/api/v1/oauth/par", post(oauth_advanced::pushed_authorization_request))
TUF-Laptop:                 "/api/v1/oauth/introspect",

## Line 113 difference:
Working:             // OIDC endpoints (well-known unversioned per spec, userinfo versioned)
TUF-Laptop:                 post(oauth_advanced::introspect_token),

## Line 114 difference:
Working:             .route(
TUF-Laptop:             )

## Line 115 difference:
Working:                 "/.well-known/openid-configuration",
TUF-Laptop:             .route(

## Line 116 difference:
Working:                 get(oauth::oidc_discovery),
TUF-Laptop:                 "/api/v1/oauth/par",

## Line 117 difference:
Working:             )
TUF-Laptop:                 post(oauth_advanced::pushed_authorization_request),

## Line 118 difference:
Working:             .route("/.well-known/jwks.json", get(oauth::jwks))
TUF-Laptop:             )

## Line 119 difference:
Working:             .route("/api/v1/oidc/userinfo", get(oauth::userinfo))
TUF-Laptop:             // OIDC endpoints (well-known unversioned per spec, userinfo versioned)

## Line 120 difference:
Working:             // User management endpoints (versioned, authenticated)
TUF-Laptop:             .route(

## Line 121 difference:
Working:             .route("/api/v1/users/me", get(users::get_profile)) // Alias for /users/profile
TUF-Laptop:                 "/.well-known/openid-configuration",

## Line 122 difference:
Working:             .route("/api/v1/users/profile", get(users::get_profile))
TUF-Laptop:                 get(oauth::oidc_discovery),

## Line 123 difference:
Working:             .route("/api/v1/users/profile", put(users::update_profile))
TUF-Laptop:             )

## Line 124 difference:
Working:             .route(
TUF-Laptop:             .route("/.well-known/jwks.json", get(oauth::jwks))

## Line 125 difference:
Working:                 "/api/v1/users/change-password",
TUF-Laptop:             .route("/api/v1/oidc/userinfo", get(oauth::userinfo))

## Line 126 difference:
Working:                 post(users::change_password),
TUF-Laptop:             // User management endpoints (versioned, authenticated)

## Line 127 difference:
Working:             )
TUF-Laptop:             .route("/api/v1/users/me", get(users::get_profile)) // Alias for /users/profile

## Line 128 difference:
Working:             .route("/api/v1/users/sessions", get(users::get_sessions))
TUF-Laptop:             .route("/api/v1/users/profile", get(users::get_profile))

## Line 129 difference:
Working:             .route(
TUF-Laptop:             .route("/api/v1/users/profile", put(users::update_profile))

## Line 130 difference:
Working:                 "/api/v1/users/sessions/{session_id}",
TUF-Laptop:             .route(

## Line 131 difference:
Working:                 delete(users::revoke_session),
TUF-Laptop:                 "/api/v1/users/change-password",

## Line 132 difference:
Working:             )
TUF-Laptop:                 post(users::change_password),

## Line 133 difference:
Working:             .route(
TUF-Laptop:             )

... (truncated - too many differences)
