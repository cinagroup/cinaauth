/*!
# Auth Framework

A comprehensive authentication and authorization framework for Rust applications.

This crate provides a unified interface for various authentication methods,
token management, permission checking, and secure credential handling with
a focus on distributed systems.

## API Orientation

- Use [`AuthFramework`] as the default entry point for most applications.
- Use [`ModularAuthFramework`] only when you explicitly want manager-level
  composition and lifecycle control.
- Use [`prelude`] when you want ergonomic imports for application code.
- Use [`AppConfigBuilder`] for simple application-owned configuration values.
- Use [`LayeredConfigBuilder`] and [`ConfigManager`] when you need layered
  configuration from files and environment variables.

## Features

- Multiple authentication methods (OAuth, API keys, JWT, etc.)
- Token issuance, validation, and refresh with RSA and HMAC signing
- RSA key format support: PKCS#1 and PKCS#8 formats auto-detected
- Role-based access control integration
- Permission checking and enforcement
- Secure credential storage
- Authentication middleware for web frameworks
- Distributed authentication with cross-node validation
- Single sign-on capabilities
- Multi-factor authentication support
- Audit logging of authentication events
- Rate limiting and brute force protection
- Session management
- Password hashing and validation
- Customizable authentication flows

## Quick Start

```rust,no_run
use auth_framework::prelude::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Build configuration.  JWT secret must be at least 32 characters.
    let config = AuthConfig::new()
        .token_lifetime(std::time::Duration::from_secs(3600))
        .secret(std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "replace-with-a-32-char-random-secret!!".to_string()));

    let mut auth = AuthFramework::new(config);
    auth.initialize().await?;

    // Register a user.
    let user_id = auth.users().register("alice", "alice@example.com", "s3cr3t!").await?;

    // Issue a token via the grouped token accessor.
    let token = auth.tokens().create(&user_id, vec!["read".into()], "jwt", None).await?;

    // Validate and authorize.
    if auth.tokens().validate(&token).await? {
        if auth.authorization().check(&token, "read", "documents").await? {
            println!("Alice may read documents.");
        }
    }

    Ok(())
}
```

See [`prelude`] for the full set of re-exported types, and the accessor groups
[`AuthFramework::users`], [`AuthFramework::sessions`], [`AuthFramework::tokens`],
[`AuthFramework::authorization`], [`AuthFramework::mfa`], [`AuthFramework::monitoring`],
[`AuthFramework::audit`], and [`AuthFramework::admin`] for organized entry points
into each capability area.

## Security Considerations

- Always use HTTPS in production
- Use strong, unique secrets for token signing
- Enable rate limiting to prevent brute force attacks
- Regularly rotate secrets and keys
- Monitor authentication events for suspicious activity
- Follow the principle of least privilege for permissions

See the [Security Policy](https://github.com/yourusername/auth-framework/blob/main/SECURITY.md)
for comprehensive security guidelines.
*/

// REST API Server
#[cfg(feature = "api-server")]
pub mod api;

// Admin interface (conditional on admin-binary feature)
#[cfg(feature = "admin-binary")]
pub mod admin;

pub mod auth;
pub mod auth_modular; // Advanced component-oriented authentication framework
pub mod auth_operations; // Grouped operation facades over AuthFramework
pub mod authentication; // Supporting auth data types and submodules
pub mod distributed; // Distributed session store abstraction
pub mod errors;
pub mod methods;
pub mod permissions;
pub mod profile_utils;
pub mod providers;
pub mod tenant; // Multi-tenant support for native multi-tenant deployments

// SDK generation for multiple languages
#[cfg(feature = "enhanced-rbac")]
pub mod sdks;

pub mod server;
pub mod storage;
pub mod testing; // Reorganized testing modules
pub mod threat_intelligence; // Automated threat intelligence feed management
pub mod tokens;
pub mod utils;

// Migration utilities for role-system v1.0 integration
pub mod migration;

// Analytics and monitoring for RBAC systems
pub mod analytics;

// Production deployment automation and monitoring
pub mod deployment;

// User context and session management
pub mod user_context;

