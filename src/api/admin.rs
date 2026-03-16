//! Administrative API Endpoints
//!
//! Handles user management, system configuration, and admin operations

use crate::api::{
    ApiResponse, ApiState, extract_bearer_token, responses::Pagination, validate_api_token,
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::HeaderMap,
};
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Helper: load all user IDs from the global index
// ---------------------------------------------------------------------------
async fn load_user_ids(
    storage: &std::sync::Arc<dyn crate::storage::AuthStorage>,
) -> Vec<String> {
    match storage.get_kv("users:index").await {
        Ok(Some(bytes)) => serde_json::from_slice(&bytes).unwrap_or_default(),
        _ => vec![],
    }
}

// ---------------------------------------------------------------------------
// Helper: load a single user record by user_id and convert to UserListItem
// ---------------------------------------------------------------------------
async fn load_user_item(
    storage: &std::sync::Arc<dyn crate::storage::AuthStorage>,
    user_id: &str,
) -> Option<UserListItem> {
    let key = format!("user:{}", user_id);
    let bytes = storage.get_kv(&key).await.ok()??;
    let data: serde_json::Value = serde_json::from_slice(&bytes).ok()?;

    let username = data["username"].as_str()?.to_string();
    let email = data["email"].as_str().unwrap_or("").to_string();
    let roles: Vec<String> = data["roles"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_else(|| vec!["user".to_string()]);
    let active = data["active"].as_bool().unwrap_or(true);
    let created_at = data["created_at"].as_str().unwrap_or("").to_string();
    let last_login = data["last_login"].as_str().map(|s| s.to_string());

    Some(UserListItem {
        id: user_id.to_string(),
        username,
        email,
        roles,
        active,
        created_at,
        last_login,
    })
}

/// User list item
#[derive(Debug, Serialize)]
pub struct UserListItem {
    pub id: String,
    pub username: String,
    pub email: String,
    pub roles: Vec<String>,
    pub active: bool,
    pub created_at: String,
    pub last_login: Option<String>,
}

/// User list response
#[derive(Debug, Serialize)]
pub struct UserListResponse {
    pub users: Vec<UserListItem>,
    pub pagination: Pagination,
}

/// User list query parameters
#[derive(Debug, Deserialize)]
pub struct UserListQuery {
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub search: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub active: Option<bool>,
}

fn default_page() -> u32 {
    1
}
fn default_limit() -> u32 {
    20
}

/// Create user request
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub email: String,
    #[serde(default)]
    pub first_name: Option<String>,
    #[serde(default)]
    pub last_name: Option<String>,
    #[serde(default)]
    pub roles: Vec<String>,
    #[serde(default = "default_active")]
    pub active: bool,
}

fn default_active() -> bool {
    true
}

/// Update user roles request
#[derive(Debug, Deserialize)]
pub struct UpdateUserRolesRequest {
    pub roles: Vec<String>,
}

/// System stats response
#[derive(Debug, Serialize)]
pub struct SystemStats {
    pub total_users: u64,
    pub active_sessions: u64,
    pub total_tokens: u64,
    pub failed_logins_24h: u64,
    pub system_uptime: String,
    pub memory_usage: String,
    pub cpu_usage: String,
}

/// GET /admin/users
/// List all users (admin only)
pub async fn list_users(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Query(query): Query<UserListQuery>,
) -> ApiResponse<UserListResponse> {
    match extract_bearer_token(&headers) {
        Some(token) => {
            match validate_api_token(&state.auth_framework, &token).await {
                Ok(auth_token) => {
                    if !auth_token.roles.contains(&"admin".to_string()) {
                        return ApiResponse::<UserListResponse>::forbidden_typed();
                    }

                    let storage = state.auth_framework.storage();
                    let all_ids = load_user_ids(&storage).await;

                    let mut users: Vec<UserListItem> = Vec::new();
                    for id in &all_ids {
                        if let Some(item) = load_user_item(&storage, id).await {
                            if let Some(ref search) = query.search {
                                let s = search.to_lowercase();
                                if !item.username.to_lowercase().contains(&s)
                                    && !item.email.to_lowercase().contains(&s)
                                {
                                    continue;
                                }
                            }
                            if let Some(ref role) = query.role {
                                if !item.roles.contains(role) {
                                    continue;
                                }
                            }
                            if let Some(filter_active) = query.active {
                                if item.active != filter_active {
                                    continue;
                                }
                            }
                            users.push(item);
                        }
                    }

                    let total_users = users.len() as u64;
                    let page = if query.page == 0 { 1 } else { query.page };
                    let limit = if query.limit == 0 { 20 } else { query.limit.min(100) };
                    let offset = ((page - 1) * limit) as usize;
                    let total_pages = ((total_users as f64) / (limit as f64)).ceil() as u32;
                    let total_pages = if total_pages == 0 { 1 } else { total_pages };

                    let page_users: Vec<UserListItem> =
                        users.into_iter().skip(offset).take(limit as usize).collect();

                    let pagination = Pagination {
                        page,
                        limit,
                        total: total_users,
                        pages: total_pages,
                    };

                    ApiResponse::success(UserListResponse { users: page_users, pagination })
                }
                Err(e) => {
                    let error_response = ApiResponse::<()>::from(e);
                    ApiResponse::<UserListResponse> {
                        success: error_response.success,
                        data: None,
                        error: error_response.error,
                        message: error_response.message,
                    }
                }
            }
        }
        None => ApiResponse::<UserListResponse>::unauthorized_typed(),
    }
}

