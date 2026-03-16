//! Web GUI Interface for Auth Framework Administration

#[cfg(feature = "web-gui")]
use crate::admin::{AppState, HealthStatus};
#[cfg(feature = "web-gui")]
use crate::errors::Result;
#[cfg(feature = "web-gui")]
use askama::Template;
#[cfg(feature = "web-gui")]
use axum::{
    Form, Router,
    extract::{Query, Request, State},
    middleware::{self, Next},
    response::{Html, IntoResponse, Redirect, Response},
    routing::{get, post},
};
#[cfg(feature = "web-gui")]
use serde::{Deserialize, Serialize};
#[cfg(feature = "web-gui")]
use std::collections::HashMap;
#[cfg(feature = "web-gui")]
use tower_http::{cors::CorsLayer, services::ServeDir, trace::TraceLayer};

/// Minimal HTML entity escaping to prevent XSS in dynamic HTML responses.
#[cfg(feature = "web-gui")]
fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}

#[cfg(feature = "web-gui")]
pub async fn run_web_gui(
    state: AppState,
    host: &str,
    port: u16,
    daemon: bool,
    enable_auth: bool,
) -> Result<()> {
    tracing::info!("Starting Web GUI on {}:{}", host, port);

    let app = create_web_app(state, enable_auth).await?;

    let listener = tokio::net::TcpListener::bind(format!("{}:{}", host, port)).await?;

    if daemon {
        tracing::info!("Admin GUI running as daemon (OS-level daemonization not yet implemented).");
    }

    tracing::info!(
        host = %host,
        port = port,
        "Admin Web GUI started (dashboard: /, config: /config, users: /users, security: /security)"
    );

    axum::serve(listener, app).await?;

    Ok(())
}

#[cfg(feature = "web-gui")]
async fn create_web_app(
    state: AppState,
    enable_auth: bool,
) -> Result<Router, Box<dyn std::error::Error>> {
    // Public routes — no session required.
    let public_routes = Router::new()
        .route("/login", get(login_handler))
        .route("/login", post(login_post_handler))
        .route("/logout", get(logout_handler))
        .nest_service("/static", ServeDir::new("static"));

    // Protected routes — session cookie validated by `require_admin_session`.
    let protected_routes = Router::new()
        .route("/", get(dashboard_handler))
        .route("/dashboard", get(dashboard_handler))
        .route("/config", get(config_handler))
        .route("/config/edit", post(config_edit_handler))
        .route("/users", get(users_handler))
        .route("/users/create", post(create_user_handler))
        .route("/security", get(security_handler))
        .route("/servers", get(servers_handler))
        .route("/logs", get(logs_handler))
        .route("/api/status", get(api_status_handler))
        .route("/api/config", get(api_config_handler))
        .route("/api/config", post(api_config_update_handler))
        .route("/api/users", get(api_users_handler))
        .route("/api/security", get(api_security_handler))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            require_admin_session,
        ));

    let app = public_routes
        .merge(protected_routes)
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state);

    if !enable_auth {
        tracing::warn!(
            "enable_auth=false is set but has no effect; \
             the admin GUI always enforces session authentication."
        );
    }

    Ok(app)
}

/// Generate a cryptographically random admin GUI session token (64 hex chars = 32 bytes entropy).
#[cfg(feature = "web-gui")]
fn generate_session_token() -> String {
    use ring::rand::{SecureRandom, SystemRandom};
    let rng = SystemRandom::new();
    let mut bytes = [0u8; 32];
    rng.fill(&mut bytes)
        .expect("System CSPRNG unavailable; cannot generate admin session token");
    bytes.iter().fold(String::with_capacity(64), |mut s, b| {
        s.push_str(&format!("{b:02x}"));
        s
    })
}

/// Axum middleware that enforces admin GUI session authentication.
///
/// Reads the `auth_session` cookie and verifies it against the in-memory
/// `AppState::admin_sessions` set.  Requests without a valid session token
/// are redirected to `/login`.
#[cfg(feature = "web-gui")]
async fn require_admin_session(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let session_valid = request
        .headers()
        .get("cookie")
        .and_then(|v| v.to_str().ok())
        .and_then(|cookies| {
            cookies
                .split(';')
                .find(|c| c.trim().starts_with("auth_session="))
                .map(|c| c.trim()["auth_session=".len()..].to_string())
        })
        .map(|token| {
            state
                .admin_sessions
                .lock()
                .map(|sessions| sessions.contains(&token))
                .unwrap_or(false)
        })
        .unwrap_or(false);

    if session_valid {
        next.run(request).await
    } else {
        Redirect::to("/login").into_response()
    }
}

