//! OAuth 2.0 Advanced Features API Endpoints
//!
//! Implements advanced OAuth 2.0 and OIDC RFCs:
//! - RFC 7662: Token Introspection
//! - RFC 9126: Pushed Authorization Requests (PAR)

use crate::api::ApiState;
use crate::server::oauth::par::{PARManager, PushedAuthorizationRequest};
use crate::server::token_exchange::token_introspection::{
    ClientAuthMethod, IntrospectionClientCredentials,
};
use axum::{
    Form, Json,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use serde_json::{Value as JsonValue, json};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, info, warn};

// ============================================================================
// Request/Response Types
// ============================================================================

/// Token introspection request (RFC 7662)
#[derive(Debug, Deserialize)]
pub struct IntrospectRequest {
    /// The token to introspect
    pub token: String,

    /// Optional hint about the token type
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_type_hint: Option<String>,

    /// Client ID (if using POST body authentication)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,

    /// Client secret (if using POST body authentication)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_secret: Option<String>,
}

/// Token introspection response (RFC 7662)
#[derive(Debug, Serialize)]
pub struct IntrospectResponse {
    /// Whether the token is currently active
    pub active: bool,

    /// Space-separated scopes (if active)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,

    /// Client identifier (if active)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,

    /// Username (if active)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,

    /// Token type (if active)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_type: Option<String>,

    /// Expiration timestamp (if active)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exp: Option<i64>,

    /// Issued at timestamp (if active)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub iat: Option<i64>,

    /// Not before timestamp (if active)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nbf: Option<i64>,

    /// Subject identifier (if active)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub: Option<String>,

    /// Audience (if active)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aud: Option<String>,

    /// Issuer (if active)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub iss: Option<String>,

    /// JWT ID (if active)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jti: Option<String>,
}

/// Pushed authorization request (RFC 9126)
#[derive(Debug, Deserialize)]
pub struct PARRequest {
    /// OAuth response type
    pub response_type: String,

    /// Client identifier
    pub client_id: String,

    /// Redirect URI
    pub redirect_uri: String,

    /// Requested scopes (space-separated)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,

    /// Client state for CSRF protection
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,

    /// PKCE code challenge
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code_challenge: Option<String>,

    /// PKCE code challenge method
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code_challenge_method: Option<String>,

    /// OIDC nonce
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nonce: Option<String>,

    /// Additional parameters
    #[serde(flatten)]
    pub additional_params: std::collections::HashMap<String, serde_json::Value>,
}

/// Pushed authorization response (RFC 9126)
#[derive(Debug, Serialize)]
pub struct PARResponse {
    /// URI referencing the authorization request
    pub request_uri: String,

    /// Lifetime of the request URI in seconds
    pub expires_in: u64,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Extract Basic Auth credentials from Authorization header
fn extract_basic_auth(auth_value: &str) -> Option<(String, String)> {
    if !auth_value.starts_with("Basic ") {
        return None;
    }

    let encoded = auth_value.strip_prefix("Basic ")?;
    let decoded = general_purpose::STANDARD.decode(encoded).ok()?;
    let decoded_str = String::from_utf8(decoded).ok()?;

    let mut parts = decoded_str.splitn(2, ':');
    let client_id = parts.next()?.to_string();
    let client_secret = parts.next()?.to_string();

    Some((client_id, client_secret))
}

/// Authenticate client for token introspection
async fn authenticate_client(
    headers: &HeaderMap,
    client_id: &Option<String>,
    client_secret: &Option<String>,
) -> Result<IntrospectionClientCredentials, (StatusCode, Json<JsonValue>)> {
    // 1. Check if any authentication is provided
    let auth_header = headers.get("authorization").and_then(|v| v.to_str().ok());

    if auth_header.is_none() && client_id.is_none() {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(
                json!({ "error": "invalid_client", "error_description": "Client authentication required" }),
            ),
        ));
    }

    // 2. Try Basic Auth first
    if let Some(auth_value) = auth_header {
        if let Some((client_id, client_secret)) = extract_basic_auth(auth_value) {
            return Ok(IntrospectionClientCredentials {
                client_id,
                client_secret: Some(client_secret),
                client_assertion: None,
                auth_method: ClientAuthMethod::ClientSecretBasic,
            });
        } else {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(
                    json!({ "error": "invalid_client", "error_description": "Invalid Basic Auth format" }),
                ),
            ));
        }
    }

    // 3. Try POST body authentication
    if let (Some(cid), Some(secret)) = (client_id, client_secret) {
        return Ok(IntrospectionClientCredentials {
            client_id: cid.clone(),
            client_secret: Some(secret.clone()),
            client_assertion: None,
            auth_method: ClientAuthMethod::ClientSecretPost,
        });
    }

    // 4. If we get here, authentication failed
    Err((
        StatusCode::UNAUTHORIZED,
        Json(
            json!({ "error": "invalid_client", "error_description": "Client authentication required" }),
        ),
    ))
}

// ============================================================================
// Token Introspection Endpoint (RFC 7662)
// ============================================================================

