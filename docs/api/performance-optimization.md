# Performance Optimization Guide

This guide documents performance strategies that match the current AuthFramework API and storage model.

## 1. Optimize the Real Hot Paths

For the mounted REST API, the common hot paths are:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/validate`
- `GET /api/v1/users/profile`
- `POST /api/v1/oauth/introspect`
- `GET /api/v1/health`

Start with those routes before tuning rarely used admin or feature-gated endpoints.

## 2. Reuse HTTP Connections

When you call AuthFramework from another service, keep a single `reqwest::Client` per process.

```rust,ignore
use reqwest::Client;
use std::time::Duration;

fn build_auth_http_client() -> anyhow::Result<Client> {
    Ok(Client::builder()
        .pool_max_idle_per_host(20)
        .pool_idle_timeout(Duration::from_secs(90))
        .tcp_keepalive(Duration::from_secs(60))
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(15))
        .build()?)
}
```

That is a better match for the current codebase than examples built around non-existent `AuthClient` or `HttpClientConfig` types.

## 3. Cache Validation Results Carefully

`GET /api/v1/auth/validate` and `GET /api/v1/oauth/userinfo` are good candidates for very short-lived caching when you control both sides of the call.

Use these rules:

- Key the cache by a hash of the bearer token, not the raw token string.
- Cap the TTL by the token's remaining lifetime.
- Invalidate early when you already know the user logged out.
- Do not cache error responses for long. Revocation and MFA state can change quickly.

```rust,ignore
fn validation_cache_key(token: &str) -> String {
    format!("auth:validate:{}", blake3::hash(token.as_bytes()))
}
```

## 4. Understand the Storage Model

Several fast paths depend on simple KV lookups. Important keys include:

- `user:{user_id}` for canonical user JSON
- `users:index` for the global user list
- `user:username:{name}` and `user:email:{email}` for lookup indexes
- `revoked_token:{jti}` for JWT revocation
- `mfa_enabled:{user_id}` and related MFA keys

Performance implications:

- Avoid redundant lookups for the same user record inside a single request path.
- Prefer batched admin/reporting work outside latency-sensitive authentication flows.
- Keep revocation checks fast by using the existing `revoked_token:{jti}` pattern instead of inventing new token-state lookups.

## 5. Benchmark the Mounted Routes, Not Historical Examples

Use the current route table when load testing.

```bash
ab -n 1000 -c 10 http://localhost:8080/api/v1/health
wrk -t12 -c200 -d30s http://localhost:8080/api/v1/health
```

For login benchmarking, use realistic credentials and include the JSON wrapper in your parsing.

## 6. Introspection and OAuth Tuning

`POST /api/v1/oauth/introspect` performs client authentication and token validation. Treat it as a more expensive path than local bearer-token validation.

Recommendations:

- Prefer `GET /api/v1/auth/validate` for first-party internal services that already trust the AuthFramework bearer tokens.
- Reserve `/oauth/introspect` for RFC-compliant OAuth resource-server integrations.
- Reuse client credentials and keep HTTP connections warm.

## 7. WebAuthn and SAML Considerations

WebAuthn and SAML flows do more parsing and validation than a normal bearer-token request.

- WebAuthn registration and authentication paths parse base64url payloads and verify ceremony state.
- SAML ACS validates XML signatures and assertion conditions when the `saml` feature is enabled.

These paths should be benchmarked separately from login or health checks.

## 8. Database and Reporting Notes

If you maintain a relational reporting store alongside the built-in API layer, align reporting queries with the current schema names.

- The SQL migrations in this repository use `last_login_at`, not `last_login`.
- The `/users/profile` API does not currently expose a `last_login` field.
- Admin list views may surface `last_login` only when that value exists in the stored user JSON.

Keep reporting docs and dashboards separate from the public API contract.

## 9. Observability Endpoints

Use the built-in endpoints before adding custom probes:

- `GET /api/v1/health`
- `GET /api/v1/health/detailed`
- `GET /api/v1/metrics`
- `GET /api/v1/readiness`
- `GET /api/v1/liveness`

These are the right places to observe latency, dependency health, and scrape-ready metrics.

## 10. Practical Checklist

- Reuse `reqwest::Client`
- Keep validation caches short-lived and token-hash keyed
- Benchmark `/api/v1/...` routes, not removed `/oauth2/...` routes
- Use the existing KV key conventions for user, MFA, and revocation state
- Separate protocol-heavy benchmarks (SAML, WebAuthn, introspection) from the basic auth path