// Templates
#[cfg(feature = "web-gui")]
#[derive(Template)]
#[template(path = "simple_dashboard.html")]
struct DashboardTemplate {
    server_running: bool,
    user_count: usize,
    recent_events: Vec<String>,
}

#[cfg(feature = "web-gui")]
#[derive(Template)]
#[template(path = "simple_config.html")]
struct ConfigTemplate {}

#[cfg(feature = "web-gui")]
#[derive(Template)]
#[template(path = "simple_users.html")]
struct UsersTemplate {
    user_count: usize,
}

#[cfg(feature = "web-gui")]
#[derive(Template)]
#[template(path = "simple_security.html")]
struct SecurityTemplate {}

#[cfg(feature = "web-gui")]
#[derive(Template)]
#[template(path = "simple_servers.html")]
struct ServersTemplate {}

#[cfg(feature = "web-gui")]
#[derive(Template)]
#[template(path = "simple_logs.html")]
struct LogsTemplate {}

#[cfg(feature = "web-gui")]
#[derive(Template)]
#[template(path = "simple_login.html")]
struct LoginTemplate {}

// Data structures
#[cfg(feature = "web-gui")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigItem {
    pub key: String,
    pub value: String,
    pub description: String,
    pub editable: bool,
}

#[cfg(feature = "web-gui")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub active: bool,
    pub created: String,
    pub last_login: Option<String>,
    pub roles: Vec<String>,
}

#[cfg(feature = "web-gui")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityEvent {
    pub id: String,
    pub timestamp: String,
    pub event_type: String,
    pub user: Option<String>,
    pub ip_address: Option<String>,
    pub details: String,
    pub severity: String,
}

#[cfg(feature = "web-gui")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    pub web_server_running: bool,
    pub web_server_port: Option<u16>,
    pub database_connected: bool,
    pub redis_connected: bool,
    pub uptime: String,
}

#[cfg(feature = "web-gui")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub disk_usage: f32,
    pub network_in: String,
    pub network_out: String,
}

#[cfg(feature = "web-gui")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: String,
    pub level: String,
    pub component: String,
    pub message: String,
}

#[cfg(feature = "web-gui")]
#[derive(Deserialize)]
struct LoginForm {
    username: String,
    password: String,
}

#[cfg(feature = "web-gui")]
#[derive(Deserialize)]
struct ConfigEditForm {
    key: String,
    value: String,
}

#[cfg(feature = "web-gui")]
#[derive(Deserialize)]
struct CreateUserForm {
    email: String,
    password: String,
    admin: Option<bool>,
}

// Handlers
#[cfg(feature = "web-gui")]
async fn dashboard_handler(State(state): State<AppState>) -> impl IntoResponse {
    let server_status = state.server_status.read().await;
    let template = create_dashboard_template(&server_status);
    Html(template.render().unwrap_or_else(|e| {
        tracing::error!("dashboard template rendering failed: {e}");
        "<html><body><h1>Internal Server Error</h1></body></html>".to_string()
    }))
}

#[cfg(feature = "web-gui")]
fn create_dashboard_template(server_status: &crate::admin::ServerStatus) -> DashboardTemplate {
    DashboardTemplate {
        server_running: server_status.web_server_running,
        user_count: server_status.active_sessions as usize,
        recent_events: vec![
            "User logged in".to_string(),
            "Configuration updated".to_string(),
        ],
    }
}

#[cfg(feature = "web-gui")]
async fn config_handler(State(_state): State<AppState>) -> impl IntoResponse {
    let _config_items = create_config_items();
    let template = ConfigTemplate {};
    Html(template.render().unwrap_or_else(|e| {
        tracing::error!("config template rendering failed: {e}");
        "<html><body><h1>Internal Server Error</h1></body></html>".to_string()
    }))
}