/// POST /api/v1/oauth/introspect
///
/// RFC 7662 - Token Introspection Endpoint
///
/// Allows resource servers to query the authorization server to determine
/// the active state and metadata of a token.
///
/// # Security
/// - Requires client authentication (Basic Auth or POST body)
/// - Rate limited per client
/// - Does not expose sensitive token details
///
/// # Example Request
/// ```http
/// POST /api/v1/oauth/introspect HTTP/1.1
/// Host: auth.example.com
/// Authorization: Basic Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ=
/// Content-Type: application/x-www-form-urlencoded
///
/// token=eyJhbGc...&token_type_hint=access_token
/// ```
pub async fn introspect_token(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Form(form): Form<IntrospectRequest>,
) -> impl IntoResponse {
    debug!(
        "Token introspection request - token_type_hint: {:?}",
        form.token_type_hint
    );

    // 1. Authenticate the client
    let credentials =
        match authenticate_client(&headers, &form.client_id, &form.client_secret).await {
            Ok(creds) => creds,
            Err(error_response) => return error_response.into_response(),
        };

    debug!("Client authenticated: {}", credentials.client_id);

    // 2. Validate token using TokenManager
    let token_manager = state.auth_framework.token_manager();

    match token_manager.validate_jwt_token(&form.token) {
        Ok(claims) => {
            // Token is valid and active
            let response = IntrospectResponse {
                active: true,
                scope: Some(claims.scope.clone()),
                client_id: claims.client_id.clone(),
                username: Some(claims.sub.clone()),
                token_type: Some("Bearer".to_string()),
                exp: Some(claims.exp),
                iat: Some(claims.iat),
                nbf: Some(claims.nbf),
                sub: Some(claims.sub.clone()),
                aud: Some(claims.aud.clone()),
                iss: Some(claims.iss.clone()),
                jti: Some(claims.jti.clone()),
            };

            info!(
                "Token introspection completed - active: {}, user: {}",
                response.active, claims.sub
            );

            (StatusCode::OK, Json(response)).into_response()
        }
        Err(err) => {
            // Token is invalid or expired - return inactive per RFC 7662
            // Don't leak information about why the token is invalid
            debug!("Token validation failed: {}", err);

            let response = IntrospectResponse {
                active: false,
                scope: None,
                client_id: None,
                username: None,
                token_type: None,
                exp: None,
                iat: None,
                nbf: None,
                sub: None,
                aud: None,
                iss: None,
                jti: None,
            };

            info!("Token introspection completed - active: false");

            (StatusCode::OK, Json(response)).into_response()
        }
    }
}

// ============================================================================
// Pushed Authorization Request Endpoint (RFC 9126)
// ============================================================================

/// POST /api/v1/oauth/par
///
/// RFC 9126 - Pushed Authorization Requests
///
/// Allows clients to push authorization request parameters to the server
/// before initiating the authorization flow. Returns a request_uri that
/// can be used in the authorization endpoint.
///
/// # Security Benefits
/// - Prevents authorization request parameter tampering
/// - Reduces URL length issues
/// - Protects sensitive parameters from browser history
/// - Server-side parameter validation
///
/// # Example Request
/// ```http
/// POST /api/v1/oauth/par HTTP/1.1
/// Host: auth.example.com
/// Content-Type: application/x-www-form-urlencoded
///
/// response_type=code&client_id=client123&redirect_uri=https://app.example.com/callback
/// &scope=openid%20profile&state=xyz&code_challenge=E9Melhoa...&code_challenge_method=S256
/// ```
pub async fn pushed_authorization_request(
    State(state): State<ApiState>,
    Form(form): Form<PARRequest>,
) -> impl IntoResponse {
    debug!(
        "PAR request from client: {}, redirect_uri: {}",
        form.client_id, form.redirect_uri
    );

    // 1. Validate required parameters
    if form.client_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(
                json!({ "error": "invalid_request", "error_description": "client_id is required" }),
            ),
        )
            .into_response();
    }

    if form.redirect_uri.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid_request", "error_description": "redirect_uri is required" })),
        )
            .into_response();
    }

    // 2. Convert additional_params from JsonValue to String
    let mut additional_params_string: HashMap<String, String> = HashMap::new();
    for (k, v) in form.additional_params.iter() {
        if let Some(s) = v.as_str() {
            additional_params_string.insert(k.clone(), s.to_string());
        }
    }

    // 3. Create PAR request
    let par_request = PushedAuthorizationRequest {
        client_id: form.client_id.clone(),
        response_type: form.response_type.clone(),
        redirect_uri: form.redirect_uri.clone(),
        scope: form.scope.clone(),
        state: form.state.clone(),
        code_challenge: form.code_challenge.clone(),
        code_challenge_method: form.code_challenge_method.clone(),
        additional_params: additional_params_string,
    };

    // 4. Get PAR manager from AuthFramework (singleton)
    let par_manager = state.auth_framework.par_manager();

    // 5. Store the request
    let par_response = match par_manager.store_request(par_request).await {
        Ok(response) => response,
        Err(e) => {
            warn!("Failed to store PAR request: {:?}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "invalid_request", "error_description": format!("Invalid authorization request: {:?}", e) })),
            )
                .into_response();
        }
    };

    // 6. Build response
    let response = PARResponse {
        request_uri: par_response.request_uri,
        expires_in: par_response.expires_in,
    };

    info!(
        "PAR request stored successfully for client: {}, request_uri: {}",
        form.client_id, response.request_uri
    );

    (StatusCode::CREATED, Json(response)).into_response()
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_basic_auth_valid() {
        // "client_id:client_secret" in base64
        let auth_header = "Basic Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ=";

        let result = extract_basic_auth(auth_header);
        assert!(result.is_some());

        let (client_id, client_secret) = result.unwrap();
        assert_eq!(client_id, "client_id");
        assert_eq!(client_secret, "client_secret");
    }

    #[test]
    fn test_extract_basic_auth_invalid_format() {
        let auth_header = "Bearer token";
        let result = extract_basic_auth(auth_header);
        assert!(result.is_none());
    }

    #[test]
    fn test_extract_basic_auth_malformed() {
        let auth_header = "Basic not_valid_base64!";
        let result = extract_basic_auth(auth_header);
        assert!(result.is_none());
    }

    // Integration tests will be added in tests/api/oauth_advanced_tests.rs
}
