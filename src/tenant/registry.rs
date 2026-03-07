//! Tenant registry for managing multiple tenant instances

use super::context::{TenantContext, TenantId};
use crate::auth::AuthFramework;
use crate::config::AuthConfig;
use crate::errors::{AuthError, Result};
use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};

/// Error types for tenant registry operations
#[derive(Debug, Clone)]
pub enum TenantRegistryError {
    /// Tenant not found
    TenantNotFound(String),

    /// Tenant already exists
    TenantAlreadyExists(String),

    /// Invalid tenant configuration
    InvalidConfiguration(String),

    /// Tenant is inactive
    TenantInactive(String),

    /// Internal error
    InternalError(String),
}

impl std::fmt::Display for TenantRegistryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::TenantNotFound(id) => write!(f, "Tenant not found: {}", id),
            Self::TenantAlreadyExists(id) => write!(f, "Tenant already exists: {}", id),
            Self::InvalidConfiguration(msg) => write!(f, "Invalid configuration: {}", msg),
            Self::TenantInactive(id) => write!(f, "Tenant is inactive: {}", id),
            Self::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl std::error::Error for TenantRegistryError {}

impl From<TenantRegistryError> for AuthError {
    fn from(err: TenantRegistryError) -> Self {
        AuthError::internal(err.to_string())
    }
}

/// Registry for managing multi-tenant AuthFramework instances
///
/// The TenantRegistry manages the lifecycle of AuthFramework instances,
/// one per tenant. Each tenant has complete data isolation and independent
/// configuration while sharing the same process.
#[derive(Clone)]
pub struct TenantRegistry {
    /// Default configuration for new tenants
    default_config: Arc<RwLock<AuthConfig>>,

    /// Active AuthFramework instances by tenant ID
    frameworks: Arc<DashMap<TenantId, Arc<RwLock<AuthFramework>>>>,

    /// Tenant contexts/metadata
    tenants: Arc<DashMap<TenantId, TenantContext>>,
}

impl TenantRegistry {
    /// Create a new TenantRegistry with default configuration
    pub fn new(default_config: AuthConfig) -> Self {
        Self {
            default_config: Arc::new(RwLock::new(default_config)),
            frameworks: Arc::new(DashMap::new()),
            tenants: Arc::new(DashMap::new()),
        }
    }

    /// Register a new tenant and create its AuthFramework instance
    pub async fn register_tenant(
        &self,
        tenant_context: TenantContext,
        config: Option<AuthConfig>,
    ) -> Result<Arc<RwLock<AuthFramework>>> {
        // Validate tenant is active
        if !tenant_context.active {
            warn!(
                "Attempted to register inactive tenant: {}",
                tenant_context.id
            );
            return Err(AuthError::internal(
                TenantRegistryError::TenantInactive(tenant_context.id.to_string()).to_string(),
            ));
        }

        let tenant_id = tenant_context.id.clone();

        // Check if tenant already exists
        if self.tenants.contains_key(&tenant_id) {
            error!("Tenant already registered: {}", tenant_id);
            return Err(AuthError::internal(
                TenantRegistryError::TenantAlreadyExists(tenant_id.to_string()).to_string(),
            ));
        }

        // Use provided config or default
        let mut auth_config = if let Some(cfg) = config {
            cfg
        } else {
            self.default_config.read().await.clone()
        };

        // Store tenant ID in method_configs for reference during operations
        // This ensures all storage operations are namespaced per tenant
        auth_config.method_configs.insert(
            "tenant_id".to_string(),
            serde_json::json!(tenant_id.as_str()),
        );

        // Create new AuthFramework for this tenant
        let mut framework = AuthFramework::new(auth_config);

        // Initialize the framework
        if let Err(e) = framework.initialize().await {
            error!(
                "Failed to initialize AuthFramework for tenant {}: {}",
                tenant_id, e
            );
            return Err(e);
        }

        let framework = Arc::new(RwLock::new(framework));

        // Store in registry
        self.frameworks.insert(tenant_id.clone(), framework.clone());
        self.tenants
            .insert(tenant_id.clone(), tenant_context.clone());

        info!(
            "Tenant registered: {} ({})",
            tenant_id, tenant_context.metadata.name
        );

        Ok(framework)
    }

    /// Get the AuthFramework for a specific tenant
    pub fn get_tenant_framework(&self, tenant_id: &TenantId) -> Result<Arc<RwLock<AuthFramework>>> {
        let tenant_ref = self.tenants.get(tenant_id).ok_or_else(|| {
            AuthError::internal(
                TenantRegistryError::TenantNotFound(tenant_id.to_string()).to_string(),
            )
        })?;

        // Check if tenant is active
        if !tenant_ref.active {
            debug!("Attempted to access inactive tenant: {}", tenant_id);
            return Err(AuthError::internal(
                TenantRegistryError::TenantInactive(tenant_id.to_string()).to_string(),
            ));
        }

        self.frameworks
            .get(tenant_id)
            .map(|f| f.clone())
            .ok_or_else(|| {
                error!("Framework not found for tenant: {}", tenant_id);
                AuthError::internal(
                    TenantRegistryError::InternalError(format!(
                        "Framework not found for tenant: {}",
                        tenant_id
                    ))
                    .to_string(),
                )
            })
    }

