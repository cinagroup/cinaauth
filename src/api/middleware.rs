//! API Middleware
//!
//! Authentication, authorization, rate limiting, and other middleware

use crate::api::{ApiResponse, ApiState};
use crate::distributed_rate_limiting::RateLimitResult;
use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::time::{Duration, Instant};

/// Rate limiting middleware backed by [`crate::distributed_rate_limiting::DistributedRateLimiter`].
///
/// Uses the client IP address (from `X-Forwarded-For`, then `X-Real-IP`, falling back to
/// `"unknown"`) as the rate-limiting key.  Returns **429 Too Many Requests** when the limit
/// is exceeded and adds standard `X-RateLimit-*` response headers on every response.
pub async fn rate_limit_middleware_with_state(
    state: ApiState,
    request: Request,
    next: Next,
) -> Result<Response, Response> {
    // Derive a stable key from the client IP.
    // SECURITY (H-4): Validate the extracted value as a real IP address before using it
    // as a rate-limit key.  An attacker who can set arbitrary X-Forwarded-For headers
    // could bypass per-IP limiting by injecting a fabricated first address.  Requiring a
    // valid parse means only syntactically correct IPs are accepted; anything else falls
    // through to the next header or the fallback string "unknown".
    let client_key = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(str::trim)
        .and_then(|s| s.parse::<std::net::IpAddr>().ok().map(|ip| ip.to_string()))
        .or_else(|| {
            request
                .headers()
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(str::trim)
                .and_then(|s| s.parse::<std::net::IpAddr>().ok().map(|ip| ip.to_string()))
        })
        .unwrap_or_else(|| {
            tracing::warn!(
                "Rate limiter: no identifiable client IP from X-Forwarded-For or X-Real-IP; \
                 falling back to shared 'unidentified' bucket"
            );
            "unidentified".to_string()
        });

    match state.rate_limiter.check_rate_limit(&client_key).await {
        Ok(RateLimitResult::Allowed {
            remaining,
            reset_at,
        }) => {
            let mut response = next.run(request).await;
            let headers = response.headers_mut();
            let reset_secs = reset_at
                .checked_duration_since(Instant::now())
                .unwrap_or(Duration::ZERO)
                .as_secs();
            if let Ok(v) = remaining.to_string().parse() {
                headers.insert("X-RateLimit-Remaining", v);
            }
            if let Ok(v) = reset_secs.to_string().parse() {
                headers.insert("X-RateLimit-Reset", v);
            }
            Ok(response)
        }
        Ok(RateLimitResult::Denied { retry_after, .. }) => {
            tracing::warn!(client = %client_key, "Rate limit exceeded");
            let mut response = ApiResponse::<()>::error(
                "RATE_LIMIT_EXCEEDED",
                "Too many requests — please retry after the indicated delay",
            )
            .into_response();
            *response.status_mut() = StatusCode::TOO_MANY_REQUESTS;
            let headers = response.headers_mut();
            if let Ok(v) = retry_after.as_secs().to_string().parse() {
                headers.insert("Retry-After", v);
            }
            Err(response)
        }
        Ok(RateLimitResult::Blocked { unblock_at, reason }) => {
            tracing::warn!(client = %client_key, reason = %reason, "Client is blocked");
            let mut response = ApiResponse::<()>::error(
                "CLIENT_BLOCKED",
                "Access temporarily blocked due to repeated rate limit violations",
            )
            .into_response();
            *response.status_mut() = StatusCode::TOO_MANY_REQUESTS;
            let unblock_secs = unblock_at
                .checked_duration_since(Instant::now())
                .unwrap_or(Duration::ZERO)
                .as_secs();
            if let Ok(v) = unblock_secs.to_string().parse() {
                let headers = response.headers_mut();
                headers.insert("Retry-After", v);
            }
            Err(response)
        }
        Err(e) => {
            // Fail open: log the error and allow the request to proceed.
            tracing::error!(error = %e, "Rate limiter error — allowing request");
            Ok(next.run(request).await)
        }
    }
}

// cors_middleware was removed: it set `Access-Control-Allow-Origin: *` which is
// inappropriate for an authentication service.  Use tower-http's `CorsLayer`
// with a configured `AllowOrigin` list instead.

/// Logging middleware
pub async fn logging_middleware(request: Request, next: Next) -> Response {
    let start = Instant::now();
    let method = request.method().clone();
    let uri = request.uri().clone();
    let headers = request.headers().clone();

    // Extract user agent and IP for logging
    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");

    let forwarded_for = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");

    tracing::info!(
        "Request started: {} {} from {} ({})",
        method,
        uri,
        forwarded_for,
        user_agent
    );

    let response = next.run(request).await;
    let duration = start.elapsed();
    let status = response.status();

    tracing::info!(
        "Request completed: {} {} {} in {:?}",
        method,
        uri,
        status,
        duration
    );

    response
}

/// Security headers middleware
pub async fn security_headers_middleware(request: Request, next: Next) -> Response {
    let response = next.run(request).await;

    let mut response = response;
    let headers = response.headers_mut();

    // Security headers — all values are well-known static strings so from_static is safe.
    headers.insert(
        "X-Content-Type-Options",
        axum::http::HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        "X-Frame-Options",
        axum::http::HeaderValue::from_static("DENY"),
    );
    headers.insert(
        "X-XSS-Protection",
        axum::http::HeaderValue::from_static("1; mode=block"),
    );
    headers.insert(
        "Strict-Transport-Security",
        axum::http::HeaderValue::from_static("max-age=31536000; includeSubDomains"),
    );
    headers.insert(
        "Referrer-Policy",
        axum::http::HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert(
        "Permissions-Policy",
        axum::http::HeaderValue::from_static("camera=(), microphone=(), geolocation=()"),
    );
    headers.insert(
        "Content-Security-Policy",
        axum::http::HeaderValue::from_static("default-src 'none'; frame-ancestors 'none'"),
    );

    response
}

/// Request timeout middleware
pub async fn timeout_middleware(request: Request, next: Next) -> Result<Response, Response> {
    // Set a 30-second timeout for all requests
    match tokio::time::timeout(Duration::from_secs(30), next.run(request)).await {
        Ok(response) => Ok(response),
        Err(_) => {
            let error_response =
                ApiResponse::<()>::error("REQUEST_TIMEOUT", "Request timed out after 30 seconds");
            Err(error_response.into_response())
        }
    }
}

/// Permission check helper
pub fn check_permission(auth_token: &crate::tokens::AuthToken, required_permission: &str) -> bool {
    auth_token.permissions.iter().any(|perm| {
        perm == required_permission
            || perm == "*"
            || (perm.ends_with("*") && required_permission.starts_with(&perm[..perm.len() - 1]))
    })
}

/// Role check helper
pub fn check_role(auth_token: &crate::tokens::AuthToken, required_role: &str) -> bool {
    auth_token.roles.contains(&required_role.to_string())
        || auth_token.roles.contains(&"admin".to_string()) // Admin has all roles
}
