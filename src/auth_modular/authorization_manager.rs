//! Authorization manager: wraps `PermissionChecker` and exposes all role/permission operations.

use crate::errors::{AuthError, Result};
use crate::permissions::{Permission, PermissionChecker, Role};
use crate::storage::AuthStorage;
use crate::tokens::AuthToken;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info};

/// Authorization manager that owns the `PermissionChecker` and exposes
/// all role and permission operations for delegation from `AuthFramework`.
pub struct AuthorizationManager {
    checker: Arc<RwLock<PermissionChecker>>,
    storage: Arc<dyn AuthStorage>,
}

impl AuthorizationManager {
    /// Create a new authorization manager.
    pub fn new(checker: Arc<RwLock<PermissionChecker>>, storage: Arc<dyn AuthStorage>) -> Self {
        Self { checker, storage }
    }

    /// Initialize the default roles in the permission checker (called during framework init).
    pub async fn create_default_roles(&self) {
        let mut c = self.checker.write().await;
        c.create_default_roles();
    }

    /// Grant a direct permission to a user.
    pub async fn grant_permission(
        &self,
        user_id: &str,
        action: &str,
        resource: &str,
    ) -> Result<()> {
        debug!(
            "Granting permission '{}:{}' to user '{}'",
            action, resource, user_id
        );
        let mut c = self.checker.write().await;
        let permission = Permission::new(action, resource);
        c.add_user_permission(user_id, permission);
        info!(
            "Permission '{}:{}' granted to user '{}'",
            action, resource, user_id
        );
        Ok(())
    }

    /// Revoke a direct permission from a user.
    pub async fn revoke_permission(
        &self,
        user_id: &str,
        action: &str,
        resource: &str,
    ) -> Result<()> {
        debug!(
            "Revoking permission '{}:{}' from user '{}'",
            action, resource, user_id
        );
        if user_id.is_empty() || action.is_empty() || resource.is_empty() {
            return Err(AuthError::validation(
                "User ID, action, and resource cannot be empty",
            ));
        }
        let mut c = self.checker.write().await;
        let permission = Permission::new(action, resource);
        c.remove_user_permission(user_id, &permission);
        info!(
            "Permission '{}:{}' revoked from user '{}'",
            action, resource, user_id
        );
        Ok(())
    }

    /// Create (register) a new role.
    pub async fn create_role(&self, role: Role) -> Result<()> {
        debug!("Creating role '{}'", role.name);
        if role.name.is_empty() {
            return Err(AuthError::validation("Role name cannot be empty"));
        }
        let mut c = self.checker.write().await;
        c.add_role(role.clone());
        info!("Role '{}' created", role.name);
        Ok(())
    }

    /// Assign a role to a user.
    pub async fn assign_role(&self, user_id: &str, role_name: &str) -> Result<()> {
        debug!("Assigning role '{}' to user '{}'", role_name, user_id);
        if user_id.is_empty() {
            return Err(AuthError::validation("User ID cannot be empty"));
        }
        if role_name.is_empty() {
            return Err(AuthError::validation("Role name cannot be empty"));
        }
        let mut c = self.checker.write().await;
        c.assign_role_to_user(user_id, role_name)?;
        info!("Role '{}' assigned to user '{}'", role_name, user_id);
        Ok(())
    }

    /// Remove a role from a user.
    pub async fn remove_role(&self, user_id: &str, role_name: &str) -> Result<()> {
        debug!("Removing role '{}' from user '{}'", role_name, user_id);
        if user_id.is_empty() || role_name.is_empty() {
            return Err(AuthError::validation(
                "User ID and role name cannot be empty",
            ));
        }
        let mut c = self.checker.write().await;
        c.remove_user_role(user_id, role_name);
        info!("Role '{}' removed from user '{}'", role_name, user_id);
        Ok(())
    }

    /// Set role inheritance (`child_role` inherits all permissions from `parent_role`).
    pub async fn set_role_inheritance(&self, child_role: &str, parent_role: &str) -> Result<()> {
        debug!(
            "Setting inheritance: '{}' inherits from '{}'",
            child_role, parent_role
        );
        if child_role.is_empty() || parent_role.is_empty() {
            return Err(AuthError::validation("Role names cannot be empty"));
        }
        let mut c = self.checker.write().await;
        c.set_role_inheritance(child_role, parent_role)?;
        info!(
            "Role inheritance set: '{}' inherits from '{}'",
            child_role, parent_role
        );
        Ok(())
    }

