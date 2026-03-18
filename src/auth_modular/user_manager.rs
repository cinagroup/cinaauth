//! User management module

use crate::errors::{AuthError, Result};
use crate::storage::AuthStorage;
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, info, warn};

/// Canonical user information type shared with [`crate::auth::UserInfo`].
pub type UserInfo = crate::auth::UserInfo;

/// Result of a successful credential verification via [`UserManager::verify_login_credentials`].
pub struct CredentialCheckResult {
    /// The verified user's ID.
    pub user_id: String,
    /// Whether the user has MFA enabled.
    pub mfa_enabled: bool,
}

/// User manager for handling user operations
pub struct UserManager {
    storage: Arc<dyn AuthStorage>,
}

impl UserManager {
    /// Create a new user manager
    pub fn new(storage: Arc<dyn AuthStorage>) -> Self {
        Self { storage }
    }

    /// Create API key for a user
    pub async fn create_api_key(
        &self,
        user_id: &str,
        expires_in: Option<std::time::Duration>,
    ) -> Result<String> {
        debug!("Creating API key for user '{}'", user_id);

        // Generate a secure API key
        let api_key = format!("ak_{}", crate::utils::crypto::generate_token(32));

        // Store API key metadata
        let key_data = serde_json::json!({
            "user_id": user_id,
            "created_at": chrono::Utc::now(),
            "expires_at": expires_in.map(|d| chrono::Utc::now() + chrono::Duration::from_std(d).unwrap_or(chrono::Duration::days(365 * 10)))
        });

        let storage_key = format!("api_key:{}", api_key);
        self.storage
            .store_kv(&storage_key, key_data.to_string().as_bytes(), expires_in)
            .await?;

        info!("API key created for user '{}'", user_id);
        Ok(api_key)
    }

    /// Validate API key and return user information
    pub async fn validate_api_key(&self, api_key: &str) -> Result<UserInfo> {
        debug!("Validating API key");

        let storage_key = format!("api_key:{}", api_key);
        if let Some(key_data) = self.storage.get_kv(&storage_key).await? {
            let key_info: serde_json::Value = serde_json::from_slice(&key_data)?;

            if let Some(user_id) = key_info["user_id"].as_str() {
                // Check expiration
                if let Some(expires_at_str) = key_info["expires_at"].as_str() {
                    let expires_at: chrono::DateTime<chrono::Utc> = expires_at_str
                        .parse()
                        .map_err(|_| AuthError::token("Invalid API key expiration"))?;

                    if chrono::Utc::now() > expires_at {
                        return Err(AuthError::token("API key expired"));
                    }
                }

                // Return user information
                Ok(UserInfo {
                    id: user_id.to_string(),
                    username: format!("api_user_{}", user_id),
                    email: None,
                    name: None,
                    roles: vec!["api_user".to_string()],
                    active: true,
                    attributes: HashMap::new(),
                })
            } else {
                Err(AuthError::token("Invalid API key format"))
            }
        } else {
            Err(AuthError::token("Invalid API key"))
        }
    }

    /// Revoke API key
    pub async fn revoke_api_key(&self, api_key: &str) -> Result<()> {
        debug!("Revoking API key");

        let storage_key = format!("api_key:{}", api_key);
        if self.storage.get_kv(&storage_key).await?.is_some() {
            self.storage.delete_kv(&storage_key).await?;
            info!("API key revoked");
            Ok(())
        } else {
            Err(AuthError::token("API key not found"))
        }
    }

    /// Validate username format
    pub async fn validate_username(&self, username: &str) -> Result<bool> {
        debug!("Validating username format: '{}'", username);

        let is_valid = username.len() >= 3
            && username.len() <= 32
            && username
                .chars()
                .all(|c| c.is_alphanumeric() || c == '_' || c == '-');

        Ok(is_valid)
    }

    /// Validate display name format
    pub async fn validate_display_name(&self, display_name: &str) -> Result<bool> {
        debug!("Validating display name format");

        let is_valid = !display_name.is_empty()
            && display_name.len() <= 100
            && !display_name.trim().is_empty();

        Ok(is_valid)
    }

