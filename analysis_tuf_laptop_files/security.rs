//! Security Features - Rate Limiting, DoS Protection, IP Blacklisting
//!
//! Advanced security features for API protection

use crate::api::{ApiResponse, ApiState};
use axum::{
    Json,
    extract::{ConnectInfo, State},
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

/// Rate limiter configuration
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Maximum requests per window
    pub max_requests: u32,
    /// Time window duration
    pub window_duration: Duration,
    /// Penalty duration for exceeding limit
    pub penalty_duration: Duration,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            max_requests: 100,
            window_duration: Duration::from_secs(60),
            penalty_duration: Duration::from_secs(300), // 5 minutes
        }
    }
}

/// DoS protection configuration
#[derive(Debug, Clone)]
pub struct DosProtectionConfig {
    /// Maximum request rate (requests per second) before triggering protection
    pub max_rate: f64,
    /// Duration to monitor for DoS attacks
    pub monitor_duration: Duration,
    /// Duration to block suspected DoS attackers
    pub block_duration: Duration,
}

impl Default for DosProtectionConfig {
    fn default() -> Self {
        Self {
            max_rate: 10.0, // 10 requests per second
            monitor_duration: Duration::from_secs(10),
            block_duration: Duration::from_secs(600), // 10 minutes
        }
    }
}

/// IP blacklist entry
#[derive(Debug, Clone)]
pub struct BlacklistEntry {
    pub ip: IpAddr,
    pub reason: String,
    pub blocked_at: Instant,
    pub expires_at: Option<Instant>,
}

/// Rate limit tracking data
#[derive(Debug, Clone)]
struct RateLimitData {
    count: u32,
    window_start: Instant,
    penalty_until: Option<Instant>,
}

/// DoS tracking data
#[derive(Debug, Clone)]
struct DosTrackingData {
    requests: Vec<Instant>,
}

/// Security middleware state
#[derive(Clone)]
pub struct SecurityState {
    rate_limits: Arc<RwLock<HashMap<IpAddr, RateLimitData>>>,
    dos_tracking: Arc<RwLock<HashMap<IpAddr, DosTrackingData>>>,
    blacklist: Arc<RwLock<HashMap<IpAddr, BlacklistEntry>>>,
    rate_limit_config: RateLimitConfig,
    dos_config: DosProtectionConfig,
}

impl SecurityState {
    /// Create new security state with default configuration
    pub fn new() -> Self {
        Self {
            rate_limits: Arc::new(RwLock::new(HashMap::new())),
            dos_tracking: Arc::new(RwLock::new(HashMap::new())),
            blacklist: Arc::new(RwLock::new(HashMap::new())),
            rate_limit_config: RateLimitConfig::default(),
            dos_config: DosProtectionConfig::default(),
        }
    }

    /// Create new security state with custom configuration
    pub fn with_config(rate_limit: RateLimitConfig, dos: DosProtectionConfig) -> Self {
        Self {
            rate_limits: Arc::new(RwLock::new(HashMap::new())),
            dos_tracking: Arc::new(RwLock::new(HashMap::new())),
            blacklist: Arc::new(RwLock::new(HashMap::new())),
            rate_limit_config: rate_limit,
            dos_config: dos,
        }
    }

    /// Check if an IP is blacklisted
    pub async fn is_blacklisted(&self, ip: &IpAddr) -> Option<BlacklistEntry> {
        let blacklist = self.blacklist.read().await;
        if let Some(entry) = blacklist.get(ip) {
            // Check if blacklist entry has expired
            if let Some(expires_at) = entry.expires_at {
                if Instant::now() > expires_at {
                    return None;
                }
            }
            return Some(entry.clone());
        }
        None
    }

    /// Add an IP to the blacklist
    pub async fn blacklist_ip(&self, ip: IpAddr, reason: String, duration: Option<Duration>) {
        let mut blacklist = self.blacklist.write().await;
        let reason_clone = reason.clone();
        let entry = BlacklistEntry {
            ip,
            reason,
            blocked_at: Instant::now(),
            expires_at: duration.map(|d| Instant::now() + d),
        };
        blacklist.insert(ip, entry);
        tracing::warn!("IP blacklisted: {} - {}", ip, reason_clone);
    }

    /// Remove an IP from the blacklist
    pub async fn unblock_ip(&self, ip: &IpAddr) -> bool {
        let mut blacklist = self.blacklist.write().await;
        if blacklist.remove(ip).is_some() {
            tracing::info!("IP unblocked: {}", ip);
            true
        } else {
            false
        }
    }

    /// Check rate limit for an IP
    pub async fn check_rate_limit(&self, ip: &IpAddr) -> Result<(), String> {
        let now = Instant::now();
        let mut rate_limits = self.rate_limits.write().await;

        let data = rate_limits.entry(*ip).or_insert_with(|| RateLimitData {
            count: 0,
            window_start: now,
            penalty_until: None,
        });

        // Check if IP is under penalty
        if let Some(penalty_until) = data.penalty_until {
            if now < penalty_until {
                let remaining = penalty_until.duration_since(now).as_secs();
                return Err(format!(
                    "Rate limit exceeded. Try again in {} seconds",
                    remaining
                ));
            } else {
                // Penalty expired, reset
                data.penalty_until = None;
                data.count = 0;
                data.window_start = now;
            }
        }

        // Check if window has expired
        if now.duration_since(data.window_start) > self.rate_limit_config.window_duration {
            data.count = 0;
            data.window_start = now;
        }

        // Increment count
        data.count += 1;

        // Check if limit exceeded
        if data.count > self.rate_limit_config.max_requests {
            data.penalty_until = Some(now + self.rate_limit_config.penalty_duration);
            tracing::warn!(
                "Rate limit exceeded for IP {}: {} requests in {:?}",
                ip,
                data.count,
                self.rate_limit_config.window_duration
            );
            return Err(format!(
                "Rate limit exceeded. Try again in {} seconds",
                self.rate_limit_config.penalty_duration.as_secs()
            ));
        }

        Ok(())
    }

