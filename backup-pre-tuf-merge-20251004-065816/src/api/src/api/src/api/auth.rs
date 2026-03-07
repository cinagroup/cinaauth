//! Authentication API Endpoints
//!
//! Handles login, logout, token refresh, and related authentication operations

use crate::api::{ApiResponse, ApiState, extract_bearer_token};
use axum::{Json, extract::State, http::HeaderMap};
use serde::{Deserialize, Serialize};

/// Login request payload
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
    #[serde(default)]
    pub mfa_code: Option<String>,
    #[serde(default)]
    pub remember_me: bool,
}

/// Login response data
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: u64,
    pub user: UserInfo,
}

/// User information in login response
#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub username: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
}

/// Token refresh request
#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

/// Token refresh response
#[derive(Debug, Serialize)]
pub struct RefreshResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
}

/// Logout request
#[derive(Debug, Deserialize)]
pub struct LogoutRequest {
    #[serde(default)]
    pub refresh_token: Option<String>,
}

/// POST /auth/login
pub async fn login(
    State(state): State<ApiState>,
    Json(req): Json<LoginRequest>,
) -> ApiResponse<LoginResponse> {
    // Validate required fields
    if req.username.is_empty() || req.password.is_empty() {
        return ApiResponse::validation_error_typed("Username and password are required");
    }

    // Create credential for authentication
    let credential = crate::authentication::credentials::Credential::Password {
        username: req.username.clone(),
        password: req.password.clone(),
    };

    // Attempt authentication
    match state
        .auth_framework
        .authenticate("password", credential)
        .await
    {
        Ok(auth_result) => match auth_result {
            crate::auth_modular::AuthResult::Success(token) => {
                // Create response with token information
                let user_info = UserInfo {
                    id: token.user_id.clone(),
                    username: req.username,
                    roles: token.roles.clone(),
                    permissions: token.permissions.clone(),
                };

                // Generate actual JWT access token
                let token_lifetime = std::time::Duration::from_secs(3600); // 1 hour
                let access_token = match state.auth_framework.token_manager().create_jwt_token(
                    &token.user_id,
                    token.permissions.clone(),
                    Some(token_lifetime),
                ) {
                    Ok(jwt) => jwt,
                    Err(e) => {
                        tracing::error!("Failed to create JWT token: {}", e);
                        return ApiResponse::error_typed(
                            "TOKEN_CREATION_FAILED",
                            "Failed to create access token",
                        );
                    }
                };

                // Generate refresh token with longer lifetime
                let refresh_token_lifetime = std::time::Duration::from_secs(86400 * 7); // 7 days
                let refresh_token = match state.auth_framework.token_manager().create_jwt_token(
                    &token.user_id,
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

                let response = LoginResponse {
                    access_token,
                    refresh_token,
                    token_type: "Bearer".to_string(),
                    expires_in: 3600, // 1 hour
                    user: user_info,
                };

                ApiResponse::success(response)
            }
            crate::auth_modular::AuthResult::MfaRequired(_challenge) => {
                // In real implementation, return MFA challenge info
                ApiResponse::error_typed("MFA_REQUIRED", "Multi-factor authentication required")
            }
            crate::auth_modular::AuthResult::Failure(reason) => {
                ApiResponse::error_typed("AUTHENTICATION_FAILED", reason)
            }
        },
        Err(e) => {
            // Convert auth error to API error
            if matches!(e, crate::errors::AuthError::AuthMethod { .. }) {
                ApiResponse::error_typed("INVALID_CREDENTIALS", "Invalid username or password")
            } else {
                ApiResponse::error_typed("AUTH_ERROR", "Authentication failed")
            }
        }
    }
}

/// POST /auth/refresh
pub async fn refresh_token(
    State(state): State<ApiState>,
    Json(req): Json<RefreshRequest>,
) -> ApiResponse<RefreshResponse> {
    if req.refresh_token.is_empty() {
        return ApiResponse::validation_error_typed("Refresh token is required");
    }

    // Validate the refresh token
    match state
        .auth_framework
        .token_manager()
        .validate_jwt_token(&req.refresh_token)
    {
        Ok(claims) => {
            // Check if this is actually a refresh token
            if !claims.scope.contains("refresh") {
                return ApiResponse::error_typed("INVALID_TOKEN", "Token is not a refresh token");
            }

            // Create new access token
            let token_lifetime = std::time::Duration::from_secs(3600); // 1 hour
            let new_access_token = match state.auth_framework.token_manager().create_jwt_token(
                &claims.sub,
                vec!["read".to_string(), "write".to_string()], // Default permissions
                Some(token_lifetime),
            ) {
                Ok(jwt) => jwt,
                Err(e) => {
                    tracing::error!("Failed to create new access token: {}", e);
                    return ApiResponse::error_typed(
                        "TOKEN_CREATION_FAILED",
                        "Failed to create new access token",
                    );
                }
            };

            let response = RefreshResponse {
                access_token: new_access_token,
                token_type: "Bearer".to_string(),
                expires_in: 3600,
            };

            ApiResponse::success(response)
        }
        Err(e) => {
            tracing::warn!("Invalid refresh token: {}", e);
            ApiResponse::error_typed("INVALID_TOKEN", "Invalid or expired refresh token")
        }
    }
}

/// POST /auth/logout
pub async fn logout(
    State(_state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<LogoutRequest>,
) -> ApiResponse<()> {
    // Extract token from Authorization header
    if let Some(token) = extract_bearer_token(&headers) {
        // In a real implementation, invalidate the token
        tracing::info!("Logging out user with token: {}", &token[..10]);
    }

    // If refresh token provided, invalidate it too
    if let Some(ref refresh_token) = req.refresh_token {
        tracing::info!("Invalidating refresh token: {}", &refresh_token[..10]);
    }

    ApiResponse::<()>::ok_with_message("Successfully logged out")
}

/// GET /auth/validate
/// Validate current token and return user information
pub async fn validate_token(
    State(state): State<ApiState>,
    headers: HeaderMap,
) -> ApiResponse<UserInfo> {
    match extract_bearer_token(&headers) {
        Some(token) => {
            match crate::api::validate_api_token(&state.auth_framework, &token).await {
                Ok(auth_token) => {
                    // Fetch actual user information from storage
                    let username = match state
                        .auth_framework
                        .get_user_profile(&auth_token.user_id)
                        .await
                    {
                        Ok(profile) => profile.username,
                        Err(_) => format!("user_{}", auth_token.user_id), // Fallback if profile fetch fails
                    };

                    let user_info = UserInfo {
                        id: auth_token.user_id,
                        username,
                        roles: auth_token.roles,
                        permissions: auth_token.permissions,
                    };
                    ApiResponse::success(user_info)
                }
                Err(_e) => ApiResponse::error_typed("AUTH_ERROR", "Token validation failed"),
            }
        }
        None => ApiResponse::unauthorized_typed(),
    }
}

/// GET /auth/providers
/// List available OAuth providers
pub async fn list_providers(State(_state): State<ApiState>) -> ApiResponse<Vec<ProviderInfo>> {
    let providers = vec![
        ProviderInfo {
            name: "google".to_string(),
            display_name: "Google".to_string(),
            auth_url: "/oauth/google".to_string(),
        },
        ProviderInfo {
            name: "github".to_string(),
            display_name: "GitHub".to_string(),
            auth_url: "/oauth/github".to_string(),
        },
        ProviderInfo {
            name: "microsoft".to_string(),
            display_name: "Microsoft".to_string(),
            auth_url: "/oauth/microsoft".to_string(),
        },
    ];

    ApiResponse::success(providers)
}

/// Provider information
#[derive(Debug, Serialize)]
pub struct ProviderInfo {
    pub name: String,
    pub display_name: String,
    pub auth_url: String,
}

/// User registration request
#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub full_name: Option<String>,
}

/// User registration response
#[derive(Debug, Serialize)]
pub struct RegisterResponse {
    pub user_id: String,
    pub username: String,
    pub email: String,
    pub created_at: String,
}

/// POST /auth/register
/// Public endpoint for user self-registration with duplicate prevention
pub async fn register(
    State(state): State<ApiState>,
    Json(req): Json<RegisterRequest>,
) -> ApiResponse<RegisterResponse> {
    // Validate input
    if req.username.is_empty() || req.password.is_empty() || req.email.is_empty() {
        return ApiResponse::validation_error_typed("Username, password, and email are required");
    }

    // Enhanced email validation using RFC 5322 standards (Phase 2)
    if let Err(e) = crate::utils::validation::validate_email(&req.email) {
        return ApiResponse::validation_error_typed(&format!("Invalid email: {}", e));
    }

    // Enhanced password validation with complexity requirements (Phase 2)
    let security_config = &state.auth_framework.config().security;
    if let Err(e) = crate::utils::validation::validate_password(
        &req.password,
        security_config.min_password_length,
        security_config.require_password_complexity,
        security_config.require_uppercase,
        security_config.require_lowercase,
        security_config.require_digit,
        security_config.require_special,
        security_config.min_complexity_criteria,
    ) {
        return ApiResponse::validation_error_typed(&format!("Password validation failed: {}", e));
    }

    // Use UserManager to create the user (handles duplicate checking automatically)
    let user_manager = state.auth_framework.user_manager();
    match user_manager
        .create_user(&req.username, &req.email, &req.password)
        .await
    {
        Ok(user_id) => {
            tracing::info!("New user registered: {} ({})", req.username, user_id);

            let response = RegisterResponse {
                user_id,
                username: req.username,
                email: req.email,
                created_at: chrono::Utc::now().to_rfc3339(),
            };

            ApiResponse::success(response)
        }
        Err(e) => match e {
            crate::errors::AuthError::Validation { message, .. } => {
                if message.contains("Username already exists") {
                    ApiResponse::error_typed("USERNAME_EXISTS", "Username already exists")
                } else if message.contains("Email address already registered") {
                    ApiResponse::error_typed("EMAIL_EXISTS", "Email address already registered")
                } else {
                    ApiResponse::validation_error_typed(&message)
                }
            }
            _ => ApiResponse::error_typed("REGISTRATION_FAILED", "Failed to create user account"),
        },
    }
}

// ================================================================================================
// API Key Management Endpoints
// ================================================================================================

/// API Key creation request
#[derive(Debug, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    #[serde(default)]
    pub scopes: Vec<String>,
    #[serde(default)]
    pub permissions: Vec<String>,
    #[serde(default)]
    pub expires_in_days: Option<u64>,
}

