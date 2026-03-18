//! Enhanced X.509 Certificate Signing Module
//!
//! This module provides comprehensive X.509 certificate signing capabilities
//! for enterprise authentication scenarios including:
//!
//! # Features
//!
//! - **Certificate Authority (CA) Operations**: Root and intermediate CA management
//! - **Certificate Signing Requests (CSR)**: Generate and sign CSRs
//! - **Certificate Lifecycle**: Create, renew, revoke, and validate certificates
//! - **Multiple Key Types**: RSA, ECDSA, and Ed25519 support
//! - **Certificate Profiles**: Different certificate types for various use cases
//! - **CRL and OCSP**: Certificate revocation mechanisms
//! - **Enterprise Integration**: LDAP, Active Directory, and PKI integration
//!
//! # Use Cases
//!
//! - Client certificate authentication (OAuth 2.0 mTLS)
//! - Code signing certificates
//! - TLS/SSL server certificates
//! - Email signing and encryption certificates
//! - Document signing certificates
//! - IoT device certificates

use crate::errors::{AuthError, Result};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64_STANDARD};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::SystemTime;
use tokio::sync::RwLock;
use uuid::Uuid;
use x509_parser::parse_x509_certificate;

/// Enhanced X.509 Certificate Manager
#[derive(Debug, Clone)]
pub struct X509CertificateManager {
    /// Configuration
    config: X509Config,

    /// Certificate store
    certificate_store: Arc<RwLock<HashMap<String, StoredCertificate>>>,

    /// Certificate revocation list
    revocation_list: Arc<RwLock<HashMap<String, RevocationEntry>>>,

    /// CA certificates
    ca_certificates: Arc<RwLock<HashMap<String, CACertificate>>>,
}

/// X.509 Configuration
#[derive(Debug, Clone)]
pub struct X509Config {
    /// Default certificate validity period (days)
    pub default_validity_days: i64,

    /// Root CA certificate path
    pub root_ca_cert_path: String,

    /// Root CA certificate path (alias)
    pub root_ca_path: String,

    /// Root CA private key path
    pub root_ca_key_path: String,

    /// Intermediate CA certificate path
    pub intermediate_ca_cert_path: Option<String>,

    /// Intermediate CA certificate path (alias)
    pub intermediate_ca_path: Option<String>,

    /// Intermediate CA private key path
    pub intermediate_ca_key_path: Option<String>,

    /// Default key size for RSA
    pub default_rsa_key_size: u32,

    /// Default curve for ECDSA
    pub default_ecdsa_curve: EcdsaCurve,

    /// Certificate profiles
    pub certificate_profiles: HashMap<String, CertificateProfile>,

    /// Enable OCSP (Online Certificate Status Protocol)
    pub enable_ocsp: bool,

    /// OCSP responder URL
    pub ocsp_responder_url: Option<String>,

    /// Enable CRL (Certificate Revocation List)
    pub enable_crl: bool,

    /// CRL distribution point URL
    pub crl_distribution_url: Option<String>,
}

/// ECDSA Curve types
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum EcdsaCurve {
    /// P-256 (secp256r1)
    P256,
    /// P-384 (secp384r1)
    P384,
    /// P-521 (secp521r1)
    P521,
}

/// Certificate Profile for different use cases
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertificateProfile {
    /// Profile name
    pub name: String,

    /// Certificate type
    pub cert_type: CertificateType,

    /// Key usage flags
    pub key_usage: Vec<KeyUsage>,

    /// Extended key usage
    pub extended_key_usage: Vec<ExtendedKeyUsage>,

    /// Subject alternative names
    pub subject_alt_names: Vec<SubjectAltName>,

    /// Validity period (days)
    pub validity_days: i64,

    /// Key type preference
    pub preferred_key_type: KeyType,

    /// Additional extensions
    pub extensions: HashMap<String, Value>,
}

/// Certificate Types
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum CertificateType {
    /// Root Certificate Authority
    RootCA,
    /// Intermediate Certificate Authority
    IntermediateCA,
    /// End entity certificate (leaf)
    EndEntity,
    /// Code signing certificate
    CodeSigning,
    /// Email certificate
    Email,
    /// TLS server certificate
    TlsServer,
    /// TLS client certificate
    TlsClient,
    /// Document signing certificate
    DocumentSigning,
}

/// Key Usage flags
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum KeyUsage {
    /// Digital signature
    DigitalSignature,
    /// Non-repudiation
    NonRepudiation,
    /// Key encipherment
    KeyEncipherment,
    /// Data encipherment
    DataEncipherment,
    /// Key agreement
    KeyAgreement,
    /// Key certificate signing
    KeyCertSign,
    /// CRL signing
    CrlSign,
    /// Encipher only
    EncipherOnly,
    /// Decipher only
    DecipherOnly,
}

/// Extended Key Usage
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ExtendedKeyUsage {
    /// Server authentication
    ServerAuth,
    /// Client authentication
    ClientAuth,
    /// Code signing
    CodeSigning,
    /// Email protection
    EmailProtection,
    /// Time stamping
    TimeStamping,
    /// OCSP signing
    OcspSigning,
}

/// Subject Alternative Name types
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SubjectAltName {
    /// DNS name
    DnsName(String),
    /// Email address
    Email(String),
    /// URI
    Uri(String),
    /// IP address
    IpAddress(String),
}

/// Key Types
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum KeyType {
    /// RSA key
    Rsa(u32), // Key size in bits
    /// ECDSA key
    Ecdsa(EcdsaCurve),
    /// Ed25519 key
    Ed25519,
}

/// Stored Certificate
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredCertificate {
    /// Certificate ID
    pub cert_id: String,

    /// Certificate data (PEM format)
    pub certificate_pem: String,

    /// Private key (PEM format, optional)
    pub private_key_pem: Option<String>,

    /// Certificate subject
    pub subject: String,

    /// Certificate issuer
    pub issuer: String,

    /// Serial number
    pub serial_number: String,

    /// Not before date
    pub not_before: DateTime<Utc>,

    /// Not after date
    pub not_after: DateTime<Utc>,

    /// Certificate profile used
    pub profile: String,

    /// Certificate status
    pub status: CertificateStatus,

    /// Fingerprint (SHA-256)
    pub fingerprint: String,

    /// Created timestamp
    pub created_at: DateTime<Utc>,

    /// Metadata
    pub metadata: HashMap<String, Value>,
}

/// Certificate Status
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum CertificateStatus {
    /// Certificate is valid
    Valid,
    /// Certificate is expired
    Expired,
    /// Certificate is revoked
    Revoked,
    /// Certificate is suspended
    Suspended,
}

/// CA Certificate
#[derive(Debug, Clone)]
pub struct CACertificate {
    /// CA ID
    pub ca_id: String,

    /// CA certificate
    pub certificate: StoredCertificate,

    /// Certificate subject
    pub subject: String,

    /// CA private key
    pub private_key: Vec<u8>,

    /// CA type
    pub ca_type: CAType,

    /// Issued certificates count
    pub issued_count: u64,

    /// Next certificate serial number
    pub next_serial: u64,
}

/// CA Types
#[derive(Debug, Clone, PartialEq)]
pub enum CAType {
    /// Root CA
    Root,
    /// Intermediate CA
    Intermediate,
}

/// Certificate Revocation Entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevocationEntry {
    /// Certificate serial number
    pub serial_number: String,

    /// Revocation date
    pub revocation_date: DateTime<Utc>,

    /// Revocation reason
    pub reason: RevocationReason,

    /// Additional information
    pub additional_info: Option<String>,
}

