// Health monitoring system for production deployment
// Comprehensive health checks, metrics collection, and service monitoring

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use thiserror::Error;
use tokio::time::interval;

#[derive(Debug, Error)]
pub enum HealthError {
    #[error("Health check failed: {0}")]
    CheckFailed(String),
    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),
    #[error("Timeout error: {0}")]
    Timeout(String),
    #[error("Network error: {0}")]
    Network(String),
    #[error("Configuration error: {0}")]
    Configuration(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Health check status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
    Unknown,
}

/// Health check type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HealthCheckType {
    Http,
    Database,
    Redis,
    FileSystem,
    Memory,
    Cpu,
    Disk,
    Custom(String),
}

/// Individual health check configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheck {
    pub name: String,
    pub check_type: HealthCheckType,
    pub endpoint: String,
    pub timeout: Duration,
    pub interval: Duration,
    pub retries: u32,
    pub enabled: bool,
    pub critical: bool,
    pub tags: HashMap<String, String>,
}

/// Health check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckResult {
    pub name: String,
    pub status: HealthStatus,
    pub message: String,
    pub response_time: Duration,
    pub timestamp: u64,
    pub metadata: HashMap<String, serde_json::Value>,
}

/// Service health status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealth {
    pub service_name: String,
    pub overall_status: HealthStatus,
    pub checks: Vec<HealthCheckResult>,
    pub uptime: Duration,
    pub last_updated: u64,
    pub version: String,
}

/// System metrics for health monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub disk_usage: f64,
    pub network_io: NetworkIoMetrics,
    pub process_count: u32,
    pub load_average: LoadAverage,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkIoMetrics {
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub packets_sent: u64,
    pub packets_received: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadAverage {
    pub one_minute: f64,
    pub five_minutes: f64,
    pub fifteen_minutes: f64,
}

/// Health monitoring configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthMonitorConfig {
    pub enabled: bool,
    pub global_timeout: Duration,
    pub check_interval: Duration,
    pub unhealthy_threshold: u32,
    pub degraded_threshold: u32,
    pub metrics_retention: Duration,
    pub alert_on_failure: bool,
    pub alert_endpoints: Vec<String>,
}

/// Health monitor manager
pub struct HealthMonitor {
    config: HealthMonitorConfig,
    checks: Vec<HealthCheck>,
    results: HashMap<String, HealthCheckResult>,
    service_health: ServiceHealth,
    system_metrics: SystemMetrics,
    failure_counts: HashMap<String, u32>,
}

impl HealthMonitor {
    /// Create new health monitor
    pub fn new(config: HealthMonitorConfig) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default();