    /// Check if a token has a specific direct permission.
    ///
    /// Does **not** validate the token itself — the caller must validate
    /// the token's signature and expiry before calling this method.
    pub async fn check_token_permission(
        &self,
        token: &AuthToken,
        action: &str,
        resource: &str,
    ) -> Result<bool> {
        let permission = Permission::new(action, resource);
        let mut c = self.checker.write().await;
        c.check_token_permission(token, &permission)
    }

    /// Check if a user (by ID) has a specific permission (ABAC/RBAC evaluation).
    pub async fn check_user_permission(&self, user_id: &str, action: &str, resource: &str) -> bool {
        let permission = Permission::new(action, resource);
        let mut c = self.checker.write().await;
        c.check_permission(user_id, &permission).unwrap_or(false)
    }

    /// Check whether a user currently holds a named role.
    pub async fn user_has_role(&self, user_id: &str, role_name: &str) -> Result<bool> {
        debug!("Checking if user '{}' has role '{}'", user_id, role_name);
        if user_id.is_empty() || role_name.is_empty() {
            return Err(AuthError::validation(
                "User ID and role name cannot be empty",
            ));
        }
        let c = self.checker.read().await;
        let has_role = c.user_has_role(user_id, role_name);
        debug!("User '{}' has role '{}': {}", user_id, role_name, has_role);
        Ok(has_role)
    }

    /// Get all effective permissions for a user (direct + role-inherited).
    pub async fn get_effective_permissions(&self, user_id: &str) -> Result<Vec<String>> {
        debug!("Getting effective permissions for user '{}'", user_id);
        if user_id.is_empty() {
            return Err(AuthError::validation("User ID cannot be empty"));
        }
        let c = self.checker.read().await;
        let permissions = c.get_effective_permissions(user_id);
        debug!(
            "User '{}' has {} effective permissions",
            user_id,
            permissions.len()
        );
        Ok(permissions)
    }

    /// Get raw permission metrics: `(role_count, user_count, total_direct_permission_count)`.
    pub async fn get_metrics(&self) -> (usize, usize, usize) {
        let c = self.checker.read().await;
        (
            c.role_count(),
            c.user_count(),
            c.total_direct_permission_count(),
        )
    }

    // ── ABAC / Storage-backed operations ────────────────────────────────────

    /// Create or overwrite an ABAC policy record in storage.
    pub async fn create_abac_policy(&self, name: &str, description: &str) -> Result<()> {
        debug!("Creating ABAC policy '{}'", name);
        if name.is_empty() {
            return Err(AuthError::validation("Policy name cannot be empty"));
        }
        if description.is_empty() {
            return Err(AuthError::validation("Policy description cannot be empty"));
        }
        let policy_data = serde_json::json!({
            "name": name,
            "description": description,
            "created_at": chrono::Utc::now(),
            "rules": [],
            "active": true
        });
        let key = format!("abac:policy:{}", name);
        let policy_json = serde_json::to_vec(&policy_data)
            .map_err(|e| AuthError::validation(format!("Failed to serialize policy: {}", e)))?;
        self.storage.store_kv(&key, &policy_json, None).await?;
        info!("ABAC policy '{}' created", name);
        Ok(())
    }