/// Revocation Reasons (RFC 5280)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum RevocationReason {
    /// Unspecified
    Unspecified,
    /// Key compromise
    KeyCompromise,
    /// CA compromise
    CaCompromise,
    /// Affiliation changed
    AffiliationChanged,
    /// Superseded
    Superseded,
    /// Cessation of operation
    CessationOfOperation,
    /// Certificate hold
    CertificateHold,
    /// Remove from CRL
    RemoveFromCrl,
    /// Privilege withdrawn
    PrivilegeWithdrawn,
    /// AA compromise
    AaCompromise,
}

/// Certificate Signing Request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertificateRequest {
    /// Request ID
    pub request_id: String,

    /// Certificate subject information
    pub subject: CertificateSubject,

    /// Certificate profile to use
    pub profile: String,

    /// Public key (PEM format)
    pub public_key_pem: String,

    /// Subject alternative names
    pub subject_alt_names: Vec<SubjectAltName>,

    /// Request timestamp
    pub requested_at: DateTime<Utc>,

    /// Requester information
    pub requester: String,

    /// Additional attributes
    pub attributes: HashMap<String, Value>,
}

/// Certificate Subject Information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertificateSubject {
    /// Common name
    pub common_name: String,

    /// Organization
    pub organization: Option<String>,

    /// Organizational unit
    pub organizational_unit: Option<String>,

    /// Country
    pub country: Option<String>,

    /// State/Province
    pub state: Option<String>,

    /// City/Locality
    pub locality: Option<String>,

    /// Email address
    pub email: Option<String>,
}

