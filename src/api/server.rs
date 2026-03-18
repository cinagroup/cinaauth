//! REST API Server Implementation
//!
//! Main server that hosts all API endpoints

use crate::AuthFramework;
#[cfg(feature = "saml")]
use crate::api::saml;
use crate::api::{
    ApiState, admin, auth, health, mfa, middleware, oauth_advanced, oauth2, users, webauthn,
};
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
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;

/// API Server configuration
#[derive(Debug, Clone)]
pub struct ApiServerConfig {
    pub host: String,
    pub port: u16,
    pub enable_cors: bool,
    /// Explicit list of allowed CORS origins, e.g. `["https://app.example.com"]`.
    /// An empty list means CORS is enabled but no origin is whitelisted — effectively
    /// blocking all cross-origin requests while still serving preflight 200s.
    /// Never use `["*"]`; configure the exact origins that need cross-origin access.
    pub allowed_origins: Vec<String>,
    pub max_body_size: usize,
    pub enable_tracing: bool,
}

impl Default for ApiServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 8080,
            enable_cors: false, // Disabled by default; set to true and populate allowed_origins
            allowed_origins: vec![],
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

        // Create nested router for API v1
        let api_v1 = Router::new()
            // Health and monitoring endpoints (public)
            .route("/health", get(health::health_check))
            .route("/health/detailed", get(health::detailed_health_check))
            .route("/metrics", get(health::metrics))
            .route("/readiness", get(health::readiness_check))
            .route("/liveness", get(health::liveness_check))
            // Authentication endpoints (public)
            .route("/auth/login", post(auth::login))
            .route("/auth/register", post(auth::register))
            .route("/auth/refresh", post(auth::refresh_token))
            .route("/auth/logout", post(auth::logout))
            .route("/auth/validate", get(auth::validate_token))
            .route("/auth/providers", get(auth::list_providers))
            .route("/api-keys", post(auth::create_api_key))
            // OAuth 2.0 endpoints
            .route("/oauth/authorize", get(oauth2::authorize))
            .route("/oauth/token", post(oauth2::token))
            .route("/oauth/revoke", post(oauth2::revoke))
            // RFC 7662: Token Introspection (form-encoded, client auth required)
            .route("/oauth/introspect", post(oauth_advanced::introspect_token))
            // RFC 9126: Pushed Authorization Requests
            .route(
                "/oauth/par",
                post(oauth_advanced::pushed_authorization_request),
            )
            .route("/oauth/clients/{client_id}", get(oauth2::get_client_info))
            // User management endpoints (authenticated)
            .route("/users/profile", get(users::get_profile))
            .route("/users/profile", put(users::update_profile))
            .route("/users/change-password", post(users::change_password))
            .route("/users/sessions", get(users::get_sessions))
            .route(
                "/users/sessions/{session_id}",
                delete(users::revoke_session),
            )
            .route("/users/{user_id}/profile", get(users::get_user_profile))
            // Multi-factor authentication endpoints (authenticated)
            .route("/mfa/setup", post(mfa::setup_mfa))
            .route("/mfa/verify", post(mfa::verify_mfa))
            .route("/mfa/disable", post(mfa::disable_mfa))
            .route("/mfa/status", get(mfa::get_mfa_status))
            .route(
                "/mfa/regenerate-backup-codes",
                post(mfa::regenerate_backup_codes),
            )
            .route("/mfa/verify-backup-code", post(mfa::verify_backup_code))
            // Administrative endpoints (admin only)
            .route("/admin/users", get(admin::list_users))
            .route("/admin/users", post(admin::create_user))
            .route(
                "/admin/users/{user_id}/roles",
                put(admin::update_user_roles),
            )
            .route("/admin/users/{user_id}", delete(admin::delete_user))
            .route("/admin/users/{user_id}/activate", put(admin::activate_user))
            .route("/admin/stats", get(admin::get_system_stats))
            .route("/admin/audit-logs", get(admin::get_audit_logs))
            .route("/admin/audit-logs/stats", get(admin::get_audit_log_stats))
            .route(
                "/admin/config",
                get(admin::get_config).put(admin::update_config),
            )
            // WebAuthn endpoints
            .route(
                "/webauthn/registration/init",
                post(webauthn::webauthn_registration_init),
            )
            .route(
                "/webauthn/registration/complete",
                post(webauthn::webauthn_registration_complete),
            )
            .route(
                "/webauthn/authentication/init",
                post(webauthn::webauthn_authentication_init),
            )
            .route(
                "/webauthn/authentication/complete",
                post(webauthn::webauthn_authentication_complete),
            )
            .route(
                "/webauthn/credentials/{username}",
                get(webauthn::list_webauthn_credentials),
            )
            .route(
                "/webauthn/credentials/{username}/{credential_id}",
                delete(webauthn::delete_webauthn_credential),
            );

        // Build the router with conditional SAML routes
        let api_v1 = {
            let router = api_v1;

            #[cfg(feature = "saml")]
            {
                router
                    .route("/saml/metadata", get(saml::get_saml_metadata))
                    .route("/saml/sso", post(saml::initiate_saml_sso))
                    .route("/saml/acs", post(saml::handle_saml_acs))
                    .route("/saml/slo", post(saml::initiate_saml_slo))
                    .route("/saml/slo/response", get(saml::handle_saml_slo_response))
                    .route("/saml/assertion", post(saml::create_saml_assertion))
                    .route("/saml/idps", get(saml::list_saml_idps))
            }

            #[cfg(not(feature = "saml"))]
            {
                router
            }
        };

        // Create the main router with all routes
        let router = Router::new()
            .nest("/api/v1", api_v1)
            .with_state(state.clone());

        // Add middleware layers
        let middleware_stack = ServiceBuilder::new()
            .layer(axum_middleware::from_fn(middleware::timeout_middleware))
            .layer(axum_middleware::from_fn(
                middleware::security_headers_middleware,
            ))
            .layer(axum_middleware::from_fn({
                let state = state.clone();
                move |request, next| {
                    let state = state.clone();
                    async move {
                        middleware::rate_limit_middleware_with_state(state, request, next).await
                    }
                }
            }))
            .layer(axum_middleware::from_fn(middleware::logging_middleware));

        let router = if self.config.enable_cors {
            if self.config.allowed_origins.is_empty() {
                tracing::warn!(
                    "SECURITY/CORS: CORS is enabled but allowed_origins is empty. All cross-origin requests will be rejected! Disable CORS or add allowed origins."
                );
            }

            let header_origins: Vec<axum::http::HeaderValue> = self
                .config
                .allowed_origins
                .iter()
                .filter_map(|o| o.parse::<axum::http::HeaderValue>().ok())
                .collect();

            if header_origins.is_empty() && !self.config.allowed_origins.is_empty() {
                tracing::warn!(
                    "CORS: none of the configured allowed_origins could be parsed as valid HTTP \
                     header values; cross-origin requests will be rejected"
                );
            }

            let allow_origin = tower_http::cors::AllowOrigin::list(header_origins);

            router.layer(
                CorsLayer::new()
                    .allow_origin(allow_origin)
                    .allow_methods([
                        Method::GET,
                        Method::POST,
                        Method::PUT,
                        Method::DELETE,
                        Method::OPTIONS,
                    ])
                    // SECURITY (M-11): Restrict allowed CORS headers to only those the API
                    // actually needs.  Allowing any header lets clients send arbitrary custom
                    // headers, which can be exploited in certain CORS-based attacks.
                    .allow_headers([
                        axum::http::header::AUTHORIZATION,
                        axum::http::header::CONTENT_TYPE,
                        axum::http::header::ACCEPT,
                        axum::http::header::ORIGIN,
                    ])
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
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    async fn create_test_api_server() -> ApiServer {
        let _storage = Arc::new(InMemoryStorage::new());
        let config = AuthConfig::default();
        let auth_framework = Arc::new(AuthFramework::new(config));
        ApiServer::new(auth_framework)
    }

    #[tokio::test]
    async fn test_health_endpoint() {
        let api_server = create_test_api_server().await;
        let router = api_server.build_router().await.unwrap();

        let request = Request::builder()
            .uri("/api/v1/health")
            .method("GET")
            .body(Body::empty())
            .unwrap();

        let response = router.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_auth_required_endpoints() {
        let api_server = create_test_api_server().await;
        let router = api_server.build_router().await.unwrap();

        let request = Request::builder()
            .uri("/api/v1/users/profile")
            .method("GET")
            .body(Body::empty())
            .unwrap();

        let response = router.oneshot(request).await.unwrap();
        // Protected endpoint should reject request without auth
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_cors_headers() {
        let config = AuthConfig::default();
        let auth_framework = Arc::new(AuthFramework::new(config));
        let api_config = ApiServerConfig {
            enable_cors: true,
            allowed_origins: vec!["http://localhost:3000".to_string()],
            ..ApiServerConfig::default()
        };
        let api_server = ApiServer::with_config(auth_framework, api_config);
        let router = api_server.build_router().await.unwrap();

        let request = Request::builder()
            .uri("/api/v1/health")
            .method("GET")
            .header("Origin", "http://localhost:3000")
            .body(Body::empty())
            .unwrap();

        let response = router.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // Check CORS headers are present when a matching Origin is sent
        assert!(
            response
                .headers()
                .contains_key("access-control-allow-origin")
        );
    }
}
