import re

with open('src/analytics/metrics.rs', 'r', encoding='utf-8') as f:
    text = f.read()

metrics_sig = r'    pub async fn collect_metrics\(.*?\) -> Result<\(\), AnalyticsError> \{.*?Ok\(\(\)\)\n    \}'

metrics_repl = '''    pub async fn collect_metrics(
        &mut self,
        events: &[AnalyticsEvent],
    ) -> Result<(), AnalyticsError> {
        for event in events {
            match event.event_type {
                crate::analytics::RbacEventType::PermissionCheck => {
                    *self.current_metrics.entry("permission_checks_total".to_string()).or_insert(0.0) += 1.0;
                    if let Some(action) = &event.action {
                        if action == "Granted" {
                            *self.current_metrics.entry("permission_grants_total".to_string()).or_insert(0.0) += 1.0;
                        } else {
                            *self.current_metrics.entry("permission_denies_total".to_string()).or_insert(0.0) += 1.0;
                        }
                    }
                },
                crate::analytics::RbacEventType::RoleAssignment => {
                    *self.current_metrics.entry("role_assignments_total".to_string()).or_insert(0.0) += 1.0;
                },
                _ => {
                    *self.current_metrics.entry("other_events_total".to_string()).or_insert(0.0) += 1.0;
                }
            }
        }
        
        let json_data = serde_json::to_vec(&self.current_metrics).unwrap_or_default();
        let _ = self.storage.store_kv("current_metrics_snapshot", &json_data, None).await;

        Ok(())
    }'''

text = re.sub(metrics_sig, metrics_repl.strip(), text, flags=re.DOTALL)

with open('src/analytics/metrics.rs', 'w', encoding='utf-8') as f:
    f.write(text)

with open('src/analytics/reports.rs', 'r', encoding='utf-8') as f:
    r_text = f.read()

r_sig = r'    pub async fn generate_report\(.*?\) -> Result<String, AnalyticsError> \{.*?Ok\("Generated report content"\.to_string\(\)\)\n    \}'
r_repl = '''    pub async fn generate_report(
        &self,
        request: ReportRequest,
    ) -> Result<String, AnalyticsError> {
        let keys = self.storage.list_kv_keys("analytics_event_").await.unwrap_or_default();
        let mut total_events = 0;
        let mut events = Vec::new();
        
        for key in keys {
            if let Ok(Some(data)) = self.storage.get_kv(&key).await {
                if let Ok(event) = serde_json::from_slice::<crate::analytics::AnalyticsEvent>(&data) {
                    total_events += 1;
                    events.push(event);
                }
            }
        }
        
        let report_content = match request.format {
            ReportFormat::Json => {
                serde_json::to_string_pretty(&serde_json::json!({
                    "title": request.title,
                    "type": request.report_type,
                    "total_events": total_events,
                    "sample_events": events.len(),
                    "generated_at": chrono::Utc::now(),
                })).unwrap_or_else(|_| "{}".to_string())
            },
            ReportFormat::Csv => {
                format!("Title,Type,TotalEvents\\n{},{:?},{}", request.title, request.report_type, total_events)
            },
            ReportFormat::Html | ReportFormat::Pdf => {
                format!("<h1>{}</h1><p>Total Events: {}</p>", request.title, total_events)
            }
        };
        
        Ok(report_content)
    }'''

r_text = re.sub(r_sig, r_repl.strip(), r_text, flags=re.DOTALL)

with open('src/analytics/reports.rs', 'w', encoding='utf-8') as f:
    f.write(r_text)

print("Updated metrics and reports.")
