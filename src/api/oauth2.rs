//! OAuth 2.0 API Endpoints
//!
//! Handles OAuth 2.0 authorization code flow (RFC 6749), token exchange,
//! token revocation (RFC 7009), and client metadata retrieval.

use crate::api::{ApiResponse, ApiState, extract_bearer_token, validate_api_token};
use crate::oauth2_server::AuthorizationRequest;
// Re-export canonical types for consumers that imported them from api::oauth2
pub use crate::oauth2_server::{AuthorizationRequest as AuthorizeRequest, TokenRequest, TokenResponse};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Redirect},
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// OAuth error response (RFC 6749 §5.2)
#[derive(Debug, Serialize)]
pub struct OAuthError {
    pub error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_uri: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
}

/// Client information
#[derive(Debug, Serialize, Deserialize)]
pub struct ClientInfo {
    pub client_id: String,
    pub name: String,
    pub description: String,
    pub redirect_uris: Vec<String>,
    pub scopes: Vec<String>,
}

/// OAuth2 token revocation request
#[derive(Debug, Deserialize)]
pub struct RevokeRequest {
    pub token: String,
    #[serde(default)]
    pub token_type_hint: Option<String>, // "access_token" or "refresh_token"
}

/// UserInfo response for OAuth2
#[derive(Debug, Serialize)]
pub struct UserInfoResponse {
    pub sub: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub picture: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<i64>,
}