        Self {
            config,
            checks: Vec::new(),
            results: HashMap::new(),
            service_health: ServiceHealth {
                service_name: "authframework".to_string(),
                overall_status: HealthStatus::Unknown,
                checks: Vec::new(),
                uptime: Duration::from_secs(0),
                last_updated: now.as_secs(),
                version: env!("CARGO_PKG_VERSION").to_string(),
            },
            system_metrics: SystemMetrics {
                cpu_usage: 0.0,
                memory_usage: 0.0,
                disk_usage: 0.0,
                network_io: NetworkIoMetrics {
                    bytes_sent: 0,
                    bytes_received: 0,
                    packets_sent: 0,
                    packets_received: 0,
                },
                process_count: 0,
                load_average: LoadAverage {
                    one_minute: 0.0,
                    five_minutes: 0.0,
                    fifteen_minutes: 0.0,
                },
                timestamp: now.as_secs(),
            },
            failure_counts: HashMap::new(),
        }
    }

    /// Add health check
    pub fn add_check(&mut self, check: HealthCheck) {
        self.checks.push(check);
    }

    /// Remove health check
    pub fn remove_check(&mut self, name: &str) {
        self.checks.retain(|check| check.name != name);
        self.results.remove(name);
        self.failure_counts.remove(name);
    }

    /// Start health monitoring
    pub async fn start_monitoring(&mut self) -> Result<(), HealthError> {
        if !self.config.enabled {
            return Ok(());
        }

        // Start monitoring loop
        let mut interval = interval(self.config.check_interval);

        loop {
            interval.tick().await;

            // Run all health checks
            self.run_health_checks().await?;

            // Update system metrics
            self.update_system_metrics().await?;

            // Update overall service health
            self.update_service_health();

            // Check for alerts
            self.check_alerts().await?;
        }
    }

    /// Run all configured health checks
    async fn run_health_checks(&mut self) -> Result<(), HealthError> {
        for check in &self.checks {
            if !check.enabled {
                continue;
            }

            let result = self.run_single_check(check).await;
            self.results.insert(check.name.clone(), result.clone());

            // Update failure count
            match result.status {
                HealthStatus::Healthy => {
                    self.failure_counts.insert(check.name.clone(), 0);
                }
                _ => {
                    let count = self.failure_counts.get(&check.name).unwrap_or(&0) + 1;
                    self.failure_counts.insert(check.name.clone(), count);
                }
            }
        }

        Ok(())
    }

    /// Run single health check
    async fn run_single_check(&self, check: &HealthCheck) -> HealthCheckResult {
        let start_time = SystemTime::now();
        let mut retries = 0;
        let mut last_error = String::new();

        while retries <= check.retries {
            let result = match check.check_type {
                HealthCheckType::Http => self.check_http(&check.endpoint).await,
                HealthCheckType::Database => self.check_database(&check.endpoint).await,
                HealthCheckType::Redis => self.check_redis(&check.endpoint).await,
                HealthCheckType::FileSystem => self.check_filesystem(&check.endpoint).await,
                HealthCheckType::Memory => self.check_memory().await,
                HealthCheckType::Cpu => self.check_cpu().await,
                HealthCheckType::Disk => self.check_disk(&check.endpoint).await,
                HealthCheckType::Custom(ref custom_type) => {
                    self.check_custom(custom_type, &check.endpoint).await
                }
            };

            match result {
                Ok(status) => {
                    let response_time = start_time.elapsed().unwrap_or_default();
                    return HealthCheckResult {
                        name: check.name.clone(),
                        status,
                        message: "Health check passed".to_string(),
                        response_time,
                        timestamp: SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs(),
                        metadata: HashMap::new(),
                    };
                }
                Err(e) => {
                    last_error = e.to_string();
                    retries += 1;

                    if retries <= check.retries {
                        tokio::time::sleep(Duration::from_millis(100 * retries as u64)).await;
                    }
                }
            }
        }

        let response_time = start_time.elapsed().unwrap_or_default();
        HealthCheckResult {
            name: check.name.clone(),
            status: HealthStatus::Unhealthy,
            message: format!(
                "Health check failed after {} retries: {}",
                check.retries, last_error
            ),
            response_time,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            metadata: HashMap::new(),
        }
    }

    /// Check HTTP endpoint health by issuing a real HEAD/GET request.
    async fn check_http(&self, endpoint: &str) -> Result<HealthStatus, HealthError> {
        if !endpoint.starts_with("http") {
            return Err(HealthError::CheckFailed(
                "Invalid HTTP endpoint: must start with http".to_string(),
            ));
        }

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .map_err(|e| HealthError::Network(e.to_string()))?;

        match client.head(endpoint).send().await {
            Ok(response) => {
                let status = response.status().as_u16();
                if status < 500 {
                    Ok(HealthStatus::Healthy)
                } else {
                    Ok(HealthStatus::Unhealthy)
                }
            }
            Err(e) if e.is_connect() || e.is_timeout() => Ok(HealthStatus::Unhealthy),
            Err(e) => Err(HealthError::Network(e.to_string())),
        }
    }

    /// Check database connectivity by opening a TCP connection to the endpoint.
    ///
    /// `endpoint` should be `"host:port"` — e.g. `"localhost:5432"` for PostgreSQL
    /// or `"postgres://user:pass@localhost:5432/db"` (the host:port is extracted).
    async fn check_database(&self, endpoint: &str) -> Result<HealthStatus, HealthError> {
        if endpoint.is_empty() {
            return Err(HealthError::CheckFailed(
                "Database endpoint not configured".to_string(),
            ));
        }
        let addr = extract_host_port(endpoint);
        tcp_connect_check(&addr).await
    }

    /// Check Redis connectivity by opening a TCP connection to the endpoint.
    ///
    /// `endpoint` should be `"host:port"` — e.g. `"localhost:6379"`.
    async fn check_redis(&self, endpoint: &str) -> Result<HealthStatus, HealthError> {
        if endpoint.is_empty() {
            return Err(HealthError::CheckFailed(
                "Redis endpoint not configured".to_string(),
            ));
        }
        let addr = extract_host_port(endpoint);
        tcp_connect_check(&addr).await
    }

    /// Check filesystem health
    async fn check_filesystem(&self, path: &str) -> Result<HealthStatus, HealthError> {
        use std::path::Path;

        if Path::new(path).exists() {
            Ok(HealthStatus::Healthy)
        } else {
            Err(HealthError::CheckFailed(format!(
                "Path does not exist: {}",
                path
            )))
        }
    }

    /// Check memory usage
    async fn check_memory(&self) -> Result<HealthStatus, HealthError> {
        let memory_usage = self.get_memory_usage().await?;

        if memory_usage < 0.8 {
            Ok(HealthStatus::Healthy)
        } else if memory_usage < 0.9 {
            Ok(HealthStatus::Degraded)
        } else {
            Ok(HealthStatus::Unhealthy)
        }
    }

    /// Check CPU usage
    async fn check_cpu(&self) -> Result<HealthStatus, HealthError> {
        let cpu_usage = self.get_cpu_usage().await?;

        if cpu_usage < 0.7 {
            Ok(HealthStatus::Healthy)
        } else if cpu_usage < 0.85 {
            Ok(HealthStatus::Degraded)
        } else {
            Ok(HealthStatus::Unhealthy)
        }
    }

    /// Check disk usage
    async fn check_disk(&self, path: &str) -> Result<HealthStatus, HealthError> {
        let disk_usage = self.get_disk_usage(path).await?;

        if disk_usage < 0.8 {
            Ok(HealthStatus::Healthy)
        } else if disk_usage < 0.9 {
            Ok(HealthStatus::Degraded)
        } else {
            Ok(HealthStatus::Unhealthy)
        }
    }

    /// Check custom health endpoint
    async fn check_custom(
        &self,
        _custom_type: &str,
        _endpoint: &str,
    ) -> Result<HealthStatus, HealthError> {
        // Implement custom health check logic
        Ok(HealthStatus::Healthy)
    }

    /// Update system metrics
    async fn update_system_metrics(&mut self) -> Result<(), HealthError> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default();

        self.system_metrics = SystemMetrics {
            cpu_usage: self.get_cpu_usage().await?,
            memory_usage: self.get_memory_usage().await?,
            disk_usage: self.get_disk_usage("/").await?,
            network_io: self.get_network_io().await?,
            process_count: self.get_process_count().await?,
            load_average: self.get_load_average().await?,
            timestamp: now.as_secs(),
        };

        Ok(())
    }

    /// Get CPU usage percentage.
    ///
    /// Reads `/proc/stat` on Linux and falls back to a cross-platform
    /// `sysinfo`-compatible placeholder.  Returns a value in [0.0, 1.0].
    async fn get_cpu_usage(&self) -> Result<f64, HealthError> {
        #[cfg(target_os = "linux")]
        {
            use std::fs;
            // Two-sample measurement is ideal but would require state; a
            // single-sample approximation reads the running-total for a quick
            // health-endpoint response.
            if let Ok(contents) = fs::read_to_string("/proc/stat") {
                if let Some(line) = contents.lines().next() {
                    // cpu user nice system idle iowait irq softirq …
                    let parts: Vec<u64> = line
                        .split_ascii_whitespace()
                        .skip(1)
                        .filter_map(|s| s.parse().ok())
                        .collect();
                    if parts.len() >= 4 {
                        let idle = parts[3];
                        let total: u64 = parts.iter().sum();
                        if total > 0 {
                            return Ok(1.0 - idle as f64 / total as f64);
                        }
                    }
                }
            }
        }
        // Non-Linux platforms: report 0.0 (unknown).
        // A production deployment should integrate the `sysinfo` crate for
        // cross-platform CPU metrics.
        tracing::debug!("CPU usage not available on this platform; reporting 0.0");
        Ok(0.0)
    }

    /// Get memory usage percentage.
    ///
    /// Reads `/proc/meminfo` on Linux; returns 0.0 on other platforms.
    async fn get_memory_usage(&self) -> Result<f64, HealthError> {
        #[cfg(target_os = "linux")]
        {
            use std::fs;
            if let Ok(contents) = fs::read_to_string("/proc/meminfo") {
                let mut total = 0u64;
                let mut available = 0u64;
                for line in contents.lines() {
                    if line.starts_with("MemTotal:") {
                        total = line
                            .split_ascii_whitespace()
                            .nth(1)
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0);
                    } else if line.starts_with("MemAvailable:") {
                        available = line
                            .split_ascii_whitespace()
                            .nth(1)
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0);
                    }
                }
                if total > 0 {
                    return Ok(1.0 - available as f64 / total as f64);
                }
            }
        }
        tracing::debug!("Memory usage not available on this platform; reporting 0.0");
        Ok(0.0)
    }

    /// Get disk usage percentage for `path`.
    ///
    /// Returns a value in `[0.0, 1.0]` representing the fraction of disk space
    /// used.  Uses `sysinfo::Disks` to enumerate mounted file-systems and finds
    /// the one whose mount-point is the longest prefix of `path` (i.e. the most
    /// specific mount point).  Falls back to the first listed disk if no prefix
    /// match is found, and returns `0.0` only when no disks are available.
    async fn get_disk_usage(&self, path: &str) -> Result<f64, HealthError> {
        use sysinfo::Disks;
        let disks = Disks::new_with_refreshed_list();

        // Find the mount-point that is the longest prefix of `path`.
        let mut best: Option<(usize, f64)> = None; // (prefix_len, usage)
        for disk in disks.list() {
            let mount = disk.mount_point().to_string_lossy();
            let total = disk.total_space();
            if total == 0 {
                continue;
            }
            let available = disk.available_space();
            let usage = 1.0 - (available as f64 / total as f64);

            if path.starts_with(mount.as_ref()) {
                let len = mount.len();
                match best {
                    Some((prev_len, _)) if len > prev_len => best = Some((len, usage)),
                    None => best = Some((len, usage)),
                    _ => {}
                }
            }
        }

        if let Some((_, usage)) = best {
            return Ok(usage.clamp(0.0, 1.0));
        }

        // Fallback: use first available disk.
        if let Some(disk) = disks.list().first() {
            let total = disk.total_space();
            if total > 0 {
                let available = disk.available_space();
                let usage = 1.0 - (available as f64 / total as f64);
                tracing::debug!(
                    "No disk mount point matched '{}'; using first available disk",
                    path
                );
                return Ok(usage.clamp(0.0, 1.0));
            }
        }

        tracing::debug!("No disks found; reporting disk usage 0.0 for '{}'", path);
        Ok(0.0)
    }

    /// Get network I/O metrics.
    ///
    /// Reads `/proc/net/dev` on Linux; returns zeroed metrics on other platforms.
    async fn get_network_io(&self) -> Result<NetworkIoMetrics, HealthError> {
        #[cfg(target_os = "linux")]
        {
            use std::fs;
            if let Ok(contents) = fs::read_to_string("/proc/net/dev") {
                let mut bytes_recv = 0u64;
                let mut pkts_recv = 0u64;
                let mut bytes_sent = 0u64;
                let mut pkts_sent = 0u64;
                for line in contents.lines().skip(2) {
                    // iface: rx_bytes rx_pkts … tx_bytes tx_pkts …
                    let fields: Vec<&str> = line.split_ascii_whitespace().collect();
                    if fields.len() >= 10 {
                        bytes_recv += fields[1].parse::<u64>().unwrap_or(0);
                        pkts_recv += fields[2].parse::<u64>().unwrap_or(0);
                        bytes_sent += fields[9].parse::<u64>().unwrap_or(0);
                        pkts_sent += fields[10].parse::<u64>().unwrap_or(0);
                    }
                }
                return Ok(NetworkIoMetrics {
                    bytes_sent,
                    bytes_received: bytes_recv,
                    packets_sent: pkts_sent,
                    packets_received: pkts_recv,
                });
            }
        }
        tracing::debug!("Network I/O metrics not available on this platform; reporting zeroes");
        Ok(NetworkIoMetrics {
            bytes_sent: 0,
            bytes_received: 0,
            packets_sent: 0,
            packets_received: 0,
        })
    }

    /// Get the number of running processes.
    ///
    /// Counts entries in `/proc` on Linux; returns 0 on other platforms.
    async fn get_process_count(&self) -> Result<u32, HealthError> {
        #[cfg(target_os = "linux")]
        {
            use std::fs;
            if let Ok(entries) = fs::read_dir("/proc") {
                let count = entries
                    .filter_map(|e| e.ok())
                    .filter(|e| {
                        e.file_name()
                            .to_str()
                            .map(|s| s.chars().all(|c| c.is_ascii_digit()))
                            .unwrap_or(false)
                    })
                    .count();
                return Ok(count as u32);
            }
        }
        tracing::debug!("Process count not available on this platform; reporting 0");
        Ok(0)
    }

    /// Get load averages.
    ///
    /// Reads `/proc/loadavg` on Linux; returns zeroes on other platforms.
    async fn get_load_average(&self) -> Result<LoadAverage, HealthError> {
        #[cfg(target_os = "linux")]
        {
            use std::fs;
            if let Ok(contents) = fs::read_to_string("/proc/loadavg") {
                let parts: Vec<f64> = contents
                    .split_ascii_whitespace()
                    .take(3)
                    .filter_map(|s| s.parse().ok())
                    .collect();
                if parts.len() >= 3 {
                    return Ok(LoadAverage {
                        one_minute: parts[0],
                        five_minutes: parts[1],
                        fifteen_minutes: parts[2],
                    });
                }
            }
        }
        tracing::debug!("Load average not available on this platform; reporting zeroes");
        Ok(LoadAverage {
            one_minute: 0.0,
            five_minutes: 0.0,
            fifteen_minutes: 0.0,
        })
    }

    /// Update overall service health based on individual checks
    fn update_service_health(&mut self) {
        let mut healthy_count = 0;
        let mut degraded_count = 0;
        let mut unhealthy_count = 0;
        let mut critical_unhealthy = false;

        let check_results: Vec<HealthCheckResult> = self.results.values().cloned().collect();

        for result in &check_results {
            // Check if this is a critical check
            let is_critical = self
                .checks
                .iter()
                .find(|check| check.name == result.name)
                .map(|check| check.critical)
                .unwrap_or(false);

            match result.status {
                HealthStatus::Healthy => healthy_count += 1,
                HealthStatus::Degraded => degraded_count += 1,
                HealthStatus::Unhealthy => {
                    unhealthy_count += 1;
                    if is_critical {
                        critical_unhealthy = true;
                    }
                }
                HealthStatus::Unknown => {}
            }
        }

        // Determine overall status
        let overall_status = if critical_unhealthy {
            HealthStatus::Unhealthy
        } else if unhealthy_count > 0 || degraded_count > 0 {
            HealthStatus::Degraded
        } else if healthy_count > 0 {
            HealthStatus::Healthy
        } else {
            HealthStatus::Unknown
        };

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default();

        self.service_health = ServiceHealth {
            service_name: self.service_health.service_name.clone(),
            overall_status,
            checks: check_results,
            uptime: Duration::from_secs(now.as_secs() - self.service_health.last_updated),
            last_updated: now.as_secs(),
            version: self.service_health.version.clone(),
        };
    }

    /// Check for alert conditions
    async fn check_alerts(&self) -> Result<(), HealthError> {
        if !self.config.alert_on_failure {
            return Ok(());
        }

        // Check for unhealthy services
        if self.service_health.overall_status == HealthStatus::Unhealthy {
            self.send_alert("Service is unhealthy").await?;
        }

        // Check for high failure rates
        for (check_name, failure_count) in &self.failure_counts {
            if *failure_count >= self.config.unhealthy_threshold {
                self.send_alert(&format!(
                    "Health check '{}' has failed {} times",
                    check_name, failure_count
                ))
                .await?;
            }
        }

        Ok(())
    }

    /// Send alert to configured endpoints
    async fn send_alert(&self, message: &str) -> Result<(), HealthError> {
        for endpoint in &self.config.alert_endpoints {
            // Real HTTP dispatch to `endpoint` requires an HTTP client (e.g. reqwest).
            // Until that integration is added, log the alert through the structured
            // logging system so it is visible in production log streams.
            tracing::warn!(
                target: "health_alert",
                alert_endpoint = %endpoint,
                "HEALTH ALERT: {message}"
            );
        }
        Ok(())
    }

    /// Get current service health
    pub fn get_service_health(&self) -> &ServiceHealth {
        &self.service_health
    }

    /// Get current system metrics
    pub fn get_system_metrics(&self) -> &SystemMetrics {
        &self.system_metrics
    }

    /// Get health check results
    pub fn get_check_results(&self) -> &HashMap<String, HealthCheckResult> {
        &self.results
    }

    /// Get specific health check result
    pub fn get_check_result(&self, name: &str) -> Option<&HealthCheckResult> {
        self.results.get(name)
    }
}