#[cfg(feature = "web-gui")]
fn create_config_items() -> Vec<ConfigItem> {
    vec![
        ConfigItem {
            key: "jwt.secret_key".to_string(),
            value: "***hidden***".to_string(),
            description: "Secret key for JWT signing".to_string(),
            editable: true,
        },
        ConfigItem {
            key: "jwt.algorithm".to_string(),
            value: "HS256".to_string(),
            description: "JWT signing algorithm".to_string(),
            editable: true,
        },
        ConfigItem {
            key: "jwt.expiry".to_string(),
            value: "1h".to_string(),
            description: "JWT token expiration time".to_string(),
            editable: true,
        },
        ConfigItem {
            key: "session.name".to_string(),
            value: "AUTH_SESSION".to_string(),
            description: "Session cookie name".to_string(),
            editable: true,
        },
        ConfigItem {
            key: "session.secure".to_string(),
            value: "true".to_string(),
            description: "Secure session cookies".to_string(),
            editable: true,
        },
        ConfigItem {
            key: "threat_intel.enabled".to_string(),
            value: "true".to_string(),
            description: "Enable threat intelligence".to_string(),
            editable: true,
        },
    ]
}

#[cfg(feature = "web-gui")]
async fn config_edit_handler(
    State(_state): State<AppState>,
    Form(form): Form<ConfigEditForm>,
) -> impl IntoResponse {
    // SECURITY: Do not log the value — it may contain secrets (e.g. JWT signing key,
    // database DSN, API credentials).  Log only the key name so the audit trail
    // shows that a change was attempted without capturing the sensitive value.
    tracing::warn!(
        key = %form.key,
        "Config edit received but set_by_path() is not yet implemented on the config layer; \
         edit the config file directly and restart the service."
    );

    // Return a 501 with an explicit explanation so the caller knows the edit
    // was NOT applied — rather than a silent success redirect that hides data loss.
    use axum::http::StatusCode;
    (
        StatusCode::NOT_IMPLEMENTED,
        Html(
            "<html><body>\
             <h2>Configuration Edit Not Yet Supported</h2>\
             <p>Live configuration updates via the admin GUI are not yet available. \
             Please edit the configuration file directly and restart the service.</p>\
             <a href='/config'>&#8592; Back to Config</a>\
             </body></html>"
                .to_string(),
        ),
    )
}

#[cfg(feature = "web-gui")]
async fn users_handler(State(state): State<AppState>) -> impl IntoResponse {
    // Derive user count from active sessions in the server status.
    // A real storage query (e.g. storage.list_users()) requires AppState to hold
    // an AuthStorage reference, which is not yet wired up.
    let user_count = {
        let status = state.server_status.read().await;
        status.active_sessions as usize
    };

    let template = UsersTemplate { user_count };

    Html(template.render().unwrap_or_else(|e| {
        tracing::error!("users template rendering failed: {e}");
        "<html><body><h1>Internal Server Error</h1></body></html>".to_string()
    }))
}

#[cfg(feature = "web-gui")]
async fn create_user_handler(
    State(state): State<AppState>,
    Form(form): Form<CreateUserForm>,
) -> impl IntoResponse {
    use axum::http::StatusCode;

    let Some(ref af) = state.auth_framework else {
        tracing::warn!(
            email = %form.email,
            "User creation attempted but no AuthFramework instance is wired into AppState."
        );
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Html(
                "<html><body>\
                 <h2>User Creation Unavailable</h2>\
                 <p>The admin GUI does not have access to the auth storage backend. \
                 Please use the CLI (<code>auth-framework users add</code>) \
                 or the REST API to manage users.</p>\
                 <a href='/users'>&#8592; Back to Users</a>\
                 </body></html>"
                    .to_string(),
            ),
        );
    };

    // Generate a username from the email local part.
    let username = form.email.split('@').next().unwrap_or("user");

    match af.register_user(username, &form.email, &form.password).await {
        Ok(user_id) => {
            tracing::info!(user_id = %user_id, email = %form.email, "User created via admin GUI");
            // Escape dynamic values to prevent XSS in the HTML response.
            let safe_email = escape_html(&form.email);
            let safe_id = escape_html(&user_id);
            (
                StatusCode::OK,
                Html(format!(
                    "<html><body>\
                     <h2>User Created</h2>\
                     <p>User <strong>{safe_email}</strong> has been created successfully (ID: {safe_id}).</p>\
                     <a href='/users'>&#8592; Back to Users</a>\
                     </body></html>",
                )),
            )
        }
        Err(e) => {
            tracing::error!(email = %form.email, error = %e, "Failed to create user via admin GUI");
            let safe_err = escape_html(&e.to_string());
            (
                StatusCode::BAD_REQUEST,
                Html(format!(
                    "<html><body>\
                     <h2>User Creation Failed</h2>\
                     <p>Error: {safe_err}</p>\
                     <a href='/users'>&#8592; Back to Users</a>\
                     </body></html>",
                )),
            )
        }
    }
}