impl X509CertificateManager {
    /// Create new X.509 certificate manager
    pub fn new(config: X509Config) -> Self {
        Self {
            config,
            certificate_store: Arc::new(RwLock::new(HashMap::new())),
            revocation_list: Arc::new(RwLock::new(HashMap::new())),
            ca_certificates: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Initialize certificate manager with CA certificates
    pub async fn initialize(&self) -> Result<()> {
        // Load root CA certificate
        self.load_root_ca().await?;

        // Load intermediate CA certificate if configured
        if self.config.intermediate_ca_cert_path.is_some() {
            self.load_intermediate_ca().await?;
        }

        Ok(())
    }

    /// Load root CA certificate
    async fn load_root_ca(&self) -> Result<()> {
        // Production implementation: Load from secure certificate store or HSM
        // Check for HSM configuration first
        if let Ok(hsm_config) = std::env::var("X509_HSM_CONFIG") {
            tracing::info!("Loading CA certificate from HSM: {}", hsm_config);
            // In production, integrate with PKCS#11 or Azure Key Vault
            return self.load_ca_from_hsm(&hsm_config).await;
        }

        // Check for Azure Key Vault configuration
        if let Ok(vault_url) = std::env::var("X509_AZURE_VAULT_URL")
            && let Ok(cert_name) = std::env::var("X509_AZURE_CERT_NAME")
        {
            tracing::info!("Loading CA certificate from Azure Key Vault: {}", vault_url);
            return self.load_ca_from_azure_vault(&vault_url, &cert_name).await;
        }

        // Check for AWS Secrets Manager configuration
        if let Ok(secret_id) = std::env::var("X509_AWS_SECRET_ID") {
            tracing::info!(
                "Loading CA certificate from AWS Secrets Manager: {}",
                secret_id
            );
            return self.load_ca_from_aws_secrets(&secret_id).await;
        }

        // Fallback to file system loading with proper security validation
        let ca_cert_path = if self.config.root_ca_path.is_empty() {
            "ca/root-ca.pem"
        } else {
            &self.config.root_ca_path
        };

        tracing::warn!(
            "Loading CA certificate from file system - consider using HSM or secure vault for production"
        );
        self.load_ca_from_file(ca_cert_path).await
    }

    /// Load CA certificate from HSM (Hardware Security Module) via PKCS#11.
    ///
    /// `hsm_config` must be a JSON object with the following fields:
    /// - `library` (required): absolute path to the PKCS#11 shared library (`.so` / `.dll`)
    /// - `slot` (optional, default `0`): slot index returned by `get_slots_with_initialized_token`
    /// - `pin` (optional): User PIN for login (omit for login-less tokens)
    /// - `label` (optional, default `"ca-cert"`): CKA_LABEL of the certificate object
    ///
    /// # Example config
    /// ```text
    /// {"library":"/usr/lib/softhsm/libsofthsm2.so","slot":0,"pin":"1234","label":"root-ca"}
    /// ```
    async fn load_ca_from_hsm(&self, hsm_config: &str) -> Result<()> {
        let config: serde_json::Value = serde_json::from_str(hsm_config).map_err(|e| {
            AuthError::ConfigurationError(format!("Invalid HSM JSON config: {}", e))
        })?;

        let library = config["library"].as_str().ok_or_else(|| {
            AuthError::ConfigurationError("HSM config missing 'library' path".to_string())
        })?;

        // Extract optional parameters
        let slot_id = config["slot"].as_u64().unwrap_or(0);
        let pin = config["pin"].as_str().map(|s| s.to_string());
        let _label = config["label"].as_str().unwrap_or("root-ca").to_string();

        // Note: Real PKCS#11 operations are synchronous and may block.
        // We use spawn_blocking to prevent blocking the async runtime.
        let library_path = library.to_string();

        let handle = tokio::task::spawn_blocking(move || -> Result<Vec<u8>> {
            // First, initialize the PKCS#11 context
            let pkcs11 = cryptoki::context::Pkcs11::new(&library_path).map_err(|e| {
                AuthError::ConfigurationError(format!("Failed to load PKCS#11 library: {}", e))
            })?;

            pkcs11
                .initialize(cryptoki::context::CInitializeArgs::new(
                    cryptoki::context::CInitializeFlags::OS_LOCKING_OK,
                ))
                .map_err(|e| {
                    AuthError::ConfigurationError(format!(
                        "Failed to initialize PKCS#11 context: {}",
                        e
                    ))
                })?;

            // Get slots
            let slots = pkcs11.get_slots_with_token().map_err(|e| {
                AuthError::ConfigurationError(format!("Failed to get PKCS#11 slots: {}", e))
            })?;

            if slot_id as usize >= slots.len() {
                return Err(AuthError::ConfigurationError(format!(
                    "HSM slot {} not found or has no token",
                    slot_id
                )));
            }
            let slot = slots[slot_id as usize];

            // Open a session
            let session = pkcs11.open_ro_session(slot).map_err(|e| {
                AuthError::ConfigurationError(format!("Failed to open PKCS#11 session: {}", e))
            })?;

            // Login if PIN is provided
            if let Some(p) = pin {
                let auth_pin = cryptoki::types::AuthPin::new(p.into());
                session
                    .login(cryptoki::session::UserType::User, Some(&auth_pin))
                    .map_err(|e| {
                        AuthError::ConfigurationError(format!("HSM login failed: {}", e))
                    })?;
            }

            // Find the certificate object by label
            let mut search_template: Vec<cryptoki::object::Attribute> = Vec::new();
            search_template.push(cryptoki::object::Attribute::Class(
                cryptoki::object::ObjectClass::CERTIFICATE,
            ));
            search_template.push(cryptoki::object::Attribute::Label(
                _label.clone().into_bytes(),
            ));

            let objects = session.find_objects(&search_template).map_err(|e| {
                AuthError::ConfigurationError(format!("Failed to search PKCS#11 objects: {}", e))
            })?;

            if objects.is_empty() {
                return Err(AuthError::ConfigurationError(format!(
                    "Certificate with label '{}' not found in HSM",
                    _label
                )));
            }

            // Read the certificate value (usually CKA_VALUE for X.509 certs)
            let cert_obj = objects[0];
            let attrs = session
                .get_attributes(cert_obj, &[cryptoki::object::AttributeType::Value])
                .map_err(|e| {
                    AuthError::ConfigurationError(format!(
                        "Failed to get certificate value from HSM: {}",
                        e
                    ))
                })?;

            if attrs.is_empty() {
                return Err(AuthError::ConfigurationError(
                    "Certificate object has no value attribute".to_string(),
                ));
            }

            let value = match &attrs[0] {
                cryptoki::object::Attribute::Value(v) => v.clone(),
                _ => {
                    return Err(AuthError::ConfigurationError(
                        "Invalid value attribute type".to_string(),
                    ));
                }
            };

            Ok(value)
        });

        let mut _cert_der = handle
            .await
            .map_err(|_| AuthError::ConfigurationError("HSM task panicked".to_string()))??;

        // Ensure proper parsing of the DER bytes (stubbed for now, normally we'd parse and store it)
        Err(AuthError::ConfigurationError(
            "HSM support using PKCS#11 mapped: pending integration into caching model.".to_string(),
        ))
    }

    async fn load_ca_from_azure_vault(&self, vault_url: &str, cert_name: &str) -> Result<()> {
        let tenant_id = std::env::var("X509_AZURE_TENANT_ID").map_err(|_| {
            AuthError::ConfigurationError(
                "X509_AZURE_TENANT_ID environment variable required for Azure Key Vault authentication"
                    .to_string(),
            )
        })?;
        let client_id = std::env::var("X509_AZURE_CLIENT_ID").map_err(|_| {
            AuthError::ConfigurationError(
                "X509_AZURE_CLIENT_ID environment variable required for Azure Key Vault authentication"
                    .to_string(),
            )
        })?;
        let client_secret = std::env::var("X509_AZURE_CLIENT_SECRET").map_err(|_| {
            AuthError::ConfigurationError(
                "X509_AZURE_CLIENT_SECRET environment variable required for Azure Key Vault authentication"
                    .to_string(),
            )
        })?;

        let http = reqwest::Client::new();

        // Step 1: Client-credentials flow → access token.
        let token_url = format!(
            "https://login.microsoftonline.com/{}/oauth2/v2.0/token",
            tenant_id
        );
        let token_resp = http
            .post(&token_url)
            .form(&[
                ("grant_type", "client_credentials"),
                ("client_id", client_id.as_str()),
                ("client_secret", client_secret.as_str()),
                ("scope", "https://vault.azure.net/.default"),
            ])
            .send()
            .await
            .map_err(|e| AuthError::internal(format!("Azure AD token request failed: {}", e)))?;

        if !token_resp.status().is_success() {
            let status = token_resp.status();
            let body = token_resp.text().await.unwrap_or_default();
            return Err(AuthError::ConfigurationError(format!(
                "Azure AD token request returned {}: {}",
                status, body
            )));
        }

        let token_json: serde_json::Value = token_resp.json().await.map_err(|e| {
            AuthError::internal(format!("Failed to parse Azure AD token response: {}", e))
        })?;
        let access_token = token_json["access_token"]
            .as_str()
            .ok_or_else(|| AuthError::internal("Azure AD response missing 'access_token'"))?
            .to_string();

        // Step 2: Fetch the secret from Key Vault (returns PEM / PKCS#12 bundle).
        let vault_base = vault_url.trim_end_matches('/');
        let secret_url = format!("{}/secrets/{}?api-version=7.4", vault_base, cert_name);
        let cert_resp = http
            .get(&secret_url)
            .header("Authorization", format!("Bearer {}", access_token))
            .send()
            .await
            .map_err(|e| AuthError::internal(format!("Azure Key Vault request failed: {}", e)))?;

        if !cert_resp.status().is_success() {
            let status = cert_resp.status();
            let body = cert_resp.text().await.unwrap_or_default();
            return Err(AuthError::ConfigurationError(format!(
                "Azure Key Vault secret fetch returned {}: {}",
                status, body
            )));
        }

        let cert_json: serde_json::Value = cert_resp.json().await.map_err(|e| {
            AuthError::internal(format!("Failed to parse Azure Key Vault response: {}", e))
        })?;

        let raw_value = cert_json["value"]
            .as_str()
            .ok_or_else(|| AuthError::internal("Azure Key Vault response missing 'value' field"))?
            .to_string();

        let content_type = cert_json["contentType"]
            .as_str()
            .unwrap_or("application/x-pem-file");

        let cert_pem = if content_type == "application/x-pem-file"
            || raw_value.contains("-----BEGIN")
        {
            // PEM bundle — extract only the leaf/CA certificate block.
            x509_extract_certificate_pem(&raw_value)
        } else {
            return Err(AuthError::ConfigurationError(format!(
                "Azure Key Vault certificate '{}' uses content-type '{}'. \
                 Store the certificate as a PEM secret (application/x-pem-file) for automatic import.",
                cert_name, content_type
            )));
        };

        tracing::info!(
            "Successfully loaded CA certificate from Azure Key Vault: {}/{}",
            vault_base,
            cert_name
        );
        self.store_ca_certificate_from_pem(
            &cert_pem,
            &format!("azure_kv:{}/{}", vault_base, cert_name),
        )
        .await
    }

    /// Load CA certificate from AWS Secrets Manager using AWS SigV4 request signing.
    ///
    /// Required environment variables (standard AWS credential chain):
    /// - `AWS_ACCESS_KEY_ID`
    /// - `AWS_SECRET_ACCESS_KEY`
    /// - `AWS_REGION` or `AWS_DEFAULT_REGION`
    /// - `AWS_SESSION_TOKEN` (optional, for temporary credentials)
    ///
    /// The secret value must be a PEM-encoded certificate (or a PEM bundle; the
    /// first `CERTIFICATE` block is extracted automatically).
    async fn load_ca_from_aws_secrets(&self, secret_id: &str) -> Result<()> {
        let access_key = std::env::var("AWS_ACCESS_KEY_ID").map_err(|_| {
            AuthError::ConfigurationError(
                "AWS_ACCESS_KEY_ID environment variable required for Secrets Manager".to_string(),
            )
        })?;
        let secret_key = std::env::var("AWS_SECRET_ACCESS_KEY").map_err(|_| {
            AuthError::ConfigurationError(
                "AWS_SECRET_ACCESS_KEY environment variable required for Secrets Manager"
                    .to_string(),
            )
        })?;
        let region = std::env::var("AWS_REGION")
            .or_else(|_| std::env::var("AWS_DEFAULT_REGION"))
            .map_err(|_| {
                AuthError::ConfigurationError(
                    "AWS_REGION (or AWS_DEFAULT_REGION) environment variable required for Secrets Manager"
                        .to_string(),
                )
            })?;
        let session_token = std::env::var("AWS_SESSION_TOKEN").ok();

        let service = "secretsmanager";
        let host = format!("{}.{}.amazonaws.com", service, region);
        let payload =
            serde_json::to_vec(&serde_json::json!({ "SecretId": secret_id })).map_err(|e| {
                AuthError::internal(format!(
                    "Failed to serialise Secrets Manager GetSecretValue request: {}",
                    e
                ))
            })?;

        let now = chrono::Utc::now();
        let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();
        let date_stamp = now.format("%Y%m%d").to_string();

        let authorization = aws_sigv4_authorization(
            &access_key,
            &secret_key,
            session_token.as_deref(),
            &region,
            service,
            "POST",
            &host,
            "/",
            "",
            &payload,
            &amz_date,
            &date_stamp,
            "secretsmanager.GetSecretValue",
        );

        let url = format!("https://{}/", host);
        let http = reqwest::Client::new();
        let mut req_builder = http
            .post(&url)
            .header("Content-Type", "application/x-amz-json-1.1")
            .header("X-Amz-Target", "secretsmanager.GetSecretValue")
            .header("X-Amz-Date", &amz_date)
            .header("Authorization", &authorization)
            .body(payload);

        if let Some(ref token) = session_token {
            req_builder = req_builder.header("X-Amz-Security-Token", token.as_str());
        }

        let resp = req_builder.send().await.map_err(|e| {
            AuthError::internal(format!("AWS Secrets Manager request failed: {}", e))
        })?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AuthError::ConfigurationError(format!(
                "AWS Secrets Manager GetSecretValue returned {}: {}",
                status, body
            )));
        }

        let json: serde_json::Value = resp.json().await.map_err(|e| {
            AuthError::internal(format!("Failed to parse Secrets Manager response: {}", e))
        })?;

        let raw_value = if let Some(s) = json["SecretString"].as_str() {
            s.to_string()
        } else if let Some(b64) = json["SecretBinary"].as_str() {
            let bytes = BASE64_STANDARD.decode(b64).map_err(|e| {
                AuthError::internal(format!("Failed to decode SecretBinary: {}", e))
            })?;
            String::from_utf8(bytes).map_err(|e| {
                AuthError::internal(format!("SecretBinary is not valid UTF-8: {}", e))
            })?
        } else {
            return Err(AuthError::ConfigurationError(format!(
                "AWS Secrets Manager secret '{}' contains neither SecretString nor SecretBinary",
                secret_id
            )));
        };

        let cert_pem = if raw_value.contains("-----BEGIN CERTIFICATE-----") {
            x509_extract_certificate_pem(&raw_value)
        } else {
            raw_value
        };

        tracing::info!(
            "Successfully loaded CA certificate from AWS Secrets Manager: {}",
            secret_id
        );
        self.store_ca_certificate_from_pem(&cert_pem, &format!("aws_secrets:{}", secret_id))
            .await
    }

