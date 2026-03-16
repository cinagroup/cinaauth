//! Additional server capability modules
//!
//! Note: WebAuthn/FIDO2 support is provided via the `PasskeyAuthMethod`
//! in `src/methods/passkey/mod.rs` using the production-grade `passkey` crate.
//! No separate WebAuthn server module is needed.

/// JWT token server for issuing and validating JWT tokens
pub mod jwt_server {
    use crate::errors::Result;
    use crate::storage::AuthStorage;
    use serde::{Deserialize, Serialize};
    use std::sync::Arc;

    #[derive(Debug, Clone)]
    pub struct JwtServerConfig {
        pub issuer: String,
        pub key_id: String,
    }

    impl Default for JwtServerConfig {
        fn default() -> Self {
            Self {
                issuer: "https://auth.example.com".to_string(),
                key_id: "default".to_string(),
            }
        }
    }

    pub struct JwtServer {
        config: JwtServerConfig,
        storage: Arc<dyn AuthStorage>,
    }

    impl JwtServer {
        pub async fn new(config: JwtServerConfig, storage: Arc<dyn AuthStorage>) -> Result<Self> {
            Ok(Self { config, storage })
        }

        /// Perform any async initialization after construction.
        ///
        /// `JwtServer` requires no async startup work — all state is set up in [`new`].
        /// This method is provided for API symmetry with other server modules that
        /// do require an initialization step (e.g., connecting to external services).
        pub async fn initialize(&self) -> Result<()> {
            Ok(())
        }

        pub async fn get_well_known_jwt_configuration(&self) -> Result<JwtWellKnownConfiguration> {
            Ok(JwtWellKnownConfiguration {
                issuer: self.config.issuer.clone(),
                jwks_uri: format!("{}/jwks", self.config.issuer),
            })
        }

        /// Store JWT metadata in storage
        pub async fn store_jwt_metadata(&self, metadata: &JwtWellKnownConfiguration) -> Result<()> {
            let key = format!("jwt_metadata:{}", self.config.issuer);
            let value = serde_json::to_string(metadata).map_err(|e| {
                crate::errors::AuthError::internal(format!("Serialization error: {}", e))
            })?;

            self.storage.store_kv(&key, value.as_bytes(), None).await?;
            tracing::info!("Stored JWT metadata for issuer: {}", self.config.issuer);
            Ok(())
        }

        /// Retrieve JWT metadata from storage
        pub async fn get_stored_metadata(&self) -> Result<Option<JwtWellKnownConfiguration>> {
            let key = format!("jwt_metadata:{}", self.config.issuer);

            if let Some(value_bytes) = self.storage.get_kv(&key).await? {
                let value = String::from_utf8(value_bytes).map_err(|e| {
                    crate::errors::AuthError::internal(format!("UTF-8 conversion error: {}", e))
                })?;
                let metadata: JwtWellKnownConfiguration =
                    serde_json::from_str(&value).map_err(|e| {
                        crate::errors::AuthError::internal(format!("Deserialization error: {}", e))
                    })?;
                Ok(Some(metadata))
            } else {
                Ok(None)
            }
        }

        /// Store JWT signing key information
        pub async fn store_signing_key(&self, key_data: &str) -> Result<()> {
            let key = format!("jwt_key:{}", self.config.key_id);
            self.storage
                .store_kv(&key, key_data.as_bytes(), None)
                .await?;
            tracing::info!("Stored JWT signing key: {}", self.config.key_id);
            Ok(())
        }
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct JwtWellKnownConfiguration {
        pub issuer: String,
        pub jwks_uri: String,
    }
}

/// API Gateway authentication and authorization
pub mod api_gateway {
    use crate::errors::Result;
    use crate::storage::AuthStorage;
    use std::sync::Arc;

    #[derive(Debug, Clone)]
    pub struct ApiGatewayConfig {
        pub name: String,
    }

    impl Default for ApiGatewayConfig {
        fn default() -> Self {
            Self {
                name: "API Gateway".to_string(),
            }
        }
    }

    pub struct ApiGateway {
        config: ApiGatewayConfig,
        storage: Arc<dyn AuthStorage>,
    }

    impl ApiGateway {
        pub async fn new(config: ApiGatewayConfig, storage: Arc<dyn AuthStorage>) -> Result<Self> {
            Ok(Self { config, storage })
        }