// Enhanced OAuth2 storage with proper validation
pub mod oauth2_enhanced_storage;

// Canonical OAuth 2.0 client type definitions (RFC 6749 §2.1)
pub mod client;

// OAuth2 server implementation
// Secure OAuth2 server implementation
pub mod oauth2_server;

// Consolidated security modules
pub mod audit;
pub mod authorization;
#[cfg(feature = "role-system")]
pub mod authorization_enhanced;
pub mod distributed_rate_limiting; // Advanced distributed rate limiting
pub mod security;
pub mod session; // Reorganized session modules

// Configuration management
pub mod config;

// Monitoring and metrics collection
pub mod monitoring;

// Enhanced observability
#[cfg(feature = "enhanced-observability")]
pub mod observability;

// Architecture enhancements
#[cfg(feature = "event-sourcing")]
pub mod architecture;

// Web framework integrations
pub mod integrations {
    #[cfg(feature = "axum-integration")]
    pub mod axum;

    #[cfg(feature = "actix-integration")]
    pub mod actix_web;

    #[cfg(feature = "warp-integration")]
    pub mod warp;
}

// Database migrations
pub mod migrations;

// CLI tools
pub mod cli;

// Ergonomic builders and prelude for better developer experience
pub mod builders;
pub mod prelude;

// WS-Security 1.1 and SAML 2.0 support
pub mod saml_assertions;
pub mod ws_security;
pub mod ws_trust;

// Re-exports - Main modular auth framework components
pub use crate::auth::{
    AdminOperations, AuditOperations, AuthFramework, AuthResult, AuthStats,
    AuthorizationOperations, MfaOperations, MonitoringOperations, SessionOperations,
    TokenOperations, UserInfo, UserInfo as CoreUserInfo, UserOperations,
};
pub use crate::auth_modular::AuthFramework as ModularAuthFramework;
pub use authentication::credentials::Credential;
pub use config::app_config::ConfigBuilder as AppConfigBuilder;
pub use config::config_manager::{
    AuthFrameworkSettings, ConfigBuilder as LayeredConfigBuilder, ConfigManager,
};
pub use config::{AuthConfig, app_config::AppConfig};
pub use errors::{AuthError, Result};
pub use methods::{
    ApiKeyMethod, AuthMethod, JwtMethod, MethodResult, OAuth2Method, PasswordMethod,
};

// REST API Server exports
#[cfg(feature = "api-server")]
pub use api::{ApiError, ApiResponse, ApiServer, ApiState};

// SAML support (feature-gated)
#[cfg(feature = "saml")]
pub use methods::saml;

// PKCE support functions
pub use providers::generate_pkce;

pub use permissions::{Permission, PermissionChecker, Role};
pub use profile_utils::{ExtractProfile, TokenToProfile};
pub use providers::{
    DeviceAuthorizationResponse, OAuthProvider, OAuthProviderConfig, ProviderProfile,
};
pub use tokens::AuthToken;

// WS-Security 1.1 and WS-Trust — advanced SOAP-era protocol support.
// Hidden from root docs; access via `auth_framework::ws_security` / `ws_trust`.
#[doc(hidden)]
pub use ws_security::{UsernameToken, WsSecurityClient, WsSecurityConfig, WsSecurityHeader};
#[doc(hidden)]
pub use ws_trust::RequestSecurityToken;

// Server-side authentication and authorization - Now working!
pub use server::oidc::{
    Address, AuthorizationValidationResult, IdTokenClaims, Jwk, JwkSet, LogoutResponse,
    OidcAuthorizationRequest, OidcConfig, OidcDiscoveryDocument, OidcProvider, SubjectType,
    UserInfo as OidcUserInfo,
};

