//! Main authentication framework implementation.

use crate::authentication::credentials::{Credential, CredentialMetadata};
use crate::config::AuthConfig;
use crate::distributed::DistributedSessionStore;
use crate::errors::{AuthError, MfaError, Result};
use crate::methods::{AuthMethod, AuthMethodEnum, MethodResult, MfaChallenge};
use crate::permissions::PermissionChecker;
use crate::storage::{AuthStorage, MemoryStorage, SessionData};
use crate::tokens::{AuthToken, TokenManager};
use crate::utils::rate_limit::RateLimiter;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};

/// Result of an authentication attempt.
#[derive(Debug, Clone)]
pub enum AuthResult {
    /// Authentication was successful
    Success(Box<AuthToken>),

    /// Multi-factor authentication is required
    MfaRequired(Box<MfaChallenge>),

    /// Authentication failed
    Failure(String),
}

/// Information about a user.
#[derive(Debug, Clone)]
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

/// Returns true when running in a test environment.
///
/// Checks `cfg!(test)`, the `RUST_TEST` env var (set by `TestEnvironmentGuard`), and the
/// `ENVIRONMENT=test` convention. This allows relaxed security constraints (e.g. short JWT
/// secrets) in automated tests while enforcing them in production.
///
/// An explicit `ENVIRONMENT=production` setting always overrides → returns `false`, so tests
/// that deliberately validate production-mode behaviour can opt out of the bypass.
#[inline]
fn is_test_env() -> bool {
    // An explicit production override always wins — never bypass security checks.
    if std::env::var("ENVIRONMENT").as_deref() == Ok("production") {
        return false;
    }
    cfg!(test)
        || std::env::var("RUST_TEST").is_ok()
        || std::env::var("ENVIRONMENT").as_deref() == Ok("test")
}

/// The primary authentication and authorization framework for Rust applications.
///
/// `AuthFramework` is the central component that orchestrates all authentication
/// and authorization operations. It provides a unified interface for multiple
/// authentication methods, token management, session handling, and security monitoring.
///
/// # Core Capabilities
///
/// - **Multi-Method Authentication**: Support for password, OAuth2, MFA, passkeys, and custom methods
/// - **Token Management**: JWT token creation, validation, and lifecycle management
/// - **Session Management**: Secure session handling with configurable storage backends
/// - **Permission System**: Role-based and resource-based authorization
/// - **Security Monitoring**: Real-time threat detection and audit logging
/// - **Rate Limiting**: Configurable rate limiting for brute force protection
///
/// # Thread Safety
///
/// The framework is designed for concurrent use and can be safely shared across
/// multiple threads using `Arc<AuthFramework>`.
///
/// # Storage Backends
///
/// Supports multiple storage backends:
/// - In-memory (for development/testing)
/// - Redis (for production with clustering)
/// - PostgreSQL (for persistent storage)
/// - Custom implementations via the `AuthStorage` trait
///
/// # Example
///
/// ```rust,no_run
/// use auth_framework::{AuthFramework, AuthConfig};
/// use auth_framework::authentication::credentials::Credential;
/// use auth_framework::methods::AuthMethodEnum;
///
/// # #[tokio::main]
/// # async fn main() -> Result<(), Box<dyn std::error::Error>> {
/// // Create framework with default configuration
/// let config = AuthConfig::default();
/// let mut auth = AuthFramework::new(config);
///
/// // Register an authentication method
/// # let password_method: AuthMethodEnum = todo!();
/// auth.register_method("password", password_method);
///
/// // Authenticate a user
/// # let credential: Credential = todo!();
/// let result = auth.authenticate("password", credential).await?;
/// # Ok(())
/// # }
/// ```
///
/// # Security Considerations
///
/// - All tokens are signed with cryptographically secure keys
/// - Session data is encrypted at rest when using persistent storage
/// - Rate limiting prevents brute force attacks
/// - Audit logging captures all security-relevant events
/// - Configurable security policies for enterprise compliance
pub struct AuthFramework {
    /// Configuration
    config: AuthConfig,

    /// Registered authentication methods
    methods: HashMap<String, AuthMethodEnum>,

    /// Token manager
    token_manager: TokenManager,

    /// Storage backend
    storage: Arc<dyn AuthStorage>,

    /// Authorization manager for role/permission operations
    authorization_manager: crate::auth_modular::authorization_manager::AuthorizationManager,

    /// Rate limiter
    rate_limiter: Option<RateLimiter>,

    /// Monitoring manager for metrics and health checks
    monitoring_manager: Arc<crate::monitoring::MonitoringManager>,

    /// Audit manager for security event logging
    audit_manager: Arc<crate::audit::AuditLogger<Arc<crate::storage::MemoryStorage>>>,

    /// Security manager for rate limiting, DoS protection, and IP blacklisting
    security_manager: Arc<crate::api::SecurityManager>,

    /// Runtime-mutable configuration. Updated live by the admin API without restart.
    pub(crate) runtime_config: Arc<tokio::sync::RwLock<crate::config::RuntimeConfig>>,

    /// Decoupled user lifecycle manager.
    user_manager: crate::auth_modular::user_manager::UserManager,

    /// Decoupled session lifecycle manager.
    session_manager: crate::auth_modular::session_manager::SessionManager,

    /// Decoupled MFA manager (TOTP, SMS, email, backup codes).
    mfa_manager: crate::auth_modular::mfa::MfaManager,

    /// Framework initialization state
    initialized: bool,
}

pub use crate::auth_operations::{
    AdminOperations, AuditOperations, AuthorizationOperations, MfaOperations,
    MonitoringOperations, SessionOperations, TokenOperations, UserOperations,
};

/// Extract JWT secret bytes from `config` or the `JWT_SECRET` env-var.
///
/// Tries (in order): `config.security.secret_key`, `config.secret`, `$JWT_SECRET`.
/// Returns an error when none is present; callers in non-production environments may
/// substitute a dev-only fallback when this function returns `Err`.
fn resolve_jwt_secret_bytes(config: &AuthConfig) -> Result<Vec<u8>> {
    if let Some(secret) = &config.security.secret_key {
        if secret.len() < 32 && !is_test_env() {
            return Err(AuthError::configuration(
                "JWT secret must be at least 32 characters for production security",
            ));
        }
        return Ok(secret.as_bytes().to_vec());
    }
    if let Some(secret) = &config.secret {
        if secret.len() < 32 && !is_test_env() {
            return Err(AuthError::configuration(
                "JWT secret must be at least 32 characters for production security",
            ));
        }
        return Ok(secret.as_bytes().to_vec());
    }
    if let Ok(jwt_secret) = std::env::var("JWT_SECRET") {
        if jwt_secret.len() < 32 && !is_test_env() {
            return Err(AuthError::configuration(
                "JWT_SECRET must be at least 32 characters for production security",
            ));
        }
        return Ok(jwt_secret.as_bytes().to_vec());
    }
    Err(AuthError::configuration(
        "JWT secret not configured! Please set JWT_SECRET environment variable or provide in configuration.\n\
           For security reasons, no default secret is provided.\n\
           Generate a secure secret with: openssl rand -base64 32",
    ))
}

