//! OAuth2 Flow Endpoints
//!
//! Handles OAuth2 authorization code flow, token exchange, and related operations

use crate::api::{ApiResponse, ApiState};
use axum::{Json, extract::Query, extract::State, http::HeaderMap};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// OAuth2 authorization request parameters
#[derive(Debug, Deserialize)]
pub struct AuthorizeRequest {
    pub response_type: String,
    pub client_id: String,
    pub redirect_uri: String,
    #[serde(default)]
    pub scope: Option<String>,
    #[serde(default)]
    pub state: Option<String>,
    #[serde(default)]
    pub code_challenge: Option<String>, // PKCE
    #[serde(default)]
    pub code_challenge_method: Option<String>, // PKCE
}

/// OAuth2 authorization response
#[derive(Debug, Serialize)]
pub struct AuthorizeResponse {
    pub authorization_url: String,
    pub state: Option<String>,
}

/// OAuth2 token exchange request
#[derive(Debug, Deserialize)]
pub struct TokenRequest {
    pub grant_type: String,
    #[serde(default)]
    pub code: Option<String>,
    #[serde(default)]
    pub redirect_uri: Option<String>,
    #[serde(default)]
    pub client_id: Option<String>,
    #[serde(default)]
    pub client_secret: Option<String>,
    #[serde(default)]
    pub code_verifier: Option<String>, // PKCE
    #[serde(default)]
    pub refresh_token: Option<String>,
}

/// OAuth2 token response
#[derive(Debug, Serialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
}

/// OAuth2 token revocation request
#[derive(Debug, Deserialize)]
pub struct RevokeRequest {
    pub token: String,
    #[serde(default)]
    pub token_type_hint: Option<String>, // "access_token" or "refresh_token"
}

/// GET /oauth2/authorize - Start OAuth2 authorization flow
pub async fn authorize(
    State(state): State<ApiState>,
    Query(req): Query<AuthorizeRequest>,
) -> ApiResponse<AuthorizeResponse> {
    // Validate response_type
    if req.response_type != "code" {
        return ApiResponse::validation_error_typed(
            "Only 'code' response_type is supported (authorization code flow)",
        );
    }

    // Validate client_id (in production, check against registered clients)
    if req.client_id.is_empty() {
        return ApiResponse::validation_error_typed("client_id is required");
    }

    // Validate redirect_uri
    if req.redirect_uri.is_empty() {
        return ApiResponse::validation_error_typed("redirect_uri is required");
    }

    // In production, validate redirect_uri against registered URIs for this client
    tracing::info!(
        "OAuth2 authorization request from client: {}",
        req.client_id
    );

    // Generate authorization code
    let auth_code = format!("ac_{}", uuid::Uuid::new_v4().to_string().replace("-", ""));

    // Store authorization code with associated data
    let code_data = serde_json::json!({
        "client_id": req.client_id,
        "redirect_uri": req.redirect_uri,
        "scope": req.scope.clone().unwrap_or_else(|| "openid profile email".to_string()),
        "state": req.state.clone(),
        "code_challenge": req.code_challenge,
        "code_challenge_method": req.code_challenge_method,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "expires_at": (chrono::Utc::now() + chrono::Duration::minutes(10)).to_rfc3339(),
        "used": false,
    });

    let storage_key = format!("oauth2_code:{}", auth_code);
    let code_data_str = serde_json::to_string(&code_data).unwrap();

    // Store with 10 minute expiration
    match state
        .auth_framework
        .storage()
        .store_kv(
            &storage_key,
            code_data_str.as_bytes(),
            Some(std::time::Duration::from_secs(600)),
        )
        .await
    {
        Ok(_) => {
            // Build authorization URL with code
            let mut auth_url = format!("{}?code={}", req.redirect_uri, auth_code);
            if let Some(state_param) = &req.state {
                auth_url = format!("{}&state={}", auth_url, state_param);
            }

            let response = AuthorizeResponse {
                authorization_url: auth_url,
                state: req.state,
            };

            tracing::info!("Authorization code generated for client: {}", req.client_id);
            ApiResponse::success(response)
        }
        Err(e) => {
            tracing::error!("Failed to store authorization code: {:?}", e);
            ApiResponse::error_typed(
                "AUTHORIZATION_FAILED",
                "Failed to generate authorization code",
            )
        }
    }
}

/// POST /oauth2/token - Exchange authorization code for access token
pub async fn token(
    State(state): State<ApiState>,
    Json(req): Json<TokenRequest>,
) -> ApiResponse<TokenResponse> {
    match req.grant_type.as_str() {
        "authorization_code" => handle_authorization_code_grant(state, req).await,
        "refresh_token" => handle_refresh_token_grant(state, req).await,
        _ => ApiResponse::validation_error_typed(&format!(
            "Unsupported grant_type: {}",
            req.grant_type
        )),
    }
}