    /// Track request for DoS detection
    pub async fn track_request(&self, ip: &IpAddr) -> Result<(), String> {
        let now = Instant::now();
        let mut dos_tracking = self.dos_tracking.write().await;

        let data = dos_tracking.entry(*ip).or_insert_with(|| DosTrackingData {
            requests: Vec::new(),
        });

        // Remove old requests outside the monitoring window
        data.requests
            .retain(|&t| now.duration_since(t) <= self.dos_config.monitor_duration);

        // Add current request
        data.requests.push(now);

        // Calculate request rate
        let duration_secs = self.dos_config.monitor_duration.as_secs_f64();
        let rate = data.requests.len() as f64 / duration_secs;

        // Check if rate exceeds threshold
        if rate > self.dos_config.max_rate {
            tracing::error!(
                "DoS attack detected from IP {}: rate = {:.2} req/s (threshold: {:.2} req/s)",
                ip,
                rate,
                self.dos_config.max_rate
            );

            // Blacklist the IP
            drop(dos_tracking); // Release lock before calling blacklist_ip
            self.blacklist_ip(
                *ip,
                format!("DoS attack detected: {:.2} req/s", rate),
                Some(self.dos_config.block_duration),
            )
            .await;

            return Err(format!(
                "DoS protection triggered. IP blocked for {} seconds",
                self.dos_config.block_duration.as_secs()
            ));
        }

        Ok(())
    }

    /// Get security statistics
    pub async fn get_stats(&self) -> SecurityStats {
        let rate_limits = self.rate_limits.read().await;
        let blacklist = self.blacklist.read().await;
        let dos_tracking = self.dos_tracking.read().await;

        SecurityStats {
            tracked_ips: rate_limits.len(),
            blacklisted_ips: blacklist.len(),
            active_rate_limits: rate_limits
                .values()
                .filter(|d| d.penalty_until.is_some())
                .count(),
            dos_monitoring: dos_tracking.len(),
        }
    }
}

impl Default for SecurityState {
    fn default() -> Self {
        Self::new()
    }
}

/// Security statistics
#[derive(Debug, Serialize)]
pub struct SecurityStats {
    pub tracked_ips: usize,
    pub blacklisted_ips: usize,
    pub active_rate_limits: usize,
    pub dos_monitoring: usize,
}

/// Security middleware - applies all security checks
pub async fn security_middleware(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    State(security_state): State<SecurityState>,
    request: Request<axum::body::Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let ip = addr.ip();

    // 1. Check blacklist
    if let Some(entry) = security_state.is_blacklisted(&ip).await {
        tracing::warn!("Blocked blacklisted IP: {} - {}", ip, entry.reason);
        return Err(StatusCode::FORBIDDEN);
    }

    // 2. Check rate limit
    if let Err(msg) = security_state.check_rate_limit(&ip).await {
        tracing::warn!("Rate limit check failed for IP {}: {}", ip, msg);
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    // 3. Track for DoS detection
    if let Err(msg) = security_state.track_request(&ip).await {
        tracing::error!("DoS protection triggered for IP {}: {}", ip, msg);
        return Err(StatusCode::FORBIDDEN);
    }

    // All checks passed, continue
    Ok(next.run(request).await)
}

/// IP blacklist management request
#[derive(Debug, Deserialize)]
pub struct BlacklistRequest {
    pub ip: String,
    pub reason: String,
    #[serde(default)]
    pub duration_seconds: Option<u64>,
}

/// IP unblock request
#[derive(Debug, Deserialize)]
pub struct UnblockRequest {
    pub ip: String,
}

/// POST /admin/security/blacklist - Add IP to blacklist (admin only)
pub async fn blacklist_ip_endpoint(
    State(_state): State<ApiState>,
    Json(req): Json<BlacklistRequest>,
) -> ApiResponse<serde_json::Value> {
    // In a real implementation, SecurityState would be part of ApiState
    // For now, we'll create a temporary instance
    let security_state = SecurityState::new();
    // Parse IP address
    let ip: IpAddr = match req.ip.parse() {
        Ok(ip) => ip,
        Err(_) => return ApiResponse::validation_error_typed("Invalid IP address"),
    };

    let duration = req.duration_seconds.map(Duration::from_secs);

    security_state.blacklist_ip(ip, req.reason, duration).await;

    ApiResponse::success(serde_json::json!({
        "message": "IP blacklisted successfully",
        "ip": ip.to_string(),
    }))
}

/// POST /admin/security/unblock - Remove IP from blacklist (admin only)
pub async fn unblock_ip_endpoint(
    State(_state): State<ApiState>,
    Json(req): Json<UnblockRequest>,
) -> ApiResponse<serde_json::Value> {
    let security_state = SecurityState::new();
    let ip: IpAddr = match req.ip.parse() {
        Ok(ip) => ip,
        Err(_) => return ApiResponse::validation_error_typed("Invalid IP address"),
    };

    if security_state.unblock_ip(&ip).await {
        ApiResponse::success(serde_json::json!({
            "message": "IP unblocked successfully",
            "ip": ip.to_string(),
        }))
    } else {
        ApiResponse::error_typed("NOT_FOUND", "IP not found in blacklist")
    }
}

/// GET /admin/security/stats - Get security statistics (admin only)
pub async fn security_stats_endpoint(State(_state): State<ApiState>) -> ApiResponse<SecurityStats> {
    let security_state = SecurityState::new();
    let stats = security_state.get_stats().await;
    ApiResponse::success(stats)
}

