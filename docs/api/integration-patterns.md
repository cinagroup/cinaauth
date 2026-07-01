# Integration Patterns and Best Practices

This guide focuses on patterns that match the current crate surface.

Cinaauth does not currently expose a general-purpose Rust `AuthClient` or `ServiceAuthClient` type for the REST API. The recommended integration model is:

1. Run `ApiServer` inside your auth service.
2. Build a small application-specific HTTP adapter around the routes you use.
3. Reuse the shared `ApiResponse<T>` envelope in that adapter.

## 1. Thin HTTP Adapter

Use a normal HTTP client such as `reqwest::Client` and model only the routes your application actually calls.

```rust,ignore
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<ApiError>,
    message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ApiError {
    code: String,
    message: String,
    details: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
struct LoginRequest<'a> {
    username: &'a str,
    password: &'a str,
    remember_me: bool,
}

#[derive(Debug, Deserialize)]
struct LoginUserInfo {
    id: String,
    username: String,
    roles: Vec<String>,
    permissions: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct LoginResponse {
    access_token: String,
    refresh_token: String,
    token_type: String,
    expires_in: u64,
    user: LoginUserInfo,
    login_risk_level: String,
    security_warnings: Vec<String>,
}

struct AuthApiClient {
    base_url: String,
    http: Client,
}

impl AuthApiClient {
    async fn login(&self, username: &str, password: &str) -> anyhow::Result<LoginResponse> {
        let response = self
            .http
            .post(format!("{}/api/v1/auth/login", self.base_url))
            .json(&LoginRequest {
                username,
                password,
                remember_me: false,
            })
            .send()
            .await?
            .error_for_status()?;

        let body: ApiResponse<LoginResponse> = response.json().await?;
        match (body.success, body.data, body.error) {
            (true, Some(data), _) => Ok(data),
            (false, _, Some(err)) => Err(anyhow::anyhow!("{}: {}", err.code, err.message)),
            _ => Err(anyhow::anyhow!("unexpected response shape")),
        }
    }
}
```

## 2. Axum Middleware Pattern

For services that need to trust Cinaauth bearer tokens, call `GET /api/v1/auth/validate` once near the edge and stash the resulting identity in request extensions.

```rust,ignore
use axum::{
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};

#[derive(Clone)]
struct AppState {
    auth_api: AuthApiClient,
}

async fn auth_middleware<B>(
    State(state): State<AppState>,
    mut request: Request<B>,
    next: Next<B>,
) -> Result<Response, StatusCode> {
    let bearer = request
        .headers()
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let user = state
        .auth_api
        .validate_token(bearer)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    request.extensions_mut().insert(user);
    Ok(next.run(request).await)
}
```

Why `GET /auth/validate`:

- It matches the mounted route.
- It returns the normalized user identity used by the REST layer.
- It also respects token revocation checks already wired into the API.

## 3. MFA Enrollment Pattern

The current MFA enrollment flow is two-step and stays entirely on the authenticated API:

1. `POST /api/v1/mfa/setup`
2. Render the returned `qr_code` or `secret`
3. `POST /api/v1/mfa/verify` with `totp_code`

Do not build a separate `verify-setup` route on the client side. That endpoint does not exist in the current server.

If login returns `MFA_REQUIRED`, finish the login by calling `POST /api/v1/auth/login` again with `challenge_id` and `mfa_code`.

## 4. Profile and Session Management Pattern

Use `/users/profile` for editable account data and `/users/me` only when you specifically want OIDC-style claims.

Current route split:

- `/api/v1/users/profile` returns `email_verified`, `mfa_enabled`, and the editable profile fields.
- `/api/v1/users/me` aliases `/api/v1/oauth/userinfo` and returns OIDC claims instead.
- `/api/v1/users/sessions` lists active sessions for the bearer token's user.

## 5. Admin Automation Pattern

Treat the admin routes as operational APIs rather than end-user workflows.

- Use `GET /api/v1/admin/users` for paginated user inventory.
- Use `PUT /api/v1/admin/users/{user_id}/roles` only for role replacement.
- Use `PUT /api/v1/admin/users/{user_id}/activate` with `{ "active": true | false }` for account state changes.
- Use `GET /api/v1/admin/config` and `PUT /api/v1/admin/config` for runtime-tunable settings only.

## 6. OAuth and OIDC Pattern

Prefer standards-compliant clients around the RFC endpoints instead of inventing crate-local wrapper types.

Important route details:

- Authorization endpoint: `GET /api/v1/oauth/authorize`
- Token endpoint: `POST /api/v1/oauth/token`
- Introspection endpoint: `POST /api/v1/oauth/introspect`
- Discovery document: `GET /api/v1/.well-known/openid-configuration`
- JWKS: `GET /api/v1/.well-known/jwks.json`

Current caveats:

- `/oauth/introspect` requires client authentication and rejects bearer-token auth.
- Dynamic client registration is `POST /oauth/register`.
- Client lookup is `GET /oauth/clients/{client_id}`.

## 7. Testing Pattern

For Rust integration tests, test the mounted HTTP routes directly instead of depending on non-existent mock client types.

```rust,ignore
#[tokio::test]
async fn login_returns_wrapped_tokens() {
    let auth = std::sync::Arc::new(setup_cinaauth().await);
    let server = cinaauth::api::ApiServer::new(auth);
    let router = server.build_router().await.unwrap();

    let response = tower::ServiceExt::oneshot(
        router,
        axum::http::Request::builder()
            .method("POST")
            .uri("/api/v1/auth/login")
            .header("content-type", "application/json")
            .body(axum::body::Body::from(
                r#"{"username":"alice","password":"SecurePassword123!"}"#,
            ))
            .unwrap(),
    )
    .await
    .unwrap();

    assert_eq!(response.status(), axum::http::StatusCode::OK);
}
```

## 8. Operational Guidance

- Reuse one `reqwest::Client` per process to benefit from connection pooling.
- Unwrap the API envelope once in your adapter, not in every call site.
- Preserve `error.code` in logs and metrics. It is the stable signal for operational analysis.
- Keep protocol-native RFC endpoints separate from your wrapped application routes in client code.
