//! Grouped operation facades over [`AuthFramework`].
//!
//! Each `*Operations` struct is a lightweight view (holds only a lifetime-bound
//! reference to the framework) that exposes a focused subset of the full API.
//! They are created by the corresponding accessor on `AuthFramework` (e.g. [`users()`]).
//!
//! [`users()`]: crate::auth::AuthFramework::users

use crate::auth::{AuthFramework, AuthStats, UserInfo};
use crate::audit::SecurityAuditStats;
use crate::errors::Result;
use crate::methods::MfaChallenge;
use crate::permissions::Role;
use crate::storage::SessionData;
use crate::tokens::AuthToken;
use std::sync::Arc;
use std::time::Duration;

// ──────────────────────────────────────────────────────────────────────────────
// User operations
// ──────────────────────────────────────────────────────────────────────────────

/// Focused user-management operations exposed from [`AuthFramework::users`].
pub struct UserOperations<'a> {
    pub(crate) framework: &'a AuthFramework,
}

impl UserOperations<'_> {
    /// Register a new user.
    pub async fn register(&self, username: &str, email: &str, password: &str) -> Result<String> {
        self.framework
            .register_user(username, email, password)
            .await
    }

    /// Check whether a username exists.
    pub async fn exists_by_username(&self, username: &str) -> Result<bool> {
        self.framework.username_exists(username).await
    }

    /// Check whether an email exists.
    pub async fn exists_by_email(&self, email: &str) -> Result<bool> {
        self.framework.email_exists(email).await
    }

    /// Fetch a user record by username.
    pub async fn get_by_username(
        &self,
        username: &str,
    ) -> Result<std::collections::HashMap<String, serde_json::Value>> {
        self.framework.get_user_by_username(username).await
    }

    /// Fetch an application-level user profile.
    pub async fn profile(&self, user_id: &str) -> Result<crate::providers::ProviderProfile> {
        self.framework.get_user_profile(user_id).await
    }

    /// Update a user's password.
    pub async fn update_password(&self, username: &str, new_password: &str) -> Result<()> {
        self.framework
            .update_user_password(username, new_password)
            .await
    }

    /// Update the roles assigned to a user.
    pub async fn update_roles(&self, user_id: &str, roles: &[String]) -> Result<()> {
        self.framework.update_user_roles(user_id, roles).await
    }

    /// Enable or disable a user.
    pub async fn set_active(&self, user_id: &str, active: bool) -> Result<()> {
        self.framework.set_user_active(user_id, active).await
    }

    /// Verify a user's password.
    pub async fn verify_password(&self, user_id: &str, password: &str) -> Result<bool> {
        self.framework.verify_user_password(user_id, password).await
    }

    /// Resolve a username from a user ID.
    pub async fn username(&self, user_id: &str) -> Result<String> {
        self.framework.get_username_by_id(user_id).await
    }

    /// Delete a user by username.
    pub async fn delete(&self, username: &str) -> Result<()> {
        self.framework.delete_user(username).await
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Session operations
// ──────────────────────────────────────────────────────────────────────────────

/// Focused session-management operations exposed from [`AuthFramework::sessions`].
pub struct SessionOperations<'a> {
    pub(crate) framework: &'a AuthFramework,
}

impl SessionOperations<'_> {
    /// Create a new session.
    pub async fn create(
        &self,
        user_id: &str,
        expires_in: Duration,
        ip_address: Option<String>,
        user_agent: Option<String>,
    ) -> Result<String> {
        self.framework
            .create_session(user_id, expires_in, ip_address, user_agent)
            .await
    }

    /// Fetch a session by ID.
    pub async fn get(&self, session_id: &str) -> Result<Option<SessionData>> {
        self.framework.get_session(session_id).await
    }

    /// Delete a session by ID.
    pub async fn delete(&self, session_id: &str) -> Result<()> {
        self.framework.delete_session(session_id).await
    }

    /// List all sessions owned by a user.
    pub async fn list_for_user(&self, user_id: &str) -> Result<Vec<SessionData>> {
        self.framework.storage().list_user_sessions(user_id).await
    }

    /// Remove expired sessions and tokens.
    pub async fn cleanup_expired(&self) -> Result<()> {
        self.framework.cleanup_expired_data().await
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Token operations
// ──────────────────────────────────────────────────────────────────────────────

/// Focused token-management operations exposed from [`AuthFramework::tokens`].
pub struct TokenOperations<'a> {
    pub(crate) framework: &'a AuthFramework,
}

