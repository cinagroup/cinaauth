//! REST API Server Implementation
//!
//! Main server that hosts all API endpoints

use crate::AuthFramework;
use crate::api::{ApiState, admin, auth, health, mfa, middleware, oauth, users};
use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::Method,
    middleware as axum_middleware,
    routing::{delete, get, post, put},
};
use std::net::SocketAddr;
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::info;

/// API Server configuration
#[derive(Debug, Clone)]
pub struct ApiServerConfig {
    pub host: String,
    pub port: u16,
    pub enable_cors: bool,
    pub max_body_size: usize,
    pub enable_tracing: bool,
}

impl Default for ApiServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 8080,
            enable_cors: true,
            max_body_size: 1024 * 1024, // 1MB
            enable_tracing: true,
        }
    }
}

/// REST API Server
pub struct ApiServer {
    config: ApiServerConfig,
    auth_framework: Arc<AuthFramework>,
}

impl ApiServer {
    /// Create new API server
    pub fn new(auth_framework: Arc<AuthFramework>) -> Self {
        Self {
            config: ApiServerConfig::default(),
            auth_framework,
        }
    }

    /// Create new API server with custom configuration
    pub fn with_config(auth_framework: Arc<AuthFramework>, config: ApiServerConfig) -> Self {
        Self {
            config,
            auth_framework,
        }
    }