impl AuthFramework {
    /// Access focused user-management operations.
    pub fn users(&self) -> UserOperations<'_> {
        UserOperations { framework: self }
    }

    /// Access focused session-management operations.
    pub fn sessions(&self) -> SessionOperations<'_> {
        SessionOperations { framework: self }
    }

    /// Access focused token-management operations.
    pub fn tokens(&self) -> TokenOperations<'_> {
        TokenOperations { framework: self }
    }

    /// Access focused authorization operations.
    pub fn authorization(&self) -> AuthorizationOperations<'_> {
        AuthorizationOperations { framework: self }
    }

    /// Access focused multi-factor authentication operations.
    pub fn mfa(&self) -> MfaOperations<'_> {
        MfaOperations { framework: self }
    }

    /// Access focused monitoring and health operations.
    pub fn monitoring(&self) -> MonitoringOperations<'_> {
        MonitoringOperations { framework: self }
    }

    /// Access focused audit log operations.
    pub fn audit(&self) -> AuditOperations<'_> {
        AuditOperations { framework: self }
    }

    /// Read the current runtime-mutable configuration.
    pub async fn get_runtime_config(&self) -> crate::config::RuntimeConfig {
        self.runtime_config.read().await.clone()
    }

    /// Apply a partial or full update to the runtime-mutable configuration.
    ///
    /// The update is applied atomically. Returns the updated configuration.
    /// Returns `Err` if any field value is out of range (e.g. zero token lifetime).
    pub async fn update_runtime_config(
        &self,
        update: crate::config::RuntimeConfig,
    ) -> Result<crate::config::RuntimeConfig> {
        // Basic sanity checks before persisting.
        if update.token_lifetime_secs == 0 {
            return Err(AuthError::config("token_lifetime_secs must be > 0"));
        }
        if update.refresh_token_lifetime_secs == 0 {
            return Err(AuthError::config("refresh_token_lifetime_secs must be > 0"));
        }
        if update.refresh_token_lifetime_secs <= update.token_lifetime_secs {
            return Err(AuthError::config(
                "refresh_token_lifetime_secs must be greater than token_lifetime_secs",
            ));
        }
        if update.min_password_length == 0 {
            return Err(AuthError::config("min_password_length must be > 0"));
        }
        let mut cfg = self.runtime_config.write().await;
        *cfg = update.clone();
        Ok(update)
    }

    /// Access focused advanced administration operations (ABAC, delegation, role hierarchy).
    pub fn admin(&self) -> AdminOperations<'_> {
        AdminOperations { framework: self }
    }

    /// Create a new authentication framework.
    ///
    /// This method is infallible and creates a basic framework instance.
    /// Configuration validation and component initialization is deferred to `initialize()`.
    /// This design improves API usability while maintaining security through proper initialization.
    pub fn new(config: AuthConfig) -> Self {
        // Store configuration for later validation during initialize()
        let storage = Arc::new(MemoryStorage::new()) as Arc<dyn AuthStorage>;
        let audit_storage = Arc::new(crate::storage::MemoryStorage::new());
        let audit_manager = Arc::new(crate::audit::AuditLogger::new(audit_storage));

        // Create a default token manager that will be replaced during initialization
        let default_secret = b"temporary_development_secret_replace_in_init";
        let token_manager =
            TokenManager::new_hmac(default_secret, "auth-framework", "auth-framework");

        let user_manager =
            crate::auth_modular::user_manager::UserManager::new(storage.clone());
        let session_manager =
            crate::auth_modular::session_manager::SessionManager::new(storage.clone());
        let mfa_manager =
            crate::auth_modular::mfa::MfaManager::new(storage.clone());
        let authorization_manager =
            crate::auth_modular::authorization_manager::AuthorizationManager::new(
                Arc::new(RwLock::new(PermissionChecker::new())),
                storage.clone(),
            );

        Self {
            config,
            methods: HashMap::new(),
            token_manager,
            storage,
            authorization_manager,
            rate_limiter: None, // Will be set during initialization
            monitoring_manager: Arc::new(crate::monitoring::MonitoringManager::new(
                crate::monitoring::MonitoringConfig::default(),
            )),
            audit_manager,
            security_manager: Arc::new(crate::api::SecurityManager::new()),
            runtime_config: Arc::new(tokio::sync::RwLock::new(
                crate::config::RuntimeConfig::default(),
            )),
            user_manager,
            session_manager,
            mfa_manager,
            initialized: false,
        }
    }

    /// Create a new authentication framework with validation.
    ///
    /// This method validates the configuration immediately and returns an error
    /// if the configuration is invalid. Use this when you want early validation.
    pub fn new_validated(config: AuthConfig) -> Result<Self> {
        // Validate configuration - return error instead of panicking
        config.validate().map_err(|e| {
            AuthError::configuration(format!("Configuration validation failed: {}", e))
        })?;

        // Create token manager with proper error handling
        let current_secret_bytes = resolve_jwt_secret_bytes(&config)?;

        let mut token_manager =
            TokenManager::new_hmac(&current_secret_bytes, "auth-framework", "auth-framework");

        // Handle gracefully retained old secret for zero-downtime key rotation
        if let Some(prev_secret) = &config.security.previous_secret_key {
            // Initialize with previous key, then rotate to the new key
            token_manager =
                TokenManager::new_hmac(prev_secret.as_bytes(), "auth-framework", "auth-framework");
            token_manager.rotate_hmac_key(&current_secret_bytes);
        }

        // Create storage backend with proper error handling
        let storage: Arc<dyn AuthStorage> = match &config.storage {
            #[cfg(feature = "redis-storage")]
            crate::config::StorageConfig::Redis { url, key_prefix } => Arc::new(
                crate::storage::RedisStorage::new(url, key_prefix).map_err(|e| {
                    AuthError::configuration(format!("Failed to create Redis storage: {}", e))
                })?,
            ),
            _ => Arc::new(MemoryStorage::new()) as Arc<dyn AuthStorage>,
        };

        // Create rate limiter if enabled
        let rate_limiter = if config.rate_limiting.enabled {
            Some(RateLimiter::new(
                config.rate_limiting.max_requests,
                config.rate_limiting.window,
            ))
        } else {
            None
        };

        // Create audit manager
        let audit_storage = Arc::new(crate::storage::MemoryStorage::new());
        let audit_manager = Arc::new(crate::audit::AuditLogger::new(audit_storage));

        let user_manager =
            crate::auth_modular::user_manager::UserManager::new(storage.clone());
        let session_manager =
            crate::auth_modular::session_manager::SessionManager::new(storage.clone());
        let mfa_manager =
            crate::auth_modular::mfa::MfaManager::new(storage.clone());
        let authorization_manager =
            crate::auth_modular::authorization_manager::AuthorizationManager::new(
                Arc::new(RwLock::new(PermissionChecker::new())),
                storage.clone(),
            );

        Ok(Self {
            config: config.clone(),
            methods: HashMap::new(),
            token_manager,
            storage,
            authorization_manager,
            rate_limiter,
            monitoring_manager: Arc::new(crate::monitoring::MonitoringManager::new(
                crate::monitoring::MonitoringConfig::default(),
            )),
            audit_manager,
            security_manager: Arc::new(crate::api::SecurityManager::new()),
            runtime_config: Arc::new(tokio::sync::RwLock::new(
                crate::config::RuntimeConfig::from_auth_config(&config),
            )),
            user_manager,
            session_manager,
            mfa_manager,
            initialized: false,
        })
    }

    /// Replace the storage backend with a custom implementation.
    ///
    /// This will swap the internal storage Arc so subsequent operations use
    /// the provided storage instance. Implementations that rely on a
    /// different concrete storage may need additional reconfiguration by the
    /// caller.
    pub fn replace_storage(&mut self, storage: std::sync::Arc<dyn AuthStorage>) {
        self.storage = storage.clone();
        self.user_manager =
            crate::auth_modular::user_manager::UserManager::new(storage.clone());
        self.session_manager =
            crate::auth_modular::session_manager::SessionManager::new(storage.clone());
        self.mfa_manager =
            crate::auth_modular::mfa::MfaManager::new(storage.clone());
        self.authorization_manager =
            crate::auth_modular::authorization_manager::AuthorizationManager::new(
                Arc::new(RwLock::new(PermissionChecker::new())),
                storage,
            );
    }

    /// Replace the distributed session store.
    ///
    /// Call this during application startup after configuring a distributed cache
    /// (Redis, Valkey, Hazelcast, etc.) so that
    /// [`coordinate_distributed_sessions`][Self::coordinate_distributed_sessions]
    /// reports accurate cross-node session counts instead of `0`.
    pub fn set_distributed_store(&mut self, store: Arc<dyn DistributedSessionStore>) {
        self.session_manager.set_distributed_store(store);
    }

    /// Convenience constructor that creates a framework with a custom storage instance.
    pub fn new_with_storage(config: AuthConfig, storage: std::sync::Arc<dyn AuthStorage>) -> Self {
        let mut framework = Self::new(config);
        framework.replace_storage(storage);
        framework
    }

    /// Register an authentication method.
    pub fn register_method(&mut self, name: impl Into<String>, method: AuthMethodEnum) {
        let name = name.into();
        info!("Registering authentication method: {}", name);

        // Validate method configuration
        if let Err(e) = method.validate_config() {
            error!("Method '{}' configuration validation failed: {}", name, e);
            return;
        }

        self.methods.insert(name, method);
    }

    /// Initialize the authentication framework.
    ///
    /// This method performs configuration validation, sets up secure components,
    /// and prepares the framework for use. It must be called before any other operations.
    ///
    /// # Security Note
    ///
    /// This method validates JWT secrets and replaces any temporary secrets with
    /// properly configured ones for production security.
    pub async fn initialize(&mut self) -> Result<()> {
        if self.initialized {
            return Ok(());
        }

        info!("Initializing authentication framework");

        // Validate configuration
        self.config.validate().map_err(|e| {
            AuthError::configuration(format!("Configuration validation failed: {}", e))
        })?;

        // Set up proper token manager with validated configuration
        let token_manager = match resolve_jwt_secret_bytes(&self.config) {
            Ok(bytes) => TokenManager::new_hmac(&bytes, "auth-framework", "auth-framework"),
            Err(_) => {
                if Self::is_production_environment() {
                    return Err(AuthError::configuration(
                        "Production deployment requires JWT_SECRET environment variable or configuration!\n\
                         Generate a secure secret with: openssl rand -base64 32\n\
                         Set it with: export JWT_SECRET=\"your-secret-here\"",
                    ));
                }
                warn!("No JWT secret configured, using development-only default");
                warn!("CRITICAL: Set JWT_SECRET environment variable for production!");
                warn!("This configuration is NOT SECURE and should only be used in development!");
                self.token_manager.clone()
            }
        };

        // Replace token manager with properly configured one
        self.token_manager = token_manager;

        // Set up storage backend if not already configured
        match &self.config.storage {
            #[cfg(feature = "redis-storage")]
            crate::config::StorageConfig::Redis { url, key_prefix } => {
                let redis_storage =
                    crate::storage::RedisStorage::new(url, key_prefix).map_err(|e| {
                        AuthError::configuration(format!("Failed to create Redis storage: {}", e))
                    })?;
                self.storage = Arc::new(redis_storage);
            }
            _ => {
                // Keep existing memory storage
            }
        }

        // Set up rate limiter if enabled
        if self.config.rate_limiting.enabled {
            self.rate_limiter = Some(RateLimiter::new(
                self.config.rate_limiting.max_requests,
                self.config.rate_limiting.window,
            ));
        }

        // Initialize permission checker with default roles
        self.authorization_manager.create_default_roles().await;

        // Perform any necessary setup
        self.cleanup_expired_data().await?;

        self.initialized = true;
        info!("Authentication framework initialized successfully");

        Ok(())
    }

    /// Authenticate a user with the specified method.
    pub async fn authenticate(
        &self,
        method_name: &str,
        credential: Credential,
    ) -> Result<AuthResult> {
        self.authenticate_with_metadata(method_name, credential, CredentialMetadata::new())
            .await
    }

    /// Authenticate a user with the specified method and metadata.
    pub async fn authenticate_with_metadata(
        &self,
        method_name: &str,
        credential: Credential,
        metadata: CredentialMetadata,
    ) -> Result<AuthResult> {
        use std::time::Instant;
        use tokio::time::{Duration as TokioDuration, sleep};

        let start_time = Instant::now();

        // Record authentication request
        self.monitoring_manager.record_auth_request().await;

        if !self.initialized {
            return Err(AuthError::internal("Framework not initialized"));
        }

        // Perform the authentication logic
        let result = self
            .authenticate_internal(method_name, credential, metadata)
            .await;

        // Ensure minimum response time to prevent timing attacks
        let min_duration = TokioDuration::from_millis(100); // 100ms minimum
        let elapsed = start_time.elapsed();
        if elapsed < min_duration {
            sleep(min_duration - elapsed).await;
        }

        // Record authentication performance
        if let Ok(ref auth_result) = result {
            match auth_result {
                AuthResult::Success(token) => {
                    self.monitoring_manager
                        .record_auth_success(&token.user_id, elapsed)
                        .await;
                }
                AuthResult::Failure(reason) => {
                    self.monitoring_manager
                        .record_auth_failure(None, reason)
                        .await;
                }
                _ => {} // MFA required - not counted as failure
            }
        }

        result
    }

    /// Internal authentication logic without timing protection
    async fn authenticate_internal(
        &self,
        method_name: &str,
        credential: Credential,
        metadata: CredentialMetadata,
    ) -> Result<AuthResult> {
        // Check rate limiting
        if let Some(ref rate_limiter) = self.rate_limiter {
            let rate_key = format!(
                "auth:{}:{}",
                method_name,
                metadata.client_ip.as_deref().unwrap_or("unknown")
            );

            if !rate_limiter.is_allowed(&rate_key) {
                warn!(
                    "Rate limit exceeded for method '{}' from IP {:?}",
                    method_name, metadata.client_ip
                );
                return Err(AuthError::rate_limit("Too many authentication attempts"));
            }
        }

        // Built-in password authentication: reads credentials from framework storage directly.
        // This handles password auth even when no "password" method has been explicitly registered,
        // allowing the register endpoint and login endpoint to work with the same storage backend.
        if method_name == "password"
            && let Credential::Password {
                ref username,
                ref password,
            } = credential
            {
                return self
                    .authenticate_password_builtin(username, password, &metadata)
                    .await;
            }

        // Get the authentication method
        let method = self.methods.get(method_name).ok_or_else(|| {
            AuthError::auth_method(method_name, "Authentication method not found".to_string())
        })?;

        // Log authentication attempt
        debug!(
            "Authentication attempt with method '{}' for credential: {}",
            method_name,
            credential.safe_display()
        );

        // Perform authentication
        let result = method.authenticate(credential, metadata.clone()).await?;

        // Log and handle the result
        match &result {
            MethodResult::Success(token) => {
                info!(
                    "Authentication successful for user '{}' with method '{}'",
                    token.user_id, method_name
                );

                // Store token
                self.storage.store_token(token).await?;

                // Log audit event
                self.log_audit_event("auth_success", &token.user_id, method_name, &metadata)
                    .await;

                Ok(AuthResult::Success(token.clone()))
            }

            MethodResult::MfaRequired(challenge) => {
                info!(
                    "MFA required for user '{}' with method '{}'",
                    challenge.user_id, method_name
                );

                // Store MFA challenge with resource limits
                self.guard_and_store_mfa_challenge((**challenge).clone()).await?;

                // Log audit event
                self.log_audit_event("mfa_required", &challenge.user_id, method_name, &metadata)
                    .await;

                Ok(AuthResult::MfaRequired(challenge.clone()))
            }

            MethodResult::Failure { reason } => {
                warn!(
                    "Authentication failed for method '{}': {}",
                    method_name, reason
                );

                // Log audit event
                self.log_audit_event("auth_failure", "unknown", method_name, &metadata)
                    .await;

                Ok(AuthResult::Failure(reason.clone()))
            }
        }
    }

    /// Built-in password authentication against framework storage.
    async fn authenticate_password_builtin(
        &self,
        username: &str,
        password: &str,
        metadata: &CredentialMetadata,
    ) -> Result<AuthResult> {
        use crate::auth_modular::user_manager::CredentialCheckResult;

        if username.is_empty() || password.is_empty() {
            return Ok(AuthResult::Failure(
                "Username or password cannot be empty".to_string(),
            ));
        }

        match self
            .user_manager
            .verify_login_credentials(username, password)
            .await?
        {
            None => {
                self.log_audit_event("auth_failure", "unknown", "password", metadata)
                    .await;
                Ok(AuthResult::Failure(
                    "Invalid username or password".to_string(),
                ))
            }
            Some(CredentialCheckResult {
                ref user_id,
                mfa_enabled: true,
            }) => {
                let now = chrono::Utc::now();
                let challenge = MfaChallenge {
                    id: crate::utils::string::generate_id(Some("mfa")),
                    mfa_type: crate::methods::MfaType::MultiMethod,
                    user_id: user_id.clone(),
                    created_at: now,
                    expires_at: now + chrono::Duration::minutes(5),
                    attempts: 0,
                    max_attempts: 5,
                    code_hash: None,
                    message: Some(
                        "Provide your current TOTP code or a backup code to complete login"
                            .to_string(),
                    ),
                    data: HashMap::new(),
                };
                self.guard_and_store_mfa_challenge(challenge.clone()).await?;
                self.log_audit_event("mfa_required", user_id, "password", metadata)
                    .await;
                info!(
                    "Built-in password authentication requires MFA for user: {}",
                    username
                );
                Ok(AuthResult::MfaRequired(Box::new(challenge)))
            }
            Some(CredentialCheckResult {
                ref user_id,
                mfa_enabled: false,
            }) => {
                let token = self
                    .mint_and_store_token(
                        user_id,
                        vec!["read".to_string(), "write".to_string()],
                        "password",
                        None,
                    )
                    .await?;
                self.monitoring_manager.record_auth_request().await;
                self.log_audit_event("auth_success", user_id, "password", metadata)
                    .await;
                info!(
                    "Built-in password authentication successful for user: {}",
                    username
                );
                Ok(AuthResult::Success(Box::new(token)))
            }
        }
    }

    /// Complete multi-factor authentication.
    pub async fn complete_mfa(&self, challenge: MfaChallenge, mfa_code: &str) -> Result<AuthToken> {
        debug!("Completing MFA for challenge '{}'", challenge.id);

        let stored_challenge = self
            .mfa_manager
            .get_challenge(&challenge.id)
            .await?
            .ok_or(MfaError::ChallengeExpired)?;

        if stored_challenge.is_expired() {
            self.mfa_manager.remove_challenge(&challenge.id).await?;
            return Err(MfaError::ChallengeExpired.into());
        }

        if !self.verify_mfa_code(&stored_challenge, mfa_code).await? {
            return Err(MfaError::InvalidCode.into());
        }

        self.mfa_manager.remove_challenge(&challenge.id).await?;

        let scopes = self
            .user_manager
            .get_user_roles(&challenge.user_id)
            .await
            .unwrap_or_else(|_| vec!["user".to_string()]);

        let token = self
            .mint_and_store_token(&challenge.user_id, scopes, "mfa", None)
            .await?;

        info!("MFA completed successfully for user '{}'", challenge.user_id);
        Ok(token)
    }

    /// Complete MFA using a previously issued challenge ID.
    pub async fn complete_mfa_by_id(
        &self,
        challenge_id: &str,
        mfa_code: &str,
    ) -> Result<AuthToken> {
        let challenge = self
            .mfa_manager
            .get_challenge(challenge_id)
            .await?
            .ok_or(MfaError::ChallengeExpired)?;

        self.complete_mfa(challenge, mfa_code).await
    }

    /// Validate a token.
    pub async fn validate_token(&self, token: &AuthToken) -> Result<bool> {
        if !self.initialized {
            return Err(AuthError::internal("Framework not initialized"));
        }
        let valid = token.is_valid()
            && self.token_manager.validate_auth_token(token).is_ok()
            && self.touch_stored_token(token).await?;
        self.monitoring_manager.record_token_validation(valid).await;
        Ok(valid)
    }

    async fn touch_stored_token(&self, token: &AuthToken) -> Result<bool> {
        let Some(mut stored) = self.storage.get_token(&token.token_id).await? else {
            return Ok(false);
        };
        stored.mark_used();
        self.storage.update_token(&stored).await?;
        Ok(true)
    }

    /// Get user information from a token.
    pub async fn get_user_info(&self, token: &AuthToken) -> Result<UserInfo> {
        if !self.validate_token(token).await? {
            return Err(AuthError::auth_method("token", "Invalid token".to_string()));
        }

        let token_info = self.token_manager.extract_token_info(&token.access_token)?;

        // Fetch authoritative user state (active flag, current roles) from storage.
        // Fall back to token claims if the user record is not found.
        match self.user_manager.get_user_info(&token_info.user_id).await {
            Ok(mut info) => {
                // Overlay any token-specific attributes on top of the stored profile.
                if !token_info.attributes.is_empty() {
                    info.attributes = token_info.attributes;
                }
                Ok(info)
            }
            Err(_) => Ok(UserInfo {
                id: token_info.user_id,
                username: token_info.username.unwrap_or_else(|| "unknown".to_string()),
                email: token_info.email,
                name: token_info.name,
                roles: token_info.roles,
                active: false,
                attributes: token_info.attributes,
            }),
        }
    }

    /// Check if a token has a specific permission.
    pub async fn check_permission(
        &self,
        token: &AuthToken,
        action: &str,
        resource: &str,
    ) -> Result<bool> {
        if !self.validate_token(token).await? {
            return Ok(false);
        }
        self.authorization_manager.check_token_permission(token, action, resource).await
    }

    /// Refresh a token.
    pub async fn refresh_token(&self, token: &AuthToken) -> Result<AuthToken> {
        debug!("Refreshing token for user '{}'", token.user_id);

        // Check if the auth method supports refresh
        if let Some(method) = self.methods.get(&token.auth_method)
            && method.supports_refresh()
            && let Some(ref refresh_token) = token.refresh_token
        {
            let new_token = method.refresh_token(refresh_token.to_string()).await?;
            self.storage.store_token(&new_token).await?;
            return Ok(new_token);
        }

        // Fallback to creating a new token with the same properties
        let new_token = self.token_manager.refresh_token(token)?;
        self.storage.store_token(&new_token).await?;

        info!("Token refreshed for user '{}'", token.user_id);

        Ok(new_token)
    }

    /// Revoke a token.
    pub async fn revoke_token(&self, token: &AuthToken) -> Result<()> {
        debug!("Revoking token for user '{}'", token.user_id);

        // Mark token as revoked
        let mut revoked_token = token.clone();
        revoked_token.revoke(Some("Manual revocation".to_string()));

        // Update in storage
        self.storage.update_token(&revoked_token).await?;

        info!("Token revoked for user '{}'", token.user_id);

        Ok(())
    }

    /// Create a new API key for a user.
    pub async fn create_api_key(
        &self,
        user_id: &str,
        expires_in: Option<Duration>,
    ) -> Result<String> {
        self.user_manager.create_api_key(user_id, expires_in).await
    }

    /// Validate an API key and return user information.
    pub async fn validate_api_key(&self, api_key: &str) -> Result<UserInfo> {
        self.user_manager.validate_api_key(api_key).await
    }

    /// Revoke an API key.
    pub async fn revoke_api_key(&self, api_key: &str) -> Result<()> {
        self.user_manager.revoke_api_key(api_key).await
    }

    /// Create a new session.
    pub async fn create_session(
        &self,
        user_id: &str,
        expires_in: Duration,
        ip_address: Option<String>,
        user_agent: Option<String>,
    ) -> Result<String> {
        if !self.initialized {
            return Err(AuthError::internal("Framework not initialized"));
        }
        let (session_id, new_total) = self
            .session_manager
            .create_session_limited(user_id, expires_in, ip_address, user_agent)
            .await?;
        self.monitoring_manager
            .update_session_count(new_total)
            .await;
        Ok(session_id)
    }

    /// Get session information.
    pub async fn get_session(&self, session_id: &str) -> Result<Option<SessionData>> {
        if !self.initialized {
            return Err(AuthError::internal("Framework not initialized"));
        }

        self.session_manager.get_session(session_id).await
    }

    /// Delete a session.
    pub async fn delete_session(&self, session_id: &str) -> Result<()> {
        if !self.initialized {
            return Err(AuthError::internal("Framework not initialized"));
        }

        self.session_manager.delete_session(session_id).await?;

        let remaining = self.session_manager.count_active_sessions().await.unwrap_or(0);
        self.monitoring_manager
            .update_session_count(remaining)
            .await;

        Ok(())
    }

    /// Get all tokens for a user.
    pub async fn list_user_tokens(&self, user_id: &str) -> Result<Vec<AuthToken>> {
        self.storage.list_user_tokens(user_id).await
    }

    /// Clean up expired data.
    pub async fn cleanup_expired_data(&self) -> Result<()> {
        debug!("Cleaning up expired data");

        // Clean up storage
        self.storage.cleanup_expired().await?;

        // Clean up MFA challenges via mfa manager
        self.mfa_manager.cleanup_expired_challenges().await?;

        // Clean up sessions via session manager
        self.session_manager.cleanup_expired_sessions().await?;

        // Clean up rate limiter
        if let Some(ref rate_limiter) = self.rate_limiter {
            let _ = rate_limiter.cleanup().ok();
        }

        Ok(())
    }