    /// Store a user attribute used in ABAC policy evaluation.
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
        if user_id.is_empty() || attribute.is_empty() {
            return Err(AuthError::validation(
                "User ID and attribute name cannot be empty",
            ));
        }
        let attrs_key = format!("user:{}:attributes", user_id);
        let mut user_attrs = if let Some(bytes) = self.storage.get_kv(&attrs_key).await? {
            serde_json::from_slice::<std::collections::HashMap<String, String>>(&bytes)
                .unwrap_or_default()
        } else {
            std::collections::HashMap::new()
        };
        user_attrs.insert(attribute.to_string(), value.to_string());
        let attrs_json = serde_json::to_vec(&user_attrs)
            .map_err(|e| AuthError::validation(format!("Failed to serialize attributes: {}", e)))?;
        self.storage.store_kv(&attrs_key, &attrs_json, None).await?;
        info!("Attribute '{}' mapped for user '{}'", attribute, user_id);
        Ok(())
    }

    /// Retrieve a single user attribute.
    pub async fn get_user_attribute(
        &self,
        user_id: &str,
        attribute: &str,
    ) -> Result<Option<String>> {
        debug!("Getting attribute '{}' for user '{}'", attribute, user_id);
        if user_id.is_empty() || attribute.is_empty() {
            return Err(AuthError::validation(
                "User ID and attribute name cannot be empty",
            ));
        }
        let attrs_key = format!("user:{}:attributes", user_id);
        if let Some(bytes) = self.storage.get_kv(&attrs_key).await? {
            let user_attrs: std::collections::HashMap<String, String> =
                serde_json::from_slice(&bytes).unwrap_or_default();
            Ok(user_attrs.get(attribute).cloned())
        } else {
            Ok(None)
        }
    }

    /// Evaluate a permission request with full ABAC context.
    pub async fn check_dynamic_permission(
        &self,
        user_id: &str,
        action: &str,
        resource: &str,
        context: std::collections::HashMap<String, String>,
    ) -> Result<bool> {
        debug!(
            "Checking dynamic permission for user '{}': {}:{} with context: {:?}",
            user_id, action, resource, context
        );
        if user_id.is_empty() || action.is_empty() || resource.is_empty() {
            return Err(AuthError::validation(
                "User ID, action, and resource cannot be empty",
            ));
        }
        // Load user attributes for ABAC evaluation.
        let user_attrs_key = format!("user:{}:attributes", user_id);
        let user_attrs = if let Some(bytes) = self.storage.get_kv(&user_attrs_key).await? {
            serde_json::from_slice::<std::collections::HashMap<String, String>>(&bytes)
                .unwrap_or_default()
        } else {
            std::collections::HashMap::new()
        };
        // Start with RBAC check.
        let mut permission_granted = self.check_user_permission(user_id, action, resource).await;
        // Apply context-based rules only when the base permission is granted.
        if permission_granted {
            // Time-based access control.
            if let Some(time_restriction) = context.get("time_restriction") {
                let current_hour = chrono::Utc::now()
                    .format("%H")
                    .to_string()
                    .parse::<u32>()
                    .unwrap_or(0);
                if time_restriction == "business_hours" && !(9..=17).contains(&current_hour) {
                    permission_granted = false;
                    debug!("Access denied: outside business hours");
                }
            }
            // Location-based access control.
            if let Some(required_location) = context.get("required_location")
                && let Some(user_location) = user_attrs.get("location")
                && user_location != required_location
            {
                permission_granted = false;
                debug!(
                    "Access denied: user location {} != required {}",
                    user_location, required_location
                );
            }
            // Clearance-level access control.
            if let Some(required_clearance) = context.get("required_clearance")
                && let Some(user_clearance) = user_attrs.get("clearance_level")
            {
                let required_level = required_clearance.parse::<u32>().unwrap_or(0);
                let user_level = user_clearance.parse::<u32>().unwrap_or(0);
                if user_level < required_level {
                    permission_granted = false;
                    debug!(
                        "Access denied: user clearance {} < required {}",
                        user_level, required_level
                    );
                }
            }
        }
        debug!(
            "Dynamic permission check result for user '{}': {}",
            user_id, permission_granted
        );
        Ok(permission_granted)
    }

    /// Register a resource in the permission system.
    pub async fn create_resource(&self, resource: &str) -> Result<()> {
        debug!("Creating resource '{}'", resource);
        if resource.is_empty() {
            return Err(AuthError::validation("Resource name cannot be empty"));
        }
        let resource_data = serde_json::json!({
            "name": resource,
            "created_at": chrono::Utc::now(),
            "active": true
        });
        let key = format!("resource:{}", resource);
        let resource_json = serde_json::to_vec(&resource_data)
            .map_err(|e| AuthError::validation(format!("Failed to serialize resource: {}", e)))?;
        self.storage.store_kv(&key, &resource_json, None).await?;
        info!("Resource '{}' created", resource);
        Ok(())
    }

    /// Delegate a permission from one user to another for a limited duration.
    pub async fn delegate_permission(
        &self,
        delegator_id: &str,
        delegatee_id: &str,
        action: &str,
        resource: &str,
        duration: std::time::Duration,
    ) -> Result<()> {
        debug!(
            "Delegating permission '{}:{}' from '{}' to '{}' for {:?}",
            action, resource, delegator_id, delegatee_id, duration
        );
        if delegator_id.is_empty()
            || delegatee_id.is_empty()
            || action.is_empty()
            || resource.is_empty()
        {
            return Err(AuthError::validation(
                "All delegation parameters cannot be empty",
            ));
        }
        if !self
            .check_user_permission(delegator_id, action, resource)
            .await
        {
            return Err(AuthError::authorization(
                "Delegator does not have the permission to delegate",
            ));
        }
        let delegation_id = uuid::Uuid::new_v4().to_string();
        let expires_secs = std::time::SystemTime::now()
            .checked_add(duration)
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let delegation_data = serde_json::json!({
            "id": delegation_id,
            "delegator_id": delegator_id,
            "delegatee_id": delegatee_id,
            "action": action,
            "resource": resource,
            "created_at": chrono::Utc::now(),
            "expires_at": expires_secs
        });
        let key = format!("delegation:{}", delegation_id);
        let delegation_json = serde_json::to_vec(&delegation_data)
            .map_err(|e| AuthError::validation(format!("Failed to serialize delegation: {}", e)))?;
        self.storage
            .store_kv(&key, &delegation_json, Some(duration))
            .await?;
        // Maintain a per-delegatee index.
        let index_key = format!("delegations_index:{}", delegatee_id);
        let mut ids: Vec<String> = match self.storage.get_kv(&index_key).await? {
            Some(bytes) => serde_json::from_slice(&bytes).unwrap_or_default(),
            None => vec![],
        };
        ids.push(delegation_id.clone());
        let ids_json = serde_json::to_vec(&ids).map_err(|e| {
            AuthError::validation(format!("Failed to serialize delegation index: {}", e))
        })?;
        self.storage.store_kv(&index_key, &ids_json, None).await?;
        info!(
            "Permission '{}:{}' delegated from '{}' to '{}' for {:?}",
            action, resource, delegator_id, delegatee_id, duration
        );
        Ok(())
    }

    /// List currently active permission delegations for a user (as delegatee).
    pub async fn get_active_delegations(&self, user_id: &str) -> Result<Vec<String>> {
        debug!("Getting active delegations for user '{}'", user_id);
        if user_id.is_empty() {
            return Err(AuthError::validation("User ID cannot be empty"));
        }
        let index_key = format!("delegations_index:{}", user_id);
        let delegation_ids: Vec<String> = match self.storage.get_kv(&index_key).await? {
            Some(bytes) => serde_json::from_slice(&bytes).unwrap_or_default(),
            None => return Ok(vec![]),
        };
        let now_secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let mut result = Vec::new();
        let mut active_ids = Vec::new();
        for id in &delegation_ids {
            let key = format!("delegation:{}", id);
            if let Some(bytes) = self.storage.get_kv(&key).await?
                && let Ok(data) = serde_json::from_slice::<serde_json::Value>(&bytes)
            {
                let expires_at = data["expires_at"].as_u64().unwrap_or(0);
                if expires_at > now_secs {
                    let action = data["action"].as_str().unwrap_or("unknown");
                    let resource = data["resource"].as_str().unwrap_or("unknown");
                    let delegator = data["delegator_id"].as_str().unwrap_or("unknown");
                    result.push(format!(
                        "{}:{}:delegated_from:{}",
                        action, resource, delegator
                    ));
                    active_ids.push(id.clone());
                }
            }
        }
        // Prune stale entries from the index.
        if active_ids.len() != delegation_ids.len()
            && let Ok(pruned) = serde_json::to_vec(&active_ids)
        {
            let _ = self.storage.store_kv(&index_key, &pruned, None).await;
        }
        debug!(
            "Found {} active delegations for user '{}'",
            result.len(),
            user_id
        );
        Ok(result)
    }

    /// Assemble aggregated permission metrics.
    ///
    /// `active_sessions` and `permission_checks_last_hour` are provided by the
    /// caller so that the manager stays independent from the session and audit
    /// subsystems.
    pub async fn get_permission_metrics(
        &self,
        active_sessions: u64,
        permission_checks_last_hour: u64,
    ) -> Result<std::collections::HashMap<String, u64>> {
        let (total_roles, total_users, total_permissions) = self.get_metrics().await;
        let mut metrics = std::collections::HashMap::new();
        metrics.insert(
            "total_users_with_permissions".to_string(),
            total_users as u64,
        );
        metrics.insert("total_roles".to_string(), total_roles as u64);
        metrics.insert("total_permissions".to_string(), total_permissions as u64);
        metrics.insert("active_sessions".to_string(), active_sessions);
        metrics.insert(
            "permission_checks_last_hour".to_string(),
            permission_checks_last_hour,
        );
        debug!("Retrieved {} permission metrics", metrics.len());
        Ok(metrics)
    }
}