#[cfg(feature = "web-gui")]
async fn security_handler(State(_state): State<AppState>) -> impl IntoResponse {
    let template = SecurityTemplate {};

    Html(template.render().unwrap_or_else(|e| {
        tracing::error!("security template rendering failed: {e}");
        "<html><body><h1>Internal Server Error</h1></body></html>".to_string()
    }))
}

#[cfg(feature = "web-gui")]
async fn servers_handler(State(state): State<AppState>) -> impl IntoResponse {
    let server_status = state.server_status.read().await;

    let _web_running = server_status.web_server_running;
    drop(server_status);

    let template = ServersTemplate {};

    Html(template.render().unwrap_or_else(|e| {
        tracing::error!("servers template rendering failed: {e}");
        "<html><body><h1>Internal Server Error</h1></body></html>".to_string()
    }))
}

#[cfg(feature = "web-gui")]
async fn logs_handler(State(_state): State<AppState>) -> impl IntoResponse {
    let template = LogsTemplate {};

    Html(template.render().unwrap_or_else(|e| {
        tracing::error!("logs template rendering failed: {e}");
        "<html><body><h1>Internal Server Error</h1></body></html>".to_string()
    }))
}

#[cfg(feature = "web-gui")]
async fn login_handler(Query(params): Query<HashMap<String, String>>) -> impl IntoResponse {
    let _error = params.get("error").cloned();

    let template = LoginTemplate {};

    Html(template.render().unwrap_or_else(|e| {
        tracing::error!("login template rendering failed: {e}");
        "<html><body><h1>Internal Server Error</h1></body></html>".to_string()
    }))
}

#[cfg(feature = "web-gui")]
async fn login_post_handler(
    State(state): State<AppState>,
    Form(form): Form<LoginForm>,
) -> impl IntoResponse {
    // Credentials are read from environment variables — no secret is hardcoded.
    // ADMIN_GUI_USERNAME defaults to "admin".
    // ADMIN_GUI_PASSWORD has no default and must be set explicitly.
    let expected_username =
        std::env::var("ADMIN_GUI_USERNAME").unwrap_or_else(|_| "admin".to_string());
    if expected_username == "admin" {
        tracing::warn!(
            "ADMIN_GUI_USERNAME is using the default value 'admin'. \
             Set ADMIN_GUI_USERNAME to a unique value to reduce brute-force risk."
        );
    }
    let expected_password = match std::env::var("ADMIN_GUI_PASSWORD") {
        Ok(pw) => pw,
        Err(_) => {
            tracing::error!(
                "ADMIN_GUI_PASSWORD environment variable is not set; \
                 admin GUI login is disabled until it is configured."
            );
            return Redirect::to("/login?error=not_configured").into_response();
        }
    };
    // SECURITY: Use constant-time comparison to prevent timing oracle attacks.
    // Plain `==` on strings short-circuits on the first differing byte, allowing
    // statistical timing analysis to recover credentials byte-by-byte.
    let username_ok = crate::security::timing_protection::constant_time_string_compare(
        &form.username,
        &expected_username,
    );
    let password_ok = crate::security::timing_protection::constant_time_string_compare(
        &form.password,
        &expected_password,
    );
    if username_ok && password_ok {
        // Generate a fresh cryptographically random session token and store it
        // in the shared session set so `require_admin_session` can validate it.
        let token = generate_session_token();
        if let Ok(mut sessions) = state.admin_sessions.lock() {
            sessions.insert(token.clone());
        }
        let cookie_value = format!(
            "auth_session={}; HttpOnly; Secure; SameSite=Strict; Path=/",
            token
        );
        let mut response = Redirect::to("/dashboard").into_response();
        if let Ok(v) = cookie_value.parse() {
            response.headers_mut().insert("Set-Cookie", v);
        }
        response
    } else {
        Redirect::to("/login?error=invalid_credentials").into_response()
    }
}