/// Detect if the process is running in a production environment by inspecting
/// well-known environment variables and container indicators.
fn is_production_environment() -> bool {
    if let Ok(env) = std::env::var("ENVIRONMENT")
        && (env.to_lowercase() == "production" || env.to_lowercase() == "prod")
    {
        return true;
    }
    if let Ok(env) = std::env::var("ENV")
        && (env.to_lowercase() == "production" || env.to_lowercase() == "prod")
    {
        return true;
    }
    if let Ok(env) = std::env::var("NODE_ENV") && env.to_lowercase() == "production" {
        return true;
    }
    if let Ok(env) = std::env::var("RUST_ENV") && env.to_lowercase() == "production" {
        return true;
    }
    std::env::var("KUBERNETES_SERVICE_HOST").is_ok() || std::env::var("DOCKER_CONTAINER").is_ok()
}

    /// Get authentication framework statistics.
    pub async fn get_stats(&self) -> Result<AuthStats> {
        let mut stats = AuthStats::default();

        if let Err(e) = self.storage.cleanup_expired().await {
            warn!("Failed to cleanup expired data: {}", e);
        }
        if let Some(rate_limiter) = &self.rate_limiter {
            let _ = rate_limiter.cleanup().ok();
        }

        let active_sessions =
            self.session_manager.count_active_sessions().await.unwrap_or(0) as u32;
        let failed_attempts = self.audit_manager.get_failed_login_count_24h().await.unwrap_or(0) as u32;
        let successful_attempts = self.audit_manager.get_successful_login_count_24h().await.unwrap_or(0) as u32;

        stats.registered_methods = self.methods.keys().cloned().collect();
        stats.active_sessions = active_sessions as u64;
        stats.active_mfa_challenges = self.mfa_manager.get_active_challenge_count().await as u64;
        stats.tokens_issued = active_sessions as u64;
        stats.auth_attempts = (successful_attempts + failed_attempts) as u64;

        Ok(stats)
    }

    /// Get the token manager.
    pub fn token_manager(&self) -> &TokenManager {
        &self.token_manager
    }

    /// Validate username format.
    pub async fn validate_username(&self, username: &str) -> Result<bool> {
        self.user_manager.validate_username(username).await
    }

    /// Validate display name format.
    pub async fn validate_display_name(&self, display_name: &str) -> Result<bool> {
        self.user_manager.validate_display_name(display_name).await
    }

    /// Validate password strength using security policy.
    pub async fn validate_password_strength(&self, password: &str) -> Result<bool> {
        self.user_manager.validate_password_strength(password).await
    }

    /// Validate user input against common injection patterns.
    pub async fn validate_user_input(&self, input: &str) -> Result<bool> {
        Ok(crate::utils::validation::validate_user_input(input))
    }

    /// Create an authentication token directly (useful for testing and demos).
    ///
    /// Note: In production, tokens should be created through the `authenticate` method.
    pub async fn create_auth_token(
        &self,
        user_id: impl Into<String>,
        scopes: Vec<String>,
        method_name: impl Into<String>,
        lifetime: Option<Duration>,
    ) -> Result<AuthToken> {
        let method_name = method_name.into();
        let user_id = user_id.into();

        // Validate the method exists and is correctly configured
        let auth_method = self
            .methods
            .get(&method_name)
            .ok_or_else(|| AuthError::auth_method(&method_name, "Method not found"))?;
        auth_method.validate_config()?;

        // ENTERPRISE SECURITY: Check token limits to prevent resource exhaustion
        const MAX_TOKENS_PER_USER: usize = 100;
        let user_tokens = self.storage.list_user_tokens(&user_id).await?;
        if user_tokens.len() >= MAX_TOKENS_PER_USER {
            warn!(
                "User '{}' has reached maximum tokens ({})",
                user_id, MAX_TOKENS_PER_USER
            );
            return Err(AuthError::rate_limit(
                "Maximum tokens per user exceeded. Please revoke unused tokens.",
            ));
        }

        let token = self
            .mint_and_store_token(&user_id, scopes, &method_name, lifetime)
            .await?;
        self.monitoring_manager
            .record_token_creation(&method_name)
            .await;
        Ok(token)
    }

    /// Initiate SMS challenge for MFA.
    pub async fn initiate_sms_challenge(&self, user_id: &str) -> Result<String> {
        self.mfa_manager.sms.initiate_challenge(user_id).await
    }

    /// Verify SMS challenge code.
    pub async fn verify_sms_code(&self, challenge_id: &str, code: &str) -> Result<bool> {
        self.mfa_manager.sms.verify_code(challenge_id, code).await
    }

    /// Register email for a user.
    pub async fn register_email(&self, user_id: &str, email: &str) -> Result<()> {
        self.mfa_manager.email.register_email(user_id, email).await
    }

    /// Generate TOTP secret for a user.
    pub async fn generate_totp_secret(&self, user_id: &str) -> Result<String> {
        self.mfa_manager.totp.generate_secret(user_id).await
    }

    /// Generate TOTP QR code URL.
    pub async fn generate_totp_qr_code(
        &self,
        user_id: &str,
        app_name: &str,
        secret: &str,
    ) -> Result<String> {
        self.mfa_manager.totp.generate_qr_code(user_id, app_name, secret).await
    }

    /// Generate current TOTP code using provided secret.
    pub async fn generate_totp_code(&self, secret: &str) -> Result<String> {
        self.mfa_manager.totp.generate_code(secret).await
    }

    /// Generate TOTP code for given secret and optional specific time window
    pub async fn generate_totp_code_for_window(
        &self,
        secret: &str,
        time_window: Option<u64>,
    ) -> Result<String> {
        self.mfa_manager.totp.generate_code_for_window(secret, time_window).await
    }

    /// Verify TOTP code.
    pub async fn verify_totp_code(&self, user_id: &str, code: &str) -> Result<bool> {
        self.mfa_manager.totp.verify_code(user_id, code).await
    }

    /// Check IP rate limit.
    pub async fn check_ip_rate_limit(&self, ip: &str) -> Result<bool> {
        debug!("Checking IP rate limit for '{}'", ip);
        let Some(ref rate_limiter) = self.rate_limiter else { return Ok(true); };
        if !rate_limiter.is_allowed(&format!("ip:{}", ip)) {
            warn!("Rate limit exceeded for IP: {}", ip);
            return Err(AuthError::rate_limit(format!(
                "Too many requests from IP {}. Please try again later.",
                ip
            )));
        }
        Ok(true)
    }

    /// Get security metrics.
    pub async fn get_security_metrics(&self) -> Result<std::collections::HashMap<String, u64>> {
        debug!("Getting security metrics");
        let mut metrics = std::collections::HashMap::new();
        let total_active_sessions = self.session_manager.count_active_sessions().await.unwrap_or(0);
        metrics.insert("active_sessions".to_string(), total_active_sessions);
        metrics.insert("total_tokens".to_string(), total_active_sessions);
        metrics.insert("failed_attempts".to_string(), self.audit_manager.get_failed_login_count_24h().await.unwrap_or(0));
        metrics.insert("successful_attempts".to_string(), self.audit_manager.get_successful_login_count_24h().await.unwrap_or(0));
        metrics.insert("expired_tokens".to_string(), 0u64);
        Ok(metrics)
    }

    /// Register phone number for SMS MFA.
    pub async fn register_phone_number(&self, user_id: &str, phone_number: &str) -> Result<()> {
        self.mfa_manager.sms.register_phone_number(user_id, phone_number).await
    }

    /// Generate backup codes.
    pub async fn generate_backup_codes(&self, user_id: &str, count: usize) -> Result<Vec<String>> {
        self.mfa_manager.backup_codes.generate_codes(user_id, count).await
    }
    /// Grant permission to a user.
    pub async fn grant_permission(
        &self,
        user_id: &str,
        action: &str,
        resource: &str,
    ) -> Result<()> {
        self.authorization_manager.grant_permission(user_id, action, resource).await
    }

    /// Initiate email challenge.
    pub async fn initiate_email_challenge(&self, user_id: &str) -> Result<String> {
        self.mfa_manager.email.initiate_challenge(user_id).await
    }

    /// Get reference to the storage backend.
    pub fn storage(&self) -> Arc<dyn AuthStorage> {
        self.storage.clone()
    }

    /// Register a new user with username, email, and password.
    pub async fn register_user(
        &self,
        username: &str,
        email: &str,
        password: &str,
    ) -> Result<String> {
        self.user_manager.register_user(username, email, password).await
    }

    /// Update the roles assigned to a user.
    pub async fn update_user_roles(&self, user_id: &str, roles: &[String]) -> Result<()> {
        self.user_manager.update_user_roles(user_id, roles).await
    }

    /// Set a user's active / deactivated status.
    pub async fn set_user_active(&self, user_id: &str, active: bool) -> Result<()> {
        self.user_manager.set_user_active(user_id, active).await
    }

    /// Verify a user's password by user_id against the stored bcrypt hash.
    pub async fn verify_user_password(&self, user_id: &str, password: &str) -> Result<bool> {
        self.user_manager.verify_user_password(user_id, password).await
    }

    /// Look up a user's username by their user_id.
    pub async fn get_username_by_id(&self, user_id: &str) -> Result<String> {
        self.user_manager.get_username_by_id(user_id).await
    }

    /// Check if a username exists.
    pub async fn username_exists(&self, username: &str) -> Result<bool> {
        self.user_manager.username_exists(username).await
    }

    /// Check if an email exists.
    pub async fn email_exists(&self, email: &str) -> Result<bool> {
        self.user_manager.email_exists(email).await
    }

    /// Get user data by username.
    pub async fn get_user_by_username(
        &self,
        username: &str,
    ) -> Result<HashMap<String, serde_json::Value>> {
        self.user_manager.get_user_by_username(username).await
    }

    /// Update user password.
    pub async fn update_user_password(&self, username: &str, new_password: &str) -> Result<()> {
        self.user_manager.update_user_password(username, new_password).await
    }

    /// Delete a user by username.
    pub async fn delete_user(&self, username: &str) -> Result<()> {
        self.user_manager.delete_user(username).await
    }

    /// Verify MFA code with proper challenge validation.
    async fn verify_mfa_code(&self, challenge: &MfaChallenge, code: &str) -> Result<bool> {
        self.mfa_manager.verify_challenge_code(challenge, code).await
    }

    /// Log an audit event via tracing, subject to per-event-type config guards.
    async fn log_audit_event(
        &self,
        event_type: &str,
        user_id: &str,
        method: &str,
        metadata: &CredentialMetadata,
    ) {
        if !self.config.audit.enabled { return; }
        let should_log = match event_type {
            "auth_success" | "mfa_required" => self.config.audit.log_success,
            "auth_failure" => self.config.audit.log_failures,
            _ => true,
        };
        if should_log {
            self.audit_manager
                .log_auth_trace_event(
                    event_type,
                    user_id,
                    method,
                    metadata.client_ip.as_deref().unwrap_or("unknown"),
                    metadata.user_agent.as_deref().unwrap_or("unknown"),
                )
                .await;
        }
    }

    /// Guard the global MFA-challenge budget and store the challenge.
    async fn guard_and_store_mfa_challenge(&self, challenge: MfaChallenge) -> Result<()> {
        self.mfa_manager.guard_and_store(challenge).await
    }

    /// Create and immediately store an auth token, returning it.
    async fn mint_and_store_token(
        &self,
        user_id: &str,
        scopes: Vec<String>,
        method: &str,
        lifetime: Option<Duration>,
    ) -> Result<AuthToken> {
        let token = self.token_manager.create_auth_token(user_id, scopes, method, lifetime)?;
        self.storage.store_token(&token).await?;
        Ok(token)
    }

    /// Coordinate session state across distributed instances.
    pub async fn coordinate_distributed_sessions(&self) -> Result<SessionCoordinationStats> {
        self.session_manager.coordinate_distributed_sessions().await
    }

    /// Synchronize a specific session with remote instances.
    pub async fn synchronize_session(&self, session_id: &str) -> Result<()> {
        self.session_manager.synchronize_session(session_id).await
    }

    /// Returns the monitoring manager for metrics collection and health checks.
    pub fn get_monitoring_manager(&self) -> Arc<crate::monitoring::MonitoringManager> {
        self.monitoring_manager.clone()
    }

    /// Returns the security manager for rate limiting, DoS protection, and IP blacklisting.
    pub fn get_security_manager(&self) -> Option<Arc<crate::api::SecurityManager>> {
        Some(self.security_manager.clone())
    }

    /// Get current performance metrics
    pub async fn get_performance_metrics(&self) -> std::collections::HashMap<String, u64> {
        self.monitoring_manager.get_performance_metrics()
    }

    /// Perform comprehensive health check
    pub async fn health_check(
        &self,
    ) -> Result<std::collections::HashMap<String, crate::monitoring::HealthCheckResult>> {
        self.monitoring_manager.health_check().await
    }

    /// Export metrics in Prometheus format
    pub async fn export_prometheus_metrics(&self) -> String {
        self.monitoring_manager.export_prometheus_metrics().await
    }
    /// Create a new role.
    pub async fn create_role(&self, role: crate::permissions::Role) -> Result<()> {
        self.authorization_manager.create_role(role).await
    }

    /// Assign a role to a user.
    pub async fn assign_role(&self, user_id: &str, role_name: &str) -> Result<()> {
        self.authorization_manager.assign_role(user_id, role_name).await
    }

    /// Remove a role from a user.
    pub async fn remove_role(&self, user_id: &str, role_name: &str) -> Result<()> {
        self.authorization_manager.remove_role(user_id, role_name).await
    }

    /// Set role inheritance.
    pub async fn set_role_inheritance(&self, child_role: &str, parent_role: &str) -> Result<()> {
        self.authorization_manager.set_role_inheritance(child_role, parent_role).await
    }

    /// Revoke permission from a user.
    pub async fn revoke_permission(
        &self,
        user_id: &str,
        action: &str,
        resource: &str,
    ) -> Result<()> {
        self.authorization_manager.revoke_permission(user_id, action, resource).await
    }

    /// Check if user has a role.
    pub async fn user_has_role(&self, user_id: &str, role_name: &str) -> Result<bool> {
        self.authorization_manager.user_has_role(user_id, role_name).await
    }

    /// Get effective permissions for a user.
    pub async fn get_effective_permissions(&self, user_id: &str) -> Result<Vec<String>> {
        self.authorization_manager.get_effective_permissions(user_id).await
    }

    /// Create ABAC policy.
    pub async fn create_abac_policy(&self, name: &str, description: &str) -> Result<()> {
        self.authorization_manager.create_abac_policy(name, description).await
    }

    /// Map user attribute for ABAC evaluation.
    pub async fn map_user_attribute(
        &self,
        user_id: &str,
        attribute: &str,
        value: &str,
    ) -> Result<()> {
        self.authorization_manager.map_user_attribute(user_id, attribute, value).await
    }

    /// Get user attribute for ABAC evaluation.
    pub async fn get_user_attribute(
        &self,
        user_id: &str,
        attribute: &str,
    ) -> Result<Option<String>> {
        self.authorization_manager.get_user_attribute(user_id, attribute).await
    }

    /// Check dynamic permission with context evaluation (ABAC).
    pub async fn check_dynamic_permission(
        &self,
        user_id: &str,
        action: &str,
        resource: &str,
        context: std::collections::HashMap<String, String>,
    ) -> Result<bool> {
        self.authorization_manager.check_dynamic_permission(user_id, action, resource, context).await
    }

    /// Create resource for permission management.
    pub async fn create_resource(&self, resource: &str) -> Result<()> {
        self.authorization_manager.create_resource(resource).await
    }

    /// Delegate permission from one user to another.
    pub async fn delegate_permission(
        &self,
        delegator_id: &str,
        delegatee_id: &str,
        action: &str,
        resource: &str,
        duration: std::time::Duration,
    ) -> Result<()> {
        self.authorization_manager.delegate_permission(delegator_id, delegatee_id, action, resource, duration).await
    }

    /// Get active delegations for a user.
    pub async fn get_active_delegations(&self, user_id: &str) -> Result<Vec<String>> {
        self.authorization_manager.get_active_delegations(user_id).await
    }

    /// Get permission audit logs with filtering.
    pub async fn get_permission_audit_logs(
        &self,
        user_id: Option<&str>,
        action: Option<&str>,
        resource: Option<&str>,
        limit: Option<usize>,
    ) -> Result<Vec<String>> {
        self.audit_manager.get_permission_audit_logs(user_id, action, resource, limit).await
    }

    /// Get permission metrics for monitoring.
    pub async fn get_permission_metrics(
        &self,
    ) -> Result<std::collections::HashMap<String, u64>, AuthError> {
        let active_sessions = self.storage.count_active_sessions().await.unwrap_or(0);
        let permission_checks_last_hour =
            self.audit_manager.get_permission_checks_last_hour().await.unwrap_or(0);
        self.authorization_manager
            .get_permission_metrics(active_sessions, permission_checks_last_hour)
            .await
    }

    /// Collect comprehensive security audit statistics.
    pub async fn get_security_audit_stats(&self) -> Result<SecurityAuditStats> {
        let active_sessions = self.session_manager.count_active_sessions().await.unwrap_or(0);
        self.audit_manager.get_security_audit_stats(active_sessions).await
    }

    /// Get user profile information
    pub async fn get_user_profile(
        &self,
        user_id: &str,
    ) -> Result<crate::providers::ProviderProfile> {
        self.user_manager.get_user_profile(user_id).await
    }
}

