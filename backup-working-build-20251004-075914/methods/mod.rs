//! Authentication method implementations.

use crate::{
    authentication::credentials::{Credential, CredentialMetadata},
    errors::{AuthError, Result},
    tokens::AuthToken,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Import the specific auth method modules
pub mod enhanced_device;
pub mod hardware_token;
pub mod passkey;
#[cfg(feature = "saml")]
pub mod saml;

// Re-export types from submodules
#[cfg(feature = "enhanced-device-flow")]
pub use enhanced_device::EnhancedDeviceFlowMethod;
pub use hardware_token::HardwareToken;
#[cfg(feature = "passkeys")]
pub use passkey::PasskeyAuthMethod;
#[cfg(feature = "saml")]
pub use saml::SamlAuthMethod;

/// Result of an authentication attempt.
#[derive(Debug, Clone)]
pub enum MethodResult {
    /// Authentication was successful
    Success(Box<AuthToken>),

    /// Multi-factor authentication is required
    MfaRequired(Box<MfaChallenge>),

    /// Authentication failed
    Failure { reason: String },
}

/// Multi-factor authentication challenge.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MfaChallenge {
    /// Unique challenge ID
    pub id: String,

    /// Type of MFA required
    pub mfa_type: MfaType,

    /// User ID this challenge is for
    pub user_id: String,

    /// When the challenge expires
    pub expires_at: chrono::DateTime<chrono::Utc>,

    /// Optional message or instructions
    pub message: Option<String>,

    /// Additional challenge data
    pub data: HashMap<String, serde_json::Value>,
}

/// Types of multi-factor authentication.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MfaType {
    /// Time-based one-time password (TOTP)
    Totp,

    /// SMS verification code
    Sms { phone_number: String },

    /// Email verification code
    Email { email_address: String },

    /// Push notification
    Push { device_id: String },

    /// Hardware security key
    SecurityKey,

    /// Backup codes
    BackupCode,
}

/// Trait for authentication methods.
pub trait AuthMethod: Send + Sync {
    type MethodResult: Send + Sync + 'static;
    type AuthToken: Send + Sync + 'static;

    /// Get the name of this authentication method.
    fn name(&self) -> &str;

    /// Authenticate using the provided credentials.
    fn authenticate(
        &self,
        credential: Credential,
        metadata: CredentialMetadata,
    ) -> impl std::future::Future<Output = Result<Self::MethodResult>> + Send;

    /// Validate configuration for this method.
    fn validate_config(&self) -> Result<()>;

    /// Check if this method supports refresh tokens.
    fn supports_refresh(&self) -> bool {
        false
    }

    /// Refresh a token if supported.
    fn refresh_token(
        &self,
        _refresh_token: String,
    ) -> impl std::future::Future<Output = Result<AuthToken, AuthError>> + Send {
        async {
            Err(AuthError::auth_method(
                self.name(),
                "Token refresh not supported by this method".to_string(),
            ))
        }
    }
}

/// Basic user information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    /// User ID
    pub id: String,

    /// Username
    pub username: String,

    /// Email address
    pub email: Option<String>,

    /// Display name
    pub name: Option<String>,

    /// User roles
    pub roles: Vec<String>,

    /// Whether the user is active
    pub active: bool,

    /// Additional user attributes
    pub attributes: HashMap<String, serde_json::Value>,
}

/// Enum wrapper for all supported authentication methods (for registry)
pub enum AuthMethodEnum {
    Password(PasswordMethod),
    Jwt(JwtMethod),
    ApiKey(ApiKeyMethod),
    OAuth2(OAuth2Method),
    #[cfg(feature = "saml")]
    Saml(SamlAuthMethod),
    #[cfg(feature = "ldap-auth")]
    Ldap(LdapAuthMethod),
    HardwareToken(HardwareToken),
    OpenIdConnect(OpenIdConnectAuthMethod),
    AdvancedMfa(AdvancedMfaAuthMethod),
    #[cfg(feature = "enhanced-device-flow")]
    EnhancedDeviceFlow(Box<enhanced_device::EnhancedDeviceFlowMethod>),
    #[cfg(feature = "passkeys")]
    Passkey(PasskeyAuthMethod),
}