/// GET /oauth/authorize
/// OAuth 2.0 authorization endpoint — validates the client and redirect_uri, generates
/// an authorization code, and redirects the user-agent back to the client (RFC 6749 §4.1.2).
///
/// SECURITY: The caller must supply their access token as `Authorization: Bearer <token>`.
/// The authenticated user's identity is recorded in the authorization code so it can be
/// used when the client exchanges the code for tokens.  Issuing codes without a verified
/// user identity would allow any party that knows a valid client_id to obtain tokens.
pub async fn authorize(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Query(params): Query<AuthorizationRequest>,
) -> impl IntoResponse {
    if params.response_type != "code" {
        let error = OAuthError {
            error: "unsupported_response_type".to_string(),
            error_description: Some("Only 'code' response type is supported".to_string()),
            error_uri: None,
            state: params.state,
        };
        return (StatusCode::BAD_REQUEST, Json(error)).into_response();
    }

    if params.client_id.is_empty() {
        let error = OAuthError {
            error: "invalid_request".to_string(),
            error_description: Some("client_id is required".to_string()),
            error_uri: None,
            state: params.state,
        };
        return (StatusCode::BAD_REQUEST, Json(error)).into_response();
    }

    if params.redirect_uri.is_empty() {
        let error = OAuthError {
            error: "invalid_request".to_string(),
            error_description: Some("redirect_uri is required".to_string()),
            error_uri: None,
            state: params.state,
        };
        return (StatusCode::BAD_REQUEST, Json(error)).into_response();
    }

    // SECURITY: Require the resource owner to be authenticated before issuing codes.
    // The user must supply their Bearer access token.  Without this check, any caller
    // that knows a registered client_id could obtain a code and exchange it for tokens.
    let user_id = {
        let token_str = match extract_bearer_token(&headers) {
            Some(t) => t,
            None => {
                let error = OAuthError {
                    error: "unauthorized_client".to_string(),
                    error_description: Some(
                        "User authentication required: supply your access token as \
                         'Authorization: Bearer <token>'"
                            .to_string(),
                    ),
                    error_uri: None,
                    state: params.state,
                };
                return (StatusCode::UNAUTHORIZED, Json(error)).into_response();
            }
        };
        match validate_api_token(&state.auth_framework, &token_str).await {
            Ok(auth_token) => auth_token.user_id,
            Err(_) => {
                let error = OAuthError {
                    error: "unauthorized_client".to_string(),
                    error_description: Some("Invalid or expired user access token".to_string()),
                    error_uri: None,
                    state: params.state,
                };
                return (StatusCode::UNAUTHORIZED, Json(error)).into_response();
            }
        }
    };

    // SECURITY: Validate client_id and verify the redirect_uri is pre-registered.
    // Redirecting to an unregistered URI would let an attacker steal the authorization code.
    let client_key = format!("oauth2_client:{}", params.client_id);
    match state.auth_framework.storage().get_kv(&client_key).await {
        Ok(Some(data)) => {
            let client_data: serde_json::Value = serde_json::from_slice(&data).unwrap_or_default();
            let registered_uris: Vec<String> = client_data["redirect_uris"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();

            if !registered_uris.contains(&params.redirect_uri) {
                tracing::warn!(
                    client_id = %params.client_id,
                    redirect_uri = %params.redirect_uri,
                    "OAuth authorize: redirect_uri not registered for client"
                );
                let error = OAuthError {
                    error: "invalid_request".to_string(),
                    error_description: Some(
                        "redirect_uri is not registered for this client".to_string(),
                    ),
                    error_uri: None,
                    state: params.state,
                };
                return (StatusCode::BAD_REQUEST, Json(error)).into_response();
            }
        }
        Ok(None) => {
            tracing::warn!(client_id = %params.client_id, "OAuth authorize: unknown client_id");
            let error = OAuthError {
                error: "invalid_client".to_string(),
                error_description: Some("Unknown client_id".to_string()),
                error_uri: None,
                state: params.state,
            };
            return (StatusCode::BAD_REQUEST, Json(error)).into_response();
        }
        Err(e) => {
            tracing::error!(
                client_id = %params.client_id,
                error = %e,
                "OAuth authorize: storage error looking up client"
            );
            let error = OAuthError {
                error: "server_error".to_string(),
                error_description: Some("Authorization server error".to_string()),
                error_uri: None,
                state: params.state,
            };
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(error)).into_response();
        }
    }

    let auth_code = format!("ac_{}", uuid::Uuid::new_v4().to_string().replace("-", ""));
    let code_data = serde_json::json!({
        "client_id": params.client_id,
        "redirect_uri": params.redirect_uri,
        "scope": params.scope.clone().unwrap_or_else(|| "openid profile email".to_string()),
        "state": params.state.clone(),
        "code_challenge": params.code_challenge,
        "code_challenge_method": params.code_challenge_method,
        "user_id": user_id,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "expires_at": (chrono::Utc::now() + chrono::Duration::minutes(10)).to_rfc3339(),
        "used": false,
    });

    let storage_key = format!("oauth2_code:{}", auth_code);
    let code_data_str = match serde_json::to_string(&code_data) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to serialize OAuth authorization code data: {:?}", e);
            let error = OAuthError {
                error: "server_error".to_string(),
                error_description: Some("Authorization server internal error".to_string()),
                error_uri: None,
                state: None,
            };
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(error)).into_response();
        }
    };

    if let Err(e) = state
        .auth_framework
        .storage()
        .store_kv(
            &storage_key,
            code_data_str.as_bytes(),
            Some(std::time::Duration::from_secs(600)),
        )
        .await
    {
        tracing::error!("Failed to store OAuth authorization code: {:?}", e);
        let error = OAuthError {
            error: "server_error".to_string(),
            error_description: Some("Authorization server error".to_string()),
            error_uri: None,
            state: params.state,
        };
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(error)).into_response();
    }

    // SECURITY: URL-encode the state value to prevent parameter injection.
    // A raw state like "&extra=injected" would append unintended query parameters.
    let encoded_state: Option<String> = params.state.as_deref().map(|st| {
        st.bytes()
            .flat_map(|b| {
                if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') {
                    vec![b as char]
                } else {
                    format!("%{:02X}", b).chars().collect()
                }
            })
            .collect()
    });

    let mut redirect_url = params.redirect_uri;
    redirect_url.push_str(&format!("?code={}", auth_code));
    if let Some(ref st) = encoded_state {
        redirect_url.push_str(&format!("&state={}", st));
    }

    tracing::info!(
        client_id = %params.client_id,
        user_id = %user_id,
        "OAuth authorization code issued"
    );
    Redirect::to(&redirect_url).into_response()
}