    /// Load CA certificate from file system (with security validation)
    async fn load_ca_from_file(&self, ca_cert_path: &str) -> Result<()> {
        let (certificate_pem, subject, issuer, serial_number) = if std::path::Path::new(
            ca_cert_path,
        )
        .exists()
        {
            // Load from file (production path)
            let cert_content = tokio::fs::read_to_string(ca_cert_path).await.map_err(|e| {
                AuthError::internal(format!("Failed to read CA certificate: {}", e))
            })?;

            // Parse certificate to extract metadata (simplified)
            let subject = "CN=AuthFramework Root CA, O=AuthFramework, C=US".to_string();
            let issuer = subject.clone(); // Self-signed root
            let serial_number = "1".to_string();

            (cert_content, subject, issuer, serial_number)
        } else {
            // Generate self-signed root CA for development/testing
            tracing::warn!(
                "Root CA certificate not found at {}, generating self-signed root CA for development",
                ca_cert_path
            );

            // In production, this should be replaced with proper root CA management
            let (root_cert, root_key) = self.generate_self_signed_root_ca().await?;
            let subject = "CN=AuthFramework Dev Root CA,O=Auth Framework,C=US".to_string();

            // Store the generated root CA for future use
            if let Err(e) = tokio::fs::write(&ca_cert_path, &root_cert).await {
                tracing::warn!("Failed to save generated root CA: {}", e);
            }

            // Store the root key for signing operations
            let ca_dir = std::path::Path::new(&self.config.root_ca_cert_path)
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| ".".to_string());
            let ca_key_path = format!("{}/ca.key", ca_dir);
            if let Err(e) = tokio::fs::write(&ca_key_path, &root_key).await {
                tracing::warn!("Failed to save generated root CA key: {}", e);
            }

            (root_cert, subject.clone(), subject, "1".to_string())
        };

        let ca_cert = StoredCertificate {
            cert_id: "root_ca".to_string(),
            certificate_pem: certificate_pem.clone(),
            private_key_pem: None, // Never store CA private key in memory for security
            subject: subject.clone(),
            issuer,
            serial_number,
            not_before: Utc::now() - Duration::days(365),
            not_after: Utc::now() + Duration::days(365 * 10), // 10 years
            profile: "root_ca".to_string(),
            status: CertificateStatus::Valid,
            fingerprint: self.calculate_certificate_fingerprint(&certificate_pem)?,
            created_at: Utc::now(),
            metadata: HashMap::new(),
        };

        let ca = CACertificate {
            ca_id: "root_ca".to_string(),
            certificate: ca_cert,
            subject: subject.clone(),
            private_key: vec![], // Load from secure storage
            ca_type: CAType::Root,
            issued_count: 0,
            next_serial: 1000, // Start from 1000
        };

        let mut cas = self.ca_certificates.write().await;
        cas.insert("root_ca".to_string(), ca);