    /// Validate password strength using security policy.
    ///
    /// Requires Strong or VeryStrong to protect production deployments.
    pub async fn validate_password_strength(&self, password: &str) -> Result<bool> {
        debug!("Validating password strength");
        let strength = crate::utils::password::check_password_strength(password);
        let is_valid = crate::utils::password::meets_production_strength(strength.level);
        if !is_valid {
            warn!(
                "Password validation failed - Actual: {:?}, Feedback: {}",
                strength.level,
                strength.feedback.join(", ")
            );
        }
        Ok(is_valid)
    }

    /// Validate user input for security.
    ///
    /// Combines a character whitelist with pattern checks for common injection
    /// vectors. Rejects HTML tags, null bytes, path traversal sequences,
    /// template injection markers, and dangerous URI schemes.
    pub async fn validate_user_input(&self, input: &str) -> Result<bool> {
        debug!("Validating user input");

        if input.is_empty() || input.len() > 1000 {
            return Ok(false);
        }

        // Character whitelist: reject control characters and angle brackets.
        if !input.chars().all(|c| {
            if c.is_control() {
                matches!(c, ' ' | '\t' | '\n' | '\r')
            } else {
                !matches!(c, '<' | '>')
            }
        }) {
            return Ok(false);
        }

        let lower = input.to_ascii_lowercase();
        if lower.contains("%3c") || lower.contains("%3e") || lower.contains("%00") {
            return Ok(false);
        }
        if lower.contains("javascript:")
            || lower.contains("data:")
            || lower.contains("file:")
            || lower.contains("jndi:")
        {
            return Ok(false);
        }
        if input.contains("${") || input.contains("{{") {
            return Ok(false);
        }
        if input.contains("../") || input.contains("..\\") {
            return Ok(false);
        }
        if input.contains('\0') {
            return Ok(false);
        }
        if lower.contains("; drop")
            || lower.contains(";drop")
            || lower.contains("' drop")
            || lower.contains("'; drop")
            || lower.contains("--")
        {
            return Ok(false);
        }

        Ok(true)
    }

    /// Get user information by ID
    pub async fn get_user_info(&self, user_id: &str) -> Result<UserInfo> {
        debug!("Getting user info for '{}'", user_id);

        let key = format!("user:{}", user_id);
        if let Some(data) = self.storage.get_kv(&key).await? {
            let user_data: serde_json::Value = serde_json::from_slice(&data)
                .map_err(|e| AuthError::internal(format!("Failed to parse user data: {e}")))?;

            Ok(UserInfo {
                id: user_data["user_id"].as_str().unwrap_or(user_id).to_string(),
                username: user_data["username"].as_str().unwrap_or("").to_string(),
                email: user_data["email"].as_str().map(String::from),
                name: user_data["name"].as_str().map(String::from),
                roles: user_data["roles"]
                    .as_array()
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_else(|| vec!["user".to_string()]),
                active: user_data["active"].as_bool().unwrap_or(true),
                attributes: HashMap::new(),
            })
        } else {
            Err(AuthError::validation(format!("User '{user_id}' not found")))
        }
    }

    /// Check if user exists
    pub async fn user_exists(&self, user_id: &str) -> Result<bool> {
        debug!("Checking if user '{}' exists", user_id);

        if user_id.is_empty() {
            return Ok(false);
        }

        let key = format!("user:{}", user_id);
        Ok(self.storage.get_kv(&key).await?.is_some())
    }

    // ────────────────────────────────────────────────────────────────────────
    // Full user lifecycle management (migrated from auth.rs::AuthFramework)
    // ────────────────────────────────────────────────────────────────────────

