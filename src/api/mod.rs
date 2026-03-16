//! REST API Server Module
//!
//! This module provides a comprehensive REST API server implementation
//! that exposes all AuthFramework functionality through HTTP endpoints.

pub mod admin;
pub mod auth;
pub mod error_codes;
pub mod health;
pub mod metrics;
pub mod mfa;
pub mod middleware;
pub mod oauth2;
pub mod oauth_advanced;
pub mod openapi;
pub mod responses;
pub mod security;
pub mod security_simple;
pub mod server;
pub mod users;
pub mod validation;
pub mod versioning;
pub mod webauthn;
pub mod saml;

#[cfg(feature = "enhanced-rbac")]
#[cfg(feature = "role-system")]
pub mod rbac_endpoints;

pub use responses::{ApiError, ApiResponse, ApiResult};
pub use security::SecurityManager;
pub use server::ApiServer;

use crate::AuthFramework;
use crate::distributed_rate_limiting::{DistributedRateLimiter, RateLimitConfig};
use crate::errors::AuthError;
use std::sync::Arc;

/// API server state
#[derive(Clone)]
pub struct ApiState {
    pub auth_framework: Arc<AuthFramework>,
    pub rate_limiter: Arc<DistributedRateLimiter>,
    #[cfg(feature = "enhanced-rbac")]
    pub authorization_service: Arc<crate::authorization_enhanced::AuthorizationService>,
}

impl ApiState {
    pub async fn new(auth_framework: Arc<AuthFramework>) -> crate::errors::Result<Self> {
        let rate_limiter = Arc::new(
            DistributedRateLimiter::new(RateLimitConfig::balanced()).await?,
        );
        Ok(Self {
            auth_framework,
            rate_limiter,
            #[cfg(feature = "enhanced-rbac")]
            authorization_service: Arc::new(
                crate::authorization_enhanced::AuthorizationService::new().await?,
            ),
        })
    }

    #[cfg(feature = "enhanced-rbac")]
    pub fn with_authorization_service(
        auth_framework: Arc<AuthFramework>,
        rate_limiter: Arc<DistributedRateLimiter>,
        authorization_service: Arc<crate::authorization_enhanced::AuthorizationService>,
    ) -> Self {
        Self {
            auth_framework,
            rate_limiter,
            authorization_service,
        }
    }
}

/// Extract bearer token from Authorization header
pub fn extract_bearer_token(headers: &axum::http::HeaderMap) -> Option<String> {
    headers
        .get("authorization")
        .and_then(|header| header.to_str().ok())
        .and_then(|auth_str| auth_str.strip_prefix("Bearer "))
        .map(|token| token.to_string())
}

/// Validate API token and extract user information
pub async fn validate_api_token(
    auth_framework: &AuthFramework,
    token: &str,
) -> Result<crate::tokens::AuthToken, AuthError> {
    // Validate the JWT signature and expiry
    let token_obj = auth_framework.token_manager().validate_jwt_token(token)?;

    // Check whether this token has been explicitly revoked (e.g. via logout)
    let revocation_key = format!("revoked_token:{}", token_obj.jti);
    match auth_framework.storage().get_kv(&revocation_key).await {
        Ok(Some(_)) => {
            return Err(AuthError::Unauthorized(
                "Token has been revoked".to_string(),
            ));
        }
        Ok(None) => {} // Not revoked — proceed
        Err(e) => {
            // Storage error: fail open with a warning rather than denying all requests
            tracing::warn!("Could not check token revocation list: {}", e);
        }
    }

    // Convert the validated token claims to AuthToken.
    // Roles are not embedded in JWT claims (create_jwt_token sets roles: None),
    // so we load them from the user record in KV storage to allow role-based
    // access checks (e.g. admin endpoints) to work correctly.
    let user_id_str = token_obj.sub.clone();
    let roles = {
        let user_key = format!("user:{}", user_id_str);
        match auth_framework.storage().get_kv(&user_key).await {
            Ok(Some(bytes)) => {
                let json: serde_json::Value =
                    serde_json::from_slice(&bytes).unwrap_or_default();
                json["roles"]
                    .as_array()
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str())
                            .map(|s| s.to_string())
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_else(|| token_obj.roles.clone().unwrap_or_default())
            }
            _ => token_obj.roles.clone().unwrap_or_default(),
        }
    };

    Ok(crate::tokens::AuthToken {
        token_id: token_obj.jti.clone(),
        user_id: user_id_str.clone(),
        access_token: token.to_string(),
        token_type: Some("Bearer".to_string()),
        subject: Some(user_id_str.clone()),
        issuer: Some(token_obj.iss.clone()),
        refresh_token: None,
        issued_at: chrono::DateTime::from_timestamp(token_obj.iat, 0)
            .unwrap_or_else(chrono::Utc::now),
        expires_at: chrono::DateTime::from_timestamp(token_obj.exp, 0)
            .unwrap_or_else(chrono::Utc::now),
        scopes: token_obj
            .scope
            .split_whitespace()
            .map(|s| s.to_string())
            .collect(),
        auth_method: "jwt".to_string(),
        client_id: token_obj.client_id,
        user_profile: None,
        permissions: token_obj.permissions.unwrap_or_default(),
        roles,
        metadata: crate::tokens::TokenMetadata {
            session_id: None, // JWT tokens don't have session_id in claims by default
            ..Default::default()
        },
    })
}