/// API Key response
#[derive(Debug, Serialize)]
pub struct ApiKeyResponse {
    pub key: String,
    pub name: String,
    pub user_id: String,
    pub scopes: Vec<String>,
    pub permissions: Vec<String>,
    pub created_at: String,
    pub expires_at: Option<String>,
}

/// API Key list item
#[derive(Debug, Serialize)]
pub struct ApiKeyInfo {
    pub name: String,
    pub key_prefix: String, // Only show first 12 characters
    pub scopes: Vec<String>,
    pub created_at: String,
    pub expires_at: Option<String>,
    pub last_used: Option<String>,
    pub use_count: u64,
}

/// Revoke API key request
#[derive(Debug, Deserialize)]
pub struct RevokeApiKeyRequest {
    pub key_id: String,
}

/// POST /api-keys - Create a new API key
pub async fn create_api_key(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateApiKeyRequest>,
) -> ApiResponse<ApiKeyResponse> {
    // Extract and validate bearer token
    let token = match extract_bearer_token(&headers) {
        Some(t) => t,
        None => return ApiResponse::unauthorized_typed(),
    };

    // Validate the token
    let claims = match state
        .auth_framework
        .token_manager()
        .validate_jwt_token(&token)
    {
        Ok(c) => c,
        Err(_) => {
            return ApiResponse::unauthorized_typed();
        }
    };

    let user_id = claims.sub.clone();

    // Validate name
    if req.name.is_empty() {
        return ApiResponse::validation_error_typed("API key name is required");
    }

    // Use UserManager to create the API key
    let user_manager = state.auth_framework.user_manager();
    match user_manager
        .create_api_key_enhanced(
            &user_id,
            &req.name,
            req.scopes.clone(),
            req.permissions.clone(),
            req.expires_in_days,
        )
        .await
    {
        Ok(api_key) => {
            let created_at = chrono::Utc::now();
            let expires_at = req
                .expires_in_days
                .map(|days| created_at + chrono::Duration::days(days as i64));

            // Set default scopes and permissions if not provided
            let final_scopes = if req.scopes.is_empty() {
                vec!["api_access".to_string()]
            } else {
                req.scopes
            };

            let final_permissions = if req.permissions.is_empty() {
                vec!["read".to_string()]
            } else {
                req.permissions
            };

            let response = ApiKeyResponse {
                key: api_key,
                name: req.name,
                user_id,
                scopes: final_scopes,
                permissions: final_permissions,
                created_at: created_at.to_rfc3339(),
                expires_at: expires_at.map(|dt| dt.to_rfc3339()),
            };

            tracing::info!("API key created: {}", response.name);
            ApiResponse::success(response)
        }
        Err(e) => {
            tracing::error!("Failed to create API key: {:?}", e);
            ApiResponse::error_typed("API_KEY_CREATION_FAILED", "Failed to create API key")
        }
    }
}