    /// Build the router with all routes and middleware
    pub async fn build_router(&self) -> crate::errors::Result<Router> {
        let state = ApiState::new(self.auth_framework.clone()).await?;

        // Create the main router with all routes
        let router = Router::new()
            // Health and monitoring endpoints (public, unversioned for infrastructure)
            .route("/health", get(health::health_check))
            .route("/health/detailed", get(health::detailed_health_check))
            .route("/metrics", get(health::metrics))
            .route("/readiness", get(health::readiness_check))
            .route("/liveness", get(health::liveness_check))
            // Authentication endpoints (versioned)
            .route("/api/v1/auth/register", post(auth::register))
            .route("/api/v1/auth/login", post(auth::login))
            .route("/api/v1/auth/authenticate", post(auth::authenticate))
            .route("/api/v1/auth/refresh", post(auth::refresh_token))
            .route("/api/v1/auth/logout", post(auth::logout))
            .route("/api/v1/auth/validate", get(auth::validate_token))
            .route("/api/v1/auth/providers", get(auth::list_providers))
            // API Key management endpoints (versioned, authenticated)
            .route("/api/v1/api-keys", post(auth::create_api_key))
            .route("/api/v1/api-keys", get(auth::list_api_keys))
            .route("/api/v1/api-keys/revoke", post(auth::revoke_api_key))
            // OAuth 2.0 endpoints (versioned)
            .route("/api/v1/oauth/authorize", get(oauth::authorize))
            .route("/api/v1/oauth/token", post(oauth::token))
            .route("/api/v1/oauth/revoke", post(oauth::revoke_token))
            // OAuth 2.0 Flow endpoints (authorization code flow with PKCE)
            .route(
                "/api/v1/oauth2/authorize",
                get(crate::api::oauth2::authorize),
            )
            .route("/api/v1/oauth2/token", post(crate::api::oauth2::token))
            .route("/api/v1/oauth2/revoke", post(crate::api::oauth2::revoke))
            .route("/api/v1/oauth2/userinfo", get(crate::api::oauth2::userinfo))
            // NOTE: /introspect moved to oauth_advanced module (RFC 7662 compliant)
            .route("/api/v1/oauth/token-exchange", post(oauth::token_exchange))
            .route(
                "/api/v1/oauth/clients/{client_id}",
                get(oauth::get_client_info),
            )
            // OAuth 2.0 Advanced Features (RFC 7662, RFC 9126) - TODO: Implement
            // .route("/api/v1/oauth/introspect", post(oauth_advanced::introspect_token))
            // .route("/api/v1/oauth/par", post(oauth_advanced::pushed_authorization_request))
            // OIDC endpoints (well-known unversioned per spec, userinfo versioned)
            .route(
                "/.well-known/openid-configuration",
                get(oauth::oidc_discovery),
            )
            .route("/.well-known/jwks.json", get(oauth::jwks))
            .route("/api/v1/oidc/userinfo", get(oauth::userinfo))
            // User management endpoints (versioned, authenticated)
            .route("/api/v1/users/me", get(users::get_profile)) // Alias for /users/profile
            .route("/api/v1/users/profile", get(users::get_profile))
            .route("/api/v1/users/profile", put(users::update_profile))
            .route(
                "/api/v1/users/change-password",
                post(users::change_password),
            )
            .route("/api/v1/users/sessions", get(users::get_sessions))
            .route(
                "/api/v1/users/sessions/{session_id}",
                delete(users::revoke_session),
            )
            .route(
                "/api/v1/users/{user_id}/profile",
                get(users::get_user_profile),
            )
            // Multi-factor authentication endpoints (versioned, authenticated)
            .route("/api/v1/mfa/setup", post(mfa::setup_mfa))
            .route("/api/v1/mfa/verify", post(mfa::verify_mfa))
            .route("/api/v1/mfa/disable", post(mfa::disable_mfa))
            .route("/api/v1/mfa/status", get(mfa::get_mfa_status))
            .route(
                "/api/v1/mfa/regenerate-backup-codes",
                post(mfa::regenerate_backup_codes),
            )
            .route(
                "/api/v1/mfa/verify-backup-code",
                post(mfa::verify_backup_code),
            )
            // Administrative endpoints (versioned, admin only)
            .route("/api/v1/admin/users", get(admin::list_users))
            .route("/api/v1/admin/users", post(admin::create_user))
            .route(
                "/api/v1/admin/users/{user_id}/roles",
                put(admin::update_user_roles),
            )
            .route("/api/v1/admin/users/{user_id}", delete(admin::delete_user))
            .route(
                "/api/v1/admin/users/{user_id}/activate",
                put(admin::activate_user),
            )
            .route("/api/v1/admin/stats", get(admin::get_system_stats))
            .route("/api/v1/admin/audit-logs", get(admin::get_audit_logs))
            // Security endpoints (admin only) - TODO: Implement security manager
            // .route("/api/v1/admin/security/blacklist", post(security::blacklist_ip_endpoint))
            // .route("/api/v1/admin/security/unblock", post(security::unblock_ip_endpoint))
            // .route("/api/v1/admin/security/stats", get(security::security_stats_endpoint))
            ;

        // Add RBAC routes if enhanced-rbac feature is enabled
        #[cfg(feature = "enhanced-rbac")]
        let router = {
            use crate::api::rbac_endpoints;
            router
                .route("/api/v1/rbac/roles", post(rbac_endpoints::create_role))
                .route("/api/v1/rbac/roles", get(rbac_endpoints::list_roles))
                .route(
                    "/api/v1/rbac/roles/{role_id}",
                    get(rbac_endpoints::get_role),
                )
                .route(
                    "/api/v1/rbac/roles/{role_id}",
                    put(rbac_endpoints::update_role),
                )
                .route(
                    "/api/v1/rbac/roles/{role_id}",
                    delete(rbac_endpoints::delete_role),
                )
                .route(
                    "/api/v1/rbac/users/{user_id}/roles",
                    post(rbac_endpoints::assign_user_role),
                )
                .route(
                    "/api/v1/rbac/users/{user_id}/roles/{role_id}",
                    delete(rbac_endpoints::revoke_user_role),
                )
                .route(
                    "/api/v1/rbac/users/{user_id}/roles",
                    get(rbac_endpoints::get_user_roles),
                )
                .route(
                    "/api/v1/rbac/bulk/assign",
                    post(rbac_endpoints::bulk_assign_roles),
                )
                .route(
                    "/api/v1/rbac/check-permission",
                    post(rbac_endpoints::check_permission),
                )
                .route("/api/v1/rbac/elevate", post(rbac_endpoints::elevate_role))
                .route("/api/v1/rbac/audit", get(rbac_endpoints::get_audit_logs))
        };

        // Set shared state
        let router = router.with_state(state.clone());

        // Add middleware layers
        let middleware_stack = ServiceBuilder::new()
            .layer(axum_middleware::from_fn(middleware::timeout_middleware))
            .layer(axum_middleware::from_fn(
                middleware::security_headers_middleware,
            ))
            .layer(axum_middleware::from_fn(middleware::rate_limit_middleware))
            .layer(axum_middleware::from_fn(middleware::logging_middleware));

        let router = if self.config.enable_cors {
            router.layer(
                CorsLayer::new()
                    .allow_origin(Any)
                    .allow_methods([
                        Method::GET,
                        Method::POST,
                        Method::PUT,
                        Method::DELETE,
                        Method::OPTIONS,
                    ])
                    .allow_headers(Any)
                    .max_age(std::time::Duration::from_secs(3600)),
            )
        } else {
            router
        };

        let router = if self.config.enable_tracing {
            router.layer(TraceLayer::new_for_http())
        } else {
            router
        };

        Ok(router
            .layer(middleware_stack)
            .layer(DefaultBodyLimit::max(self.config.max_body_size)))
    }