/// POST /oauth/token - OAuth2 token exchange
pub async fn token(
    State(state): State<ApiState>,
    Json(req): Json<TokenRequest>,
) -> ApiResponse<TokenResponse> {
    match req.grant_type.as_str() {
        "authorization_code" => handle_authorization_code_grant(state, req).await,
        "refresh_token" => handle_refresh_token_grant(state, req).await,
        _ => ApiResponse::error_typed(
            "unsupported_grant_type",
            "Supported grant types: authorization_code, refresh_token",
        ),
    }
}

async fn handle_authorization_code_grant(
    state: ApiState,
    req: TokenRequest,
) -> ApiResponse<TokenResponse> {
    let code = match req.code {
        Some(c) => c,
        None => {
            return ApiResponse::validation_error_typed(
                "code is required for authorization_code grant",
            );
        }
    };

    let client_id = match req.client_id {
        Some(c) => c,
        None => return ApiResponse::validation_error_typed("client_id is required"),
    };

    // Retrieve authorization code data from storage
    let storage_key = format!("oauth2_code:{}", code);
    let code_data = match state.auth_framework.storage().get_kv(&storage_key).await {
        Ok(Some(data)) => match serde_json::from_slice::<serde_json::Value>(&data) {
            Ok(json) => json,
            Err(e) => {
                tracing::error!("Failed to parse stored authorization code data: {:?}", e);
                return ApiResponse::error_typed("invalid_grant", "Invalid authorization code");
            }
        },
        Ok(None) => {
            return ApiResponse::error_typed(
                "invalid_grant",
                "Authorization code not found or expired",
            );
        }
        Err(e) => {
            tracing::error!("Failed to retrieve authorization code: {:?}", e);
            return ApiResponse::error_typed(
                "server_error",
                "Failed to validate authorization code",
            );
        }
    };

    // Validate code hasn't been used (one-time use enforcement)
    if code_data["used"].as_bool().unwrap_or(false) {
        return ApiResponse::error_typed(
            "invalid_grant",
            "Authorization code has already been used",
        );
    }

    // Validate client_id matches
    if code_data["client_id"].as_str() != Some(&client_id) {
        return ApiResponse::error_typed("invalid_grant", "client_id mismatch");
    }

    // Validate redirect_uri if provided
    if let Some(redirect_uri) = &req.redirect_uri
        && code_data["redirect_uri"].as_str() != Some(redirect_uri)
    {
        return ApiResponse::error_typed("invalid_grant", "redirect_uri mismatch");
    }

    // Check if PKCE was used in authorization - if so, code_verifier is required
    let stored_challenge = code_data["code_challenge"].as_str();
    let challenge_method = code_data["code_challenge_method"]
        .as_str()
        .unwrap_or("plain");

    if let Some(stored) = stored_challenge {
        // PKCE was used in authorization, so code_verifier is required
        let code_verifier = match &req.code_verifier {
            Some(verifier) => verifier,
            None => {
                return ApiResponse::error_typed(
                    "invalid_request",
                    "code_verifier is required when PKCE challenge was provided",
                );
            }
        };

        let computed_challenge = match challenge_method {
            "S256" => {
                let mut hasher = Sha256::new();
                hasher.update(code_verifier.as_bytes());
                URL_SAFE_NO_PAD.encode(hasher.finalize())
            }
            "plain" => code_verifier.clone(),
            _ => {
                return ApiResponse::error_typed(
                    "invalid_request",
                    "Unsupported code_challenge_method",
                );
            }
        };

        if computed_challenge != stored {
            return ApiResponse::error_typed("invalid_grant", "PKCE verification failed");
        }
    } else if req.code_verifier.is_some() {
        // code_verifier provided but no challenge was used - this is suspicious
        return ApiResponse::error_typed(
            "invalid_request",
            "code_verifier provided but no PKCE challenge was used in authorization",
        );
    }

    // SECURITY: Mark code as used before issuing tokens.  If persisting the mark fails we
    // MUST refuse to proceed — silently continuing would allow replay of the same code.
    let mut updated_code_data = code_data.clone();
    updated_code_data["used"] = serde_json::Value::Bool(true);
    let updated_data_str = match serde_json::to_string(&updated_code_data) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to serialize updated code data: {:?}", e);
            return ApiResponse::error_typed("server_error", "Failed to process authorization code");
        }
    };

    if let Err(e) = state
        .auth_framework
        .storage()
        .store_kv(
            &storage_key,
            updated_data_str.as_bytes(),
            Some(std::time::Duration::from_secs(600)),
        )
        .await
    {
        tracing::error!("Failed to mark authorization code as used: {:?}", e);
        return ApiResponse::error_typed(
            "server_error",
            "Failed to process authorization code; please retry",
        );
    }

    // Create access and refresh tokens
    let scope = code_data["scope"]
        .as_str()
        .unwrap_or("openid profile email");
    let scopes: Vec<String> = scope.split_whitespace().map(|s| s.to_string()).collect();

    // Use the user_id that was recorded in the authorization code when the resource owner
    // authenticated via the /oauth/authorize endpoint.  This ensures tokens are bound to the
    // actual user rather than a fabricated identifier derived from the client_id.
    let user_id = match code_data["user_id"].as_str() {
        Some(uid) if !uid.is_empty() => uid.to_string(),
        _ => {
            tracing::error!("Authorization code missing user_id field");
            return ApiResponse::error_typed("server_error", "Malformed authorization code");
        }
    };

    let token = match state.auth_framework.token_manager().create_auth_token(
        &user_id,
        scopes.clone(),
        "oauth2",
        None,
    ) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to create access token: {:?}", e);
            return ApiResponse::error_typed("server_error", "Failed to create access token");
        }
    };

    // Persist a storage-backed refresh token so the refresh grant can validate and rotate it.
    let refresh_token_value = uuid::Uuid::new_v4().to_string().replace("-", "");
    let refresh_data = serde_json::json!({
        "user_id": user_id,
        "client_id": client_id,
        "scopes": scope,
    });
    let refresh_key = format!("oauth2_refresh_token:{}", refresh_token_value);
    if let Err(e) = state
        .auth_framework
        .storage()
        .store_kv(
            &refresh_key,
            serde_json::to_string(&refresh_data).unwrap_or_default().as_bytes(),
            Some(std::time::Duration::from_secs(30 * 24 * 3600)),
        )
        .await
    {
        tracing::warn!("Failed to store refresh token: {:?}", e);
    }

    let response = TokenResponse {
        access_token: token.access_token,
        token_type: "Bearer".to_string(),
        expires_in: 3600,
        refresh_token: Some(refresh_token_value),
        scope: Some(scope.to_string()),
        id_token: None,
    };

    tracing::info!("OAuth2 tokens issued for client: {}", client_id);
    ApiResponse::success(response)
}