impl TokenOperations<'_> {
    /// Create a new authentication token.
    pub async fn create(
        &self,
        user_id: impl Into<String>,
        scopes: Vec<String>,
        method_name: impl Into<String>,
        lifetime: Option<Duration>,
    ) -> Result<AuthToken> {
        self.framework
            .create_auth_token(user_id, scopes, method_name, lifetime)
            .await
    }

    /// Validate an authentication token.
    pub async fn validate(&self, token: &AuthToken) -> Result<bool> {
        self.framework.validate_token(token).await
    }

    /// Refresh an authentication token.
    pub async fn refresh(&self, token: &AuthToken) -> Result<AuthToken> {
        self.framework.refresh_token(token).await
    }

    /// Revoke an authentication token.
    pub async fn revoke(&self, token: &AuthToken) -> Result<()> {
        self.framework.revoke_token(token).await
    }

    /// List all tokens belonging to a user.
    pub async fn list_for_user(&self, user_id: &str) -> Result<Vec<AuthToken>> {
        self.framework.list_user_tokens(user_id).await
    }

    /// Create an API key for a user.
    pub async fn create_api_key(
        &self,
        user_id: &str,
        expires_in: Option<Duration>,
    ) -> Result<String> {
        self.framework.create_api_key(user_id, expires_in).await
    }

    /// Validate an API key and return the associated user info.
    pub async fn validate_api_key(&self, api_key: &str) -> Result<UserInfo> {
        self.framework.validate_api_key(api_key).await
    }

    /// Revoke an API key.
    pub async fn revoke_api_key(&self, api_key: &str) -> Result<()> {
        self.framework.revoke_api_key(api_key).await
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Authorization operations
// ──────────────────────────────────────────────────────────────────────────────

/// Focused authorization operations exposed from [`AuthFramework::authorization`].
pub struct AuthorizationOperations<'a> {
    pub(crate) framework: &'a AuthFramework,
}

impl AuthorizationOperations<'_> {
    /// Check whether a token grants access to an action on a resource.
    pub async fn check(&self, token: &AuthToken, action: &str, resource: &str) -> Result<bool> {
        self.framework
            .check_permission(token, action, resource)
            .await
    }

    /// Grant a direct permission to a user.
    pub async fn grant(&self, user_id: &str, action: &str, resource: &str) -> Result<()> {
        self.framework
            .grant_permission(user_id, action, resource)
            .await
    }

    /// Revoke a direct permission from a user.
    pub async fn revoke(&self, user_id: &str, action: &str, resource: &str) -> Result<()> {
        self.framework
            .revoke_permission(user_id, action, resource)
            .await
    }

    /// Create a role.
    pub async fn create_role(&self, role: Role) -> Result<()> {
        self.framework.create_role(role).await
    }

    /// Assign a role to a user.
    pub async fn assign_role(&self, user_id: &str, role_name: &str) -> Result<()> {
        self.framework.assign_role(user_id, role_name).await
    }

    /// Remove a role from a user.
    pub async fn remove_role(&self, user_id: &str, role_name: &str) -> Result<()> {
        self.framework.remove_role(user_id, role_name).await
    }

    /// Check whether a user currently has a role.
    pub async fn has_role(&self, user_id: &str, role_name: &str) -> Result<bool> {
        self.framework.user_has_role(user_id, role_name).await
    }

    /// List effective permissions for a user.
    pub async fn effective_permissions(&self, user_id: &str) -> Result<Vec<String>> {
        self.framework.get_effective_permissions(user_id).await
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// MFA operations
// ──────────────────────────────────────────────────────────────────────────────

/// Focused multi-factor authentication operations exposed from [`AuthFramework::mfa`].
pub struct MfaOperations<'a> {
    pub(crate) framework: &'a AuthFramework,
}