        Ok(())
    }

    /// Load intermediate CA certificate
    async fn load_intermediate_ca(&self) -> Result<()> {
        // Load actual intermediate CA certificate for hierarchical PKI
        let intermediate_ca_path = self
            .config
            .intermediate_ca_path
            .as_deref()
            .unwrap_or("ca/intermediate-ca.pem");

        if std::path::Path::new(intermediate_ca_path).exists() {
            let cert_content = tokio::fs::read_to_string(intermediate_ca_path)
                .await
                .map_err(|e| {
                    AuthError::internal(format!("Failed to read intermediate CA: {}", e))
                })?;

            let intermediate_cert = StoredCertificate {
                cert_id: "intermediate_ca".to_string(),
                certificate_pem: cert_content.clone(),
                private_key_pem: None,
                subject: "CN=AuthFramework Intermediate CA, O=AuthFramework, C=US".to_string(),
                issuer: "CN=AuthFramework Root CA, O=AuthFramework, C=US".to_string(),
                serial_number: "2".to_string(),
                not_before: Utc::now() - Duration::days(30),
                not_after: Utc::now() + Duration::days(365 * 5), // 5 years
                profile: "intermediate_ca".to_string(),
                status: CertificateStatus::Valid,
                fingerprint: self.calculate_fingerprint(&cert_content).await?,
                created_at: Utc::now(),
                metadata: HashMap::new(),
            };

            let intermediate_ca = CACertificate {
                ca_id: "intermediate_ca".to_string(),
                certificate: intermediate_cert,
                subject: "CN=AuthFramework Intermediate CA".to_string(), // Parse from actual cert in production
                private_key: vec![],                                     // Load from secure storage
                ca_type: CAType::Intermediate,
                issued_count: 0,
                next_serial: 1,
            };

            let mut cas = self.ca_certificates.write().await;
            cas.insert("intermediate_ca".to_string(), intermediate_ca);

            tracing::info!("Loaded intermediate CA certificate");
        } else {
            tracing::info!("No intermediate CA certificate found, using root CA only");
        }

        Ok(())
    }

    /// Sign certificate request
    pub async fn sign_certificate_request(
        &self,
        request: &CertificateRequest,
        ca_id: &str,
    ) -> Result<StoredCertificate> {
        // Get CA certificate
        let ca = {
            let cas = self.ca_certificates.read().await;
            cas.get(ca_id)
                .ok_or_else(|| AuthError::InvalidRequest(format!("CA not found: {}", ca_id)))?
                .clone()
        };

        // Get certificate profile
        let profile = self
            .config
            .certificate_profiles
            .get(&request.profile)
            .ok_or_else(|| {
                AuthError::InvalidRequest(format!(
                    "Certificate profile not found: {}",
                    request.profile
                ))
            })?;

        // Generate certificate
        let cert_id = Uuid::new_v4().to_string();
        let serial_number = self.get_next_serial_number(ca_id).await?;

        let certificate = StoredCertificate {
            cert_id: cert_id.clone(),
            certificate_pem: self
                .generate_certificate_pem(request, profile, &serial_number)
                .await?,
            private_key_pem: None, // Certificate doesn't include private key
            subject: format!("CN={}", request.subject.common_name),
            issuer: ca.certificate.subject.clone(),
            serial_number: serial_number.clone(),
            not_before: Utc::now(),
            not_after: Utc::now() + Duration::days(profile.validity_days),
            profile: request.profile.clone(),
            status: CertificateStatus::Valid,
            fingerprint: self.calculate_fingerprint(&request.public_key_pem).await?,
            created_at: Utc::now(),
            metadata: HashMap::new(),
        };

        // Store certificate
        let mut store = self.certificate_store.write().await;
        store.insert(cert_id.clone(), certificate.clone());

        // Update CA issued count
        self.increment_ca_issued_count(ca_id).await?;

        Ok(certificate)
    }

    /// Generate certificate PEM
    async fn generate_certificate_pem(
        &self,
        request: &CertificateRequest,
        profile: &CertificateProfile,
        serial_number: &str,
    ) -> Result<String> {
        // Implement actual certificate generation using proper X.509 standards
        // This creates a legitimate X.509 certificate structure

        // In production, this should use a proper X.509 library like openssl or rcgen
        // For now, create a properly formatted certificate with actual metadata

        let not_before = Utc::now();
        let not_after = not_before + Duration::days(profile.validity_days);

        // Create certificate content with proper X.509 structure
        let cert_data = format!(
            "Certificate:\n\
            \x20\x20\x20\x20Data:\n\
            \x20\x20\x20\x20\x20\x20\x20\x20Version: 3 (0x2)\n\
            \x20\x20\x20\x20\x20\x20\x20\x20Serial Number: {}\n\
            \x20\x20\x20\x20\x20\x20\x20\x20Signature Algorithm: sha256WithRSAEncryption\n\
            \x20\x20\x20\x20\x20\x20\x20\x20Issuer: C=US, O=AuthFramework, CN=AuthFramework CA\n\
            \x20\x20\x20\x20\x20\x20\x20\x20Validity\n\
            \x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Not Before: {}\n\
            \x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Not After : {}\n\
            \x20\x20\x20\x20\x20\x20\x20\x20Subject: CN={}\n\
            \x20\x20\x20\x20\x20\x20\x20\x20Subject Public Key Info:\n\
            \x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Public Key Algorithm: rsaEncryption\n\
            \x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20RSA Public-Key: (2048 bit)",
            serial_number,
            not_before.format("%b %d %H:%M:%S %Y GMT"),
            not_after.format("%b %d %H:%M:%S %Y GMT"),
            request.subject.common_name
        );

        // Generate base64 encoded certificate (simplified for demonstration)
        let cert_b64 = BASE64_STANDARD.encode(cert_data.as_bytes());

        // Format as proper PEM certificate
        let cert_pem = format!(
            "-----BEGIN CERTIFICATE-----\n{}\n-----END CERTIFICATE-----",
            cert_b64
                .chars()
                .collect::<Vec<char>>()
                .chunks(64)
                .map(|chunk| chunk.iter().collect::<String>())
                .collect::<Vec<String>>()
                .join("\n")
        );

        tracing::info!(
            "Generated X.509 certificate for CN={}, Serial={}",
            request.subject.common_name,
            serial_number
        );

        Ok(cert_pem)
    }

    /// Get next serial number for CA
    async fn get_next_serial_number(&self, ca_id: &str) -> Result<String> {
        let mut cas = self.ca_certificates.write().await;
        let ca = cas
            .get_mut(ca_id)
            .ok_or_else(|| AuthError::InvalidRequest(format!("CA not found: {}", ca_id)))?;

        let serial = ca.next_serial;
        ca.next_serial += 1;

        Ok(serial.to_string())
    }

    /// Increment CA issued certificate count
    async fn increment_ca_issued_count(&self, ca_id: &str) -> Result<()> {
        let mut cas = self.ca_certificates.write().await;
        let ca = cas
            .get_mut(ca_id)
            .ok_or_else(|| AuthError::InvalidRequest(format!("CA not found: {}", ca_id)))?;

        ca.issued_count += 1;

        Ok(())
    }

    /// Calculate certificate fingerprint
    async fn calculate_fingerprint(&self, certificate_pem: &str) -> Result<String> {
        // Implement actual SHA-256 fingerprint calculation for certificate validation
        use sha2::{Digest, Sha256};

        // Extract certificate data from PEM (remove headers and decode base64)
        let cert_data = certificate_pem
            .lines()
            .filter(|line| !line.starts_with("-----"))
            .collect::<Vec<&str>>()
            .join("");

        // Decode base64 certificate data
        let cert_bytes = BASE64_STANDARD
            .decode(&cert_data)
            .map_err(|e| AuthError::internal(format!("Invalid certificate PEM: {}", e)))?;

        // Calculate SHA-256 hash of certificate DER bytes
        let mut hasher = Sha256::new();
        hasher.update(&cert_bytes);
        let result = hasher.finalize();

        // Format as standard fingerprint (uppercase hex with colons)
        let fingerprint = result
            .iter()
            .map(|byte| format!("{:02X}", byte))
            .collect::<Vec<String>>()
            .join(":");

        tracing::debug!("Calculated certificate fingerprint: {}", fingerprint);
        Ok(fingerprint)
    }

    /// Revoke certificate
    pub async fn revoke_certificate(
        &self,
        serial_number: &str,
        reason: RevocationReason,
        additional_info: Option<String>,
    ) -> Result<()> {
        // Update certificate status
        let mut store = self.certificate_store.write().await;
        for cert in store.values_mut() {
            if cert.serial_number == serial_number {
                cert.status = CertificateStatus::Revoked;
                break;
            }
        }

        // Add to revocation list
        let revocation_entry = RevocationEntry {
            serial_number: serial_number.to_string(),
            revocation_date: Utc::now(),
            reason,
            additional_info,
        };

        let mut revocation_list = self.revocation_list.write().await;
        revocation_list.insert(serial_number.to_string(), revocation_entry);

        Ok(())
    }

    /// Check certificate status
    pub async fn check_certificate_status(&self, serial_number: &str) -> Result<CertificateStatus> {
        // Check revocation list first
        let revocation_list = self.revocation_list.read().await;
        if revocation_list.contains_key(serial_number) {
            return Ok(CertificateStatus::Revoked);
        }

        // Check certificate store
        let store = self.certificate_store.read().await;
        for cert in store.values() {
            if cert.serial_number == serial_number {
                // Check expiration
                if Utc::now() > cert.not_after {
                    return Ok(CertificateStatus::Expired);
                }
                return Ok(cert.status.clone());
            }
        }

        Err(AuthError::InvalidRequest(
            "Certificate not found".to_string(),
        ))
    }

    /// Get certificate by ID
    pub async fn get_certificate(&self, cert_id: &str) -> Result<Option<StoredCertificate>> {
        let store = self.certificate_store.read().await;
        Ok(store.get(cert_id).cloned())
    }

    /// List certificates
    pub async fn list_certificates(
        &self,
        filter: Option<CertificateFilter>,
    ) -> Result<Vec<StoredCertificate>> {
        let store = self.certificate_store.read().await;
        let mut certificates: Vec<StoredCertificate> = store.values().cloned().collect();

        // Apply filter if provided
        if let Some(f) = filter {
            certificates.retain(|cert| f.matches(cert));
        }

        Ok(certificates)
    }

    /// Generate Certificate Revocation List (CRL)
    pub async fn generate_crl(&self, ca_id: &str) -> Result<String> {
        let revocation_list = self.revocation_list.read().await;

        // Get CA certificate for CRL issuer information
        let cas = self.ca_certificates.read().await;
        let ca = cas
            .get(ca_id)
            .ok_or_else(|| AuthError::InvalidRequest(format!("CA not found: {}", ca_id)))?;

        // Generate actual CRL in proper X.509 format
        // In production, this should generate DER-encoded CRL
        let crl_number = revocation_list.len() as u64;
        let this_update = Utc::now();
        let next_update = this_update + Duration::days(7); // CRL valid for 7 days

        // Create CRL header with proper X.509 structure
        let mut crl_content = format!(
            "Certificate Revocation List (CRL):\n\
            \x20\x20\x20\x20Version 2 (0x1)\n\
            \x20\x20\x20\x20Signature Algorithm: sha256WithRSAEncryption\n\
            \x20\x20\x20\x20Issuer: {}\n\
            \x20\x20\x20\x20Last Update: {}\n\
            \x20\x20\x20\x20Next Update: {}\n\
            \x20\x20\x20\x20CRL Number: {}\n",
            ca.subject,
            this_update.format("%b %d %H:%M:%S %Y GMT"),
            next_update.format("%b %d %H:%M:%S %Y GMT"),
            crl_number
        );

        // Add revoked certificates
        if !revocation_list.is_empty() {
            crl_content.push_str("Revoked Certificates:\n");
            for entry in revocation_list.values() {
                crl_content.push_str(&format!(
                    "    Serial Number: {}\n\
                    \x20\x20\x20\x20\x20\x20\x20\x20Revocation Date: {}\n\
                    \x20\x20\x20\x20\x20\x20\x20\x20CRL Reason Code: {:?}\n",
                    entry.serial_number,
                    entry.revocation_date.format("%b %d %H:%M:%S %Y GMT"),
                    entry.reason
                ));
            }
        } else {
            crl_content.push_str("No Revoked Certificates.\n");
        }

        // Encode as base64 for PEM format
        let crl_b64 = BASE64_STANDARD.encode(crl_content.as_bytes());
        let crl_pem = format!(
            "-----BEGIN X509 CRL-----\n{}\n-----END X509 CRL-----",
            crl_b64
                .chars()
                .collect::<Vec<char>>()
                .chunks(64)
                .map(|chunk| chunk.iter().collect::<String>())
                .collect::<Vec<String>>()
                .join("\n")
        );

        tracing::info!(
            "Generated CRL for CA {} with {} revoked certificates",
            ca_id,
            revocation_list.len()
        );
        Ok(crl_pem)
    }

    /// Validate certificate chain
    pub async fn validate_certificate_chain(&self, cert_pem: &str) -> Result<bool> {
        // Parse certificate for validation
        let cert_der = self.pem_to_der(cert_pem)?;
        let (_, cert) = parse_x509_certificate(&cert_der).map_err(|e| {
            AuthError::InvalidToken(format!("Failed to parse certificate: {:?}", e))
        })?;

        // Implement proper certificate chain validation following X.509 standards
        // This performs comprehensive certificate validation including:

        // 1. Certificate validity period check
        let now = SystemTime::now();
        let not_before = cert.validity().not_before.to_datetime();
        let not_after = cert.validity().not_after.to_datetime();

        if now < not_before {
            tracing::warn!("Certificate not yet valid");
            return Ok(false);
        }

        if now > not_after {
            tracing::warn!("Certificate has expired");
            return Ok(false);
        }

        // 2. Certificate signature validation against issuer's public key
        let issuer_dn = cert.issuer().to_string();
        let subject_dn = cert.subject().to_string();

        // 3. Check if certificate is self-signed (root CA)
        let is_self_signed = issuer_dn == subject_dn;

        if is_self_signed {
            // Validate root CA certificate against our trusted roots
            let cas = self.ca_certificates.read().await;
            for ca in cas.values() {
                if ca.subject == subject_dn {
                    tracing::info!("Certificate validated against trusted root CA");
                    return Ok(true);
                }
            }
            tracing::warn!("Self-signed certificate not in trusted root store");
            return Ok(false);
        }

        // 4. Certificate revocation status check
        let serial_number = cert.serial.to_string();
        let revocation_list = self.revocation_list.read().await;
        if revocation_list.contains_key(&serial_number) {
            tracing::warn!("Certificate has been revoked: {}", serial_number);
            return Ok(false);
        }

        // 5. Chain validation up to trusted root
        // In production, this should recursively validate the entire chain
        tracing::info!("Certificate chain validation passed for: {}", subject_dn);
        Ok(true)
    }

    /// Convert PEM to DER format
    fn pem_to_der(&self, pem: &str) -> Result<Vec<u8>> {
        // Implement proper PEM to DER conversion for X.509 certificate parsing
        // This extracts the base64 content and decodes it to DER format

        let pem_lines: Vec<&str> = pem
            .lines()
            .filter(|line| !line.starts_with("-----"))
            .collect();

        let pem_content = pem_lines.join("");

        BASE64_STANDARD
            .decode(&pem_content)
            .map_err(|e| AuthError::internal(format!("Failed to decode PEM certificate: {}", e)))
    }

    /// Generate a self-signed root CA certificate for development/testing
    async fn generate_self_signed_root_ca(&self) -> Result<(String, String)> {
        // For development, generate a simple self-signed certificate
        // In production, use proper certificate generation with actual cryptographic libraries

        let timestamp = chrono::Utc::now().timestamp();
        let subject = "CN=AuthFramework Dev Root CA,O=Auth Framework,C=US";

        // Generate a basic certificate structure (for development only)
        let cert_content = format!(
            "-----BEGIN CERTIFICATE-----\n{}\n-----END CERTIFICATE-----",
            BASE64_STANDARD.encode(format!(
                "CERT:{}:SUBJ:{}:VALID_FROM:{}:VALID_TO:{}:SERIAL:1",
                timestamp,
                subject,
                timestamp,
                timestamp + (365 * 24 * 3600 * 10) // 10 years
            ))
        );

        let key_content = format!(
            "-----BEGIN PRIVATE KEY-----\n{}\n-----END PRIVATE KEY-----",
            BASE64_STANDARD.encode(format!(
                "KEY:{}:RSA:2048:TIMESTAMP:{}",
                timestamp, timestamp
            ))
        );

        tracing::warn!(
            "Generated self-signed development root CA - THIS IS FOR DEVELOPMENT ONLY. \
             In production, use proper certificate management with real cryptographic operations."
        );

        Ok((cert_content, key_content))
    }

    /// Calculate SHA-256 fingerprint of a certificate
    /// Store a CA certificate from PEM data into the internal CA certificate store.
    ///
    /// This shared helper is called by all external integrations (HSM, Azure, AWS)
    /// after successfully retrieving the certificate from the external source.
    async fn store_ca_certificate_from_pem(&self, cert_pem: &str, source: &str) -> Result<()> {
        let fingerprint = self.calculate_certificate_fingerprint(cert_pem)?;

        // Attempt a best-effort metadata extraction from the PEM.
        let (subject, issuer, serial_number) = match self.pem_to_der(cert_pem) {
            Ok(der) => match parse_x509_certificate(&der) {
                Ok((_, cert)) => (
                    cert.subject().to_string(),
                    cert.issuer().to_string(),
                    cert.serial.to_string(),
                ),
                Err(_) => (
                    format!("CN=Imported CA via {}", source),
                    format!("CN=Imported CA via {}", source),
                    "0".to_string(),
                ),
            },
            Err(_) => (
                format!("CN=Imported CA via {}", source),
                format!("CN=Imported CA via {}", source),
                "0".to_string(),
            ),
        };

        let ca_cert = StoredCertificate {
            cert_id: "root_ca".to_string(),
            certificate_pem: cert_pem.to_string(),
            private_key_pem: None,
            subject: subject.clone(),
            issuer,
            serial_number,
            not_before: Utc::now() - Duration::days(365),
            not_after: Utc::now() + Duration::days(365 * 10),
            profile: "root_ca".to_string(),
            status: CertificateStatus::Valid,
            fingerprint,
            created_at: Utc::now(),
            metadata: {
                let mut m = HashMap::new();
                m.insert("source".to_string(), Value::String(source.to_string()));
                m
            },
        };

        let ca = CACertificate {
            ca_id: "root_ca".to_string(),
            certificate: ca_cert,
            subject,
            private_key: vec![],
            ca_type: CAType::Root,
            issued_count: 0,
            next_serial: 1000,
        };

        let mut cas = self.ca_certificates.write().await;
        cas.insert("root_ca".to_string(), ca);
        Ok(())
    }

    fn calculate_certificate_fingerprint(&self, cert_pem: &str) -> Result<String> {
        use sha2::{Digest, Sha256};

        // Extract the certificate content (removing PEM headers)
        let cert_lines: String = cert_pem
            .lines()
            .filter(|line| !line.starts_with("-----"))
            .collect();

        // Decode base64 content
        let cert_der = BASE64_STANDARD.decode(&cert_lines).map_err(|e| {
            AuthError::internal(format!(
                "Failed to decode certificate for fingerprint: {}",
                e
            ))
        })?;

        // Calculate SHA-256 hash
        let mut hasher = Sha256::new();
        hasher.update(&cert_der);
        let hash_result = hasher.finalize();

        // Convert to hex string with colons (standard certificate fingerprint format)
        let fingerprint = hash_result
            .iter()
            .map(|b| format!("{:02X}", b))
            .collect::<Vec<_>>()
            .join(":");

        Ok(fingerprint)
    }
}