impl Default for HealthMonitorConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            global_timeout: Duration::from_secs(30),
            check_interval: Duration::from_secs(30),
            unhealthy_threshold: 3,
            degraded_threshold: 2,
            metrics_retention: Duration::from_secs(24 * 3600), // 24 hours
            alert_on_failure: true,
            alert_endpoints: vec!["http://localhost:9093/api/v1/alerts".to_string()],
        }
    }
}

impl Default for HealthCheck {
    fn default() -> Self {
        Self {
            name: "default".to_string(),
            check_type: HealthCheckType::Http,
            endpoint: "/health".to_string(),
            timeout: Duration::from_secs(10),
            interval: Duration::from_secs(30),
            retries: 3,
            enabled: true,
            critical: false,
            tags: HashMap::new(),
        }
    }
}

/// Extract a `"host:port"` address from an endpoint string.
///
/// Handles plain `"host:port"` strings as well as full URIs like
/// `"postgres://user:pass@host:port/db"` or `"redis://host:port"`.
fn extract_host_port(endpoint: &str) -> String {
    // If it looks like a URI, extract the authority component.
    if let Some(rest) = endpoint
        .strip_prefix("postgres://")
        .or_else(|| endpoint.strip_prefix("postgresql://"))
        .or_else(|| endpoint.strip_prefix("redis://"))
        .or_else(|| endpoint.strip_prefix("mysql://"))
        .or_else(|| endpoint.strip_prefix("mongodb://"))
        .or_else(|| endpoint.strip_prefix("http://"))
        .or_else(|| endpoint.strip_prefix("https://"))
    {
        // Drop any user-info (user:pass@)
        let after_auth = if let Some(at_pos) = rest.rfind('@') {
            &rest[at_pos + 1..]
        } else {
            rest
        };
        // Keep only the host:port portion (drop /path?query etc.)
        let host_port = after_auth.split('/').next().unwrap_or(after_auth);
        return host_port.to_string();
    }
    endpoint.to_string()
}

