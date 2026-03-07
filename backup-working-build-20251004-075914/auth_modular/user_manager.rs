//! User management module

use crate::errors::{AuthError, Result};
use crate::storage::AuthStorage;
use serde_json;
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, info};
use uuid;

/// User information structure
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

/// User manager for handling user operations
pub struct UserManager {
    storage: Arc<dyn AuthStorage>,
}

impl UserManager {
    /// Create a new user manager
    pub fn new(storage: Arc<dyn AuthStorage>) -> Self {
        Self { storage }
    }

    /// Create a new user with validation and duplicate checking
    pub async fn create_user(
        &self,
        username: &str,
        email: &str,
        password: &str,
    ) -> Result<String> {
        debug!("Creating new user: '{}'", username);

        // Check if username already exists
        let username_key = format!("user:credentials:{}", username);
        if self.storage.get_kv(&username_key).await?.is_some() {
            return Err(AuthError::validation("Username already exists"));
        }

        // Check if email already exists
        let email_key = format!("user:email:{}", email);
        if self.storage.get_kv(&email_key).await?.is_some() {
            return Err(AuthError::validation("Email address already registered"));
        }

        // Generate user ID
        let user_id = format!(
            "user_{}",
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
        );
        let created_at = chrono::Utc::now().to_rfc3339();

        // Hash the password using bcrypt
        let password_hash = crate::utils::password::hash_password(password)
            .map_err(|e| AuthError::internal(format!("Password hashing failed: {}", e)))?;

        // Create user data
        let user_data = serde_json::json!({
            "user_id": user_id,
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "created_at": created_at,
        });

        // Store the main user record
        let user_data_bytes = user_data.to_string().into_bytes();  
        if let Err(e) = self.storage.store_kv(&username_key, &user_data_bytes, None).await {
            return Err(AuthError::internal(format!("Failed to store user: {}", e)));
        }

        // Store email mapping for duplicate checking
        let email_mapping = user_id.as_bytes();
        if let Err(e) = self.storage.store_kv(&email_key, email_mapping, None).await {
            // Rollback user creation
            let _ = self.storage.delete_kv(&username_key).await;
            return Err(AuthError::internal(format!("Failed to store email mapping: {}", e)));
        }

        info!("New user created: {} ({})", username, user_id);
        Ok(user_id)
    }

    /// Check if username exists
    pub async fn username_exists(&self, username: &str) -> Result<bool> {
        let username_key = format!("user:credentials:{}", username);
        Ok(self.storage.get_kv(&username_key).await?.is_some())
    }

    /// Check if email exists
    pub async fn email_exists(&self, email: &str) -> Result<bool> {
        let email_key = format!("user:email:{}", email);
        Ok(self.storage.get_kv(&email_key).await?.is_some())
    }

    /// Create API key for a user with enhanced metadata
    pub async fn create_api_key_enhanced(
        &self,
        user_id: &str,
        name: &str,
        scopes: Vec<String>,
        permissions: Vec<String>,
        expires_in_days: Option<u64>,
    ) -> Result<String> {
        debug!("Creating API key '{}' for user '{}'", name, user_id);

        // Generate a secure API key using UUID approach like TUF-Laptop version
        let api_key = format!("ak_{}", uuid::Uuid::new_v4().to_string().replace("-", ""));

        // Calculate expiration
        let created_at = chrono::Utc::now();
        let expires_at = expires_in_days
            .map(|days| created_at + chrono::Duration::days(days as i64));

        // Set default scopes and permissions if not provided
        let final_scopes = if scopes.is_empty() {
            vec!["api_access".to_string()]
        } else {
            scopes
        };

        let final_permissions = if permissions.is_empty() {
            vec!["read".to_string()]
        } else {
            permissions
        };

        // Store API key metadata
        let key_data = serde_json::json!({
            "user_id": user_id,
            "name": name,
            "scopes": final_scopes,
            "permissions": final_permissions,
            "created_at": created_at.to_rfc3339(),
            "expires_at": expires_at.map(|dt| dt.to_rfc3339()),
            "last_used": Option::<String>::None,
            "use_count": 0,
        });

        let storage_key = format!("api_key:{}", api_key);
        self.storage
            .store_kv(&storage_key, key_data.to_string().as_bytes(), None)
            .await?;

        // Add key to user's index
        let index_key = format!("user_api_keys:{}", user_id);
        let mut key_ids = match self.storage.get_kv(&index_key).await? {
            Some(data) => serde_json::from_slice::<Vec<String>>(&data).unwrap_or_default(),
            None => Vec::new(),
        };

        key_ids.push(api_key.clone());

        if let Ok(index_data) = serde_json::to_vec(&key_ids) {
            self.storage.store_kv(&index_key, &index_data, None).await?;
        }

        info!("API key '{}' created for user '{}'", name, user_id);
        Ok(api_key)
    }