        /// Perform any async initialization after construction.
        ///
        /// `ApiGateway` requires no async startup work — all state is set up in [`new`].
        /// This method is provided for API symmetry with other server modules that
        /// do require an initialization step (e.g., connecting to external services).
        pub async fn initialize(&self) -> Result<()> {
            Ok(())
        }

        /// Store API gateway configuration metadata
        pub async fn store_gateway_metadata(&self) -> Result<()> {
            let key = format!("api_gateway_config:{}", self.config.name);
            let metadata = serde_json::json!({
                "name": self.config.name,
                "initialized_at": chrono::Utc::now().to_rfc3339()
            });
            let value = serde_json::to_string(&metadata).map_err(|e| {
                crate::errors::AuthError::internal(format!("Serialization error: {}", e))
            })?;

            self.storage.store_kv(&key, value.as_bytes(), None).await?;
            tracing::info!("Stored API Gateway metadata for: {}", self.config.name);
            Ok(())
        }

        /// Store API route configuration
        pub async fn store_route_config(&self, route_path: &str, config_data: &str) -> Result<()> {
            let key = format!("api_gateway_route:{}:{}", self.config.name, route_path);
            self.storage
                .store_kv(&key, config_data.as_bytes(), None)
                .await?;
            tracing::info!(
                "Stored route config for {} on gateway: {}",
                route_path,
                self.config.name
            );
            Ok(())
        }

        /// Get API route configuration
        pub async fn get_route_config(&self, route_path: &str) -> Result<Option<String>> {
            let key = format!("api_gateway_route:{}:{}", self.config.name, route_path);

            if let Some(config_bytes) = self.storage.get_kv(&key).await? {
                let config = String::from_utf8(config_bytes).map_err(|e| {
                    crate::errors::AuthError::internal(format!("UTF-8 conversion error: {}", e))
                })?;
                Ok(Some(config))
            } else {
                Ok(None)
            }
        }

        /// Get gateway name from config
        pub fn get_gateway_name(&self) -> &str {
            &self.config.name
        }
    }
}

/// SAML Identity Provider
pub mod saml_idp {
    use crate::errors::Result;
    use crate::storage::AuthStorage;
    use serde::{Deserialize, Serialize};
    use std::sync::Arc;

    #[derive(Debug, Clone)]
    pub struct SamlIdpConfig {
        pub entity_id: String,
    }

    impl Default for SamlIdpConfig {
        fn default() -> Self {
            Self {
                entity_id: "https://auth.example.com".to_string(),
            }
        }
    }

    pub struct SamlIdentityProvider {
        config: SamlIdpConfig,
        storage: Arc<dyn AuthStorage>,
    }

    impl SamlIdentityProvider {
        pub async fn new(config: SamlIdpConfig, storage: Arc<dyn AuthStorage>) -> Result<Self> {
            Ok(Self { config, storage })
        }

        /// Perform any async initialization after construction.
        ///
        /// `SamlIdentityProvider` requires no async startup work — all state is set up in [`new`].
        /// This method is provided for API symmetry with other server modules that
        /// do require an initialization step (e.g., connecting to external services).
        pub async fn initialize(&self) -> Result<()> {
            Ok(())
        }

        pub async fn get_metadata(&self) -> Result<SamlMetadata> {
            Ok(SamlMetadata {
                entity_id: self.config.entity_id.clone(),
            })
        }

        /// Store SAML metadata in storage
        pub async fn store_saml_metadata(&self, metadata: &SamlMetadata) -> Result<()> {
            let key = format!("saml_metadata:{}", self.config.entity_id);
            let value = serde_json::to_string(metadata).map_err(|e| {
                crate::errors::AuthError::internal(format!("Serialization error: {}", e))
            })?;

            self.storage.store_kv(&key, value.as_bytes(), None).await?;
            tracing::info!("Stored SAML metadata for entity: {}", self.config.entity_id);
            Ok(())
        }

        /// Store SAML assertion
        pub async fn store_assertion(
            &self,
            assertion_id: &str,
            assertion_data: &str,
        ) -> Result<()> {
            let key = format!("saml_assertion:{}:{}", self.config.entity_id, assertion_id);
            self.storage
                .store_kv(
                    &key,
                    assertion_data.as_bytes(),
                    Some(std::time::Duration::from_secs(3600)),
                )
                .await?;
            tracing::info!(
                "Stored SAML assertion {} for entity: {}",
                assertion_id,
                self.config.entity_id
            );
            Ok(())
        }