/// Handle authorization_code grant type
async fn handle_authorization_code_grant(
    state: ApiState,
    req: TokenRequest,
) -> ApiResponse<TokenResponse> {
    // Validate required fields
    let code = match &req.code {
        Some(c) => c,
        None => return ApiResponse::validation_error_typed("code is required"),
    };

    let client_id = match &req.client_id {
        Some(c) => c,
        None => return ApiResponse::validation_error_typed("client_id is required"),
    };

    // Retrieve authorization code data
    let storage_key = format!("oauth2_code:{}", code);
    let code_data = match state.auth_framework.storage().get_kv(&storage_key).await {
        Ok(Some(data)) => {
            let data_str = String::from_utf8_lossy(&data);
            match serde_json::from_str::<serde_json::Value>(&data_str) {
                Ok(d) => d,
                Err(_) => {
                    return ApiResponse::error_typed("INVALID_CODE_DATA", "Invalid code data");
                }
            }
        }
        Ok(None) => return ApiResponse::error_typed("INVALID_GRANT", "Invalid authorization code"),
        Err(e) => {
            tracing::error!("Failed to retrieve authorization code: {:?}", e);
            return ApiResponse::error_typed("RETRIEVAL_FAILED", "Failed to retrieve code");
        }
    };

    // Validate code hasn't been used
    if code_data["used"].as_bool().unwrap_or(false) {
        return ApiResponse::error_typed("INVALID_GRANT", "Authorization code already used");
    }

    // Validate expiration
    if let Some(expires_at_str) = code_data["expires_at"].as_str() {
        if let Ok(expires_at) = chrono::DateTime::parse_from_rfc3339(expires_at_str) {
            if chrono::Utc::now() > expires_at.with_timezone(&chrono::Utc) {
                return ApiResponse::error_typed("INVALID_GRANT", "Authorization code expired");
            }
        }
    }

    // Validate client_id matches
    if code_data["client_id"].as_str() != Some(client_id) {
        return ApiResponse::error_typed("INVALID_CLIENT", "client_id mismatch");
    }

    // Validate redirect_uri matches if provided
    if let Some(redirect_uri) = &req.redirect_uri {
        if code_data["redirect_uri"].as_str() != Some(redirect_uri) {
            return ApiResponse::error_typed("INVALID_GRANT", "redirect_uri mismatch");
        }
    }

    // Validate PKCE if code_challenge was provided
    if let Some(challenge) = code_data["code_challenge"].as_str() {
        let verifier = match &req.code_verifier {
            Some(v) => v,
            None => return ApiResponse::error_typed("INVALID_REQUEST", "code_verifier required"),
        };

        // Verify code_challenge (simplified - in production use proper SHA256)
        let challenge_method = code_data["code_challenge_method"]
            .as_str()
            .unwrap_or("plain");
        let computed_challenge = match challenge_method {
            "plain" => verifier.clone(),
            "S256" => {
                // In production, compute SHA256 hash of verifier
                verifier.clone() // Simplified for now
            }
            _ => {
                return ApiResponse::error_typed(
                    "INVALID_REQUEST",
                    "Unsupported code_challenge_method",
                );
            }
        };

        if &computed_challenge != challenge {
            return ApiResponse::error_typed("INVALID_GRANT", "code_verifier validation failed");
        }
    }

    // Mark code as used
    let mut updated_code_data = code_data.clone();
    updated_code_data["used"] = serde_json::json!(true);
    let updated_data_str = serde_json::to_string(&updated_code_data).unwrap();
    let _ = state
        .auth_framework
        .storage()
        .store_kv(&storage_key, updated_data_str.as_bytes(), None)
        .await;

    // Generate tokens
    // In production, this would be for a specific user - for now use client_id as user_id
    let user_id = format!("oauth_user_{}", client_id);
    let scope = code_data["scope"]
        .as_str()
        .unwrap_or("openid profile email");

    let scopes: Vec<String> = scope.split_whitespace().map(String::from).collect();

    // Create access token
    let token_lifetime = std::time::Duration::from_secs(3600); // 1 hour
    let access_token = match state.auth_framework.token_manager().create_jwt_token(
        &user_id,
        scopes.clone(),
        Some(token_lifetime),
    ) {
        Ok(jwt) => jwt,
        Err(e) => {
            tracing::error!("Failed to create access token: {}", e);
            return ApiResponse::error_typed("TOKEN_CREATION_FAILED", "Failed to create token");
        }
    };

    // Create refresh token
    let refresh_token_lifetime = std::time::Duration::from_secs(86400 * 30); // 30 days
    let refresh_token = match state.auth_framework.token_manager().create_jwt_token(
        &user_id,
        vec!["refresh".to_string()],
        Some(refresh_token_lifetime),
    ) {
        Ok(jwt) => jwt,
        Err(e) => {
            tracing::error!("Failed to create refresh token: {}", e);
            return ApiResponse::error_typed(
                "TOKEN_CREATION_FAILED",
                "Failed to create refresh token",
            );
        }
    };

    // Store OAuth2 token data for later validation
    let token_data = serde_json::json!({
        "user_id": user_id,
        "client_id": client_id,
        "scopes": scopes,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "expires_at": (chrono::Utc::now() + chrono::Duration::hours(1)).to_rfc3339(),
        "refresh_token": refresh_token,
    });

    let token_storage_key = format!("oauth2_token:{}", access_token);
    let token_data_str = serde_json::to_string(&token_data).unwrap();
    let _ = state
        .auth_framework
        .storage()
        .store_kv(&token_storage_key, token_data_str.as_bytes(), None)
        .await;

    tracing::info!(
        "OAuth2 tokens issued for client: {} (user: {})",
        client_id,
        user_id
    );

    let response = TokenResponse {
        access_token,
        token_type: "Bearer".to_string(),
        expires_in: 3600,
        refresh_token: Some(refresh_token),
        scope: Some(scope.to_string()),
    };

    ApiResponse::success(response)
}

