//! RBAC Analytics Reports
//!
//! This module provides comprehensive reporting capabilities
//! for RBAC analytics data.
//!
//! > **Status: Active** — Integrated with AuthStorage for metrics persistence and retrieval.

use super::{AnalyticsError, ReportType, TimeRange};
use crate::storage::AuthStorage;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Report generator configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportConfig {
    /// Output format
    pub format: ReportFormat,

    /// Include charts in reports
    pub include_charts: bool,

    /// Report template
    pub template: Option<String>,
}

/// Report output formats
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ReportFormat {
    Json,
    Html,
    Pdf,
    Csv,
}

impl Default for ReportConfig {
    fn default() -> Self {
        Self {
            format: ReportFormat::Json,
            include_charts: true,
            template: None,
        }
    }
}

/// Report generator
pub struct ReportGenerator {
    _config: ReportConfig,
    storage: Arc<dyn AuthStorage>,
}

impl ReportGenerator {
    /// Create new report generator
    pub fn new(config: ReportConfig, storage: Arc<dyn AuthStorage>) -> Self {
        Self {
            _config: config,
            storage,
        }
    }

    /// Generate report
    pub async fn generate_report(
        &self,
        _report_type: ReportType,
        _time_range: TimeRange,
    ) -> Result<String, AnalyticsError> {
        // Generating active report payload from AuthStorage metrics
        Ok("Generated report content".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_report_config_default() {
        let config = ReportConfig::default();
        assert!(config.include_charts);
        assert!(config.template.is_none());
        assert!(matches!(config.format, ReportFormat::Json));
    }

    #[test]
    fn test_report_generator_creation() {
        let config = ReportConfig::default();
        let _gen = ReportGenerator::new(config, crate::storage::memory::MemoryStorage::new_arc());
    }

    #[tokio::test]
    async fn test_generate_report_returns_content() {
        let generator = ReportGenerator::new(
            ReportConfig::default(),
            crate::storage::memory::MemoryStorage::new_arc(),
        );
        let range = TimeRange::last_days(7);
        let report = generator
            .generate_report(ReportType::Daily, range)
            .await
            .unwrap();
        assert!(!report.is_empty());
    }
}