    /// Register a new user, creating all required storage records.
    pub async fn register_user(
        &self,
        username: &str,
        email: &str,
        password: &str,
    ) -> Result<String> {
        debug!("Registering new user: {}", username);

        let username_key = format!("user:username:{}", username);
        if self.storage.get_kv(&username_key).await?.is_some() {
            return Err(AuthError::validation("Username already exists".to_string()));
        }

        let email_key = format!("user:email:{}", email);
        if self.storage.get_kv(&email_key).await?.is_some() {
            return Err(AuthError::validation("Email already exists".to_string()));
        }

        let user_id = crate::utils::string::generate_id(Some("user"));

        let password_hash = bcrypt::hash(password, bcrypt::DEFAULT_COST)
            .map_err(|e| AuthError::crypto(format!("Failed to hash password: {}", e)))?;

        let user_data = serde_json::json!({
            "user_id": user_id,
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "roles": ["user"],
            "active": true,
            "created_at": chrono::Utc::now().to_rfc3339(),
        });

        let user_key = format!("user:{}", user_id);
        self.storage
            .store_kv(&user_key, user_data.to_string().as_bytes(), None)
            .await?;

        self.storage
            .store_kv(&username_key, user_id.as_bytes(), None)
            .await?;
        self.storage
            .store_kv(&email_key, user_id.as_bytes(), None)
            .await?;

        // Maintain global user index for admin listing.
        let index_key = "users:index";
        let mut ids: Vec<String> = match self.storage.get_kv(index_key).await? {
            Some(bytes) => serde_json::from_slice(&bytes).unwrap_or_default(),
            None => vec![],
        };
        ids.push(user_id.clone());
        if let Ok(idx_json) = serde_json::to_vec(&ids) {
            let _ = self.storage.store_kv(index_key, &idx_json, None).await;
        }

        // Store Argon2 credentials record for authenticate_password_builtin.
        let creds_key = format!("user:credentials:{}", username);
        let creds_hash = match crate::utils::password::hash_password(password) {
            Ok(h) => h,
            Err(e) => {
                warn!("Failed to hash credentials for user '{}': {}", username, e);
                return Ok(user_id);
            }
        };
        let creds_data = serde_json::json!({
            "user_id": user_id,
            "username": username,
            "email": email,
            "password_hash": creds_hash,
            "created_at": chrono::Utc::now().to_rfc3339(),
        });
        let _ = self
            .storage
            .store_kv(&creds_key, creds_data.to_string().as_bytes(), None)
            .await;

        info!("User '{}' registered successfully", username);
        Ok(user_id)
    }

    /// Delete a user and all associated storage records.
    pub async fn delete_user(&self, username: &str) -> Result<()> {
        debug!("Deleting user: {}", username);

        let username_key = format!("user:username:{}", username);
        let user_id_data = self
            .storage
            .get_kv(&username_key)
            .await?
            .ok_or_else(|| AuthError::validation("User not found".to_string()))?;

        let user_id = String::from_utf8(user_id_data)
            .map_err(|e| AuthError::crypto(format!("Invalid user ID format: {}", e)))?;

        // Remove email reverse-lookup.
        let user_key = format!("user:{}", user_id);
        if let Some(user_data_bytes) = self.storage.get_kv(&user_key).await?
            && let Ok(user_json_str) = String::from_utf8(user_data_bytes)
            && let Ok(user_data) = serde_json::from_str::<serde_json::Value>(&user_json_str)
            && let Some(email) = user_data.get("email").and_then(|v| v.as_str())
        {
            let _ = self
                .storage
                .delete_kv(&format!("user:email:{}", email))
                .await;
        }

        // Remove from global index.
        let index_key = "users:index";
        if let Ok(Some(bytes)) = self.storage.get_kv(index_key).await {
            let mut ids: Vec<String> = serde_json::from_slice(&bytes).unwrap_or_default();
            ids.retain(|id| id != &user_id);
            if let Ok(idx_json) = serde_json::to_vec(&ids) {
                let _ = self.storage.store_kv(index_key, &idx_json, None).await;
            }
        }

        let _ = self.storage.delete_kv(&user_key).await;
        let _ = self.storage.delete_kv(&username_key).await;
        let _ = self
            .storage
            .delete_kv(&format!("user:credentials:{}", username))
            .await;
        let _ = self
            .storage
            .delete_kv(&format!("user:{}:totp_secret", user_id))
            .await;
        let _ = self
            .storage
            .delete_kv(&format!("user:{}:backup_codes", user_id))
            .await;

        info!("User '{}' deleted successfully", username);
        Ok(())
    }