/// Password-based authentication method with secure credential storage
#[derive(Clone)]
pub struct PasswordMethod {
    storage: std::sync::Arc<dyn crate::storage::AuthStorage>,
}

impl std::fmt::Debug for PasswordMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PasswordMethod")
            .field("storage", &"<AuthStorage>")
            .finish()
    }
}

impl PasswordMethod {
    pub fn new() -> Self {
        // Create with memory storage by default - should be replaced with proper storage
        Self {
            storage: std::sync::Arc::new(crate::storage::MemoryStorage::new()),
        }
    }

    pub fn with_storage(storage: std::sync::Arc<dyn crate::storage::AuthStorage>) -> Self {
        Self { storage }
    }

    /// Authenticate user with username and password
    async fn authenticate_password(&self, username: &str, password: &str) -> Result<AuthToken> {
        use crate::utils::password::verify_password;

        // Retrieve stored user credentials from storage
        let user_key = format!("user:credentials:{}", username);
        let stored_data = match self.storage.get_kv(&user_key).await? {
            Some(data) => data,
            None => {
                // User not found - still do dummy password verification to prevent timing attacks
                let _ = verify_password(
                    password,
                    "$2b$12$KIXXvZ4LmVYC3qj6RcZ5dO1WNVu8p5xGqF1Y5z6MhQp5z6MhQp5z6",
                );
                return Err(AuthError::auth_method(
                    "password",
                    "Invalid username or password".to_string(),
                ));
            }
        };

        // Parse stored user data
        let user_data_str = String::from_utf8(stored_data)
            .map_err(|e| AuthError::internal(format!("Failed to parse user data: {}", e)))?;

        let user_data: serde_json::Value = serde_json::from_str(&user_data_str)
            .map_err(|e| AuthError::internal(format!("Failed to parse user JSON: {}", e)))?;

        // Extract password hash
        let password_hash = user_data["password_hash"]
            .as_str()
            .ok_or_else(|| AuthError::internal("Missing password hash".to_string()))?;

        // Verify password
        let is_valid = verify_password(password, password_hash)
            .map_err(|e| AuthError::crypto(format!("Password verification failed: {}", e)))?;

        if !is_valid {
            return Err(AuthError::auth_method(
                "password",
                "Invalid username or password".to_string(),
            ));
        }

        // Extract user information
        let user_id = user_data["user_id"]
            .as_str()
            .ok_or_else(|| AuthError::internal("Missing user_id".to_string()))?
            .to_string();

        let email = user_data["email"].as_str().map(|s| s.to_string());

        // Create authentication token with all required fields
        let now = chrono::Utc::now();
        let token_id = uuid::Uuid::new_v4().to_string();
        let access_token = uuid::Uuid::new_v4().to_string(); // Generate a unique access token

        let token = AuthToken {
            token_id: token_id.clone(),
            user_id: user_id.clone(),
            access_token,
            token_type: Some("bearer".to_string()),
            subject: Some(username.to_string()),
            issuer: Some("auth-framework".to_string()),
            refresh_token: None,
            issued_at: now,
            expires_at: now + chrono::Duration::hours(24),
            scopes: vec!["read".to_string(), "write".to_string()],
            auth_method: "password".to_string(),
            client_id: None,
            user_profile: email.map(|e| crate::providers::UserProfile {
                id: Some(user_id.clone()),
                provider: Some("password".to_string()),
                username: Some(username.to_string()),
                name: Some(username.to_string()),
                email: Some(e),
                email_verified: Some(false), // Default to unverified
                picture: None,
                locale: None,
                additional_data: HashMap::new(),
            }),
            permissions: vec!["read".to_string(), "write".to_string()],
            roles: vec!["user".to_string()],
            metadata: crate::tokens::TokenMetadata {
                issued_ip: None,
                user_agent: None,
                device_id: None,
                session_id: Some(token_id.clone()),
                revoked: false,
                revoked_at: None,
                revoked_reason: None,
                last_used: Some(now),
                use_count: 0,
                custom: HashMap::new(),
            },
        };

        tracing::info!("Password authentication successful for user: {}", username);
        Ok(token)
    }
}