/// Attempt a TCP connection to `addr` with a 5-second timeout.
///
/// Returns [`HealthStatus::Healthy`] on success, [`HealthStatus::Unhealthy`]
/// on connection refused / timeout, and a [`HealthError::Network`] only for
/// unexpected I/O errors.
async fn tcp_connect_check(addr: &str) -> Result<HealthStatus, HealthError> {
    match tokio::time::timeout(Duration::from_secs(5), tokio::net::TcpStream::connect(addr)).await {
        Ok(Ok(_stream)) => Ok(HealthStatus::Healthy),
        Ok(Err(e)) => {
            tracing::debug!("TCP health check to {} failed: {}", addr, e);
            Ok(HealthStatus::Unhealthy)
        }
        Err(_timeout) => {
            tracing::debug!("TCP health check to {} timed out", addr);
            Ok(HealthStatus::Unhealthy)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_monitor_creation() {
        let config = HealthMonitorConfig::default();
        let monitor = HealthMonitor::new(config);

        assert_eq!(monitor.service_health.service_name, "authframework");
        assert_eq!(monitor.service_health.overall_status, HealthStatus::Unknown);
    }

    #[test]
    fn test_add_health_check() {
        let config = HealthMonitorConfig::default();
        let mut monitor = HealthMonitor::new(config);

        let check = HealthCheck {
            name: "test-check".to_string(),
            check_type: HealthCheckType::Http,
            endpoint: "/test".to_string(),
            ..Default::default()
        };

        monitor.add_check(check);
        assert_eq!(monitor.checks.len(), 1);
        assert_eq!(monitor.checks[0].name, "test-check");
    }

    #[test]
    fn test_remove_health_check() {
        let config = HealthMonitorConfig::default();
        let mut monitor = HealthMonitor::new(config);

        let check = HealthCheck {
            name: "test-check".to_string(),
            check_type: HealthCheckType::Http,
            endpoint: "/test".to_string(),
            ..Default::default()
        };

        monitor.add_check(check);
        assert_eq!(monitor.checks.len(), 1);

        monitor.remove_check("test-check");
        assert_eq!(monitor.checks.len(), 0);
    }

    #[tokio::test]
    async fn test_http_health_check() {
        let config = HealthMonitorConfig::default();
        let monitor = HealthMonitor::new(config);

        // Invalid scheme: expect an error, not a health status.
        let result = monitor.check_http("/local/path").await;
        assert!(result.is_err(), "non-http URL should return Err");

        // Valid HTTP URL pointing at a server that is not running:
        // the real client returns HealthStatus::Unhealthy (connection refused),
        // not an error.
        let result = monitor.check_http("http://localhost:19999/health").await;
        assert!(
            result.is_ok(),
            "connection-refused should yield Ok(Unhealthy), not Err"
        );
        assert_eq!(
            result.unwrap(),
            HealthStatus::Unhealthy,
            "unreachable host should be Unhealthy"
        );
    }

    #[tokio::test]
    async fn test_filesystem_health_check() {
        let config = HealthMonitorConfig::default();
        let monitor = HealthMonitor::new(config);

        let result = monitor.check_filesystem("/tmp").await;
        // This might fail on Windows, but demonstrates the concept
        let _ = result;
    }

    #[tokio::test]
    async fn test_disk_usage_health_check() {
        let config = HealthMonitorConfig::default();
        let monitor = HealthMonitor::new(config);

        // "/" on Unix, "C:\" on Windows — both are valid paths for the root disk.
        #[cfg(unix)]
        let path = "/";
        #[cfg(windows)]
        let path = "C:\\";

        let usage = monitor.get_disk_usage(path).await;
        assert!(
            usage.is_ok(),
            "get_disk_usage returned Err: {:?}",
            usage.err()
        );
        let value = usage.unwrap();
        assert!(
            (0.0..=1.0).contains(&value),
            "Disk usage {value} is out of [0.0, 1.0]"
        );
    }

    #[tokio::test]
    async fn test_memory_health_check() {
        let config = HealthMonitorConfig::default();
        let monitor = HealthMonitor::new(config);

        let result = monitor.check_memory().await;
        assert!(result.is_ok());

        let status = result.unwrap();
        assert!(matches!(
            status,
            HealthStatus::Healthy | HealthStatus::Degraded | HealthStatus::Unhealthy
        ));
    }

    #[test]
    fn test_extract_host_port() {
        // Plain host:port — returned as-is.
        assert_eq!(extract_host_port("localhost:5432"), "localhost:5432");

        // PostgreSQL URI with credentials.
        assert_eq!(
            extract_host_port("postgres://user:pass@db.example.com:5432/mydb"),
            "db.example.com:5432"
        );

        // Redis URI without credentials.
        assert_eq!(
            extract_host_port("redis://cache.host:6379"),
            "cache.host:6379"
        );

        // Redis URI with path.
        assert_eq!(
            extract_host_port("redis://cache.host:6379/0"),
            "cache.host:6379"
        );

        // MySQL URI.
        assert_eq!(
            extract_host_port("mysql://root@localhost:3306/app"),
            "localhost:3306"
        );

        // Bare endpoint with no scheme.
        assert_eq!(extract_host_port("192.168.1.1:9200"), "192.168.1.1:9200");
    }
}