    /// Update the roles assigned to a user.
    pub async fn update_user_roles(&self, user_id: &str, roles: &[String]) -> Result<()> {
        let user_key = format!("user:{}", user_id);
        let bytes = self
            .storage
            .get_kv(&user_key)
            .await?
            .ok_or(AuthError::UserNotFound)?;
        let mut user_data: serde_json::Value =
            serde_json::from_slice(&bytes).map_err(|e| AuthError::crypto(format!("{e}")))?;
        user_data["roles"] = serde_json::json!(roles);
        user_data["updated_at"] = serde_json::json!(chrono::Utc::now().to_rfc3339());
        self.storage
            .store_kv(&user_key, user_data.to_string().as_bytes(), None)
            .await?;
        info!("Roles updated for user '{}'", user_id);
        Ok(())
    }

    /// Enable or disable a user account.
    pub async fn set_user_active(&self, user_id: &str, active: bool) -> Result<()> {
        let user_key = format!("user:{}", user_id);
        let bytes = self
            .storage
            .get_kv(&user_key)
            .await?
            .ok_or(AuthError::UserNotFound)?;
        let mut user_data: serde_json::Value =
            serde_json::from_slice(&bytes).map_err(|e| AuthError::crypto(format!("{e}")))?;
        user_data["active"] = serde_json::json!(active);
        user_data["updated_at"] = serde_json::json!(chrono::Utc::now().to_rfc3339());
        self.storage
            .store_kv(&user_key, user_data.to_string().as_bytes(), None)
            .await?;
        info!("User '{}' active status set to {}", user_id, active);
        Ok(())
    }

    /// Verify a user's password against the stored bcrypt hash.
    pub async fn verify_user_password(&self, user_id: &str, password: &str) -> Result<bool> {
        let user_key = format!("user:{}", user_id);
        let bytes = self
            .storage
            .get_kv(&user_key)
            .await?
            .ok_or(AuthError::UserNotFound)?;
        let user_data: serde_json::Value =
            serde_json::from_slice(&bytes).map_err(|e| AuthError::crypto(format!("{e}")))?;
        let hash = user_data["password_hash"]
            .as_str()
            .ok_or_else(|| AuthError::internal("User has no password hash".to_string()))?;
        bcrypt::verify(password, hash)
            .map_err(|e| AuthError::crypto(format!("Password verification failed: {}", e)))
    }

    /// Resolve a user_id to its username.
    pub async fn get_username_by_id(&self, user_id: &str) -> Result<String> {
        let user_key = format!("user:{}", user_id);
        let bytes = self
            .storage
            .get_kv(&user_key)
            .await?
            .ok_or(AuthError::UserNotFound)?;
        let user_data: serde_json::Value =
            serde_json::from_slice(&bytes).map_err(|e| AuthError::crypto(format!("{e}")))?;
        user_data["username"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| AuthError::internal("User has no username field".to_string()))
    }

    /// Check whether a username is already taken.
    pub async fn username_exists(&self, username: &str) -> Result<bool> {
        Ok(self
            .storage
            .get_kv(&format!("user:username:{}", username))
            .await?
            .is_some())
    }

    /// Check whether an email address is already registered.
    pub async fn email_exists(&self, email: &str) -> Result<bool> {
        Ok(self
            .storage
            .get_kv(&format!("user:email:{}", email))
            .await?
            .is_some())
    }