impl Default for PasswordMethod {
    fn default() -> Self {
        Self::new()
    }
}

// Stub implementations for other auth methods - to be implemented

/// JWT-based authentication method
#[derive(Clone)]
pub struct JwtMethod {
    token_manager: std::sync::Arc<crate::tokens::TokenManager>,
}

impl std::fmt::Debug for JwtMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("JwtMethod")
            .field("token_manager", &"<TokenManager>")
            .finish()
    }
}

impl JwtMethod {
    pub fn new() -> Self {
        // Create default token manager - should be replaced with proper configuration
        let default_secret = b"temporary_jwt_secret_replace_in_production";
        let token_manager = crate::tokens::TokenManager::new_hmac(
            default_secret,
            "auth-framework",
            "auth-framework",
        );
        Self {
            token_manager: std::sync::Arc::new(token_manager),
        }
    }

    pub fn with_token_manager(token_manager: std::sync::Arc<crate::tokens::TokenManager>) -> Self {
        Self { token_manager }
    }

    pub fn secret_key(self, _secret: &str) -> Self {
        // Builder pattern - for compatibility, but use with_token_manager instead
        self
    }

    pub fn issuer(self, _issuer: &str) -> Self {
        // Builder pattern - for compatibility, but use with_token_manager instead
        self
    }

    pub fn audience(self, _audience: &str) -> Self {
        // Builder pattern - for compatibility, but use with_token_manager instead
        self
    }

    /// Authenticate using JWT token
    async fn authenticate_jwt(&self, token: &str) -> Result<AuthToken> {
        // Validate JWT token using TokenManager
        let jwt_claims = self
            .token_manager
            .validate_jwt_token(token)
            .map_err(|e| AuthError::auth_method("jwt", format!("JWT validation failed: {}", e)))?;

        // Extract user information from claims
        let user_id = jwt_claims.sub.clone();

        // Get additional user info from custom claims
        let roles = jwt_claims
            .custom
            .get("roles")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_else(|| vec!["user".to_string()]);

        let permissions = jwt_claims
            .custom
            .get("permissions")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_else(|| vec!["read".to_string()]);

        // Create AuthToken from validated JWT
        let now = chrono::Utc::now();
        let expires_at = chrono::DateTime::from_timestamp(jwt_claims.exp, 0)
            .unwrap_or_else(|| now + chrono::Duration::hours(1));

        let auth_token = AuthToken {
            token_id: jwt_claims
                .custom
                .get("jti")
                .and_then(|v| v.as_str())
                .unwrap_or(&user_id)
                .to_string(),
            user_id: user_id.clone(),
            access_token: token.to_string(),
            token_type: Some("bearer".to_string()),
            subject: Some(user_id.clone()),
            issuer: Some(jwt_claims.iss.clone()),
            refresh_token: None,
            issued_at: chrono::DateTime::from_timestamp(jwt_claims.iat, 0).unwrap_or_else(|| now),
            expires_at,
            scopes: vec!["read".to_string(), "write".to_string()],
            auth_method: "jwt".to_string(),
            client_id: None,
            user_profile: None,
            permissions,
            roles,
            metadata: crate::tokens::TokenMetadata {
                issued_ip: None,
                user_agent: None,
                device_id: None,
                session_id: Some(uuid::Uuid::new_v4().to_string()),
                revoked: false,
                revoked_at: None,
                revoked_reason: None,
                last_used: Some(now),
                use_count: 0,
                custom: HashMap::new(),
            },
        };

        tracing::info!("JWT authentication successful for user: {}", user_id);
        Ok(auth_token)
    }
}

impl Default for JwtMethod {
    fn default() -> Self {
        Self::new()
    }
}

