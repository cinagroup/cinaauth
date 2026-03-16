/// Advanced middleware hooks for request/response interception and error mapping
pub trait AdvancedMiddlewareHooks {
    fn on_request(&self, _req: &warp::http::Request<warp::hyper::body::Incoming>) {}
    fn on_response(&self, _res: &warp::http::Response<warp::hyper::body::Incoming>) {}
    fn on_error(&self, _err: &AuthError) {}
}
/// Warp integration for auth-framework.
///
/// This module provides filters and utilities for seamless
/// integration with Warp web applications.
use crate::authorization::{AccessContext, AuthorizationStorage};

use crate::{
    AuthError, AuthFramework, Result,
    authorization::{AuthorizationEngine, AbacPermission},
    tokens::AuthToken,
};
use chrono::TimeZone as _;
use std::sync::Arc;
use warp::{Filter, Rejection, Reply};

/// Custom rejection type for authentication errors
#[derive(Debug)]
pub struct AuthRejection {
    pub error: AuthError,
}

impl warp::reject::Reject for AuthRejection {}

/// Warp filter for extracting and validating JWT tokens
pub fn with_auth(
    auth_framework: Arc<AuthFramework>,
) -> impl Filter<Extract = (AuthToken,), Error = Rejection> + Clone {
    warp::header::<String>("authorization").and_then(move |auth_header: String| {
        let auth_framework = auth_framework.clone();
        async move {
            // Extract the raw bearer token
            let token_str = extract_token_from_header(&auth_header)
                .map_err(|e| warp::reject::custom(AuthRejection { error: e }))?;

            // Validate using the framework's TokenManager (full HMAC/RSA signature verification)
            let claims = auth_framework
                .token_manager()
                .validate_jwt_token(&token_str)
                .map_err(|e| warp::reject::custom(AuthRejection { error: e }))?;

            // Convert the validated JwtClaims into an AuthToken
            let exp_ts = chrono::Utc.timestamp_opt(claims.exp, 0)
                .single()
                .unwrap_or_else(|| chrono::Utc::now() + chrono::Duration::seconds(3600));
            let iat_ts = chrono::Utc.timestamp_opt(claims.iat, 0)
                .single()
                .unwrap_or_else(chrono::Utc::now);
            let scopes = claims
                .scope
                .split_whitespace()
                .map(|s| s.to_string())
                .collect();

            let token = AuthToken {
                token_id: claims.jti.clone(),
                user_id: claims.sub.clone(),
                access_token: token_str,
                refresh_token: None,
                token_type: Some("Bearer".to_string()),
                expires_at: exp_ts,
                scopes,
                issued_at: iat_ts,
                auth_method: "jwt".to_string(),
                client_id: claims.client_id,
                user_profile: None,
                permissions: claims.permissions.unwrap_or_default(),
                roles: claims.roles.unwrap_or_default(),
                metadata: crate::tokens::TokenMetadata::default(),
                subject: Some(claims.sub),
                issuer: Some(claims.iss),
            };

            Ok::<AuthToken, warp::Rejection>(token)
        }
    })
}

/// Warp filter for checking permissions
pub fn with_permission<S>(
    permission: AbacPermission,
    authorization: Arc<AuthorizationEngine<S>>,
) -> impl Filter<Extract = ((),), Error = Rejection> + Clone
where
    S: AuthorizationStorage + Send + Sync + 'static,
{
    with_auth_token().and_then(move |token: AuthToken| {
        let permission = permission.clone();
        let authorization = authorization.clone();

        async move {
            // Check if user has the required permission
            match authorization
                .check_permission(
                    &token.user_id,
                    &permission,
                    &AccessContext::new(token.user_id.clone()),
                )
                .await
            {
                Ok(result) if result.granted => Ok::<(), _>(()),
                Ok(_) => Err(warp::reject::custom(AuthRejection {
                    error: AuthError::Permission(crate::errors::PermissionError::Denied {
                        action: permission.action.clone(),
                        resource: permission.resource.clone(),
                        message: "Insufficient permissions".to_string(),
                    }),
                })),
                Err(e) => Err(warp::reject::custom(AuthRejection { error: e })),
            }
        }
    })
}