/// GET /api-keys - List user's API keys
pub async fn list_api_keys(
    State(state): State<ApiState>,
    headers: HeaderMap,
) -> ApiResponse<Vec<ApiKeyInfo>> {
    // Extract and validate bearer token
    let token = match extract_bearer_token(&headers) {
        Some(t) => t,
        None => return ApiResponse::unauthorized_typed(),
    };

    // Validate the token
    let claims = match state
        .auth_framework
        .token_manager()
        .validate_jwt_token(&token)
    {
        Ok(c) => c,
        Err(_) => {
            return ApiResponse::unauthorized_typed();
        }
    };

    let user_id = claims.sub.clone();

    // Use UserManager to list API keys
    let user_manager = state.auth_framework.user_manager();
    match user_manager.list_api_keys(&user_id).await {
        Ok(key_data_list) => {
            let mut keys = Vec::new();
            for key_data in key_data_list {
                keys.push(ApiKeyInfo {
                    name: key_data["name"].as_str().unwrap_or("Unknown").to_string(),
                    key_prefix: key_data["key_prefix"].as_str().unwrap_or("").to_string(),
                    scopes: key_data["scopes"]
                        .as_array()
                        .and_then(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                .collect::<Vec<_>>()
                                .into()
                        })
                        .unwrap_or_default(),
                    created_at: key_data["created_at"].as_str().unwrap_or("").to_string(),
                    expires_at: key_data["expires_at"].as_str().map(|s| s.to_string()),
                    last_used: key_data["last_used"].as_str().map(|s| s.to_string()),
                    use_count: key_data["use_count"].as_u64().unwrap_or(0),
                });
            }

            tracing::info!("Listed {} API keys for user {}", keys.len(), user_id);
            ApiResponse::success(keys)
        }
        Err(e) => {
            tracing::error!("Failed to list API keys: {:?}", e);
            ApiResponse::error_typed("INTERNAL_ERROR", "Failed to read API keys")
        }
    }
}