impl MfaOperations<'_> {
    /// Complete a pending MFA challenge with the provided code.
    pub async fn complete(&self, challenge: MfaChallenge, code: &str) -> Result<AuthToken> {
        self.framework.complete_mfa(challenge, code).await
    }

    /// Complete a pending MFA challenge by its ID.
    pub async fn complete_by_id(&self, challenge_id: &str, code: &str) -> Result<AuthToken> {
        self.framework.complete_mfa_by_id(challenge_id, code).await
    }

    /// Initiate an SMS-based MFA challenge for a user.
    pub async fn initiate_sms(&self, user_id: &str) -> Result<String> {
        self.framework.initiate_sms_challenge(user_id).await
    }

    /// Verify an SMS challenge code.
    pub async fn verify_sms(&self, challenge_id: &str, code: &str) -> Result<bool> {
        self.framework.verify_sms_code(challenge_id, code).await
    }

    /// Initiate an email-based MFA challenge for a user.
    pub async fn initiate_email(&self, user_id: &str) -> Result<String> {
        self.framework.initiate_email_challenge(user_id).await
    }

    /// Register a phone number for SMS MFA.
    pub async fn register_phone(&self, user_id: &str, phone_number: &str) -> Result<()> {
        self.framework
            .register_phone_number(user_id, phone_number)
            .await
    }

    /// Register an email address for email MFA.
    pub async fn register_email(&self, user_id: &str, email: &str) -> Result<()> {
        self.framework.register_email(user_id, email).await
    }

    /// Generate a TOTP secret for a user.
    pub async fn generate_totp_secret(&self, user_id: &str) -> Result<String> {
        self.framework.generate_totp_secret(user_id).await
    }

    /// Generate a TOTP QR code provisioning URL.
    pub async fn generate_totp_qr_url(
        &self,
        user_id: &str,
        app_name: &str,
        secret: &str,
    ) -> Result<String> {
        self.framework
            .generate_totp_qr_code(user_id, app_name, secret)
            .await
    }

    /// Generate the current TOTP code for a secret.
    pub async fn generate_totp_code(&self, secret: &str) -> Result<String> {
        self.framework.generate_totp_code(secret).await
    }

    /// Verify a TOTP code for a user.
    pub async fn verify_totp(&self, user_id: &str, code: &str) -> Result<bool> {
        self.framework.verify_totp_code(user_id, code).await
    }

    /// Generate backup codes for a user.
    pub async fn generate_backup_codes(&self, user_id: &str, count: usize) -> Result<Vec<String>> {
        self.framework.generate_backup_codes(user_id, count).await
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Monitoring operations
// ──────────────────────────────────────────────────────────────────────────────

/// Focused monitoring and health operations exposed from [`AuthFramework::monitoring`].
pub struct MonitoringOperations<'a> {
    pub(crate) framework: &'a AuthFramework,
}

impl MonitoringOperations<'_> {
    /// Perform a comprehensive health check across all subsystems.
    pub async fn health_check(
        &self,
    ) -> Result<std::collections::HashMap<String, crate::monitoring::HealthCheckResult>> {
        self.framework.health_check().await
    }

    /// Get current performance metrics.
    pub async fn performance_metrics(&self) -> std::collections::HashMap<String, u64> {
        self.framework.get_performance_metrics().await
    }

    /// Get aggregated security metrics.
    pub async fn security_metrics(&self) -> Result<std::collections::HashMap<String, u64>> {
        self.framework.get_security_metrics().await
    }

    /// Export metrics in Prometheus text format.
    pub async fn prometheus_metrics(&self) -> String {
        self.framework.export_prometheus_metrics().await
    }

    /// Get authentication statistics.
    pub async fn stats(&self) -> Result<AuthStats> {
        self.framework.get_stats().await
    }

    /// Check whether an IP address is within the configured rate limit.
    pub async fn check_ip_rate_limit(&self, ip: &str) -> Result<bool> {
        self.framework.check_ip_rate_limit(ip).await
    }

    /// Access the underlying monitoring manager for advanced usage.
    pub fn manager(&self) -> Arc<crate::monitoring::MonitoringManager> {
        self.framework.get_monitoring_manager()
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Audit operations
// ──────────────────────────────────────────────────────────────────────────────

/// Focused audit log operations exposed from [`AuthFramework::audit`].
pub struct AuditOperations<'a> {
    pub(crate) framework: &'a AuthFramework,
}