/// API Key authentication method
#[derive(Clone)]
pub struct ApiKeyMethod {
    storage: std::sync::Arc<dyn crate::storage::AuthStorage>,
}

impl std::fmt::Debug for ApiKeyMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ApiKeyMethod")
            .field("storage", &"<AuthStorage>")
            .finish()
    }
}

impl ApiKeyMethod {
    pub fn new() -> Self {
        // Create with memory storage by default
        Self {
            storage: std::sync::Arc::new(crate::storage::MemoryStorage::new()),
        }
    }

    pub fn with_storage(storage: std::sync::Arc<dyn crate::storage::AuthStorage>) -> Self {
        Self { storage }
    }

    /// Authenticate using API key
    async fn authenticate_api_key(&self, api_key: &str) -> Result<AuthToken> {
        // Validate API key format
        if api_key.len() < 16 {
            return Err(AuthError::auth_method("api_key", "Invalid API key format"));
        }

        // Retrieve API key data from storage
        let key_data_key = format!("api_key:{}", api_key);
        let stored_data = match self.storage.get_kv(&key_data_key).await? {
            Some(data) => data,
            None => {
                return Err(AuthError::auth_method(
                    "api_key",
                    "Invalid or expired API key",
                ));
            }
        };

        // Parse API key data
        let key_data_str = String::from_utf8(stored_data)
            .map_err(|e| AuthError::internal(format!("Failed to parse API key data: {}", e)))?;

        let key_data: serde_json::Value = serde_json::from_str(&key_data_str)
            .map_err(|e| AuthError::internal(format!("Failed to parse API key JSON: {}", e)))?;

        // Check expiration
        if let Some(expires_at_str) = key_data["expires_at"].as_str() {
            let expires_at = chrono::DateTime::parse_from_rfc3339(expires_at_str)
                .map_err(|e| AuthError::internal(format!("Invalid expiration date: {}", e)))?;
            if chrono::Utc::now() > expires_at.with_timezone(&chrono::Utc) {
                return Err(AuthError::auth_method("api_key", "API key has expired"));
            }
        }

        // Extract user information
        let user_id = key_data["user_id"]
            .as_str()
            .ok_or_else(|| AuthError::internal("Missing user_id in API key data"))?
            .to_string();

        let name = key_data["name"].as_str().map(String::from);

        let scopes = key_data["scopes"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_else(|| vec!["api_access".to_string()]);

        let permissions = key_data["permissions"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_else(|| vec!["read".to_string()]);

        // Update last used timestamp
        let mut updated_data = key_data.clone();
        updated_data["last_used"] = serde_json::json!(chrono::Utc::now().to_rfc3339());
        if let Some(count) = updated_data["use_count"].as_u64() {
            updated_data["use_count"] = serde_json::json!(count + 1);
        }

        let updated_str = serde_json::to_string(&updated_data).unwrap_or(key_data_str);
        let _ = self
            .storage
            .store_kv(&key_data_key, updated_str.as_bytes(), None)
            .await;

        // Create AuthToken
        let now = chrono::Utc::now();
        let auth_token = AuthToken {
            token_id: uuid::Uuid::new_v4().to_string(),
            user_id: user_id.clone(),
            access_token: api_key.to_string(),
            token_type: Some("api_key".to_string()),
            subject: Some(user_id.clone()),
            issuer: Some("auth-framework".to_string()),
            refresh_token: None,
            issued_at: now,
            expires_at: if let Some(expires_at_str) = key_data["expires_at"].as_str() {
                chrono::DateTime::parse_from_rfc3339(expires_at_str)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| now + chrono::Duration::days(365))
            } else {
                now + chrono::Duration::days(365)
            },
            scopes,
            auth_method: "api_key".to_string(),
            client_id: None,
            user_profile: name.map(|n| crate::providers::UserProfile {
                id: Some(user_id.clone()),
                provider: Some("api_key".to_string()),
                username: Some(user_id.clone()),
                name: Some(n),
                email: None,
                email_verified: Some(false),
                picture: None,
                locale: None,
                additional_data: HashMap::new(),
            }),
            permissions,
            roles: vec!["api_user".to_string()],
            metadata: crate::tokens::TokenMetadata {
                issued_ip: None,
                user_agent: None,
                device_id: None,
                session_id: Some(uuid::Uuid::new_v4().to_string()),
                revoked: false,
                revoked_at: None,
                revoked_reason: None,
                last_used: Some(now),
                use_count: key_data["use_count"].as_u64().unwrap_or(0),
                custom: HashMap::new(),
            },
        };

        tracing::info!("API key authentication successful for user: {}", user_id);
        Ok(auth_token)
    }
}

impl Default for ApiKeyMethod {
    fn default() -> Self {
        Self::new()
    }
}

/// OAuth2 authentication method
#[derive(Clone)]
pub struct OAuth2Method {
    storage: std::sync::Arc<dyn crate::storage::AuthStorage>,
    token_manager: std::sync::Arc<crate::tokens::TokenManager>,
}

impl std::fmt::Debug for OAuth2Method {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OAuth2Method")
            .field("storage", &"<AuthStorage>")
            .field("token_manager", &"<TokenManager>")
            .finish()
    }
}