async fn handle_refresh_token_grant(
    state: ApiState,
    req: TokenRequest,
) -> ApiResponse<TokenResponse> {
    let refresh_token_str = match req.refresh_token {
        Some(t) => t,
        None => return ApiResponse::validation_error_typed("refresh_token is required"),
    };

    // Validate the refresh token against persistent storage.
    let refresh_key = format!("oauth2_refresh_token:{}", refresh_token_str);
    let stored = match state.auth_framework.storage().get_kv(&refresh_key).await {
        Ok(Some(data)) => match serde_json::from_slice::<serde_json::Value>(&data) {
            Ok(v) => v,
            Err(_) => return ApiResponse::error_typed("invalid_grant", "Invalid refresh token"),
        },
        Ok(None) => {
            return ApiResponse::error_typed(
                "invalid_grant",
                "Refresh token not found or expired",
            );
        }
        Err(e) => {
            tracing::error!("Failed to retrieve refresh token: {:?}", e);
            return ApiResponse::error_typed("server_error", "Failed to validate refresh token");
        }
    };

    let user_id = match stored["user_id"].as_str() {
        Some(u) => u.to_string(),
        None => return ApiResponse::error_typed("invalid_grant", "Malformed refresh token data"),
    };
    let scope = stored["scopes"]
        .as_str()
        .unwrap_or("openid profile email")
        .to_string();
    let scopes: Vec<String> = scope.split_whitespace().map(|s| s.to_string()).collect();

    // Rotate: delete the old refresh token (single-use enforcement).
    if let Err(e) = state.auth_framework.storage().delete_kv(&refresh_key).await {
        tracing::warn!("Failed to delete old refresh token during rotation: {:?}", e);
    }

    let token = match state
        .auth_framework
        .token_manager()
        .create_auth_token(&user_id, scopes, "oauth2", None)
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to create access token on refresh: {:?}", e);
            return ApiResponse::error_typed("server_error", "Failed to issue access token");
        }
    };

    // Issue a new refresh token (rotation).
    let new_refresh_token = uuid::Uuid::new_v4().to_string().replace("-", "");
    let new_refresh_data = serde_json::json!({ "user_id": user_id, "scopes": scope });
    let new_refresh_key = format!("oauth2_refresh_token:{}", new_refresh_token);
    if let Err(e) = state
        .auth_framework
        .storage()
        .store_kv(
            &new_refresh_key,
            serde_json::to_string(&new_refresh_data)
                .unwrap_or_default()
                .as_bytes(),
            Some(std::time::Duration::from_secs(30 * 24 * 3600)),
        )
        .await
    {
        tracing::error!("Failed to store new refresh token: {:?}", e);
        return ApiResponse::error_typed("server_error", "Failed to issue refresh token");
    }

    let response = TokenResponse {
        access_token: token.access_token,
        token_type: "Bearer".to_string(),
        expires_in: 3600,
        refresh_token: Some(new_refresh_token),
        scope: Some(scope),
        id_token: None,
    };

    tracing::info!("OAuth2 token refreshed for user: {}", user_id);
    ApiResponse::success(response)
}