    /// Get tenant context/metadata
    pub fn get_tenant_context(&self, tenant_id: &TenantId) -> Result<TenantContext> {
        self.tenants
            .get(tenant_id)
            .map(|t| t.clone())
            .ok_or_else(|| {
                AuthError::internal(
                    TenantRegistryError::TenantNotFound(tenant_id.to_string()).to_string(),
                )
            })
    }

    /// Deactivate a tenant (prevents further access)
    pub async fn deactivate_tenant(&self, tenant_id: &TenantId) -> Result<()> {
        if let Some(mut tenant) = self.tenants.get_mut(tenant_id) {
            tenant.deactivate();
            info!("Tenant deactivated: {}", tenant_id);
            Ok(())
        } else {
            Err(AuthError::internal(
                TenantRegistryError::TenantNotFound(tenant_id.to_string()).to_string(),
            ))
        }
    }

    /// Activate a previously deactivated tenant
    pub async fn activate_tenant(&self, tenant_id: &TenantId) -> Result<()> {
        if let Some(mut tenant) = self.tenants.get_mut(tenant_id) {
            tenant.activate();
            info!("Tenant activated: {}", tenant_id);
            Ok(())
        } else {
            Err(AuthError::internal(
                TenantRegistryError::TenantNotFound(tenant_id.to_string()).to_string(),
            ))
        }
    }

    /// Remove a tenant from the registry
    ///
    /// This unregisters the tenant and removes its AuthFramework instance.
    /// Note: This does NOT delete tenant data from storage.
    pub async fn remove_tenant(&self, tenant_id: &TenantId) -> Result<()> {
        self.frameworks.remove(tenant_id);
        self.tenants.remove(tenant_id);
        info!("Tenant removed from registry: {}", tenant_id);
        Ok(())
    }

    /// List all registered tenant IDs
    pub async fn list_tenant_ids(&self) -> Vec<TenantId> {
        self.tenants.iter().map(|t| t.id.clone()).collect()
    }

    /// List all active tenant IDs
    pub async fn list_active_tenants(&self) -> Vec<TenantId> {
        self.tenants
            .iter()
            .filter(|t| t.active)
            .map(|t| t.id.clone())
            .collect()
    }

    /// Get the count of registered tenants
    pub async fn tenant_count(&self) -> usize {
        self.tenants.len()
    }

    /// Get the count of active tenants
    pub async fn active_tenant_count(&self) -> usize {
        self.tenants.iter().filter(|t| t.active).count()
    }

    /// Update the default configuration for new tenants
    pub async fn set_default_config(&self, config: AuthConfig) {
        let mut default = self.default_config.write().await;
        *default = config;
    }

    /// Get a copy of the current default configuration
    pub async fn get_default_config(&self) -> AuthConfig {
        self.default_config.read().await.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_and_get_tenant() {
        let registry = TenantRegistry::new(AuthConfig::default());
        let context = TenantContext::with_name("test-tenant", "Test Tenant").unwrap();

        let result = registry.register_tenant(context, None).await;
        assert!(result.is_ok());

        let tenant_id = TenantId::new("test-tenant");
        let framework = registry.get_tenant_framework(&tenant_id);
        assert!(framework.is_ok());
    }

    #[tokio::test]
    async fn test_duplicate_tenant_registration() {
        let registry = TenantRegistry::new(AuthConfig::default());
        let context = TenantContext::with_name("test", "Test").unwrap();

        let _ = registry.register_tenant(context.clone(), None).await;
        let result = registry.register_tenant(context, None).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_tenant_activation_deactivation() {
        let registry = TenantRegistry::new(AuthConfig::default());
        let context = TenantContext::with_name("test", "Test").unwrap();
        let tenant_id = context.id.clone();

        let _ = registry.register_tenant(context, None).await;

        // Deactivate
        assert!(registry.deactivate_tenant(&tenant_id).await.is_ok());

        // Should not be able to get deactivated tenant
        let result = registry.get_tenant_framework(&tenant_id);
        assert!(result.is_err());

        // Reactivate
        assert!(registry.activate_tenant(&tenant_id).await.is_ok());

        // Should be able to access again
        let result = registry.get_tenant_framework(&tenant_id);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_list_tenants() {
        let registry = TenantRegistry::new(AuthConfig::default());

        let c1 = TenantContext::with_name("tenant1", "Tenant 1").unwrap();
        let c2 = TenantContext::with_name("tenant2", "Tenant 2").unwrap();

        let _ = registry.register_tenant(c1, None).await;
        let _ = registry.register_tenant(c2, None).await;

        assert_eq!(registry.tenant_count().await, 2);

        let ids = registry.list_tenant_ids().await;
        assert_eq!(ids.len(), 2);
    }
}