/// Helper filter to extract auth token without framework dependency
pub fn with_auth_token() -> impl Filter<Extract = (AuthToken,), Error = Rejection> + Clone {
    warp::header::<String>("authorization").and_then(|auth_header: String| async move {
        extract_token_from_header(&auth_header)
            .and_then(|token_str| validate_token_secure(&token_str))
            .map_err(|e| warp::reject::custom(AuthRejection { error: e }))
    })
}

/// Filter for optional authentication (doesn't reject if no token)
pub fn with_optional_auth() -> impl Filter<Extract = (Option<AuthToken>,), Error = Rejection> + Clone
{
    warp::header::optional::<String>("authorization").and_then(
        |auth_header: Option<String>| async move {
            match auth_header {
                Some(header) => {
                    match extract_token_from_header(&header)
                        .and_then(|token_str| validate_token_secure(&token_str))
                    {
                        Ok(token) => Ok::<_, warp::Rejection>(Some(token)),
                        Err(_) => Ok::<_, warp::Rejection>(None), // Invalid token is treated as no token
                    }
                }
                None => Ok::<_, warp::Rejection>(None),
            }
        },
    )
}

/// Filter for role-based access
pub fn with_role<S>(
    required_role: &str,
    authorization: Arc<AuthorizationEngine<S>>,
) -> impl Filter<Extract = ((),), Error = Rejection> + Clone
where
    S: AuthorizationStorage + Send + Sync + 'static,
{
    let required_role = required_role.to_string();

    with_auth_token().and_then({
        let required_role = required_role.clone();
        let authorization = authorization.clone();
        move |_token: AuthToken| {
            let required_role = required_role.clone();
            let authorization = authorization.clone();
            async move {
                // Implement real role checking using AuthorizationEngine
                let user_id = _token.user_id.clone();
                let has_role = authorization
                    .has_any_role(&user_id, std::slice::from_ref(&required_role))
                    .await
                    .unwrap_or(false);
                if has_role {
                    Ok::<(), _>(())
                } else {
                    Err(warp::reject::custom(AuthRejection {
                        error: AuthError::Permission(crate::errors::PermissionError::Denied {
                            action: "role_check".to_string(),
                            resource: required_role.clone(),
                            message: "Insufficient role".to_string(),
                        }),
                    }))
                }
            }
        }
    })
}

/// CORS filter for authentication endpoints
pub fn cors() -> warp::cors::Builder {
    warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["authorization", "content-type"])
        .allow_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
}

/// Error handling for authentication rejections
pub async fn handle_rejection(err: Rejection) -> std::result::Result<impl Reply, Rejection> {
    if let Some(auth_rejection) = err.find::<AuthRejection>() {
        let code = match &auth_rejection.error {
            AuthError::Token(_) => warp::http::StatusCode::UNAUTHORIZED,
            AuthError::Permission(_) => warp::http::StatusCode::FORBIDDEN,
            _ => warp::http::StatusCode::INTERNAL_SERVER_ERROR,
        };

        let message = match &auth_rejection.error {
            AuthError::Token(token_err) => match token_err {
                crate::errors::TokenError::Missing => "Missing authentication token",
                crate::errors::TokenError::Invalid { .. } => "Invalid authentication token",
                crate::errors::TokenError::Expired => "Authentication token expired",
                _ => "Authentication failed",
            },
            AuthError::Permission(_) => "Insufficient permissions",
            _ => "Internal server error",
        };

        let json = warp::reply::json(&serde_json::json!({
            "error": message,
            "code": code.as_u16()
        }));

        Ok(warp::reply::with_status(json, code))
    } else {
        Err(err)
    }
}