        /// Retrieve SAML assertion
        pub async fn get_assertion(&self, assertion_id: &str) -> Result<Option<String>> {
            let key = format!("saml_assertion:{}:{}", self.config.entity_id, assertion_id);

            if let Some(assertion_bytes) = self.storage.get_kv(&key).await? {
                let assertion = String::from_utf8(assertion_bytes).map_err(|e| {
                    crate::errors::AuthError::internal(format!("UTF-8 conversion error: {}", e))
                })?;
                Ok(Some(assertion))
            } else {
                Ok(None)
            }
        }
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct SamlMetadata {
        pub entity_id: String,
    }
}

// Additional server-side modules

pub mod consent {
    //! User consent management (OAuth 2.0 / OIDC consent screen logic)

    use crate::errors::Result;
    use crate::storage::AuthStorage;
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;
    use std::sync::Arc;

    /// Configuration for the consent module.
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct ConsentConfig {
        /// Require explicit consent for every OAuth 2.0 authorization request.
        pub require_explicit_consent: bool,
        /// Remember consent decisions for this many seconds (0 = never remember).
        pub remember_consent_ttl_secs: u64,
    }

    impl Default for ConsentConfig {
        fn default() -> Self {
            Self {
                require_explicit_consent: true,
                remember_consent_ttl_secs: 86_400, // 24 hours
            }
        }
    }

    /// A stored consent decision.
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct ConsentRecord {
        pub user_id: String,
        pub client_id: String,
        pub scopes: Vec<String>,
        pub granted_at: u64,
        pub expires_at: Option<u64>,
    }

    /// Manages user consent decisions with optional storage backend for persistence.
    ///
    /// When constructed with [`ConsentManager::new_with_storage`] consent decisions
    /// are written through to `AuthStorage` so they survive process restarts.
    /// When constructed with [`ConsentManager::new`] decisions are kept in-process
    /// only (suitable for testing or single-node scenarios with short TTLs).
    pub struct ConsentManager {
        config: ConsentConfig,
        /// Write-through in-process cache.  Always populated on reads.
        records: HashMap<String, ConsentRecord>,
        storage: Option<Arc<dyn AuthStorage>>,
    }

    impl std::fmt::Debug for ConsentManager {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            f.debug_struct("ConsentManager")
                .field("config", &self.config)
                .field("records", &self.records)
                .field("storage", &self.storage.is_some())
                .finish()
        }
    }

    impl Default for ConsentManager {
        fn default() -> Self {
            Self::new(ConsentConfig::default())
        }
    }

    impl ConsentManager {
        /// Create an in-memory-only `ConsentManager`.
        pub fn new(config: ConsentConfig) -> Self {
            Self {
                config,
                records: HashMap::new(),
                storage: None,
            }
        }

        /// Create a storage-backed `ConsentManager` that persists decisions across
        /// restarts using the provided `AuthStorage` implementation.
        pub fn new_with_storage(config: ConsentConfig, storage: Arc<dyn AuthStorage>) -> Self {
            Self {
                config,
                records: HashMap::new(),
                storage: Some(storage),
            }
        }

        /// Storage key for a consent record.
        fn storage_key(user_id: &str, client_id: &str) -> String {
            format!("consent:{}:{}", user_id, client_id)
        }

        /// Record a consent decision, persisting to storage if configured.
        pub async fn grant(&mut self, record: ConsentRecord) -> Result<()> {
            let key = format!("{}:{}", record.user_id, record.client_id);
            if let Some(storage) = &self.storage {
                let storage_key = Self::storage_key(&record.user_id, &record.client_id);
                let ttl = if record.expires_at.is_some() {
                    Some(std::time::Duration::from_secs(
                        self.config.remember_consent_ttl_secs,
                    ))
                } else {
                    None
                };
                let bytes = serde_json::to_vec(&record).map_err(|e| {
                    crate::errors::AuthError::internal(format!(
                        "Consent serialization error: {}",
                        e
                    ))
                })?;
                storage.store_kv(&storage_key, &bytes, ttl).await?;
            }
            self.records.insert(key, record);
            Ok(())
        }