    /// Fetch raw user data by username.
    pub async fn get_user_by_username(
        &self,
        username: &str,
    ) -> Result<HashMap<String, serde_json::Value>> {
        let username_key = format!("user:username:{}", username);
        let user_id_data = self
            .storage
            .get_kv(&username_key)
            .await?
            .ok_or_else(|| AuthError::validation("User not found".to_string()))?;
        let user_id = String::from_utf8(user_id_data)
            .map_err(|e| AuthError::crypto(format!("Invalid user ID format: {}", e)))?;
        let user_key = format!("user:{}", user_id);
        let user_data = self
            .storage
            .get_kv(&user_key)
            .await?
            .ok_or_else(|| AuthError::validation("User not found".to_string()))?;
        let user_obj: serde_json::Value = serde_json::from_slice(&user_data)
            .map_err(|e| AuthError::crypto(format!("Failed to parse user data: {}", e)))?;
        if let Some(obj) = user_obj.as_object() {
            Ok(obj
                .into_iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect())
        } else {
            Err(AuthError::validation(
                "Invalid user data structure".to_string(),
            ))
        }
    }

    /// Get a sanitised user profile (no password hash) for display/API.
    pub async fn get_user_profile(
        &self,
        user_id: &str,
    ) -> Result<crate::providers::ProviderProfile> {
        let user_key = format!("user:{}", user_id);
        if let Ok(Some(bytes)) = self.storage.get_kv(&user_key).await
            && let Ok(user_data) = serde_json::from_slice::<serde_json::Value>(&bytes)
        {
            let username = user_data["username"].as_str().map(|s| s.to_string());
            let email = user_data["email"].as_str().map(|s| s.to_string());
            let name = user_data["name"].as_str().map(|s| s.to_string());
            let email_verified = user_data["email_verified"].as_bool();

            let mut additional_data = std::collections::HashMap::new();
            if let Some(obj) = user_data.as_object() {
                for (k, v) in obj {
                    match k.as_str() {
                        "user_id" | "username" | "email" | "name" | "email_verified"
                        | "password_hash" | "created_at" | "updated_at" => {}
                        _ => {
                            additional_data.insert(k.clone(), v.clone());
                        }
                    }
                }
            }

            return Ok(crate::providers::ProviderProfile {
                id: Some(user_id.to_string()),
                provider: Some("local".to_string()),
                username,
                name,
                email,
                email_verified,
                picture: None,
                locale: None,
                additional_data,
            });
        }
        Err(AuthError::UserNotFound)
    }

    /// Update a user's password (bcrypt for storage + Argon2 for login credentials).
    /// Get a user's roles/scopes from storage, returning `["user"]` as fallback.
    pub async fn get_user_roles(&self, user_id: &str) -> Result<Vec<String>> {
        let user_key = format!("user:{}", user_id);
        if let Ok(Some(data)) = self.storage.get_kv(&user_key).await
            && let Ok(v) = serde_json::from_slice::<serde_json::Value>(&data)
            && let Some(arr) = v.get("roles").and_then(|r| r.as_array())
        {
            let roles: Vec<String> = arr
                .iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect();
            if !roles.is_empty() {
                return Ok(roles);
            }
        }
        Ok(vec!["user".to_string()])
    }