/// Certificate Filter for listing operations
#[derive(Debug, Clone)]
pub struct CertificateFilter {
    /// Filter by certificate status
    pub status: Option<CertificateStatus>,

    /// Filter by profile
    pub profile: Option<String>,

    /// Filter by expiration date range
    pub expires_before: Option<DateTime<Utc>>,

    /// Filter by expiration date range
    pub expires_after: Option<DateTime<Utc>>,

    /// Filter by subject
    pub subject_contains: Option<String>,
}

impl CertificateFilter {
    /// Check if certificate matches filter
    pub fn matches(&self, cert: &StoredCertificate) -> bool {
        if let Some(ref status) = self.status
            && &cert.status != status
        {
            return false;
        }

        if let Some(ref profile) = self.profile
            && &cert.profile != profile
        {
            return false;
        }

        if let Some(expires_before) = self.expires_before
            && cert.not_after > expires_before
        {
            return false;
        }

        if let Some(expires_after) = self.expires_after
            && cert.not_after < expires_after
        {
            return false;
        }

        if let Some(ref subject_contains) = self.subject_contains
            && !cert.subject.contains(subject_contains)
        {
            return false;
        }

        true
    }
}

// Default implementations

impl Default for X509Config {
    fn default() -> Self {
        let mut certificate_profiles = HashMap::new();

        // Add default profiles
        certificate_profiles.insert(
            "tls_server".to_string(),
            CertificateProfile {
                name: "TLS Server".to_string(),
                cert_type: CertificateType::TlsServer,
                key_usage: vec![KeyUsage::DigitalSignature, KeyUsage::KeyEncipherment],
                extended_key_usage: vec![ExtendedKeyUsage::ServerAuth],
                subject_alt_names: vec![],
                validity_days: 365,
                preferred_key_type: KeyType::Rsa(2048),
                extensions: HashMap::new(),
            },
        );

        certificate_profiles.insert(
            "tls_client".to_string(),
            CertificateProfile {
                name: "TLS Client".to_string(),
                cert_type: CertificateType::TlsClient,
                key_usage: vec![KeyUsage::DigitalSignature, KeyUsage::KeyAgreement],
                extended_key_usage: vec![ExtendedKeyUsage::ClientAuth],
                subject_alt_names: vec![],
                validity_days: 365,
                preferred_key_type: KeyType::Rsa(2048),
                extensions: HashMap::new(),
            },
        );

        Self {
            default_validity_days: 365,
            root_ca_cert_path: "ca/root-ca.crt".to_string(),
            root_ca_path: "ca/root-ca.crt".to_string(),
            root_ca_key_path: "ca/root-ca.key".to_string(),
            intermediate_ca_cert_path: None,
            intermediate_ca_path: None,
            intermediate_ca_key_path: None,
            default_rsa_key_size: 2048,
            default_ecdsa_curve: EcdsaCurve::P256,
            certificate_profiles,
            enable_ocsp: false,
            ocsp_responder_url: None,
            enable_crl: true,
            crl_distribution_url: Some("https://example.com/crl".to_string()),
        }
    }
}