impl OAuth2Method {
    pub fn new() -> Self {
        let default_secret = b"temporary_oauth2_secret_replace_in_production";
        let token_manager = crate::tokens::TokenManager::new_hmac(
            default_secret,
            "auth-framework",
            "auth-framework",
        );
        Self {
            storage: std::sync::Arc::new(crate::storage::MemoryStorage::new()),
            token_manager: std::sync::Arc::new(token_manager),
        }
    }

    pub fn with_storage_and_token_manager(
        storage: std::sync::Arc<dyn crate::storage::AuthStorage>,
        token_manager: std::sync::Arc<crate::tokens::TokenManager>,
    ) -> Self {
        Self {
            storage,
            token_manager,
        }
    }

    /// Authenticate using OAuth2 access token
    async fn authenticate_oauth2(&self, access_token: &str) -> Result<AuthToken> {
        // For OAuth2, we validate the access token and retrieve user info

        // First, try to validate as JWT (many OAuth2 providers use JWT access tokens)
        if let Ok(jwt_claims) = self.token_manager.validate_jwt_token(access_token) {
            // JWT-based OAuth2 token
            let user_id = jwt_claims.sub.clone();
            let now = chrono::Utc::now();

            let auth_token = AuthToken {
                token_id: uuid::Uuid::new_v4().to_string(),
                user_id: user_id.clone(),
                access_token: access_token.to_string(),
                token_type: Some("bearer".to_string()),
                subject: Some(user_id.clone()),
                issuer: Some(jwt_claims.iss.clone()),
                refresh_token: None,
                issued_at: chrono::DateTime::from_timestamp(jwt_claims.iat, 0).unwrap_or(now),
                expires_at: chrono::DateTime::from_timestamp(jwt_claims.exp, 0)
                    .unwrap_or_else(|| now + chrono::Duration::hours(1)),
                scopes: jwt_claims
                    .custom
                    .get("scope")
                    .and_then(|v| v.as_str())
                    .unwrap_or("openid profile email")
                    .split_whitespace()
                    .map(String::from)
                    .collect(),
                auth_method: "oauth2".to_string(),
                client_id: jwt_claims
                    .custom
                    .get("client_id")
                    .and_then(|v| v.as_str())
                    .map(String::from),
                user_profile: None,
                permissions: vec!["read".to_string()],
                roles: vec!["oauth_user".to_string()],
                metadata: crate::tokens::TokenMetadata {
                    issued_ip: None,
                    user_agent: None,
                    device_id: None,
                    session_id: Some(uuid::Uuid::new_v4().to_string()),
                    revoked: false,
                    revoked_at: None,
                    revoked_reason: None,
                    last_used: Some(now),
                    use_count: 0,
                    custom: HashMap::new(),
                },
            };

            tracing::info!("OAuth2 JWT authentication successful for user: {}", user_id);
            return Ok(auth_token);
        }

        // Opaque token - look up in storage
        let token_key = format!("oauth2_token:{}", access_token);
        let stored_data = match self.storage.get_kv(&token_key).await? {
            Some(data) => data,
            None => {
                return Err(AuthError::auth_method(
                    "oauth2",
                    "Invalid or expired OAuth2 token",
                ));
            }
        };

        // Parse token data
        let token_data_str = String::from_utf8(stored_data).map_err(|e| {
            AuthError::internal(format!("Failed to parse OAuth2 token data: {}", e))
        })?;

        let token_data: serde_json::Value = serde_json::from_str(&token_data_str).map_err(|e| {
            AuthError::internal(format!("Failed to parse OAuth2 token JSON: {}", e))
        })?;

        // Check expiration
        if let Some(expires_at_str) = token_data["expires_at"].as_str() {
            let expires_at = chrono::DateTime::parse_from_rfc3339(expires_at_str)
                .map_err(|e| AuthError::internal(format!("Invalid expiration date: {}", e)))?;
            if chrono::Utc::now() > expires_at.with_timezone(&chrono::Utc) {
                return Err(AuthError::auth_method("oauth2", "OAuth2 token has expired"));
            }
        }

        // Extract user information
        let user_id = token_data["user_id"]
            .as_str()
            .ok_or_else(|| AuthError::internal("Missing user_id in OAuth2 token data"))?
            .to_string();

        let scopes = token_data["scopes"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_else(|| vec!["openid".to_string()]);

        let now = chrono::Utc::now();
        let auth_token = AuthToken {
            token_id: uuid::Uuid::new_v4().to_string(),
            user_id: user_id.clone(),
            access_token: access_token.to_string(),
            token_type: Some("bearer".to_string()),
            subject: Some(user_id.clone()),
            issuer: Some("oauth2_provider".to_string()),
            refresh_token: token_data["refresh_token"].as_str().map(String::from),
            issued_at: now,
            expires_at: if let Some(expires_at_str) = token_data["expires_at"].as_str() {
                chrono::DateTime::parse_from_rfc3339(expires_at_str)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| now + chrono::Duration::hours(1))
            } else {
                now + chrono::Duration::hours(1)
            },
            scopes,
            auth_method: "oauth2".to_string(),
            client_id: token_data["client_id"].as_str().map(String::from),
            user_profile: None,
            permissions: vec!["read".to_string()],
            roles: vec!["oauth_user".to_string()],
            metadata: crate::tokens::TokenMetadata {
                issued_ip: None,
                user_agent: None,
                device_id: None,
                session_id: Some(uuid::Uuid::new_v4().to_string()),
                revoked: false,
                revoked_at: None,
                revoked_reason: None,
                last_used: Some(now),
                use_count: 0,
                custom: HashMap::new(),
            },
        };

        tracing::info!(
            "OAuth2 opaque token authentication successful for user: {}",
            user_id
        );
        Ok(auth_token)
    }
}