/// POST /admin/users
/// Create new user (admin only)
pub async fn create_user(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateUserRequest>,
) -> ApiResponse<UserListItem> {
    // Validate input
    if req.username.is_empty() || req.password.is_empty() || req.email.is_empty() {
        return ApiResponse::<UserListItem>::validation_error_typed(
            "Username, password, and email are required",
        );
    }

    // Validate username format — same rules as the public registration endpoint.
    if crate::utils::validation::validate_username(&req.username).is_err() {
        return ApiResponse::<UserListItem>::validation_error_typed(
            "Invalid username: must be 3-50 characters, start with a letter, and contain only letters, numbers, underscores, or hyphens",
        );
    }

    // Enforce length limits on optional name fields.
    if req.first_name.as_deref().is_some_and(|n| n.len() > 100) {
        return ApiResponse::<UserListItem>::validation_error_typed(
            "First name must be 100 characters or fewer",
        );
    }
    if req.last_name.as_deref().is_some_and(|n| n.len() > 100) {
        return ApiResponse::<UserListItem>::validation_error_typed(
            "Last name must be 100 characters or fewer",
        );
    }

    // Validate email format for consistency with the public registration endpoint.
    if crate::utils::validation::validate_email(&req.email).is_err() {
        return ApiResponse::<UserListItem>::validation_error_typed("Invalid email format");
    }

    // SECURITY (M-12): Use the same password validation as the public register endpoint
    // so that admin-created accounts cannot bypass complexity requirements.
    if let Err(e) = crate::utils::validation::validate_password(&req.password) {
        // Return a generic message to avoid leaking internal validation rule details.
        tracing::warn!("Admin create_user password validation failed: {e}");
        return ApiResponse::<UserListItem>::validation_error_typed(
            "Password does not meet complexity requirements",
        );
    }

    match extract_bearer_token(&headers) {
        Some(token) => {
            match validate_api_token(&state.auth_framework, &token).await {
                Ok(auth_token) => {
                    // Check admin permissions
                    if !auth_token.roles.contains(&"admin".to_string()) {
                        return ApiResponse::forbidden_typed();
                    }

                    match state
                        .auth_framework
                        .register_user(&req.username, &req.email, &req.password)
                        .await
                    {
                        Ok(user_id) => {
                            if !(req.roles.is_empty() || req.roles.len() == 1 && req.roles[0] == "user")
                            {
                                let _ = state
                                    .auth_framework
                                    .update_user_roles(&user_id, &req.roles)
                                    .await;
                            }
                            if !req.active {
                                let _ = state
                                    .auth_framework
                                    .set_user_active(&user_id, false)
                                    .await;
                            }
                            let new_user = UserListItem {
                                id: user_id.clone(),
                                username: req.username.clone(),
                                email: req.email.clone(),
                                roles: if req.roles.is_empty() {
                                    vec!["user".to_string()]
                                } else {
                                    req.roles.clone()
                                },
                                active: req.active,
                                created_at: chrono::Utc::now().to_rfc3339(),
                                last_login: None,
                            };
                            tracing::info!("Admin created user: {} ({})", req.username, user_id);
                            ApiResponse::success(new_user)
                        }
                        Err(e) => {
                            let error_response = ApiResponse::<()>::from(e);
                            ApiResponse::<UserListItem> {
                                success: error_response.success,
                                data: None,
                                error: error_response.error,
                                message: error_response.message,
                            }
                        }
                    }
                }
                Err(e) => {
                    // Convert AuthError to typed response
                    let error_response = ApiResponse::<()>::from(e);
                    ApiResponse::<UserListItem> {
                        success: error_response.success,
                        data: None,
                        error: error_response.error,
                        message: error_response.message,
                    }
                }
            }
        }
        None => ApiResponse::<UserListItem>::unauthorized_typed(),
    }
}

