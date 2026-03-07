//! OAuth 2.0 Advanced Features API Endpoints
//!
//! This module implements basic OAuth 2.0 advanced features:
//! - RFC 7662: Token Introspection (basic implementation)
//! - RFC 9126: Pushed Authorization Requests (basic implementation)

use crate::api::{ApiResponse, ApiState};
use axum::{
    extract::State,
    Form,
};
use serde::{Deserialize, Serialize};

// Simple Request/Response Types

#[derive(Debug, Deserialize)]
pub struct TokenIntrospectForm {
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct TokenIntrospectResponse {
    pub active: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exp: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub iat: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PARForm {
    pub client_id: String,
    pub response_type: Option<String>,
    pub redirect_uri: Option<String>,
    pub scope: Option<String>,
    pub state: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PARResponse {
    pub request_uri: String,
    pub expires_in: u64,
}

#[derive(Debug, Deserialize)]
pub struct DeviceAuthForm {
    pub client_id: String,
    pub scope: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DeviceAuthResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub verification_uri_complete: Option<String>,
    pub expires_in: u64,
    pub interval: Option<u64>,
}

// API Endpoints

/// POST /api/v1/oauth/introspect
/// Token introspection endpoint (RFC 7662)
pub async fn introspect_token(
    State(_state): State<ApiState>,
    Form(_form): Form<TokenIntrospectForm>,
) -> ApiResponse<TokenIntrospectResponse> {
    // For now, return inactive for all tokens - in a real implementation
    // this would validate against the token store
    let response = TokenIntrospectResponse {
        active: false, // TODO: Implement actual token validation
        client_id: None,
        username: None,
        scope: None,
        token_type: None,
        exp: None,
        iat: None,
        sub: None,
    };
    ApiResponse::success(response)
}

/// POST /api/v1/oauth/par
/// Pushed Authorization Request endpoint (RFC 9126)
pub async fn pushed_authorization_request(
    State(_state): State<ApiState>,
    Form(_form): Form<PARForm>,
) -> ApiResponse<PARResponse> {
    // Generate a request URI (simplified implementation)
    let request_uri = format!("urn:ietf:params:oauth:request_uri:{}", uuid::Uuid::new_v4());
    
    // In a real implementation, we would store the request parameters
    // associated with this request_uri for later retrieval
    
    let response = PARResponse {
        request_uri,
        expires_in: 60, // 1 minute expiration
    };

    ApiResponse::success(response)
}

/// POST /api/v1/oauth/device_authorization  
/// Device authorization endpoint (RFC 8628)
pub async fn device_authorization(
    State(_state): State<ApiState>,
    Form(_form): Form<DeviceAuthForm>,
) -> ApiResponse<DeviceAuthResponse> {
    // Generate device code and user code
    let device_code = format!("dc_{}", generate_random_string(32));
    let user_code = generate_user_friendly_code();
    
    let verification_uri = "http://localhost:8080/device".to_string();
    let verification_uri_complete = format!("{}?user_code={}", verification_uri, user_code);

    // In a real implementation, we would store the device authorization
    // data for polling and user authorization
    
    let response = DeviceAuthResponse {
        device_code,
        user_code,
        verification_uri,
        verification_uri_complete: Some(verification_uri_complete),
        expires_in: 600, // 10 minutes
        interval: Some(5), // Poll every 5 seconds
    };

    ApiResponse::success(response)
}

// Helper Functions

fn generate_random_string(length: usize) -> String {
    use rand::Rng;
    const CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut rng = rand::rng();
    (0..length)
        .map(|_| {
            let idx = rng.random_range(0..CHARS.len());
            CHARS[idx] as char
        })
        .collect()
}

fn generate_user_friendly_code() -> String {
    use rand::Rng;
    const CHARS: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No ambiguous chars
    let mut rng = rand::rng();
    (0..8)
        .map(|_| {
            let idx = rng.random_range(0..CHARS.len());
            CHARS[idx] as char
        })
        .collect()
}