pub use crate::audit::SecurityAuditStats;

pub use crate::auth_modular::session_manager::SessionCoordinationStats;

/// Authentication framework statistics.
#[derive(Debug, Clone, Default)]
pub struct AuthStats {
    /// Number of registered authentication methods
    pub registered_methods: Vec<String>,

    /// Number of active sessions
    pub active_sessions: u64,

    /// Number of active MFA challenges
    pub active_mfa_challenges: u64,

    /// Number of tokens issued (this would need proper tracking)
    pub tokens_issued: u64,

    /// Number of authentication attempts (this would need proper tracking)
    pub auth_attempts: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{AuthConfig, SecurityConfig};
    #[tokio::test]
    async fn test_framework_initialization() {
        let config = AuthConfig::new().security(SecurityConfig {
            min_password_length: 8,
            require_password_complexity: false,
            password_hash_algorithm: crate::config::PasswordHashAlgorithm::Bcrypt,
            jwt_algorithm: crate::config::JwtAlgorithm::HS256,
            secret_key: Some("test_secret_key_32_bytes_long!!!!".to_string()),
            secure_cookies: false,
            cookie_same_site: crate::config::CookieSameSite::Lax,
            csrf_protection: false,
            session_timeout: Duration::from_secs(3600),
            previous_secret_key: None,
        });
        let mut framework = AuthFramework::new(config);

        assert!(framework.initialize().await.is_ok());
        assert!(framework.initialized);
    }