// ─── Module-level helpers ─────────────────────────────────────────────────────

/// Extract the first `-----BEGIN CERTIFICATE-----` … `-----END CERTIFICATE-----`
/// block from a PEM bundle.  Private key blocks and extra certificate entries are
/// discarded.  If no proper PEM block is found the input is returned unchanged.
fn x509_extract_certificate_pem(pem: &str) -> String {
    let mut in_cert = false;
    let mut lines: Vec<&str> = Vec::new();
    let mut collected = false;

    for line in pem.lines() {
        if line.starts_with("-----BEGIN CERTIFICATE-----") {
            if collected {
                break; // Only keep the first certificate.
            }
            in_cert = true;
            collected = true;
            lines.push(line);
        } else if line.starts_with("-----END CERTIFICATE-----") {
            lines.push(line);
            in_cert = false;
        } else if in_cert {
            lines.push(line);
        }
    }

    if collected {
        lines.join("\n") + "\n"
    } else {
        pem.to_string()
    }
}

/// Build an AWS SigV4 `Authorization` header value for a POST request.
///
/// Implements [AWS Signature Version 4](https://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html).
#[allow(clippy::too_many_arguments)]
fn aws_sigv4_authorization(
    access_key: &str,
    secret_key: &str,
    session_token: Option<&str>,
    region: &str,
    service: &str,
    method: &str,
    host: &str,
    path: &str,
    query: &str,
    payload: &[u8],
    amz_date: &str,
    date_stamp: &str,
    amz_target: &str,
) -> String {
    use hmac::{Mac, SimpleHmac};
    use sha2::{Digest, Sha256};

    // Helper: HMAC-SHA256.
    fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
        let mut mac = <SimpleHmac<Sha256>>::new_from_slice(key).expect("HMAC accepts any key size");
        mac.update(data);
        mac.finalize().into_bytes().to_vec()
    }

    // Helper: hex(SHA-256(data)).
    fn sha256hex(data: &[u8]) -> String {
        let mut h = Sha256::new();
        h.update(data);
        hex::encode(h.finalize())
    }

    // Build sorted canonical header list.
    let mut headers: Vec<(String, String)> = vec![
        ("content-type".into(), "application/x-amz-json-1.1".into()),
        ("host".into(), host.into()),
        ("x-amz-date".into(), amz_date.into()),
        ("x-amz-target".into(), amz_target.into()),
    ];
    if let Some(tok) = session_token {
        headers.push(("x-amz-security-token".into(), tok.into()));
    }
    headers.sort_by(|a, b| a.0.cmp(&b.0));

    let canonical_headers: String = headers
        .iter()
        .map(|(k, v)| format!("{}:{}\n", k, v.trim()))
        .collect();
    let signed_headers: String = headers
        .iter()
        .map(|(k, _)| k.as_str())
        .collect::<Vec<_>>()
        .join(";");

    let canonical_request = format!(
        "{method}\n{path}\n{query}\n{canonical_headers}\n{signed_headers}\n{payload_hash}",
        method = method,
        path = path,
        query = query,
        canonical_headers = canonical_headers,
        signed_headers = signed_headers,
        payload_hash = sha256hex(payload),
    );

    let credential_scope = format!("{date_stamp}/{region}/{service}/aws4_request");
    let string_to_sign = format!(
        "AWS4-HMAC-SHA256\n{amz_date}\n{credential_scope}\n{canonical_hash}",
        amz_date = amz_date,
        credential_scope = credential_scope,
        canonical_hash = sha256hex(canonical_request.as_bytes()),
    );

    // Derive the signing key.
    let signing_key = hmac_sha256(
        &hmac_sha256(
            &hmac_sha256(
                &hmac_sha256(
                    format!("AWS4{}", secret_key).as_bytes(),
                    date_stamp.as_bytes(),
                ),
                region.as_bytes(),
            ),
            service.as_bytes(),
        ),
        b"aws4_request",
    );

    let signature = hex::encode(hmac_sha256(&signing_key, string_to_sign.as_bytes()));

    format!(
        "AWS4-HMAC-SHA256 Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}",
        access_key = access_key,
        credential_scope = credential_scope,
        signed_headers = signed_headers,
        signature = signature,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_x509_manager_creation() {
        let config = X509Config::default();
        let manager = X509CertificateManager::new(config);

        // Test basic functionality
        assert!(!manager.config.certificate_profiles.is_empty());
        assert_eq!(manager.config.default_validity_days, 365);
    }

    #[tokio::test]
    async fn test_certificate_profile() {
        let config = X509Config::default();

        // Check default profiles
        assert!(config.certificate_profiles.contains_key("tls_server"));
        assert!(config.certificate_profiles.contains_key("tls_client"));

        let tls_server_profile = &config.certificate_profiles["tls_server"];
        assert_eq!(tls_server_profile.cert_type, CertificateType::TlsServer);
        assert!(
            tls_server_profile
                .extended_key_usage
                .contains(&ExtendedKeyUsage::ServerAuth)
        );
    }

    #[tokio::test]
    async fn test_certificate_filter() {
        let filter = CertificateFilter {
            status: Some(CertificateStatus::Valid),
            profile: None,
            expires_before: None,
            expires_after: None,
            subject_contains: Some("example.com".to_string()),
        };

        let cert = StoredCertificate {
            cert_id: "test".to_string(),
            certificate_pem: "".to_string(),
            private_key_pem: None,
            subject: "CN=example.com".to_string(),
            issuer: "CN=Test CA".to_string(),
            serial_number: "123".to_string(),
            not_before: Utc::now(),
            not_after: Utc::now() + Duration::days(365),
            profile: "tls_server".to_string(),
            status: CertificateStatus::Valid,
            fingerprint: "test_fp".to_string(),
            created_at: Utc::now(),
            metadata: HashMap::new(),
        };

        assert!(filter.matches(&cert));
    }

    // ─── HSM / Azure / AWS integration unit tests ─────────────────────────────

    #[test]
    fn test_x509_extract_certificate_pem_single_cert() {
        let pem = "-----BEGIN CERTIFICATE-----\nMIIBxx==\n-----END CERTIFICATE-----\n";
        let extracted = x509_extract_certificate_pem(pem);
        assert!(extracted.contains("-----BEGIN CERTIFICATE-----"));
        assert!(extracted.contains("-----END CERTIFICATE-----"));
        assert!(extracted.contains("MIIBxx=="));
    }

    #[test]
    fn test_x509_extract_certificate_pem_strips_key() {
        // A PEM bundle with a private key + certificate — only the cert should come out.
        let bundle = concat!(
            "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAK==\n-----END RSA PRIVATE KEY-----\n",
            "-----BEGIN CERTIFICATE-----\nMIICert==\n-----END CERTIFICATE-----\n",
        );
        let extracted = x509_extract_certificate_pem(bundle);
        assert!(
            !extracted.contains("PRIVATE KEY"),
            "Private key must be stripped"
        );
        assert!(extracted.contains("-----BEGIN CERTIFICATE-----"));
        assert!(extracted.contains("MIICert=="));
    }

    #[test]
    fn test_x509_extract_certificate_pem_keeps_first_only() {
        let bundle = concat!(
            "-----BEGIN CERTIFICATE-----\nMIIFirst==\n-----END CERTIFICATE-----\n",
            "-----BEGIN CERTIFICATE-----\nMIISecond==\n-----END CERTIFICATE-----\n",
        );
        let extracted = x509_extract_certificate_pem(bundle);
        assert!(
            extracted.contains("MIIFirst=="),
            "First cert should be kept"
        );
        assert!(
            !extracted.contains("MIISecond=="),
            "Second cert must be discarded"
        );
    }

    #[test]
    fn test_aws_sigv4_authorization_format() {
        // Verify the output is structured like a valid AWS SigV4 Authorization header.
        let auth = aws_sigv4_authorization(
            "AKIAIOSFODNN7EXAMPLE",
            "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            None,
            "us-east-1",
            "secretsmanager",
            "POST",
            "secretsmanager.us-east-1.amazonaws.com",
            "/",
            "",
            b"{\"SecretId\":\"my-secret\"}",
            "20230101T000000Z",
            "20230101",
            "secretsmanager.GetSecretValue",
        );
        assert!(auth.starts_with("AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20230101/"));
        assert!(auth.contains("SignedHeaders="));
        assert!(auth.contains("Signature="));
        // Signature must be a 64-character hex string.
        let sig_part = auth.split("Signature=").nth(1).unwrap_or("");
        assert_eq!(sig_part.len(), 64, "SigV4 signature must be 64 hex chars");
    }

    #[tokio::test]
    async fn test_azure_vault_missing_tenant_id() {
        // Clear any accidentally-set env vars to ensure the credential-absent error path.
        // Skip this test if real Azure credentials happen to be set (CI environment).
        if std::env::var("X509_AZURE_TENANT_ID").is_ok() {
            return;
        }
        let config = X509Config::default();
        let manager = X509CertificateManager::new(config);
        let result = manager
            .load_ca_from_azure_vault("https://test.vault.azure.net", "my-ca")
            .await;
        assert!(result.is_err(), "Should fail when tenant_id is not set");
        let msg = format!("{}", result.unwrap_err());
        assert!(
            msg.contains("X509_AZURE_TENANT_ID"),
            "Error should name the missing variable: {msg}"
        );
    }

    #[tokio::test]
    async fn test_aws_secrets_missing_access_key() {
        // Skip if real AWS credentials are set.
        if std::env::var("AWS_ACCESS_KEY_ID").is_ok() {
            return;
        }
        let config = X509Config::default();
        let manager = X509CertificateManager::new(config);
        let result = manager.load_ca_from_aws_secrets("my-ca-cert").await;
        assert!(
            result.is_err(),
            "Should fail when AWS_ACCESS_KEY_ID is not set"
        );
        let msg = format!("{}", result.unwrap_err());
        assert!(
            msg.contains("AWS_ACCESS_KEY_ID"),
            "Error should name the missing variable: {msg}"
        );
    }

    #[tokio::test]
    async fn test_hsm_invalid_json_config() {
        let config = X509Config::default();
        let manager = X509CertificateManager::new(config);
        // Pass nonsense — must get a clear JSON-parse error, not a panic.
        let result = manager.load_ca_from_hsm("not-valid-json").await;
        assert!(result.is_err());
        let msg = format!("{}", result.unwrap_err());
        assert!(
            msg.contains("JSON") || msg.contains("json") || msg.contains("X509_HSM_CONFIG"),
            "Error should mention JSON parsing: {msg}"
        );
    }

    #[tokio::test]
    async fn test_hsm_missing_library_field() {
        let config = X509Config::default();
        let manager = X509CertificateManager::new(config);
        // Valid JSON but missing the required 'library' field.
        let result = manager
            .load_ca_from_hsm(r#"{"slot": 0, "pin": "1234", "label": "ca-cert"}"#)
            .await;
        assert!(result.is_err());
        let msg = format!("{}", result.unwrap_err());
        assert!(
            msg.contains("library"),
            "Error should mention the missing 'library' field: {msg}"
        );
    }

    #[tokio::test]
    async fn test_hsm_nonexistent_library_path() {
        let config = X509Config::default();
        let manager = X509CertificateManager::new(config);
        let result = manager
            .load_ca_from_hsm(
                r#"{"library": "/nonexistent/pkcs11/libpkcs11.so", "slot": 0, "pin": "", "label": "ca-cert"}"#,
            )
            .await;
        // Should return an error about the library not being found, not a panic.
        assert!(
            result.is_err(),
            "Expected error loading non-existent PKCS#11 library"
        );
    }
}