impl AuditOperations<'_> {
    /// Query permission-related audit log entries with optional filters.
    ///
    /// All parameters are optional — passing all `None` returns unfiltered results.
    pub async fn permission_logs(
        &self,
        user_id: Option<&str>,
        action: Option<&str>,
        resource: Option<&str>,
        limit: Option<usize>,
    ) -> Result<Vec<String>> {
        self.framework
            .get_permission_audit_logs(user_id, action, resource, limit)
            .await
    }

    /// Get aggregated permission metrics (role counts, active sessions, checks per hour).
    pub async fn permission_metrics(&self) -> Result<std::collections::HashMap<String, u64>> {
        self.framework.get_permission_metrics().await
    }

    /// Get comprehensive security audit statistics.
    pub async fn security_stats(&self) -> Result<SecurityAuditStats> {
        self.framework.get_security_audit_stats().await
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin operations
// ──────────────────────────────────────────────────────────────────────────────

/// Focused advanced administration operations exposed from [`AuthFramework::admin`].
///
/// These operations go beyond the everyday [`AuthorizationOperations`] surface and cover
/// ABAC policy management, permission delegation, role inheritance, resource registration,
/// and attribute-based access control.
pub struct AdminOperations<'a> {
    pub(crate) framework: &'a AuthFramework,
}

impl AdminOperations<'_> {
    /// Define a parent–child role inheritance relationship.
    pub async fn set_role_inheritance(&self, child_role: &str, parent_role: &str) -> Result<()> {
        self.framework
            .set_role_inheritance(child_role, parent_role)
            .await
    }

    /// Create an ABAC policy.
    pub async fn create_abac_policy(&self, name: &str, description: &str) -> Result<()> {
        self.framework.create_abac_policy(name, description).await
    }

    /// Map a user attribute used in ABAC policy evaluation.
    pub async fn map_user_attribute(
        &self,
        user_id: &str,
        attribute: &str,
        value: &str,
    ) -> Result<()> {
        self.framework
            .map_user_attribute(user_id, attribute, value)
            .await
    }

    /// Get a user attribute value.
    pub async fn get_user_attribute(
        &self,
        user_id: &str,
        attribute: &str,
    ) -> Result<Option<String>> {
        self.framework.get_user_attribute(user_id, attribute).await
    }

    /// Check a permission using dynamic ABAC context evaluation.
    pub async fn check_dynamic_permission(
        &self,
        user_id: &str,
        action: &str,
        resource: &str,
        context: std::collections::HashMap<String, String>,
    ) -> Result<bool> {
        self.framework
            .check_dynamic_permission(user_id, action, resource, context)
            .await
    }

    /// Register a resource in the permission system.
    pub async fn create_resource(&self, resource: &str) -> Result<()> {
        self.framework.create_resource(resource).await
    }

    /// Delegate a permission from one user to another for a limited duration.
    pub async fn delegate_permission(
        &self,
        delegator_id: &str,
        delegatee_id: &str,
        action: &str,
        resource: &str,
        duration: Duration,
    ) -> Result<()> {
        self.framework
            .delegate_permission(delegator_id, delegatee_id, action, resource, duration)
            .await
    }

    /// List currently active permission delegations for a user.
    pub async fn active_delegations(&self, user_id: &str) -> Result<Vec<String>> {
        self.framework.get_active_delegations(user_id).await
    }
}
