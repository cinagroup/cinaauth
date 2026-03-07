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
    /// Indicates if the token is currently active
    pub active: bool,

    /// The subject of the token
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub: Option<String>,

    /// The client_id associated with the token
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,

    /// The scopes associated with the token
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,

    /// Token expiration timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exp: Option<i64>,

    /// Token issued at timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub iat: Option<i64>,

    /// Not before timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nbf: Option<i64>,

    /// Issuer of the token
    #[serde(skip_serializing_if = "Option::is_none")]
    pub iss: Option<String>,

    /// Audience of the token
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aud: Option<JsonValue>,

    /// JWT ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jti: Option<String>,

    /// Token type (e.g., "Bearer")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_type: Option<String>,

    /// Username associated with the token
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
}

/// Pushed Authorization Request response (RFC 9126)
#[derive(Debug, Serialize)]
pub struct PARResponse {
    /// The request URI for the authorization request
    pub request_uri: String,

    /// Expiration time in seconds
    pub expires_in: u64,
}

// ============================================================================
// Client Authentication Helpers
// ============================================================================

/// Extract client credentials from Authorization header or request body
fn extract_client_credentials(
    headers: &HeaderMap,
    body_client_id: Option<String>,
    body_client_secret: Option<String>,
) -> Result<IntrospectionClientCredentials, (StatusCode, Json<JsonValue>)> {
    // Try Authorization header first (RFC preferred method)
    if let Some(auth_header) = headers.get("authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(basic_auth) = auth_str.strip_prefix("Basic ") {
                if let Ok(decoded) = general_purpose::STANDARD.decode(basic_auth) {
                    if let Ok(decoded_str) = String::from_utf8(decoded) {
                        if let Some((client_id, client_secret)) = decoded_str.split_once(':') {
                            return Ok(IntrospectionClientCredentials {
                                client_id: client_id.to_string(),
                                client_secret: Some(client_secret.to_string()),
                                auth_method: ClientAuthMethod::ClientSecretBasic,
                            });
                        }
                    }
                }
            }
        }
    }

    // Fall back to request body
    if let (Some(client_id), Some(client_secret)) = (body_client_id, body_client_secret) {
        return Ok(IntrospectionClientCredentials {
            client_id,
            client_secret: Some(client_secret),
            auth_method: ClientAuthMethod::ClientSecretPost,
        });
    }

    // If we have only client_id, it might be a public client
    if let Some(client_id) = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Basic "))
        .and_then(|b| general_purpose::STANDARD.decode(b).ok())
        .and_then(|d| String::from_utf8(d).ok())
        .and_then(|s| s.split_once(':').map(|(id, _)| id.to_string()))
    {
        return Ok(IntrospectionClientCredentials {
            client_id,
            client_secret: None,
            auth_method: ClientAuthMethod::None,
        });
    }

    Err((
        StatusCode::BAD_REQUEST,
        Json(json!({
            "error": "invalid_client",
            "error_description": "Client authentication failed"
        })),
    ))
}

// ============================================================================
// Endpoint Handlers
// ============================================================================