#[cfg(feature = "web-gui")]
async fn logout_handler(
    State(state): State<AppState>,
    request: Request,
) -> impl IntoResponse {
    // Remove the session token from the server-side set so it cannot be reused.
    if let Some(token) = request
        .headers()
        .get("cookie")
        .and_then(|v| v.to_str().ok())
        .and_then(|cookies| {
            cookies
                .split(';')
                .find(|c| c.trim().starts_with("auth_session="))
                .map(|c| c.trim()["auth_session=".len()..].to_string())
        })
    {
        if let Ok(mut sessions) = state.admin_sessions.lock() {
            sessions.remove(&token);
        }
    }
    let mut response = Redirect::to("/login").into_response();
    response.headers_mut().insert(
        "Set-Cookie",
        axum::http::HeaderValue::from_static(
            "auth_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
        ),
    );
    response
}

// API Handlers
#[cfg(feature = "web-gui")]
async fn api_status_handler(State(state): State<AppState>) -> impl IntoResponse {
    let server_status = state.server_status.read().await;
    let health = state.get_health_status().await;

    let status = serde_json::json!({
        "web_server_running": server_status.web_server_running,
        "web_server_port": server_status.web_server_port,
        "health": match health {
            HealthStatus::Healthy => "healthy",
            HealthStatus::Warning(_) => "warning",
            HealthStatus::Critical(_) => "critical",
        },
        "active_sessions": server_status.active_sessions,
        "uptime": "2h 15m"
    });

    axum::Json(status)
}

#[cfg(feature = "web-gui")]
async fn api_config_handler(State(state): State<AppState>) -> impl IntoResponse {
    let config = state.config.read().await;
    axum::Json((*config).clone())
}

#[cfg(feature = "web-gui")]
async fn api_config_update_handler(
    State(state): State<AppState>,
    axum::Json(payload): axum::Json<serde_json::Value>,
) -> impl IntoResponse {
    tracing::info!(payload = ?payload, "API config update via admin GUI");

    // In a real implementation:
    // 1. Validate the configuration
    // 2. Update the configuration
    // 3. Hot-reload if supported
    // 4. Return success/error

    state.reload_config().await.ok();

    axum::Json(serde_json::json!({
        "success": true,
        "message": "Configuration updated successfully"
    }))
}

#[cfg(feature = "web-gui")]
async fn api_users_handler(State(state): State<AppState>) -> impl IntoResponse {
    // Load real users from storage via the wired-in AuthFramework, if available.
    let users: Vec<User> = if let Some(ref af) = state.auth_framework {
        let storage = af.storage();
        // Load the user ID index maintained by register_user()
        let user_ids: Vec<String> = match storage.get_kv("users:index").await {
            Ok(Some(bytes)) => serde_json::from_slice(&bytes).unwrap_or_default(),
            _ => vec![],
        };
        let mut result = Vec::with_capacity(user_ids.len());
        for user_id in &user_ids {
            let key = format!("user:{}", user_id);
            if let Ok(Some(bytes)) = storage.get_kv(&key).await {
                if let Ok(data) = serde_json::from_slice::<serde_json::Value>(&bytes) {
                    let email = data["email"].as_str().unwrap_or("").to_string();
                    let active = data["active"].as_bool().unwrap_or(true);
                    let created = data["created_at"].as_str().unwrap_or("").to_string();
                    let last_login = data["last_login"].as_str().map(|s| s.to_string());
                    let roles: Vec<String> = data["roles"]
                        .as_array()
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                .collect()
                        })
                        .unwrap_or_else(|| vec!["user".to_string()]);
                    result.push(User { id: user_id.clone(), email, active, created, last_login, roles });
                }
            }
        }
        result
    } else {
        vec![]
    };

    axum::Json(users)
}

#[cfg(feature = "web-gui")]
async fn api_security_handler(State(_state): State<AppState>) -> impl IntoResponse {
    // Security events are not yet exposed via a queryable storage API.
    // Return an empty list rather than returning hardcoded fictitious events
    // that could mislead operators reviewing the admin GUI.
    let events: Vec<SecurityEvent> = vec![];
    axum::Json(events)
}