    /// Create API key for a user (legacy method for backward compatibility)
    pub async fn create_api_key(
        &self,
        user_id: &str,
        expires_in: Option<std::time::Duration>,
    ) -> Result<String> {
        let expires_in_days = expires_in
            .map(|d| d.as_secs() / (24 * 60 * 60));
        
        self.create_api_key_enhanced(
            user_id,
            "Default API Key",
            vec![],
            vec![],
            expires_in_days,
        ).await
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

    /// List API keys for a user
    pub async fn list_api_keys(&self, user_id: &str) -> Result<Vec<serde_json::Value>> {
        debug!("Listing API keys for user '{}'", user_id);

        // Get user's API key IDs from index
        let index_key = format!("user_api_keys:{}", user_id);
        let key_ids = match self.storage.get_kv(&index_key).await? {
            Some(data) => serde_json::from_slice::<Vec<String>>(&data).unwrap_or_default(),
            None => Vec::new(),
        };

        // Fetch details for each key
        let mut keys = Vec::new();
        for key_id in key_ids {
            let storage_key = format!("api_key:{}", key_id);
            if let Ok(Some(data)) = self.storage.get_kv(&storage_key).await {
                if let Ok(key_data) = serde_json::from_slice::<serde_json::Value>(&data) {
                    // Only show first 12 characters of key for security
                    let key_prefix = if key_id.len() > 12 {
                        format!("{}...", &key_id[..12])
                    } else {
                        key_id.clone()
                    };

                    let mut display_data = key_data.clone();
                    display_data["key_prefix"] = serde_json::Value::String(key_prefix);
                    keys.push(display_data);
                }
            }
        }

        debug!("Found {} API keys for user '{}'", keys.len(), user_id);
        Ok(keys)
    }

    /// Revoke API key with user validation
    pub async fn revoke_api_key_for_user(&self, api_key: &str, user_id: &str) -> Result<()> {
        debug!("Revoking API key for user '{}'", user_id);

        let storage_key = format!("api_key:{}", api_key);
        
        // First verify the key belongs to this user
        match self.storage.get_kv(&storage_key).await? {
            Some(data) => {
                let key_data: serde_json::Value = serde_json::from_slice(&data)
                    .map_err(|_| AuthError::token("Invalid key data"))?;

                let key_user_id = key_data["user_id"].as_str().unwrap_or("");
                if key_user_id != user_id {
                    return Err(AuthError::token("API key does not belong to user"));
                }

                // Delete the key
                self.storage.delete_kv(&storage_key).await?;

                // Remove key from user's index
                let index_key = format!("user_api_keys:{}", user_id);
                if let Ok(Some(data)) = self.storage.get_kv(&index_key).await {
                    if let Ok(mut key_ids) = serde_json::from_slice::<Vec<String>>(&data) {
                        key_ids.retain(|id| id != api_key);
                        if let Ok(index_data) = serde_json::to_vec(&key_ids) {
                            self.storage.store_kv(&index_key, &index_data, None).await?;
                        }
                    }
                }

                info!("API key revoked for user '{}'", user_id);
                Ok(())
            }
            None => Err(AuthError::token("API key not found")),
        }
    }

    /// Revoke API key (legacy method for backward compatibility)
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

    /// Validate password strength using security policy
    pub async fn validate_password_strength(&self, password: &str) -> Result<bool> {
        debug!("Validating password strength");

        let strength = crate::utils::password::check_password_strength(password);

        // Consider Medium, Strong, and VeryStrong passwords as valid
        let is_valid = !matches!(
            strength.level,
            crate::utils::password::PasswordStrengthLevel::Weak
        );

        if !is_valid {
            debug!(
                "Password validation failed: {}",
                strength.feedback.join(", ")
            );
        }

        Ok(is_valid)
    }

    /// Validate user input for security
    pub async fn validate_user_input(&self, input: &str) -> Result<bool> {
        debug!("Validating user input");

        // Comprehensive security validation
        let is_valid = !input.contains('<')
            && !input.contains('>')
            && !input.contains("script")
            && !input.contains("javascript:")
            && !input.contains("data:")
            && !input.contains("file:")
            && !input.contains("${")  // Template injection
            && !input.contains("{{")  // Template injection
            && !input.contains("'}") && !input.contains("'}")  // Template injection
            && !input.contains("'; DROP") && !input.contains("' DROP") // SQL injection
            && !input.contains("; DROP") && !input.contains(";DROP") // SQL injection
            && !input.contains("--") // SQL comments
            && !input.contains("../") // Path traversal
            && !input.contains("..\\") // Path traversal (Windows)
            && !input.contains('\0') // Null byte injection
            && !input.contains("%00") // URL encoded null byte
            && !input.contains("jndi:") // LDAP injection
            && !input.contains("%3C") && !input.contains("%3E") // URL encoded < >
            && input.len() <= 1000;

        Ok(is_valid)
    }

    /// Map user attribute
    pub async fn map_user_attribute(
        &self,
        user_id: &str,
        attribute: &str,
        value: &str,
    ) -> Result<()> {
        debug!(
            "Mapping attribute '{}' = '{}' for user '{}'",
            attribute, value, user_id
        );

        let key = format!("user:{}:attribute:{}", user_id, attribute);
        self.storage.store_kv(&key, value.as_bytes(), None).await?;

        info!("Attribute '{}' mapped for user '{}'", attribute, user_id);
        Ok(())
    }

    /// Get user attribute
    pub async fn get_user_attribute(
        &self,
        user_id: &str,
        attribute: &str,
    ) -> Result<Option<String>> {
        debug!("Getting attribute '{}' for user '{}'", attribute, user_id);

        let key = format!("user:{}:attribute:{}", user_id, attribute);
        if let Some(value_data) = self.storage.get_kv(&key).await? {
            Ok(Some(String::from_utf8(value_data).map_err(|e| {
                AuthError::internal(format!("Failed to parse attribute value: {}", e))
            })?))
        } else {
            // Return some default values for common attributes for demo purposes
            match attribute {
                "department" => Ok(Some("engineering".to_string())),
                "clearance_level" => Ok(Some("3".to_string())),
                "location" => Ok(Some("office".to_string())),
                _ => Ok(None),
            }
        }
    }

    /// Get user information by ID
    pub async fn get_user_info(&self, user_id: &str) -> Result<UserInfo> {
        debug!("Getting user info for '{}'", user_id);

        // For now, return a basic user info structure
        // In a real implementation, this would query a user database
        Ok(UserInfo {
            id: user_id.to_string(),
            username: format!("user_{}", user_id),
            email: None,
            name: None,
            roles: vec!["user".to_string()],
            active: true,
            attributes: HashMap::new(),
        })
    }

    /// Check if user exists
    pub async fn user_exists(&self, user_id: &str) -> Result<bool> {
        debug!("Checking if user '{}' exists", user_id);

        // For now, assume all non-empty user IDs exist
        // In a real implementation, this would check a user database
        Ok(!user_id.is_empty())
    }
}