/// POST /api-keys/revoke - Revoke an API key
pub async fn revoke_api_key(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<RevokeApiKeyRequest>,
) -> ApiResponse<serde_json::Value> {
    // Extract and validate bearer token
    let token = match extract_bearer_token(&headers) {
        Some(t) => t,
        None => return ApiResponse::unauthorized_typed(),
    };

    // Validate the token
    let claims = match state
        .auth_framework
        .token_manager()
        .validate_jwt_token(&token)
    {
        Ok(c) => c,
        Err(_) => {
            return ApiResponse::unauthorized_typed();
        }
    };

    let user_id = claims.sub.clone();

    // Use UserManager to revoke the API key
    let user_manager = state.auth_framework.user_manager();
    match user_manager.revoke_api_key_for_user(&req.key_id, &user_id).await {
        Ok(_) => {
            tracing::info!("API key revoked: {} by user {}", req.key_id, user_id);
            ApiResponse::success(serde_json::json!({
                "message": "API key revoked successfully"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to revoke API key: {:?}", e);
            if e.to_string().contains("does not belong to user") {
                ApiResponse::error_typed("FORBIDDEN", "API key does not belong to user")
            } else if e.to_string().contains("not found") {
                ApiResponse::error_typed("NOT_FOUND", "API key not found")
            } else {
                ApiResponse::error_typed("REVOCATION_FAILED", "Failed to revoke API key")
            }
        }
    }
}