/// POST /api/v1/oauth2/revoke - Revoke OAuth2 token
pub async fn revoke(
    State(state): State<ApiState>,
    Json(req): Json<RevokeRequest>,
) -> ApiResponse<serde_json::Value> {
    // Store the revoked token in a blacklist for immediate invalidation.
    // Key by the raw token value so the userinfo endpoint can check it too.
    let revoked_token_key = format!("oauth2_revoked_token:{}", req.token);
    let revoked_data = serde_json::json!({
        "token": req.token,
        "revoked_at": chrono::Utc::now().to_rfc3339(),
        "token_type_hint": req.token_type_hint
    });

    if let Err(e) = state
        .auth_framework
        .storage()
        .store_kv(
            &revoked_token_key,
            serde_json::to_string(&revoked_data)
                .unwrap_or_default()
                .as_bytes(),
            Some(std::time::Duration::from_secs(86400 * 7)),
        )
        .await
    {
        tracing::error!("Failed to store revoked token: {:?}", e);
        return ApiResponse::error_typed("server_error", "Failed to revoke token");
    }

    // If the token is a JWT, also store revoked_token:{jti} so the authentication
    // middleware (validate_api_token in api/mod.rs) blocks it on all protected
    // endpoints. Without this step, the revocation would only be visible to the
    // userinfo endpoint, leaving all other authenticated routes unprotected.
    if let Ok(claims) = state
        .auth_framework
        .token_manager()
        .validate_jwt_token(&req.token)
    {
        let now = chrono::Utc::now().timestamp();
        let remaining_secs = (claims.exp - now + 60).max(60) as u64;
        let jti_key = format!("revoked_token:{}", claims.jti);
        if let Err(e) = state
            .auth_framework
            .storage()
            .store_kv(
                &jti_key,
                b"1",
                Some(std::time::Duration::from_secs(remaining_secs)),
            )
            .await
        {
            tracing::warn!("Failed to store JWT JTI revocation entry: {:?}", e);
        } else {
            tracing::info!("JWT token revoked via jti: {}", claims.jti);
        }
    }

    tracing::info!(
        "OAuth2 token revoked: {}",
        &req.token[..10.min(req.token.len())]
    );

    ApiResponse::success(serde_json::json!({
        "message": "Token revoked successfully"
    }))
}