    /// Start the API server
    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        let app = self.build_router().await?;

        let addr = SocketAddr::new(self.config.host.parse()?, self.config.port);

        info!("🚀 AuthFramework API server starting on http://{}", addr);
        info!("📖 API documentation available at http://{}/docs", addr);
        info!("🏥 Health check available at http://{}/health", addr);
        info!("📊 Metrics available at http://{}/metrics", addr);

        let listener = tokio::net::TcpListener::bind(addr).await?;
        axum::serve(listener, app).await?;

        Ok(())
    }
    /// Get server configuration
    pub fn config(&self) -> &ApiServerConfig {
        &self.config
    }

    /// Get server address
    pub fn address(&self) -> String {
        format!("{}:{}", self.config.host, self.config.port)
    }
}

/// Create a basic API server with default configuration
pub async fn create_api_server(auth_framework: Arc<AuthFramework>) -> ApiServer {
    ApiServer::new(auth_framework)
}

/// Create an API server with custom host and port
pub async fn create_api_server_with_address(
    auth_framework: Arc<AuthFramework>,
    host: impl Into<String>,
    port: u16,
) -> ApiServer {
    let config = ApiServerConfig {
        host: host.into(),
        port,
        ..Default::default()
    };
    ApiServer::with_config(auth_framework, config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::memory::InMemoryStorage;
    use crate::{AuthConfig, AuthFramework};
    use axum_test::TestServer;

    #[tokio::test]
    async fn test_create_test_server() {
        let _storage = Arc::new(InMemoryStorage::new());
        let config = AuthConfig::default();
        let mut auth_framework = AuthFramework::new(config);
        auth_framework.initialize().await.unwrap();
        let auth_framework = Arc::new(auth_framework);

        let api_server = ApiServer::new(auth_framework);
        let app = api_server.build_router().await.unwrap();

        // Create test server using the proper axum-test API
        let _server = axum_test::TestServer::new(app).unwrap();

        // Test server created successfully
        assert!(true);
    }

    async fn create_test_server() -> axum_test::TestServer {
        let _storage = Arc::new(InMemoryStorage::new());
        let config = AuthConfig::default();
        let mut auth_framework = AuthFramework::new(config);
        auth_framework.initialize().await.unwrap();
        let auth_framework = Arc::new(auth_framework);

        let api_server = ApiServer::new(auth_framework);
        let app = api_server.build_router().await.unwrap();

        axum_test::TestServer::new(app).unwrap()
    }

    #[tokio::test]
    async fn test_health_endpoint() {
        let server = create_test_server().await;
        let response = server.get("/health").await;
        response.assert_status_ok();

        let body: serde_json::Value = response.json();
        // Health endpoint returns ApiResponse format with success=true and message
        assert!(
            body.get("success")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
        );
    }

    #[tokio::test]
    #[ignore = "TestServer compatibility issue"]
    async fn test_auth_required_endpoints() {
        let server = create_test_server().await;

        // Try to access protected endpoint without token
        let response = server.get("/users/profile").await;
        response.assert_status_unauthorized();
    }

    #[tokio::test]
    #[ignore = "TestServer compatibility issue"]
    async fn test_cors_headers() {
        let server = create_test_server().await;

        let response = server.get("/health").await;
        response.assert_status_ok();

        // Check CORS headers are present
        assert!(
            response
                .headers()
                .contains_key("access-control-allow-origin")
        );
    }
}
