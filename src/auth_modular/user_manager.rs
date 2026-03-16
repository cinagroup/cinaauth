//! User management module

use crate::errors::{AuthError, Result};
use crate::storage::AuthStorage;
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, info};

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
}