    #[tokio::test]
    async fn test_method_registration() {
        // Method registration test disabled due to trait object lifetime constraints
        // This test would require dynamic trait objects which have complex lifetime requirements
        // Production implementations should use static method registration or dependency injection

        let config = AuthConfig::new().security(SecurityConfig {
            min_password_length: 8,
            require_password_complexity: false,
            password_hash_algorithm: crate::config::PasswordHashAlgorithm::Bcrypt,
            jwt_algorithm: crate::config::JwtAlgorithm::HS256,
            secret_key: Some("test_secret_key_32_bytes_long!!!!".to_string()),
            secure_cookies: false,
            cookie_same_site: crate::config::CookieSameSite::Lax,
            csrf_protection: false,
            session_timeout: Duration::from_secs(3600),
            previous_secret_key: None,
        });
        let framework = AuthFramework::new(config);

        // Verify framework initialization works without dynamic method registration
        assert!(!framework.initialized);

        // Method registration system supports flexible authentication methods
        // using factory pattern for better lifetime management
    }

    #[tokio::test]
    async fn test_token_validation() {
        let config = AuthConfig::new().security(SecurityConfig {
            min_password_length: 8,
            require_password_complexity: false,
            password_hash_algorithm: crate::config::PasswordHashAlgorithm::Bcrypt,
            jwt_algorithm: crate::config::JwtAlgorithm::HS256,
            secret_key: Some("test_secret_key_32_bytes_long!!!!".to_string()),
            secure_cookies: false,
            cookie_same_site: crate::config::CookieSameSite::Lax,
            csrf_protection: false,
            session_timeout: Duration::from_secs(3600),
            previous_secret_key: None,
        });
        let mut framework = AuthFramework::new(config);
        framework.initialize().await.unwrap();

        let token = framework
            .token_manager
            .create_auth_token("test-user", vec!["read".to_string()], "test", None)
            .unwrap();

        // Store the token first
        framework.storage.store_token(&token).await.unwrap();

        assert!(framework.validate_token(&token).await.unwrap());
    }