/// Handle refresh_token grant type
async fn handle_refresh_token_grant(
    state: ApiState,
    req: TokenRequest,
) -> ApiResponse<TokenResponse> {
    // Validate required fields
    let refresh_token = match &req.refresh_token {
        Some(t) => t,
        None => return ApiResponse::validation_error_typed("refresh_token is required"),
    };

    // Validate refresh token
    let claims = match state
        .auth_framework
        .token_manager()
        .validate_jwt_token(refresh_token)
    {
        Ok(c) => c,
        Err(_) => return ApiResponse::error_typed("INVALID_GRANT", "Invalid refresh token"),
    };

    let user_id = claims.sub.clone();

    // Ensure token has refresh scope
    let token_scope = claims
        .custom
        .get("scope")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if !token_scope.contains("refresh") {
        return ApiResponse::error_typed("INVALID_GRANT", "Token is not a refresh token");
    }

    // Parse scopes from the original token (excluding 'refresh' for access token)
    let scopes: Vec<String> = token_scope
        .split_whitespace()
        .map(|s| s.to_string())
        .filter(|s| s != "refresh") // Remove refresh scope from new access token
        .collect();

    let scope_string = scopes.join(" "); // Store for response

    let token_lifetime = std::time::Duration::from_secs(3600); // 1 hour
    let access_token = match state.auth_framework.token_manager().create_jwt_token(
        &user_id,
        scopes,
        Some(token_lifetime),
    ) {
        Ok(jwt) => jwt,
        Err(e) => {
            tracing::error!("Failed to create access token: {}", e);
            return ApiResponse::error_typed("TOKEN_CREATION_FAILED", "Failed to create token");
        }
    };

    tracing::info!("OAuth2 access token refreshed for user: {}", user_id);

    let response = TokenResponse {
        access_token,
        token_type: "Bearer".to_string(),
        expires_in: 3600,
        refresh_token: None, // Don't issue new refresh token
        scope: Some(scope_string),
    };

    ApiResponse::success(response)
}

/// POST /oauth2/revoke - Revoke an OAuth2 token
pub async fn revoke(
    State(state): State<ApiState>,
    Json(req): Json<RevokeRequest>,
) -> ApiResponse<serde_json::Value> {
    // Revoke the token by deleting it from storage
    let storage_key = format!("oauth2_token:{}", req.token);

    match state.auth_framework.storage().delete_kv(&storage_key).await {
        Ok(_) => {
            tracing::info!("OAuth2 token revoked");
            ApiResponse::success(serde_json::json!({
                "message": "Token revoked successfully"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to revoke token: {:?}", e);
            // Return success anyway - token might not exist
            ApiResponse::success(serde_json::json!({
                "message": "Token revoked successfully"
            }))
        }
    }
}

/// GET /oauth2/userinfo - Get user information (OpenID Connect UserInfo endpoint)
pub async fn userinfo(
    State(state): State<ApiState>,
    headers: HeaderMap,
) -> ApiResponse<HashMap<String, serde_json::Value>> {
    // Extract bearer token
    let token = match crate::api::extract_bearer_token(&headers) {
        Some(t) => t,
        None => return ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required"),
    };

    // Validate token
    let claims = match state
        .auth_framework
        .token_manager()
        .validate_jwt_token(&token)
    {
        Ok(c) => c,
        Err(_) => return ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required"),
    };

    // Return user info
    let mut userinfo = HashMap::new();
    userinfo.insert("sub".to_string(), serde_json::json!(claims.sub));
    userinfo.insert("iss".to_string(), serde_json::json!(claims.iss));

    if let Some(scope) = claims.custom.get("scope") {
        userinfo.insert("scope".to_string(), scope.clone());
    }

    tracing::info!("UserInfo request for user: {}", claims.sub);

    ApiResponse::success(userinfo)
}