/// Token introspection endpoint (RFC 7662)
///
/// Allows authorized clients to determine the active state and meta-information
/// about a given token.
pub async fn introspect_token(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Form(request): Form<IntrospectRequest>,
) -> Result<Json<IntrospectResponse>, (StatusCode, Json<JsonValue>)> {
    debug!("Token introspection request received");

    // Extract and validate client credentials
    let credentials = extract_client_credentials(
        &headers,
        request.client_id.clone(),
        request.client_secret.clone(),
    )?;

    debug!(
        "Client authenticated: {}, method: {:?}",
        credentials.client_id, credentials.auth_method
    );

    // Get the introspection manager
    let introspection_manager = match state.auth_framework.get_introspection_manager() {
        Some(manager) => manager,
        None => {
            warn!("Token introspection not configured");
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "temporarily_unavailable",
                    "error_description": "Token introspection service is not available"
                })),
            ));
        }
    };

    // Perform token introspection
    match introspection_manager
        .introspect_token(
            &request.token,
            &credentials,
            request.token_type_hint.as_deref(),
        )
        .await
    {
        Ok(introspection_result) => {
            info!(
                "Token introspection successful for client: {}",
                credentials.client_id
            );

            let response = IntrospectResponse {
                active: introspection_result.active,
                sub: introspection_result.sub,
                client_id: introspection_result.client_id,
                scope: introspection_result.scope,
                exp: introspection_result.exp,
                iat: introspection_result.iat,
                nbf: introspection_result.nbf,
                iss: introspection_result.iss,
                aud: introspection_result.aud.map(|a| {
                    if a.len() == 1 {
                        JsonValue::String(a[0].clone())
                    } else {
                        JsonValue::Array(a.into_iter().map(JsonValue::String).collect())
                    }
                }),
                jti: introspection_result.jti,
                token_type: introspection_result.token_type,
                username: introspection_result.username,
            };

            Ok(Json(response))
        }
        Err(e) => {
            warn!(
                "Token introspection failed for client {}: {}",
                credentials.client_id, e
            );

            // Per RFC 7662, introspection failures should return active: false
            Ok(Json(IntrospectResponse {
                active: false,
                sub: None,
                client_id: None,
                scope: None,
                exp: None,
                iat: None,
                nbf: None,
                iss: None,
                aud: None,
                jti: None,
                token_type: None,
                username: None,
            }))
        }
    }
}

/// Pushed Authorization Request endpoint (RFC 9126)
///
/// Allows clients to push authorization request parameters to the authorization
/// server before redirecting the user to the authorization endpoint.
pub async fn pushed_authorization_request(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Form(request): Form<HashMap<String, String>>,
) -> Result<Json<PARResponse>, (StatusCode, Json<JsonValue>)> {
    debug!("Pushed Authorization Request received");

    // Extract client credentials
    let credentials = extract_client_credentials(
        &headers,
        request.get("client_id").cloned(),
        request.get("client_secret").cloned(),
    )?;

    debug!(
        "PAR client authenticated: {}, method: {:?}",
        credentials.client_id, credentials.auth_method
    );

    // Get the PAR manager
    let par_manager = match state.auth_framework.get_par_manager() {
        Some(manager) => manager,
        None => {
            warn!("PAR not configured");
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "temporarily_unavailable",
                    "error_description": "Pushed Authorization Request service is not available"
                })),
            ));
        }
    };

    // Convert form parameters to PAR request
    let par_request = PushedAuthorizationRequest {
        client_id: credentials.client_id.clone(),
        response_type: request.get("response_type").cloned(),
        scope: request.get("scope").cloned(),
        redirect_uri: request.get("redirect_uri").cloned(),
        state: request.get("state").cloned(),
        code_challenge: request.get("code_challenge").cloned(),
        code_challenge_method: request.get("code_challenge_method").cloned(),
        nonce: request.get("nonce").cloned(),
        additional_parameters: request
            .into_iter()
            .filter(|(k, _)| {
                !matches!(
                    k.as_str(),
                    "client_id"
                        | "client_secret"
                        | "response_type"
                        | "scope"
                        | "redirect_uri"
                        | "state"
                        | "code_challenge"
                        | "code_challenge_method"
                        | "nonce"
                )
            })
            .collect(),
    };

    // Process the PAR request
    match par_manager
        .create_request_uri(&par_request, &credentials)
        .await
    {
        Ok((request_uri, expires_in)) => {
            info!(
                "PAR successful for client: {}, request_uri: {}",
                credentials.client_id, request_uri
            );

            Ok(Json(PARResponse {
                request_uri,
                expires_in,
            }))
        }
        Err(e) => {
            warn!("PAR failed for client {}: {}", credentials.client_id, e);

            Err((
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": "invalid_request",
                    "error_description": format!("PAR failed: {}", e)
                })),
            ))
        }
    }
}