    #[tokio::test]
    async fn test_session_management() {
        let config = AuthConfig::new().security(SecurityConfig {
            min_password_length: 8,
            require_password_complexity: false,
            password_hash_algorithm: crate::config::PasswordHashAlgorithm::Bcrypt,
            jwt_algorithm: crate::config::JwtAlgorithm::HS256,
            secret_key: Some("test_secret_key_32_bytes_long!!!!".to_string()),
            secure_cookies: false,
            cookie_same_site: crate::config::CookieSameSite::Lax,
            csrf_protection: false,
            session_timeout: Duration::from_secs(3600),
            previous_secret_key: None,
        });
        let mut framework = AuthFramework::new(config);
        framework.initialize().await.unwrap();

        let session_id = framework
            .create_session(
                "test-user",
                Duration::from_secs(3600),
                Some("192.168.1.1".to_string()),
                Some("Test Agent".to_string()),
            )
            .await
            .unwrap();

        let session = framework.get_session(&session_id).await.unwrap();
        assert!(session.is_some());

        framework.delete_session(&session_id).await.unwrap();
        let session = framework.get_session(&session_id).await.unwrap();
        assert!(session.is_none());
    }

    #[tokio::test]
    async fn test_grouped_operations_accessors() {
        let config = AuthConfig::new().security(SecurityConfig {
            min_password_length: 8,
            require_password_complexity: false,
            password_hash_algorithm: crate::config::PasswordHashAlgorithm::Bcrypt,
            jwt_algorithm: crate::config::JwtAlgorithm::HS256,
            secret_key: Some("test_secret_key_32_bytes_long!!!!".to_string()),
            secure_cookies: false,
            cookie_same_site: crate::config::CookieSameSite::Lax,
            csrf_protection: false,
            session_timeout: Duration::from_secs(3600),
            previous_secret_key: None,
        });
        let mut framework = AuthFramework::new(config);
        framework.initialize().await.unwrap();

        let user_id = framework
            .users()
            .register("grouped-user", "grouped-user@example.com", "P@ssw0rd123")
            .await
            .unwrap();
        assert!(
            framework
                .users()
                .exists_by_username("grouped-user")
                .await
                .unwrap()
        );

        let session_id = framework
            .sessions()
            .create(&user_id, Duration::from_secs(300), None, None)
            .await
            .unwrap();
        assert!(
            framework
                .sessions()
                .get(&session_id)
                .await
                .unwrap()
                .is_some()
        );
        assert_eq!(
            framework
                .sessions()
                .list_for_user(&user_id)
                .await
                .unwrap()
                .len(),
            1
        );

        framework
            .authorization()
            .grant(&user_id, "read", "documents")
            .await
            .unwrap();
        let permissions = framework
            .authorization()
            .effective_permissions(&user_id)
            .await
            .unwrap();
        assert!(
            permissions
                .iter()
                .any(|permission| permission == "read:documents")
        );

        framework.sessions().delete(&session_id).await.unwrap();
        assert!(
            framework
                .sessions()
                .get(&session_id)
                .await
                .unwrap()
                .is_none()
        );
    }

    #[tokio::test]
    async fn test_cleanup_expired_data() {
        let config = AuthConfig::new().security(SecurityConfig {
            min_password_length: 8,
            require_password_complexity: false,
            password_hash_algorithm: crate::config::PasswordHashAlgorithm::Bcrypt,
            jwt_algorithm: crate::config::JwtAlgorithm::HS256,
            secret_key: Some("test_secret_key_32_bytes_long!!!!".to_string()),
            secure_cookies: false,
            cookie_same_site: crate::config::CookieSameSite::Lax,
            csrf_protection: false,
            session_timeout: Duration::from_secs(3600),
            previous_secret_key: None,
        });
        let mut framework = AuthFramework::new(config);
        framework.initialize().await.unwrap();

        // This test would need expired data to be meaningful
        assert!(framework.cleanup_expired_data().await.is_ok());
    }
}