/// Helper function to extract token from Authorization header
fn extract_token_from_header(auth_header: &str) -> Result<String> {
    if !auth_header.starts_with("Bearer ") {
        return Err(AuthError::Token(crate::errors::TokenError::Invalid {
            message: "Authorization header must use Bearer scheme".to_string(),
        }));
    }

    Ok(auth_header[7..].to_string())
}

/// Structural and claims validation for contexts where no signing key is available.
///
/// **This function does NOT verify the JWT cryptographic signature.** It validates:
/// - JWT base64url structure (three parts)
/// - Required claims (`sub`, `exp`)
/// - Token expiration
///
/// For full signature verification, use [`with_auth`] which delegates to the
/// framework's [`TokenManager::validate_jwt_token`].
fn validate_token_secure(token_str: &str) -> Result<AuthToken> {

    // Basic format validation
    if token_str.len() < 10 {
        return Err(AuthError::auth_method(
            "warp_integration",
            "Token too short",
        ));
    }

    // Check for JWT structure (header.payload.signature)
    let parts: Vec<&str> = token_str.split('.').collect();
    if parts.len() != 3 {
        return Err(AuthError::auth_method(
            "warp_integration",
            "Invalid JWT format - must have 3 parts",
        ));
    }

    // Validate base64url encoding of parts
    use base64::Engine;
    for (i, part) in parts.iter().enumerate() {
        if base64::engine::general_purpose::URL_SAFE_NO_PAD
            .decode(part)
            .is_err()
        {
            return Err(AuthError::auth_method(
                "warp_integration",
                format!("Invalid base64url encoding in part {}", i + 1),
            ));
        }
    }

    // Decode and validate the payload structure — signature is not verified here.
    // Use `with_auth()` for full cryptographic validation.
    let payload_json = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|_| AuthError::auth_method("warp_integration", "Failed to decode payload"))?;

    let payload_str = String::from_utf8(payload_json)
        .map_err(|_| AuthError::auth_method("warp_integration", "Invalid UTF-8 in payload"))?;

    let payload: serde_json::Value = serde_json::from_str(&payload_str)
        .map_err(|_| AuthError::auth_method("warp_integration", "Invalid JSON in payload"))?;

    // Validate required JWT claims
    let sub = payload
        .get("sub")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AuthError::auth_method("warp_integration", "Missing 'sub' claim"))?;

    let exp = payload.get("exp").and_then(|v| v.as_i64()).ok_or_else(|| {
        AuthError::auth_method("warp_integration", "Missing or invalid 'exp' claim")
    })?;

    // Check token expiration
    let now = chrono::Utc::now().timestamp();
    if exp < now {
        return Err(AuthError::auth_method(
            "warp_integration",
            "Token has expired",
        ));
    }

    // Extract optional claims
    let scopes = payload
        .get("scope")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();

    let iat = payload.get("iat").and_then(|v| v.as_i64()).unwrap_or(now);

    // Create validated token
    Ok(AuthToken {
        token_id: uuid::Uuid::new_v4().to_string(),
        user_id: sub.to_string(),
        access_token: token_str.to_string(),
        refresh_token: None,
        token_type: Some("Bearer".to_string()),
        expires_at: chrono::Utc.timestamp_opt(exp, 0)
            .single()
            .unwrap_or_else(|| chrono::Utc::now() + chrono::Duration::seconds(3600)),
        scopes,
        issued_at: chrono::Utc.timestamp_opt(iat, 0)
            .single()
            .unwrap_or_else(chrono::Utc::now),
        auth_method: "jwt".to_string(),
        client_id: payload
            .get("client_id")
            .or_else(|| payload.get("azp"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        user_profile: None,
        permissions: payload
            .get("permissions")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .map(|s| s.to_string())
                    .collect()
            })
            .unwrap_or_default(),
        roles: payload
            .get("roles")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .map(|s| s.to_string())
                    .collect()
            })
            .unwrap_or_default(),
        metadata: crate::tokens::TokenMetadata::default(),
        subject: Some(sub.to_string()),
        issuer: payload
            .get("iss")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
    })
}