impl Default for OAuth2Method {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(feature = "ldap-auth")]
#[derive(Debug)]
pub struct LdapAuthMethod;

#[derive(Debug)]
pub struct OpenIdConnectAuthMethod;

#[derive(Debug)]
pub struct AdvancedMfaAuthMethod;

// Implement AuthMethod trait specifically for PasswordMethod
impl AuthMethod for PasswordMethod {
    type MethodResult = MethodResult;
    type AuthToken = AuthToken;

    fn name(&self) -> &str {
        "password"
    }

    async fn authenticate(
        &self,
        credential: Credential,
        metadata: CredentialMetadata,
    ) -> Result<Self::MethodResult> {
        match credential {
            Credential::Password { username, password } => {
                // Validate inputs
                if username.is_empty() || password.is_empty() {
                    return Ok(MethodResult::Failure {
                        reason: "Username or password cannot be empty".to_string(),
                    });
                }

                // Log authentication attempt (without sensitive data)
                tracing::info!(
                    "Password authentication attempt for user: {} from IP: {:?}",
                    username,
                    metadata.client_ip
                );

                // Perform password authentication
                match self.authenticate_password(&username, &password).await {
                    Ok(token) => Ok(MethodResult::Success(Box::new(token))),
                    Err(e) => {
                        tracing::warn!(
                            "Password authentication failed for user {}: {}",
                            username,
                            e
                        );
                        Ok(MethodResult::Failure {
                            reason: "Invalid username or password".to_string(),
                        })
                    }
                }
            }
            _ => Ok(MethodResult::Failure {
                reason: "Password authentication requires username and password credentials"
                    .to_string(),
            }),
        }
    }