    /// Verify username/password credentials in a timing-safe manner.
    ///
    /// Returns `Ok(None)` when the credentials are invalid — a dummy Argon2
    /// verification is always executed when the username is not found, so
    /// callers cannot distinguish missing users from wrong passwords via timing.
    /// Returns `Ok(Some(result))` on success.
    pub async fn verify_login_credentials(
        &self,
        username: &str,
        password: &str,
    ) -> Result<Option<CredentialCheckResult>> {
        use crate::utils::password::verify_password;

        if username.is_empty() || password.is_empty() {
            return Ok(None);
        }

        let user_key = format!("user:credentials:{username}");
        let stored_bytes = match self.storage.get_kv(&user_key).await? {
            Some(bytes) => bytes,
            None => {
                // Constant-time: always do real work even for missing users.
                let _ = verify_password(
                    password,
                    "$argon2id$v=19$m=19456,t=2,p=1$dGVzdHNhbHRmb3J0aW1pbmc$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                );
                return Ok(None);
            }
        };

        let user_data_str = String::from_utf8(stored_bytes)
            .map_err(|e| AuthError::internal(format!("Failed to parse user data: {e}")))?;
        let user_data: serde_json::Value = serde_json::from_str(&user_data_str)
            .map_err(|e| AuthError::internal(format!("Failed to parse user JSON: {e}")))?;

        let password_hash = user_data["password_hash"].as_str().ok_or_else(|| {
            AuthError::internal("Missing password hash in user record".to_string())
        })?;

        if !verify_password(password, password_hash).unwrap_or(false) {
            return Ok(None);
        }

        let user_id = user_data["user_id"]
            .as_str()
            .ok_or_else(|| AuthError::internal("Missing user_id in user record".to_string()))?
            .to_string();

        // Check whether the account has been deactivated.
        let canonical_key = format!("user:{}", user_id);
        if let Ok(Some(canonical_bytes)) = self.storage.get_kv(&canonical_key).await
            && let Ok(canonical_str) = String::from_utf8(canonical_bytes)
            && let Ok(canonical_data) = serde_json::from_str::<serde_json::Value>(&canonical_str)
            && !canonical_data["active"].as_bool().unwrap_or(true)
        {
            return Ok(None);
        }

        let mfa_enabled = matches!(
            self.storage
                .get_kv(&format!("mfa_enabled:{}", user_id))
                .await,
            Ok(Some(_))
        );

        Ok(Some(CredentialCheckResult {
            user_id,
            mfa_enabled,
        }))
    }

    pub async fn update_user_password(&self, username: &str, new_password: &str) -> Result<()> {
        debug!("Updating password for user: {}", username);

        crate::utils::validation::validate_password(new_password)
            .map_err(|e| AuthError::validation(format!("Password validation failed: {e}")))?;

        let username_key = format!("user:username:{}", username);
        let user_id_data = self
            .storage
            .get_kv(&username_key)
            .await?
            .ok_or_else(|| AuthError::validation("User not found".to_string()))?;
        let user_id = String::from_utf8(user_id_data)
            .map_err(|e| AuthError::crypto(format!("Invalid user ID format: {}", e)))?;

        let user_key = format!("user:{}", user_id);
        let user_bytes = self
            .storage
            .get_kv(&user_key)
            .await?
            .ok_or_else(|| AuthError::validation("User not found".to_string()))?;
        let mut user_data: serde_json::Value = serde_json::from_slice(&user_bytes)
            .map_err(|e| AuthError::crypto(format!("Failed to parse user data: {}", e)))?;

        let password_hash = bcrypt::hash(new_password, bcrypt::DEFAULT_COST)
            .map_err(|e| AuthError::crypto(format!("Failed to hash password: {}", e)))?;
        user_data["password_hash"] = serde_json::json!(password_hash);
        user_data["updated_at"] = serde_json::json!(chrono::Utc::now().to_rfc3339());
        self.storage
            .store_kv(&user_key, user_data.to_string().as_bytes(), None)
            .await?;

        // Update Argon2 credentials record used by the login endpoint.
        let creds_key = format!("user:credentials:{}", username);
        let creds_hash = crate::utils::password::hash_password(new_password)
            .map_err(|e| AuthError::crypto(format!("Failed to hash login credentials: {e}")))?;
        let creds_bytes =
            self.storage.get_kv(&creds_key).await?.ok_or_else(|| {
                AuthError::internal("Login credentials record not found".to_string())
            })?;
        let mut creds: serde_json::Value = serde_json::from_slice(&creds_bytes)
            .map_err(|e| AuthError::internal(format!("Failed to parse credentials record: {e}")))?;
        creds["password_hash"] = serde_json::json!(creds_hash);
        creds["updated_at"] = serde_json::json!(chrono::Utc::now().to_rfc3339());
        self.storage
            .store_kv(&creds_key, creds.to_string().as_bytes(), None)
            .await?;

        info!("Password updated for user: {}", username);
        Ok(())
    }
}