/// PUT /admin/users/{user_id}/roles
/// Update user roles (admin only)
pub async fn update_user_roles(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Path(user_id): Path<String>,
    Json(req): Json<UpdateUserRolesRequest>,
) -> ApiResponse<()> {
    match extract_bearer_token(&headers) {
        Some(token) => {
            match validate_api_token(&state.auth_framework, &token).await {
                Ok(auth_token) => {
                    // Check admin permissions
                    if !auth_token.roles.contains(&"admin".to_string()) {
                        return ApiResponse::forbidden();
                    }

                    match state
                        .auth_framework
                        .update_user_roles(&user_id, &req.roles)
                        .await
                    {
                        Ok(()) => {
                            tracing::info!(
                                "Admin updated roles for user {}: {:?}",
                                user_id,
                                req.roles
                            );
                            ApiResponse::<()>::ok_with_message("User roles updated successfully")
                        }
                        Err(e) => e.into(),
                    }
                }
                Err(e) => e.into(),
            }
        }
        None => ApiResponse::unauthorized(),
    }
}

/// DELETE /admin/users/{user_id}
/// Delete user (admin only)
pub async fn delete_user(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Path(user_id): Path<String>,
) -> ApiResponse<()> {
    match extract_bearer_token(&headers) {
        Some(token) => {
            match validate_api_token(&state.auth_framework, &token).await {
                Ok(auth_token) => {
                    // Check admin permissions
                    if !auth_token.roles.contains(&"admin".to_string()) {
                        return ApiResponse::forbidden();
                    }

                    // Prevent self-deletion
                    if auth_token.user_id == user_id {
                        return ApiResponse::validation_error("Cannot delete your own account");
                    }

                    match state.auth_framework.get_username_by_id(&user_id).await {
                        Ok(username) => {
                            match state.auth_framework.delete_user(&username).await {
                                Ok(()) => {
                                    tracing::info!(
                                        "Admin deleted user: {} ({})",
                                        username,
                                        user_id
                                    );
                                    ApiResponse::<()>::ok_with_message("User deleted successfully")
                                }
                                Err(e) => e.into(),
                            }
                        }
                        Err(e) => e.into(),
                    }
                }
                Err(e) => e.into(),
            }
        }
        None => ApiResponse::unauthorized(),
    }
}

/// PUT /admin/users/{user_id}/activate
/// Activate/deactivate user (admin only)
#[derive(Debug, Deserialize)]
pub struct ActivateUserRequest {
    pub active: bool,
}

pub async fn activate_user(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Path(user_id): Path<String>,
    Json(req): Json<ActivateUserRequest>,
) -> ApiResponse<()> {
    match extract_bearer_token(&headers) {
        Some(token) => {
            match validate_api_token(&state.auth_framework, &token).await {
                Ok(auth_token) => {
                    // Check admin permissions
                    if !auth_token.roles.contains(&"admin".to_string()) {
                        return ApiResponse::forbidden();
                    }

                    match state
                        .auth_framework
                        .set_user_active(&user_id, req.active)
                        .await
                    {
                        Ok(()) => {
                            let action = if req.active { "activated" } else { "deactivated" };
                            tracing::info!("Admin {} user {}", action, user_id);
                            ApiResponse::<()>::ok_with_message(format!("User {} successfully", action))
                        }
                        Err(e) => e.into(),
                    }
                }
                Err(e) => e.into(),
            }
        }
        None => ApiResponse::unauthorized(),
    }
}

/// GET /admin/stats
/// Get system statistics (admin only)
pub async fn get_system_stats(
    State(state): State<ApiState>,
    headers: HeaderMap,
) -> ApiResponse<SystemStats> {
    match extract_bearer_token(&headers) {
        Some(token) => {
            match validate_api_token(&state.auth_framework, &token).await {
                Ok(auth_token) => {
                    // Check admin permissions
                    if !auth_token.roles.contains(&"admin".to_string()) {
                        return ApiResponse::forbidden_typed();
                    }

                    let storage = state.auth_framework.storage();
                    let total_users = load_user_ids(&storage).await.len() as u64;
                    let active_sessions =
                        storage.count_active_sessions().await.unwrap_or(0);

                    // Collect real system metrics via the sysinfo crate.
                    let (system_uptime, memory_usage, cpu_usage) = {
                        use sysinfo::System;
                        let mut sys = System::new();
                        sys.refresh_memory();
                        sys.refresh_cpu_usage();
                        let uptime_secs = System::uptime();
                        let hours = uptime_secs / 3600;
                        let mins = (uptime_secs % 3600) / 60;
                        let secs = uptime_secs % 60;
                        let uptime_str = format!("{hours}h {mins}m {secs}s");
                        let used_mb = sys.used_memory() as f64 / 1_048_576.0;
                        let total_mb = sys.total_memory() as f64 / 1_048_576.0;
                        let mem_str = format!("{used_mb:.1} MB / {total_mb:.1} MB");
                        let cpu_str = format!("{:.1}%", sys.global_cpu_usage());
                        (uptime_str, mem_str, cpu_str)
                    };

                    let stats = SystemStats {
                        total_users,
                        active_sessions,
                        // token count: proxy active sessions — each session
                        // corresponds to at least one issued JWT token.
                        total_tokens: active_sessions,
                        // Persistent audit log not wired; cannot derive 24h
                        // failure count from in-memory state alone.
                        failed_logins_24h: 0,
                        system_uptime,
                        memory_usage,
                        cpu_usage,
                    };

                    ApiResponse::success(stats)
                }
                Err(e) => {
                    let error_response = ApiResponse::<()>::from(e);
                    ApiResponse::<SystemStats> {
                        success: error_response.success,
                        data: None,
                        error: error_response.error,
                        message: error_response.message,
                    }
                }
            }
        }
        None => ApiResponse::unauthorized_typed(),
    }
}

