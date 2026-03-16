//! OAuth 2.0 client types — canonical definitions (RFC 6749 §2.1).
//!
//! [`ClientType`] and [`ClientConfig`] are the single source of truth for client
//! classification used throughout the OAuth 2.0/2.1 stack (domain layer, server
//! layer, and storage layer).  All other modules import these types rather than
//! defining their own copies.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// OAuth 2.0 client classification (RFC 6749 §2.1).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ClientType {
    /// Confidential clients can securely store their credentials (server-side apps).
    Confidential,
    /// Public clients cannot securely store credentials (SPAs, native apps).
    Public,
}

/// Full configuration record for a registered OAuth 2.0 client.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientConfig {
    /// Unique client identifier
    pub client_id: String,
    /// Client secret — only present for `Confidential` clients
    pub client_secret: Option<String>,
    /// RFC 6749 §2.1 client classification
    pub client_type: ClientType,
    /// Authorised redirect URIs
    pub redirect_uris: Vec<String>,
    /// Scopes this client is allowed to request
    pub authorized_scopes: Vec<String>,
    /// Grant types this client is allowed to use
    pub authorized_grant_types: Vec<String>,
    /// Response types this client is allowed to use
    pub authorized_response_types: Vec<String>,
    /// Human-readable display name
    pub client_name: Option<String>,
    /// Optional description
    pub client_description: Option<String>,
    /// Arbitrary metadata (e.g. logo_uri, tos_uri, contacts, …)
    pub metadata: HashMap<String, serde_json::Value>,
}

impl Default for ClientConfig {
    fn default() -> Self {
        Self {
            client_id: Uuid::new_v4().to_string(),
            client_secret: None,
            client_type: ClientType::Public,
            redirect_uris: Vec::new(),
            authorized_scopes: vec!["read".to_string()],
            authorized_grant_types: vec!["authorization_code".to_string()],
            authorized_response_types: vec!["code".to_string()],
            client_name: None,
            client_description: None,
            metadata: HashMap::new(),
        }
    }
}