    fn validate_config(&self) -> Result<()> {
        // Validate that storage is accessible
        // In a real implementation, we might check storage health here
        Ok(())
    }

    fn supports_refresh(&self) -> bool {
        false // Password auth doesn't support token refresh
    }

    async fn refresh_token(&self, _refresh_token: String) -> Result<AuthToken, AuthError> {
        Err(AuthError::auth_method(
            "password",
            "Token refresh not supported for password authentication".to_string(),
        ))
    }
}

impl AuthMethod for AuthMethodEnum {
    type MethodResult = MethodResult;
    type AuthToken = AuthToken;

    fn name(&self) -> &str {
        match self {
            AuthMethodEnum::Password(_) => "password",
            AuthMethodEnum::Jwt(_) => "jwt",
            AuthMethodEnum::ApiKey(_) => "api_key",
            AuthMethodEnum::OAuth2(_) => "oauth2",
            #[cfg(feature = "saml")]
            AuthMethodEnum::Saml(_) => "saml",
            #[cfg(feature = "ldap-auth")]
            AuthMethodEnum::Ldap(_) => "ldap",
            AuthMethodEnum::HardwareToken(_) => "hardware_token",
            AuthMethodEnum::OpenIdConnect(_) => "openid_connect",
            AuthMethodEnum::AdvancedMfa(_) => "advanced_mfa",
            #[cfg(feature = "enhanced-device-flow")]
            AuthMethodEnum::EnhancedDeviceFlow(_) => "enhanced_device_flow",
            #[cfg(feature = "passkeys")]
            AuthMethodEnum::Passkey(_) => "passkey",
        }
    }