        /// Revoke a previously granted consent, removing it from storage if configured.
        pub async fn revoke(&mut self, user_id: &str, client_id: &str) -> Result<bool> {
            let key = format!("{}:{}", user_id, client_id);
            if let Some(storage) = &self.storage {
                let storage_key = Self::storage_key(user_id, client_id);
                // Best-effort delete; ignore "not found" errors.
                let _ = storage.delete_kv(&storage_key).await;
            }
            Ok(self.records.remove(&key).is_some())
        }

        /// Check whether consent for the given scopes has already been granted.
        /// Checks the in-process cache first; falls back to storage on a cache miss.
        pub async fn has_consent(
            &mut self,
            user_id: &str,
            client_id: &str,
            scopes: &[String],
        ) -> Result<bool> {
            if !self.config.require_explicit_consent {
                return Ok(true);
            }
            let key = format!("{}:{}", user_id, client_id);

            // Cache miss: try storage.
            if !self.records.contains_key(&key) {
                if let Some(storage) = &self.storage {
                    let storage_key = Self::storage_key(user_id, client_id);
                    if let Ok(Some(bytes)) = storage.get_kv(&storage_key).await {
                        if let Ok(record) =
                            serde_json::from_slice::<ConsentRecord>(&bytes)
                        {
                            self.records.insert(key.clone(), record);
                        }
                    }
                }
            }

            Ok(self.records.get(&key).is_some_and(|record| {
                scopes.iter().all(|s| record.scopes.contains(s))
            }))
        }

        /// Return the configuration in use.
        pub fn config(&self) -> &ConsentConfig {
            &self.config
        }
    }
}

pub mod introspection {
    //! Token introspection endpoint (RFC 7662)

    use serde::{Deserialize, Serialize};

    /// Configuration for the token introspection module.
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct IntrospectionConfig {
        /// Allow only registered resource servers to call the introspection endpoint.
        pub restrict_to_registered_servers: bool,
        /// Include full JWT claims in the response.
        pub include_claims: bool,
    }

    impl Default for IntrospectionConfig {
        fn default() -> Self {
            Self {
                restrict_to_registered_servers: false,
                include_claims: true,
            }
        }
    }

    /// Response body for RFC 7662 token introspection.
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct IntrospectionResponse {
        pub active: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub scope: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub client_id: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub sub: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub exp: Option<i64>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub iat: Option<i64>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub token_type: Option<String>,
    }

    impl IntrospectionResponse {
        /// Return an `active: false` response (e.g., for invalid/expired tokens).
        pub fn inactive() -> Self {
            Self {
                active: false,
                scope: None,
                client_id: None,
                sub: None,
                exp: None,
                iat: None,
                token_type: None,
            }
        }
    }

    /// Handles token introspection logic for the server.
    #[derive(Debug, Default)]
    pub struct IntrospectionManager {
        config: IntrospectionConfig,
    }

    impl IntrospectionManager {
        /// Create a new `IntrospectionManager`.
        pub fn new(config: IntrospectionConfig) -> Self {
            Self { config }
        }

        /// Return the configuration in use.
        pub fn config(&self) -> &IntrospectionConfig {
            &self.config
        }
    }
}

pub mod device_flow_server {
    //! Device Authorization Grant server-side implementation (RFC 8628)

    use crate::errors::Result;
    use crate::storage::AuthStorage;
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;
    use std::sync::Arc;

    /// Configuration for the device flow module.
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct DeviceFlowConfig {
        /// Length of the user code (e.g., 8 characters).
        pub user_code_length: usize,
        /// How long a device code is valid (seconds).
        pub device_code_ttl_secs: u64,
        /// Minimum interval between polling requests (seconds).
        pub polling_interval_secs: u64,
        /// Verification URI shown to the user.
        pub verification_uri: String,
    }

    impl Default for DeviceFlowConfig {
        fn default() -> Self {
            Self {
                user_code_length: 8,
                device_code_ttl_secs: 1800,  // 30 minutes
                polling_interval_secs: 5,
                verification_uri: "https://example.com/device".to_string(),
            }
        }
    }

    /// State of a pending device authorization request.
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub enum DeviceAuthState {
        Pending,
        Authorized { access_token: String },
        Denied,
        Expired,
    }

    /// A device authorization record.
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct DeviceAuthRecord {
        pub device_code: String,
        pub user_code: String,
        pub client_id: String,
        pub scopes: Vec<String>,
        pub state: DeviceAuthState,
        pub expires_at: u64,
    }