/// Configuration for Warp integration
pub struct WarpConfig<S: AuthorizationStorage + Send + Sync + 'static> {
    pub auth_framework: Arc<AuthFramework>,
    pub authorization_engine: Option<Arc<AuthorizationEngine<S>>>,
}

impl<S: AuthorizationStorage + Send + Sync + 'static> WarpConfig<S> {
    pub fn new(auth_framework: Arc<AuthFramework>) -> Self {
        Self {
            auth_framework,
            authorization_engine: None,
        }
    }

    pub fn with_authorization(mut self, engine: Arc<AuthorizationEngine<S>>) -> Self {
        self.authorization_engine = Some(engine);
        self
    }

    /// Create auth filter with this configuration
    pub fn auth_filter(&self) -> impl Filter<Extract = (AuthToken,), Error = Rejection> + Clone {
        with_auth(self.auth_framework.clone())
    }
}

/// Helper macros for common authentication patterns
#[macro_export]
macro_rules! protected_route {
    ($path:expr, $handler:expr) => {
        warp::path($path)
            .and($crate::integrations::warp::with_auth_token())
            .and_then($handler)
    };
}

#[macro_export]
macro_rules! admin_route {
    ($path:expr, $handler:expr, $authorization:expr) => {
        warp::path($path)
            .and($crate::integrations::warp::with_role(
                "admin",
                $authorization,
            ))
            .and_then($handler)
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use warp::test;

    async fn test_handler(token: AuthToken) -> std::result::Result<impl Reply, warp::Rejection> {
        Ok(warp::reply::json(&serde_json::json!({
            "message": format!("Hello, {}!", token.user_id)
        })))
    }

    #[tokio::test]
    async fn test_auth_filter() {
        use jsonwebtoken::{Algorithm, EncodingKey, Header, encode};
        use serde_json::json;

        // Create a proper JWT token for testing
        let header = Header::new(Algorithm::HS256);
        let claims = json!({
            "sub": "test_user",
            "exp": chrono::Utc::now().timestamp() + 3600, // 1 hour from now
            "iat": chrono::Utc::now().timestamp(),
            "scope": "read write"
        });
        let secret = b"test_secret_key_32_bytes_minimum!";
        let token = encode(&header, &claims, &EncodingKey::from_secret(secret)).unwrap();

        let filter = warp::path("test")
            .and(with_auth_token())
            .and_then(test_handler);

        // Test with valid token
        let resp = test::request()
            .path("/test")
            .header("authorization", &format!("Bearer {}", token))
            .reply(&filter)
            .await;

        assert_eq!(resp.status(), 200);

        // Test with invalid token
        let resp = test::request()
            .path("/test")
            .header("authorization", "Bearer invalid_token")
            .reply(&filter)
            .await;

        assert_eq!(resp.status(), 500); // Should be handled by rejection handler
    }

    #[tokio::test]
    async fn test_optional_auth() {
        let filter = warp::path("test").and(with_optional_auth()).and_then(
            |token: Option<AuthToken>| async move {
                let message = match token {
                    Some(t) => format!("Hello, {}!", t.user_id),
                    None => "Hello, anonymous!".to_string(),
                };
                Ok::<_, Rejection>(warp::reply::json(&serde_json::json!({
                    "message": message
                })))
            },
        );

        // Test with token
        let resp = test::request()
            .path("/test")
            .header("authorization", "Bearer valid_token_123")
            .reply(&filter)
            .await;

        assert_eq!(resp.status(), 200);

        // Test without token
        let resp = test::request().path("/test").reply(&filter).await;

        assert_eq!(resp.status(), 200);
    }
}