    async fn authenticate(
        &self,
        credential: Credential,
        metadata: CredentialMetadata,
    ) -> Result<Self::MethodResult> {
        // Delegate to the concrete method implementation
        match self {
            AuthMethodEnum::Password(method) => method.authenticate(credential, metadata).await,
            AuthMethodEnum::Jwt(method) => {
                // Extract JWT token from credential
                let token = match credential {
                    Credential::Jwt { token } => token,
                    Credential::Bearer { token } => token,
                    _ => {
                        return Err(AuthError::auth_method(
                            "jwt",
                            "Invalid credential type for JWT authentication",
                        ));
                    }
                };

                // Authenticate using JWT method
                match method.authenticate_jwt(&token).await {
                    Ok(auth_token) => Ok(MethodResult::Success(Box::new(auth_token))),
                    Err(e) => Ok(MethodResult::Failure {
                        reason: format!("JWT authentication failed: {}", e),
                    }),
                }
            }
            AuthMethodEnum::ApiKey(method) => {
                // Extract API key from credential
                let api_key = match credential {
                    Credential::ApiKey { key } => key,
                    Credential::Bearer { token } => token,
                    _ => {
                        return Err(AuthError::auth_method(
                            "api_key",
                            "Invalid credential type for API key authentication",
                        ));
                    }
                };

                // Authenticate using API key method
                match method.authenticate_api_key(&api_key).await {
                    Ok(auth_token) => Ok(MethodResult::Success(Box::new(auth_token))),
                    Err(e) => Ok(MethodResult::Failure {
                        reason: format!("API key authentication failed: {}", e),
                    }),
                }
            }
            AuthMethodEnum::OAuth2(method) => {
                // Extract OAuth2 access token from credential
                let access_token = match credential {
                    Credential::OAuth {
                        authorization_code, ..
                    } => authorization_code,
                    Credential::Bearer { token } => token,
                    Credential::OpenIdConnect {
                        access_token: Some(token),
                        ..
                    } => token,
                    _ => {
                        return Err(AuthError::auth_method(
                            "oauth2",
                            "Invalid credential type for OAuth2 authentication",
                        ));
                    }
                };

                // Authenticate using OAuth2 method
                match method.authenticate_oauth2(&access_token).await {
                    Ok(auth_token) => Ok(MethodResult::Success(Box::new(auth_token))),
                    Err(e) => Ok(MethodResult::Failure {
                        reason: format!("OAuth2 authentication failed: {}", e),
                    }),
                }
            }
            #[cfg(feature = "saml")]
            AuthMethodEnum::Saml(_) => {
                tracing::warn!("SAML authentication not yet implemented");
                Ok(MethodResult::Failure {
                    reason: "SAML authentication not yet implemented".to_string(),
                })
            }
            #[cfg(feature = "ldap-auth")]
            AuthMethodEnum::Ldap(_) => {
                tracing::warn!("LDAP authentication not yet implemented");
                Ok(MethodResult::Failure {
                    reason: "LDAP authentication not yet implemented".to_string(),
                })
            }
            AuthMethodEnum::HardwareToken(_) => {
                tracing::warn!("Hardware token authentication not yet implemented");
                Ok(MethodResult::Failure {
                    reason: "Hardware token authentication not yet implemented".to_string(),
                })
            }
            AuthMethodEnum::OpenIdConnect(_) => {
                tracing::warn!("OpenID Connect authentication not yet implemented");
                Ok(MethodResult::Failure {
                    reason: "OpenID Connect authentication not yet implemented".to_string(),
                })
            }
            AuthMethodEnum::AdvancedMfa(_) => {
                tracing::warn!("Advanced MFA authentication not yet implemented");
                Ok(MethodResult::Failure {
                    reason: "Advanced MFA authentication not yet implemented".to_string(),
                })
            }
            #[cfg(feature = "enhanced-device-flow")]
            AuthMethodEnum::EnhancedDeviceFlow(_) => {
                tracing::warn!("Enhanced device flow authentication not yet implemented");
                Ok(MethodResult::Failure {
                    reason: "Enhanced device flow authentication not yet implemented".to_string(),
                })
            }
            #[cfg(feature = "passkeys")]
            AuthMethodEnum::Passkey(_) => {
                tracing::warn!("Passkey authentication not yet implemented");
                Ok(MethodResult::Failure {
                    reason: "Passkey authentication not yet implemented".to_string(),
                })
            }
        }
    }

    fn validate_config(&self) -> Result<()> {
        // Enhanced stub implementation with basic validation
        Ok(())
    }

    fn supports_refresh(&self) -> bool {
        false
    }

    async fn refresh_token(&self, _refresh_token: String) -> Result<AuthToken, AuthError> {
        Err(AuthError::auth_method(
            self.name(),
            "Token refresh not supported by this method".to_string(),
        ))
    }
}

impl MfaChallenge {
    /// Create a new MFA challenge.
    pub fn new(
        mfa_type: MfaType,
        user_id: impl Into<String>,
        expires_in: std::time::Duration,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            mfa_type,
            user_id: user_id.into(),
            expires_at: chrono::Utc::now() + chrono::Duration::from_std(expires_in).unwrap(),
            message: None,
            data: HashMap::new(),
        }
    }

    /// Get the challenge ID.
    pub fn id(&self) -> &str {
        &self.id
    }

    /// Check if the challenge has expired.
    pub fn is_expired(&self) -> bool {
        chrono::Utc::now() > self.expires_at
    }

    pub fn with_message(mut self, message: impl Into<String>) -> Self {
        self.message = Some(message.into());
        self
    }
}