/// Device Authorization endpoint (RFC 8628)
///
/// Initiates the device authorization flow for input-constrained devices.
pub async fn device_authorization(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Form(request): Form<HashMap<String, String>>,
) -> Result<Json<JsonValue>, (StatusCode, Json<JsonValue>)> {
    debug!("Device Authorization request received");

    // Extract client credentials
    let credentials = extract_client_credentials(
        &headers,
        request.get("client_id").cloned(),
        request.get("client_secret").cloned(),
    )?;

    debug!(
        "Device authorization client authenticated: {}",
        credentials.client_id
    );

    // Get the device flow manager
    let device_manager = match state.auth_framework.get_device_flow_manager() {
        Some(manager) => manager,
        None => {
            warn!("Device flow not configured");
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "unsupported_grant_type",
                    "error_description": "Device authorization flow is not supported"
                })),
            ));
        }
    };

    // Extract scope from request
    let scope = request.get("scope").cloned().unwrap_or_default();

    // Initiate device authorization
    match device_manager
        .initiate_device_authorization(&credentials.client_id, &scope)
        .await
    {
        Ok(device_auth) => {
            info!(
                "Device authorization initiated for client: {}, device_code: {}",
                credentials.client_id, device_auth.device_code
            );

            Ok(Json(json!({
                "device_code": device_auth.device_code,
                "user_code": device_auth.user_code,
                "verification_uri": device_auth.verification_uri,
                "verification_uri_complete": device_auth.verification_uri_complete,
                "expires_in": device_auth.expires_in,
                "interval": device_auth.interval
            })))
        }
        Err(e) => {
            warn!(
                "Device authorization failed for client {}: {}",
                credentials.client_id, e
            );

            Err((
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": "invalid_request",
                    "error_description": format!("Device authorization failed: {}", e)
                })),
            ))
        }
    }
}

/// CIBA (Client Initiated Backchannel Authentication) endpoint (OpenID Connect CIBA)
///
/// Initiates a backchannel authentication request.
pub async fn ciba_backchannel_auth(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Form(request): Form<HashMap<String, String>>,
) -> Result<Json<JsonValue>, (StatusCode, Json<JsonValue>)> {
    debug!("CIBA Backchannel Authentication request received");

    // Extract client credentials
    let credentials = extract_client_credentials(
        &headers,
        request.get("client_id").cloned(),
        request.get("client_secret").cloned(),
    )?;

    debug!("CIBA client authenticated: {}", credentials.client_id);

    // Get the CIBA manager
    let ciba_manager = match state.auth_framework.get_ciba_manager() {
        Some(manager) => manager,
        None => {
            warn!("CIBA not configured");
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "temporarily_unavailable",
                    "error_description": "CIBA service is not available"
                })),
            ));
        }
    };

    // Extract required parameters
    let login_hint = request.get("login_hint");
    let login_hint_token = request.get("login_hint_token");
    let id_token_hint = request.get("id_token_hint");

    // At least one hint must be provided
    if login_hint.is_none() && login_hint_token.is_none() && id_token_hint.is_none() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "invalid_request",
                "error_description": "At least one of login_hint, login_hint_token, or id_token_hint must be provided"
            })),
        ));
    }

    // Initiate CIBA request
    match ciba_manager
        .initiate_backchannel_auth(
            &credentials.client_id,
            login_hint,
            login_hint_token,
            id_token_hint,
            request.get("scope"),
            request.get("binding_message"),
            request.get("user_code"),
            request.get("requested_expiry").and_then(|s| s.parse().ok()),
        )
        .await
    {
        Ok(ciba_response) => {
            info!(
                "CIBA initiated for client: {}, auth_req_id: {}",
                credentials.client_id, ciba_response.auth_req_id
            );

            Ok(Json(json!({
                "auth_req_id": ciba_response.auth_req_id,
                "expires_in": ciba_response.expires_in,
                "interval": ciba_response.interval
            })))
        }
        Err(e) => {
            warn!("CIBA failed for client {}: {}", credentials.client_id, e);

            Err((
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": "invalid_request",
                    "error_description": format!("CIBA failed: {}", e)
                })),
            ))
        }
    }
}