// Phase 2: Logout & Security Ecosystem specifications (advanced OIDC logout protocols).
// Hidden from root docs; access via `auth_framework::server::oidc::oidc_backchannel_logout`
// and `auth_framework::server::oidc::oidc_frontchannel_logout`.
#[doc(hidden)]
pub use server::oidc::oidc_backchannel_logout::{
    BackChannelLogoutConfig, BackChannelLogoutManager, BackChannelLogoutRequest,
    BackChannelLogoutResponse, LogoutEvents, LogoutTokenClaims, NotificationResult,
    RpBackChannelConfig,
};
#[doc(hidden)]
pub use server::oidc::oidc_frontchannel_logout::{
    FailedNotification, FrontChannelLogoutConfig, FrontChannelLogoutManager,
    FrontChannelLogoutRequest, FrontChannelLogoutResponse, RpFrontChannelConfig,
};

// OAuth2 server types and configurations
pub use oauth2_server::{
    AuthorizationRequest, GrantType, OAuth2Config, OAuth2Server, ResponseType, TokenRequest,
    TokenResponse,
};

// Server configuration types — ClientType and ClientConfig come from the canonical `client` module.
pub use client::{ClientConfig, ClientType};
pub use server::{
    ClientRegistrationRequest, WorkingServerConfig,
};

/// Deprecated alias for [`ClientRegistrationRequest`].
#[deprecated(
    since = "0.5.0",
    note = "Use `ClientRegistrationRequest` instead"
)]
pub type ServerClientRegistrationRequest = server::core::client_registration::ClientRegistrationRequest;

// Advanced server modules and RFC implementations.
// Hidden from top-level docs/autocomplete to avoid cluttering the onboarding path;
// access via `auth_framework::server::*` for advanced use.
#[doc(hidden)]
pub use server::DpopManager;
#[doc(hidden)]
pub use server::MetadataProvider;
#[doc(hidden)]
pub use server::OAuth2Server as ServerOAuth2Server;
#[doc(hidden)]
pub use server::PARManager;
#[doc(hidden)]
pub use server::PrivateKeyJwtManager;
#[doc(hidden)]
pub use server::TokenIntrospectionService;

// Security and authentication module re-exports
pub use audit::{AuditEvent, AuditEventType, AuditLogger, EventOutcome, RiskLevel};
pub use authentication::mfa::{MfaMethodType, TotpProvider};
/// Deprecated alias for `authentication::mfa::MfaManager`. Use `auth_modular` MFA operations instead.
#[deprecated(
    since = "0.5.0",
    note = "Use `AuthFramework::mfa()` accessor or `auth_modular::MfaManager` instead"
)]
pub use authentication::mfa::MfaManager as LegacyMfaManager;
pub use authorization::{
    AbacPermission as AuthzPermission, AbacRole as AuthzRole, AccessCondition, AuthorizationEngine,
};
pub use security::secure_jwt::{SecureJwtClaims, SecureJwtConfig, SecureJwtValidator};
pub use security::secure_mfa::SecureMfaService;
pub use security::secure_session::{
    DeviceFingerprint, SecureSession, SecureSessionConfig, SecureSessionManager, SecurityFlags,
};
pub use security::secure_utils::{SecureComparison, SecureRandomGen};
pub use session::manager::{
    DeviceInfo, Session, SessionConfig, SessionManager, SessionState,
};
/// Deprecated alias for [`SessionManager`]. Use `SessionManager` directly.
#[deprecated(
    since = "0.5.0",
    note = "Use `SessionManager` instead"
)]
pub use session::manager::SessionManager as LegacySessionManager;
pub use utils::rate_limit::RateLimiter;

// Multi-tenant support
pub use tenant::{TenantContext, TenantId, TenantMetadata, TenantRegistry, TenantRegistryBuilder};

// Monitoring and metrics
pub use monitoring::{
    HealthCheckResult, HealthStatus, MetricDataPoint, MetricType, MonitoringConfig,
    MonitoringManager, PerformanceMetrics, SecurityEvent, SecurityEventSeverity, SecurityEventType,
};

// Session coordination stats from auth module
pub use auth::SessionCoordinationStats;

// Re-export testing utilities when available
#[cfg(any(test, feature = "testing"))]
pub use testing::{MockAuthMethod, MockStorage}; // Removed helpers temporarily

// Re-export test infrastructure for bulletproof testing
#[cfg(any(test, feature = "testing"))]
pub use testing::{
    test_infrastructure::{TestEnvironmentGuard, test_data},
    utilities::*,
};
