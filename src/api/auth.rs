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
    pub challenge_id: Option<String>,
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

async fn build_login_response(
    state: &ApiState,
    user_id: &str,
    username: String,
    permissions: Vec<String>,
) -> ApiResponse<LoginResponse> {
    let user_key = format!("user:{}", user_id);
    let roles: Vec<String> = match state.auth_framework.storage().get_kv(&user_key).await {
        Ok(Some(bytes)) => {
            let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap_or_default();
            json["roles"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|value| value.as_str())
                        .map(|value| value.to_string())
                        .collect()
                })
                .unwrap_or_default()
        }
        _ => vec![],
    };

    let user_info = UserInfo {
        id: user_id.to_string(),
        username,
        roles: roles.clone(),
        permissions,
    };

    let token_lifetime = std::time::Duration::from_secs(3600);
    let access_token = match state.auth_framework.token_manager().create_jwt_token(
        user_id,
        roles,
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

    let refresh_token_lifetime = std::time::Duration::from_secs(86400 * 7);
    let refresh_token = match state.auth_framework.token_manager().create_jwt_token(
        user_id,
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

    ApiResponse::success(LoginResponse {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: 3600,
        user: user_info,
    })
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

    if req.challenge_id.is_some() ^ req.mfa_code.is_some() {
        return ApiResponse::validation_error_typed(
            "challenge_id and mfa_code must be provided together",
        );
    }

    if let (Some(challenge_id), Some(mfa_code)) = (req.challenge_id.clone(), req.mfa_code.as_deref()) {
        return match state
            .auth_framework
            .complete_mfa_by_id(&challenge_id, mfa_code)
            .await
        {
            Ok(token) => {
                build_login_response(
                    &state,
                    &token.user_id,
                    req.username,
                    token.permissions.clone(),
                )
                .await
            }
            Err(e) => {
                tracing::debug!("MFA completion failed during login: {}", e);
                ApiResponse::error_typed(
                    "MFA_INVALID_CODE",
                    "Invalid or expired MFA challenge or code",
                )
            }
        };
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
            crate::auth::AuthResult::Success(token) => {
                build_login_response(
                    &state,
                    &token.user_id,
                    req.username,
                    token.permissions.clone(),
                )
                .await
            }
            crate::auth::AuthResult::MfaRequired(challenge) => {
                // Return the challenge data so the client knows how to fulfill MFA.
                // The client should prompt for the appropriate second factor and then
                // re-submit the login request with both challenge_id and mfa_code.
                let mfa_type_str = match &challenge.mfa_type {
                    crate::methods::MfaType::Totp => "totp",
                    crate::methods::MfaType::Sms { .. } => "sms",
                    crate::methods::MfaType::Email { .. } => "email",
                    crate::methods::MfaType::Push { .. } => "push",
                    crate::methods::MfaType::SecurityKey => "security_key",
                    crate::methods::MfaType::BackupCode => "backup_code",
                    crate::methods::MfaType::MultiMethod => "totp_or_backup_code",
                };
                ApiResponse::<()>::error_with_details(
                    "MFA_REQUIRED",
                    "Multi-factor authentication required",
                    serde_json::json!({
                        "challenge_id": challenge.id,
                        "mfa_type": mfa_type_str,
                        "expires_at": challenge.expires_at.to_rfc3339(),
                        "message": challenge.message,
                    }),
                )
                .cast()
            }
            crate::auth::AuthResult::Failure(reason) => {
                ApiResponse::error_typed("AUTHENTICATION_FAILED", reason)
            }
        },
        Err(e) => {
            // Always return the same error code/message regardless of *why* auth failed.
            // This prevents timing and enumeration attacks that could distinguish
            // "user not found" from "wrong password".
            tracing::debug!("Authentication error (reported as INVALID_CREDENTIALS): {}", e);
            ApiResponse::error_typed("INVALID_CREDENTIALS", "Invalid username or password")
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

            // SECURITY: Reject revoked refresh tokens (e.g. those already passed to /auth/logout).
            let revocation_key = format!("revoked_token:{}", claims.jti);
            match state.auth_framework.storage().get_kv(&revocation_key).await {
                Ok(Some(_)) => {
                    return ApiResponse::error_typed(
                        "INVALID_TOKEN",
                        "Refresh token has been revoked",
                    );
                }
                Ok(None) => {} // Not revoked — proceed
                Err(e) => {
                    tracing::warn!("Refresh token revocation check failed: {}", e);
                }
            }

            // Create new access token, preserving the user's actual permissions from storage.
            // H-1 fix: do NOT hard-code ["read","write"] — load the real permission set.

            // SECURITY: Reject refresh if the user's account has been deactivated
            // since the refresh token was issued.  Without this check a deactivated
            // user can indefinitely obtain new access tokens.
            {
                let user_key = format!("user:{}", claims.sub);
                if let Ok(Some(user_bytes)) = state.auth_framework.storage().get_kv(&user_key).await {
                    let user_json: serde_json::Value =
                        serde_json::from_slice(&user_bytes).unwrap_or_default();
                    let active = user_json["active"].as_bool().unwrap_or(true);
                    if !active {
                        return ApiResponse::error_typed(
                            "ACCOUNT_DEACTIVATED",
                            "Account has been deactivated",
                        );
                    }
                }
            }

            let permissions: Vec<String> = match state
                .auth_framework
                .storage()
                .get_kv(&format!("user_permissions:{}", claims.sub))
                .await
            {
                Ok(Some(data)) => serde_json::from_slice(&data).unwrap_or_default(),
                _ => vec![],
            };

            let token_lifetime = std::time::Duration::from_secs(3600); // 1 hour
            let new_access_token = match state.auth_framework.token_manager().create_jwt_token(
                &claims.sub,
                permissions,
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
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<LogoutRequest>,
) -> ApiResponse<()> {
    // Revoke the access token by storing it in the blocklist keyed by JTI
    if let Some(token) = extract_bearer_token(&headers) {
        match state.auth_framework.token_manager().validate_jwt_token(&token) {
            Ok(claims) => {
                let revocation_key = format!("revoked_token:{}", claims.jti);
                // TTL: longer of token's remaining lifetime or 1 hour; cap at 7 days
                let ttl = std::time::Duration::from_secs(7 * 86400);
                if let Err(e) = state
                    .auth_framework
                    .storage()
                    .store_kv(revocation_key.as_str(), b"revoked", Some(ttl))
                    .await
                {
                    tracing::error!("Failed to revoke access token JTI {}: {}", claims.jti, e);
                } else {
                    tracing::info!("Access token revoked (JTI: {})", claims.jti);
                }
            }
            Err(_) => {
                // Token was already invalid; no action needed
                tracing::debug!("Logout called with invalid/expired access token");
            }
        }
    }

    // If refresh token provided, revoke it too
    if let Some(ref refresh_token) = req.refresh_token {
        match state
            .auth_framework
            .token_manager()
            .validate_jwt_token(refresh_token)
        {
            Ok(claims) => {
                let revocation_key = format!("revoked_token:{}", claims.jti);
                let ttl = std::time::Duration::from_secs(7 * 86400);
                if let Err(e) = state
                    .auth_framework
                    .storage()
                    .store_kv(revocation_key.as_str(), b"revoked", Some(ttl))
                    .await
                {
                    tracing::error!("Failed to revoke refresh token JTI {}: {}", claims.jti, e);
                } else {
                    tracing::info!("Refresh token revoked (JTI: {})", claims.jti);
                }
            }
            Err(_) => {
                tracing::debug!("Logout called with invalid/expired refresh token");
            }
        }
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
                        Ok(profile) => profile
                            .username
                            .unwrap_or_else(|| format!("user_{}", auth_token.user_id)),
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
}

/// User registration response
#[derive(Debug, Serialize)]
pub struct RegisterResponse {
    pub user_id: String,
    pub username: String,
    pub email: String,
}

/// POST /auth/register
/// Public endpoint for user self-registration
pub async fn register(
    State(state): State<ApiState>,
    Json(req): Json<RegisterRequest>,
) -> ApiResponse<RegisterResponse> {
    // Validate required fields
    if req.username.is_empty() || req.password.is_empty() || req.email.is_empty() {
        return ApiResponse::validation_error_typed("Username, password, and email are required");
    }

    // Validate username format (length, allowed characters, must start with letter).
    if let Err(e) = crate::utils::validation::validate_username(&req.username) {
        return ApiResponse::validation_error_typed(format!("{e}"));
    }

    // Validate password strength (min 8 characters with complexity)
    if let Err(e) = crate::utils::validation::validate_password(&req.password) {
        return ApiResponse::validation_error_typed(format!("{e}"));
    }

    // Validate email format
    if let Err(e) = crate::utils::validation::validate_email(&req.email) {
        return ApiResponse::validation_error_typed(format!("{e}"));
    }

    // Check if username already exists
    let username_key = format!("user:credentials:{}", req.username);
    match state.auth_framework.storage().get_kv(&username_key).await {
        Ok(Some(_)) => {
            // Use a generic message for both username and email conflicts to prevent
            // enumeration of existing accounts via the public registration endpoint.
            return ApiResponse::error_typed(
                "CONFLICT",
                "An account with the provided details already exists",
            );
        }
        Err(e) => {
            tracing::error!("Storage error checking username: {}", e);
            return ApiResponse::internal_error_typed();
        }
        Ok(None) => {}
    }

    // Check if email already exists
    let email_key = format!("user:email:{}", req.email);
    match state.auth_framework.storage().get_kv(&email_key).await {
        Ok(Some(_)) => {
            return ApiResponse::error_typed(
                "CONFLICT",
                "An account with the provided details already exists",
            );
        }
        Err(e) => {
            tracing::error!("Storage error checking email: {}", e);
            return ApiResponse::internal_error_typed();
        }
        Ok(None) => {}
    }

    // Hash the password
    let password_hash = match crate::utils::password::hash_password(&req.password) {
        Ok(hash) => hash,
        Err(e) => {
            tracing::error!("Password hashing failed: {:?}", e);
            return ApiResponse::error_typed("REGISTRATION_FAILED", "Failed to process password");
        }
    };

    // Generate user ID
    let user_id = format!("user_{}", uuid::Uuid::new_v4().as_simple());
    let created_at = chrono::Utc::now().to_rfc3339();

    // Build user record
    let user_data = serde_json::json!({
        "user_id": user_id,
        "username": req.username,
        "email": req.email,
        "password_hash": password_hash,
        "created_at": created_at,
    });
    let user_data_bytes = user_data.to_string().into_bytes();

    // Store main user record
    if let Err(e) = state
        .auth_framework
        .storage()
        .store_kv(&username_key, &user_data_bytes, None)
        .await
    {
        tracing::error!("User registration storage failed: {:?}", e);
        return ApiResponse::error_typed("REGISTRATION_FAILED", "Failed to create user account");
    }

    // Store email → user_id mapping for duplicate checking
    if let Err(e) = state
        .auth_framework
        .storage()
        .store_kv(&email_key, user_id.as_bytes(), None)
        .await
    {
        tracing::error!("Email mapping storage failed: {:?}", e);
        // Best-effort rollback
        let _ = state
            .auth_framework
            .storage()
            .delete_kv(&username_key)
            .await;
        return ApiResponse::error_typed("REGISTRATION_FAILED", "Failed to create user account");
    }

    // Store the canonical user record used by admin operations (set_user_active,
    // update_user_password, delete_user, etc.) which all key on user:{user_id}.
    let canonical_user_data = serde_json::json!({
        "user_id": user_id,
        "username": req.username,
        "email": req.email,
        "password_hash": password_hash,
        "roles": ["user"],
        "active": true,
        "created_at": created_at,
    });
    let canonical_key = format!("user:{}", user_id);
    if let Err(e) = state
        .auth_framework
        .storage()
        .store_kv(&canonical_key, canonical_user_data.to_string().as_bytes(), None)
        .await
    {
        tracing::error!("Canonical user record storage failed: {:?}", e);
        let _ = state.auth_framework.storage().delete_kv(&username_key).await;
        let _ = state.auth_framework.storage().delete_kv(&email_key).await;
        return ApiResponse::error_typed("REGISTRATION_FAILED", "Failed to create user account");
    }

    // Store username → user_id mapping (used by get_username_by_id reverse-lookup).
    let username_id_key = format!("user:username:{}", req.username);
    if let Err(e) = state
        .auth_framework
        .storage()
        .store_kv(&username_id_key, user_id.as_bytes(), None)
        .await
    {
        tracing::error!("Username-id mapping storage failed: {:?}", e);
        let _ = state.auth_framework.storage().delete_kv(&username_key).await;
        let _ = state.auth_framework.storage().delete_kv(&email_key).await;
        let _ = state.auth_framework.storage().delete_kv(&canonical_key).await;
        return ApiResponse::error_typed("REGISTRATION_FAILED", "Failed to create user account");
    }

    // Add user to the global users:index so admin list endpoints include self-registered users.
    let index_key = "users:index";
    let mut ids: Vec<String> = match state.auth_framework.storage().get_kv(index_key).await {
        Ok(Some(bytes)) => serde_json::from_slice(&bytes).unwrap_or_default(),
        _ => vec![],
    };
    ids.push(user_id.clone());
    if let Ok(idx_json) = serde_json::to_vec(&ids) {
        let _ = state.auth_framework.storage().store_kv(index_key, &idx_json, None).await;
    }

    tracing::info!("New user registered: {} ({})", req.username, user_id);

    ApiResponse::success(RegisterResponse {
        user_id,
        username: req.username,
        email: req.email,
    })
}

/// Response returned when an API key is successfully created.
#[derive(Debug, Serialize)]
pub struct CreateApiKeyResponse {
    /// The new API key – treat as a secret and display only once.
    pub api_key: String,
    /// Always `"ApiKey"`.
    pub token_type: String,
}

/// POST /api-keys – create an API key (requires authentication)
pub async fn create_api_key(
    headers: HeaderMap,
    State(state): State<ApiState>,
) -> ApiResponse<CreateApiKeyResponse> {
    // Require a valid Bearer token; reject unauthenticated requests with 401.
    let token = match crate::api::extract_bearer_token(&headers) {
        Some(t) => t,
        None => return ApiResponse::unauthorized_typed(),
    };

    // Validate the token and extract the caller's identity.
    let auth_token = match crate::api::validate_api_token(&state.auth_framework, &token).await {
        Ok(t) => t,
        Err(_) => return ApiResponse::unauthorized_typed(),
    };

    // Create an API key scoped to the authenticated user.
    match state
        .auth_framework
        .create_api_key(&auth_token.user_id, None)
        .await
    {
        Ok(api_key) => ApiResponse::success(CreateApiKeyResponse {
            api_key,
            token_type: "ApiKey".to_string(),
        }),
        Err(e) => {
            tracing::error!(
                "Failed to create API key for user {}: {}",
                auth_token.user_id,
                e
            );
            ApiResponse::internal_error_typed()
        }
    }
}


