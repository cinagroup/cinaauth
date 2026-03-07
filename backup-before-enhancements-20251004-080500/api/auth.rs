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
                tracing::warn!(
                    "Authentication failed for user '{}': {}",
                    req.username,
                    reason
                );
                ApiResponse::unauthorized_typed(
                    "INVALID_CREDENTIALS",
                    "Invalid username or password",
                )
            }
        },
        Err(e) => {
            // Convert auth error to API error - return 401 for authentication failures
            tracing::warn!("Authentication failed for user '{}': {}", req.username, e);
            if matches!(e, crate::errors::AuthError::AuthMethod { .. }) {
                ApiResponse::unauthorized_typed(
                    "INVALID_CREDENTIALS",
                    "Invalid username or password",
                )
            } else {
                ApiResponse::unauthorized_typed("AUTH_ERROR", "Authentication failed")
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
                return ApiResponse::unauthorized_typed(
                    "INVALID_TOKEN",
                    "Token is not a refresh token",
                );
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
            ApiResponse::unauthorized_typed("INVALID_TOKEN", "Invalid or expired refresh token")
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
        None => ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required"),
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
/// Public endpoint for user self-registration
pub async fn register(
    State(state): State<ApiState>,
    Json(req): Json<RegisterRequest>,
) -> ApiResponse<RegisterResponse> {
    // Validate input
    if req.username.is_empty() || req.password.is_empty() || req.email.is_empty() {
        return ApiResponse::validation_error_typed("Username, password, and email are required");
    }

    // Enhanced email validation using RFC 5322 standards
    if let Err(e) = crate::utils::validation::validate_email(&req.email) {
        return ApiResponse::validation_error_typed(&format!("Invalid email: {}", e));
    }

    // Enhanced password validation with complexity requirements
    let security_config = &state.auth_framework.config().security;
    if let Err(e) = crate::utils::validation::validate_password(&req.password) {
        return ApiResponse::validation_error_typed(&format!("Password validation failed: {}", e));
    }

    // Check if username already exists
    let username_key = format!("user:credentials:{}", req.username);
    if let Ok(Some(_)) = state.auth_framework.storage().get_kv(&username_key).await {
        return ApiResponse::conflict_typed("USERNAME_EXISTS", "Username already exists");
    }

    // Check if email already exists
    let email_key = format!("user:email:{}", req.email);
    if let Ok(Some(_)) = state.auth_framework.storage().get_kv(&email_key).await {
        return ApiResponse::conflict_typed("EMAIL_EXISTS", "Email address already registered");
    }

    // TODO: In a real implementation:
    // 1. Hash password properly ✅ (done below)
    // 2. Create user in storage with proper user management ✅ (done below)
    // 3. Send verification email
    // 4. Maybe require email verification before allowing login

    // For now, create a basic user representation
    let user_id = format!(
        "user_{}",
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
    );
    let created_at = chrono::Utc::now().to_rfc3339();

    // Hash the password using bcrypt
    let password_hash = match crate::utils::password::hash_password(&req.password) {
        Ok(hash) => hash,
        Err(e) => {
            tracing::error!("Password hashing failed: {:?}", e);
            return ApiResponse::error_typed("PASSWORD_HASH_FAILED", "Failed to hash password");
        }
    };

    // Store the user credentials in storage
    // For now, we'll use a simple approach - store password hash with username as key
    let user_data = serde_json::json!({
        "user_id": user_id,
        "username": req.username,
        "email": req.email,
        "password_hash": password_hash,
        "created_at": created_at,
    });

    // Store user in storage (using a simple key-value approach)
    // In production, this should use a proper user management system
    let user_key = format!("user:credentials:{}", req.username);
    let user_data_bytes = user_data.to_string().into_bytes();

    // Store the main user record
    if let Err(e) = state
        .auth_framework
        .storage()
        .store_kv(&user_key, &user_data_bytes, None) // No TTL - permanent storage
        .await
    {
        tracing::error!("User registration storage failed: {:?}", e);
        return ApiResponse::error_typed("REGISTRATION_FAILED", "Failed to create user account");
    }

    // Store email mapping for duplicate checking
    let email_key = format!("user:email:{}", req.email);
    let email_mapping = user_id.as_bytes();
    if let Err(e) = state
        .auth_framework
        .storage()
        .store_kv(&email_key, email_mapping, None)
        .await
    {
        tracing::error!("Email mapping storage failed: {:?}", e);
        // Rollback user creation
        let _ = state.auth_framework.storage().delete_kv(&user_key).await;
        return ApiResponse::error_typed("REGISTRATION_FAILED", "Failed to create user account");
    }

    tracing::info!("New user registered: {} ({})", req.username, user_id);

    let response = RegisterResponse {
        user_id,
        username: req.username,
        email: req.email,
        created_at,
    };

    ApiResponse::success(response)
}

/// Flexible authentication request that supports multiple authentication methods
#[derive(Debug, Deserialize)]
pub struct AuthenticateRequest {
    pub method: String,
    pub credential: serde_json::Value,
}

/// POST /auth/authenticate - Flexible authentication endpoint
pub async fn authenticate(
    State(state): State<ApiState>,
    Json(req): Json<AuthenticateRequest>,
) -> ApiResponse<LoginResponse> {
    // Parse credential based on method
    let credential = match req.method.as_str() {
        "password" => {
            let username = req.credential["username"]
                .as_str()
                .unwrap_or_default()
                .to_string();
            let password = req.credential["password"]
                .as_str()
                .unwrap_or_default()
                .to_string();

            if username.is_empty() || password.is_empty() {
                return ApiResponse::validation_error_typed("Username and password are required");
            }

            crate::authentication::credentials::Credential::Password { username, password }
        }
        "jwt" => {
            let token = req.credential["token"]
                .as_str()
                .unwrap_or_default()
                .to_string();

            if token.is_empty() {
                return ApiResponse::validation_error_typed("JWT token is required");
            }

            crate::authentication::credentials::Credential::Jwt { token }
        }
        "api_key" => {
            let key = req.credential["key"]
                .as_str()
                .unwrap_or_default()
                .to_string();

            if key.is_empty() {
                return ApiResponse::validation_error_typed("API key is required");
            }

            crate::authentication::credentials::Credential::ApiKey { key }
        }
        "bearer" => {
            let token = req.credential["token"]
                .as_str()
                .unwrap_or_default()
                .to_string();

            if token.is_empty() {
                return ApiResponse::validation_error_typed("Bearer token is required");
            }

            crate::authentication::credentials::Credential::Bearer { token }
        }
        _ => {
            return ApiResponse::validation_error_typed(&format!(
                "Unsupported authentication method: {}",
                req.method
            ));
        }
    };

    // Attempt authentication
    match state
        .auth_framework
        .authenticate(&req.method, credential)
        .await
    {
        Ok(auth_result) => match auth_result {
            crate::auth_modular::AuthResult::Success(token) => {
                // Extract username from token or credential
                let username = match req.method.as_str() {
                    "password" => req.credential["username"]
                        .as_str()
                        .unwrap_or("unknown")
                        .to_string(),
                    _ => token.user_id.clone(),
                };

                // Create response with token information
                let user_info = UserInfo {
                    id: token.user_id.clone(),
                    username,
                    roles: token.roles.clone(),
                    permissions: token.permissions.clone(),
                };

                // For JWT/API Key/Bearer methods, the token is already valid
                let (access_token, refresh_token) = if req.method == "password" {
                    // Generate new tokens for password authentication
                    let token_lifetime = std::time::Duration::from_secs(3600); // 1 hour
                    let access = match state.auth_framework.token_manager().create_jwt_token(
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

                    let refresh_token_lifetime = std::time::Duration::from_secs(86400 * 7); // 7 days
                    let refresh = match state.auth_framework.token_manager().create_jwt_token(
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

                    (access, refresh)
                } else {
                    // For other methods, return the existing token
                    (token.access_token.clone(), String::new())
                };

                let response = LoginResponse {
                    access_token,
                    refresh_token,
                    token_type: "Bearer".to_string(),
                    expires_in: 3600,
                    user: user_info,
                };

                ApiResponse::success(response)
            }
            crate::auth_modular::AuthResult::MfaRequired(_challenge) => {
                ApiResponse::error_typed("MFA_REQUIRED", "Multi-factor authentication required")
            }
            crate::auth_modular::AuthResult::Failure(reason) => {
                tracing::warn!("Authentication failed: {}", reason);
                ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required")
            }
        },
        Err(e) => {
            tracing::error!("Authentication error: {:?}", e);
            ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required")
        }
    }
}

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
    pub key_prefix: String, // Only show first 8 characters
    pub scopes: Vec<String>,
    pub created_at: String,
    pub expires_at: Option<String>,
    pub last_used: Option<String>,
    pub use_count: u64,
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
        None => return ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required"),
    };

    // Validate the token
    let claims = match state
        .auth_framework
        .token_manager()
        .validate_jwt_token(&token)
    {
        Ok(c) => c,
        Err(_) => {
            return ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required");
        }
    };

    let user_id = claims.sub.clone();

    // Validate name
    if req.name.is_empty() {
        return ApiResponse::validation_error_typed("API key name is required");
    }

    // Generate API key
    let api_key = format!("ak_{}", uuid::Uuid::new_v4().to_string().replace("-", ""));

    // Calculate expiration
    let created_at = chrono::Utc::now();
    let expires_at = req
        .expires_in_days
        .map(|days| created_at + chrono::Duration::days(days as i64));

    // Set default scopes and permissions if not provided
    let scopes = if req.scopes.is_empty() {
        vec!["api_access".to_string()]
    } else {
        req.scopes
    };

    let permissions = if req.permissions.is_empty() {
        vec!["read".to_string()]
    } else {
        req.permissions
    };

    // Store API key data
    let key_data = serde_json::json!({
        "user_id": user_id,
        "name": req.name,
        "scopes": scopes,
        "permissions": permissions,
        "created_at": created_at.to_rfc3339(),
        "expires_at": expires_at.map(|dt| dt.to_rfc3339()),
        "last_used": Option::<String>::None,
        "use_count": 0,
    });

    let key_data_str = serde_json::to_string(&key_data).unwrap();
    let storage_key = format!("api_key:{}", api_key);

    match state
        .auth_framework
        .storage()
        .store_kv(&storage_key, key_data_str.as_bytes(), None)
        .await
    {
        Ok(_) => {
            // Add key to user's index
            let index_key = format!("user_api_keys:{}", user_id);
            let mut key_ids = match state.auth_framework.storage().get_kv(&index_key).await {
                Ok(Some(data)) => serde_json::from_slice::<Vec<String>>(&data).unwrap_or_default(),
                _ => Vec::new(),
            };

            key_ids.push(api_key.clone());

            if let Ok(index_data) = serde_json::to_vec(&key_ids) {
                let _ = state
                    .auth_framework
                    .storage()
                    .store_kv(&index_key, &index_data, None)
                    .await;
            }

            tracing::info!("API key created for user {}: {}", user_id, req.name);

            let response = ApiKeyResponse {
                key: api_key,
                name: req.name,
                user_id,
                scopes,
                permissions,
                created_at: created_at.to_rfc3339(),
                expires_at: expires_at.map(|dt| dt.to_rfc3339()),
            };

            ApiResponse::success(response)
        }
        Err(e) => {
            tracing::error!("Failed to store API key: {:?}", e);
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
        None => return ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required"),
    };

    // Validate the token
    let claims = match state
        .auth_framework
        .token_manager()
        .validate_jwt_token(&token)
    {
        Ok(c) => c,
        Err(_) => {
            return ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required");
        }
    };

    let user_id = claims.sub.clone();

    // Get user's API key IDs from index
    let index_key = format!("user_api_keys:{}", user_id);
    let key_ids = match state.auth_framework.storage().get_kv(&index_key).await {
        Ok(Some(data)) => match serde_json::from_slice::<Vec<String>>(&data) {
            Ok(ids) => ids,
            Err(e) => {
                tracing::error!("Failed to deserialize key index: {}", e);
                return ApiResponse::error_typed("INTERNAL_ERROR", "Failed to read API keys");
            }
        },
        Ok(None) => Vec::new(),
        Err(e) => {
            tracing::error!("Failed to read key index: {}", e);
            return ApiResponse::error_typed("INTERNAL_ERROR", "Failed to read API keys");
        }
    };

    // Fetch details for each key
    let mut keys = Vec::new();
    for key_id in key_ids {
        let storage_key = format!("api_key:{}", key_id);
        if let Ok(Some(data)) = state.auth_framework.storage().get_kv(&storage_key).await {
            if let Ok(key_data) = serde_json::from_slice::<serde_json::Value>(&data) {
                // Only show first 12 characters of key for security
                let key_prefix = if key_id.len() > 12 {
                    format!("{}...", &key_id[..12])
                } else {
                    key_id.clone()
                };

                keys.push(ApiKeyInfo {
                    name: key_data["name"].as_str().unwrap_or("Unknown").to_string(),
                    key_prefix,
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
        }
    }

    tracing::info!("Listed {} API keys for user {}", keys.len(), user_id);
    ApiResponse::success(keys)
}

/// DELETE /api-keys/:key_id - Revoke an API key
#[derive(Debug, Deserialize)]
pub struct RevokeApiKeyRequest {
    pub key_id: String,
}

pub async fn revoke_api_key(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<RevokeApiKeyRequest>,
) -> ApiResponse<serde_json::Value> {
    // Extract and validate bearer token
    let token = match extract_bearer_token(&headers) {
        Some(t) => t,
        None => return ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required"),
    };

    // Validate the token
    let claims = match state
        .auth_framework
        .token_manager()
        .validate_jwt_token(&token)
    {
        Ok(c) => c,
        Err(_) => {
            return ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required");
        }
    };

    let user_id = claims.sub.clone();

    // Delete the API key
    let storage_key = format!("api_key:{}", req.key_id);

    // First verify the key belongs to this user
    match state.auth_framework.storage().get_kv(&storage_key).await {
        Ok(Some(data)) => {
            let key_data_str = String::from_utf8_lossy(&data);
            let key_data: serde_json::Value = match serde_json::from_str(&key_data_str) {
                Ok(d) => d,
                Err(_) => return ApiResponse::error_typed("INVALID_KEY_DATA", "Invalid key data"),
            };

            let key_user_id = key_data["user_id"].as_str().unwrap_or("");
            if key_user_id != user_id {
                return ApiResponse::error_typed("FORBIDDEN", "API key does not belong to user");
            }

            // Delete the key
            match state.auth_framework.storage().delete_kv(&storage_key).await {
                Ok(_) => {
                    // Remove key from user's index
                    let index_key = format!("user_api_keys:{}", user_id);
                    if let Ok(Some(data)) = state.auth_framework.storage().get_kv(&index_key).await
                    {
                        if let Ok(mut key_ids) = serde_json::from_slice::<Vec<String>>(&data) {
                            key_ids.retain(|id| id != &req.key_id);
                            if let Ok(index_data) = serde_json::to_vec(&key_ids) {
                                let _ = state
                                    .auth_framework
                                    .storage()
                                    .store_kv(&index_key, &index_data, None)
                                    .await;
                            }
                        }
                    }

                    tracing::info!("API key revoked: {} by user {}", req.key_id, user_id);
                    ApiResponse::success(serde_json::json!({
                        "message": "API key revoked successfully"
                    }))
                }
                Err(e) => {
                    tracing::error!("Failed to delete API key: {:?}", e);
                    ApiResponse::error_typed("REVOCATION_FAILED", "Failed to revoke API key")
                }
            }
        }
        Ok(None) => ApiResponse::error_typed("NOT_FOUND", "API key not found"),
        Err(e) => {
            tracing::error!("Failed to retrieve API key: {:?}", e);
            ApiResponse::error_typed("RETRIEVAL_FAILED", "Failed to retrieve API key")
        }
    }
}