/// GET /api/v1/oauth2/userinfo - OAuth2 UserInfo endpoint
pub async fn userinfo(
    State(state): State<ApiState>,
    headers: HeaderMap,
) -> ApiResponse<UserInfoResponse> {
    // Extract and validate access token
    let token = match extract_bearer_token(&headers) {
        Some(t) => t,
        None => {
            return ApiResponse::error_typed("invalid_token", "Authorization header required");
        }
    };

    // Check if token is revoked first
    let revoked_token_key = format!("oauth2_revoked_token:{}", token);
    if let Ok(Some(_)) = state
        .auth_framework
        .storage()
        .get_kv(&revoked_token_key)
        .await
    {
        return ApiResponse::error_typed("invalid_token", "Token has been revoked");
    }

    // Validate the access token
    let claims = match state
        .auth_framework
        .token_manager()
        .validate_jwt_token(&token)
    {
        Ok(c) => c,
        Err(_) => {
            return ApiResponse::error_typed("invalid_token", "Access token is invalid");
        }
    };

    // Get user profile
    let user_profile = match state.auth_framework.get_user_profile(&claims.sub).await {
        Ok(profile) => profile,
        Err(e) => {
            tracing::error!("Failed to get user profile: {:?}", e);
            return ApiResponse::error_typed("server_error", "Failed to retrieve user information");
        }
    };

    let userinfo = UserInfoResponse {
        sub: claims.sub.clone(),
        name: user_profile.username.clone(),
        email: user_profile.email.clone(),
        picture: user_profile.picture.clone(),
        updated_at: Some(chrono::Utc::now().timestamp()),
    };

    tracing::info!("OAuth2 UserInfo requested for user: {}", claims.sub);
    ApiResponse::success(userinfo)
}

/// GET /oauth/clients/{client_id}
/// Returns registered OAuth client metadata.
pub async fn get_client_info(
    State(state): State<ApiState>,
    Path(client_id): Path<String>,
) -> impl IntoResponse {
    let client_key = format!("oauth2_client:{}", client_id);
    match state.auth_framework.storage().get_kv(&client_key).await {
        Ok(Some(data)) => match serde_json::from_slice::<ClientInfo>(&data) {
            Ok(client) => (
                StatusCode::OK,
                Json(serde_json::json!({ "success": true, "data": client })),
            )
                .into_response(),
            Err(e) => {
                tracing::error!(client_id = %client_id, error = %e, "Failed to deserialize client record");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "error": "server_error",
                        "message": "Failed to read client record"
                    })),
                )
                    .into_response()
            }
        },
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "error": "invalid_client",
                "message": "Unknown client_id"
            })),
        )
            .into_response(),
        Err(e) => {
            tracing::error!(client_id = %client_id, error = %e, "Storage error looking up client");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "error": "server_error",
                    "message": "Authorization server error"
                })),
            )
                .into_response()
        }
    }
}