/// GET /admin/audit-logs
/// Get audit logs (admin only)
#[derive(Debug, Serialize)]
pub struct AuditLogEntry {
    pub id: String,
    pub timestamp: String,
    pub user_id: String,
    pub action: String,
    pub resource: String,
    pub ip_address: String,
    pub user_agent: String,
    pub result: String,
}

#[derive(Debug, Serialize)]
pub struct AuditLogResponse {
    pub logs: Vec<AuditLogEntry>,
    pub pagination: Pagination,
}

#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default)]
    pub action: Option<String>,
    #[serde(default)]
    pub start_date: Option<String>,
    #[serde(default)]
    pub end_date: Option<String>,
}

pub async fn get_audit_logs(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Query(query): Query<AuditLogQuery>,
) -> ApiResponse<AuditLogResponse> {
    match extract_bearer_token(&headers) {
        Some(token) => {
            match validate_api_token(&state.auth_framework, &token).await {
                Ok(auth_token) => {
                    // Check admin permissions
                    if !auth_token.roles.contains(&"admin".to_string()) {
                        return ApiResponse::forbidden_typed();
                    }

                    let page = if query.page == 0 { 1 } else { query.page };
                    let limit = if query.limit == 0 { 20 } else { query.limit.min(100) };
                    let offset = ((page - 1) * limit) as usize;
                    let fetch_limit = offset + limit as usize;

                    match state
                        .auth_framework
                        .get_permission_audit_logs(
                            query.user_id.as_deref(),
                            query.action.as_deref(),
                            None,
                            Some(fetch_limit),
                        )
                        .await
                    {
                        Ok(all_logs) => {
                            let total = all_logs.len() as u64;
                            let total_pages =
                                ((total as f64) / (limit as f64)).ceil() as u32;
                            let total_pages = if total_pages == 0 { 1 } else { total_pages };

                            let logs: Vec<AuditLogEntry> = all_logs
                                .into_iter()
                                .skip(offset)
                                .take(limit as usize)
                                .enumerate()
                                .map(|(i, log_str)| {
                                    let (ts, rest) = log_str
                                        .strip_prefix('[')
                                        .and_then(|s| s.split_once(']'))
                                        .map(|(t, r)| {
                                            (t.trim().to_string(), r.trim().to_string())
                                        })
                                        .unwrap_or_else(|| {
                                            ("unknown".to_string(), log_str.clone())
                                        });
                                    let uid = rest
                                        .split_whitespace()
                                        .find(|w| w.starts_with("user="))
                                        .and_then(|w| w.strip_prefix("user="))
                                        .unwrap_or("system")
                                        .to_string();
                                    let result = rest
                                        .split_whitespace()
                                        .find(|w| w.starts_with("outcome="))
                                        .and_then(|w| w.strip_prefix("outcome="))
                                        .unwrap_or("unknown")
                                        .to_string();
                                    AuditLogEntry {
                                        id: format!("audit_{}", offset + i),
                                        timestamp: ts,
                                        user_id: uid,
                                        action: rest,
                                        resource: String::new(),
                                        ip_address: String::new(),
                                        user_agent: String::new(),
                                        result,
                                    }
                                })
                                .collect();

                            ApiResponse::success(AuditLogResponse {
                                logs,
                                pagination: Pagination {
                                    page,
                                    limit,
                                    total,
                                    pages: total_pages,
                                },
                            })
                        }
                        Err(e) => {
                            let error_response = ApiResponse::<()>::from(e);
                            ApiResponse::<AuditLogResponse> {
                                success: error_response.success,
                                data: None,
                                error: error_response.error,
                                message: error_response.message,
                            }
                        }
                    }
                }
                Err(e) => {
                    let error_response = ApiResponse::<()>::from(e);
                    ApiResponse::<AuditLogResponse> {
                        success: error_response.success,
                        data: None,
                        error: error_response.error,
                        message: error_response.message,
                    }
                }
            }
        }
        None => ApiResponse::unauthorized_typed(),
    }
}