    /// Manages device authorization flow state with optional storage backend.
    ///
    /// When constructed with [`DeviceFlowManager::new_with_storage`] device auth
    /// records are written through to `AuthStorage` with TTL equal to
    /// `device_code_ttl_secs`, surviving process restarts and enabling
    /// multi-instance deployments.  When constructed with [`DeviceFlowManager::new`]
    /// records are kept in-process only.
    pub struct DeviceFlowManager {
        config: DeviceFlowConfig,
        /// Write-through in-process cache keyed by `device_code`.
        records: HashMap<String, DeviceAuthRecord>,
        storage: Option<Arc<dyn AuthStorage>>,
    }

    impl std::fmt::Debug for DeviceFlowManager {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            f.debug_struct("DeviceFlowManager")
                .field("config", &self.config)
                .field("records", &self.records)
                .field("storage", &self.storage.is_some())
                .finish()
        }
    }

    impl Default for DeviceFlowManager {
        fn default() -> Self {
            Self::new(DeviceFlowConfig::default())
        }
    }

    impl DeviceFlowManager {
        /// Create an in-memory-only `DeviceFlowManager`.
        pub fn new(config: DeviceFlowConfig) -> Self {
            Self {
                config,
                records: HashMap::new(),
                storage: None,
            }
        }

        /// Create a storage-backed `DeviceFlowManager` that persists device
        /// authorization records across restarts.
        pub fn new_with_storage(config: DeviceFlowConfig, storage: Arc<dyn AuthStorage>) -> Self {
            Self {
                config,
                records: HashMap::new(),
                storage: Some(storage),
            }
        }

        /// Storage key for a device auth record.
        fn storage_key(device_code: &str) -> String {
            format!("device_flow:{}", device_code)
        }

        /// Persist a new device authorization record.
        pub async fn register(&mut self, record: DeviceAuthRecord) -> Result<()> {
            if let Some(storage) = &self.storage {
                let key = Self::storage_key(&record.device_code);
                let ttl = Some(std::time::Duration::from_secs(
                    self.config.device_code_ttl_secs,
                ));
                let bytes = serde_json::to_vec(&record).map_err(|e| {
                    crate::errors::AuthError::internal(format!(
                        "DeviceFlowRecord serialization error: {}",
                        e
                    ))
                })?;
                storage.store_kv(&key, &bytes, ttl).await?;
            }
            self.records.insert(record.device_code.clone(), record);
            Ok(())
        }

        /// Look up a record by device code, checking storage on a cache miss.
        pub async fn get(&mut self, device_code: &str) -> Result<Option<DeviceAuthRecord>> {
            if let Some(record) = self.records.get(device_code) {
                return Ok(Some(record.clone()));
            }
            if let Some(storage) = &self.storage {
                let key = Self::storage_key(device_code);
                if let Some(bytes) = storage.get_kv(&key).await? {
                    if let Ok(record) =
                        serde_json::from_slice::<DeviceAuthRecord>(&bytes)
                    {
                        self.records.insert(device_code.to_string(), record.clone());
                        return Ok(Some(record));
                    }
                }
            }
            Ok(None)
        }

        /// Approve the authorization request for a given user code.
        pub async fn approve(
            &mut self,
            user_code: &str,
            access_token: String,
        ) -> Result<bool> {
            // Find the matching record (by user_code, not device_code).
            let device_code = self
                .records
                .values()
                .find(|r| r.user_code == user_code)
                .map(|r| r.device_code.clone());

            if let Some(dc) = device_code {
                if let Some(record) = self.records.get_mut(&dc) {
                    record.state = DeviceAuthState::Authorized {
                        access_token: access_token.clone(),
                    };
                    if let Some(storage) = &self.storage {
                        let key = Self::storage_key(&dc);
                        let bytes = serde_json::to_vec(&*record).map_err(|e| {
                            crate::errors::AuthError::internal(format!(
                                "DeviceFlowRecord serialization error: {}",
                                e
                            ))
                        })?;
                        // Preserve remaining TTL rather than resetting it.
                        storage.store_kv(&key, &bytes, None).await?;
                    }
                }
                return Ok(true);
            }
            Ok(false)
        }

        /// Return the configuration in use.
        pub fn config(&self) -> &DeviceFlowConfig {
            &self.config
        }
    }
}


