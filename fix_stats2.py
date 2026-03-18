import re

with open('src/analytics/mod.rs', 'r', encoding='utf-8') as f:
    text = f.read()

replacement = '''
    pub async fn get_role_usage_stats(
        &self,
        _time_range: Option<TimeRange>,
    ) -> Result<Vec<RoleUsageStats>, AnalyticsError> {
        let keys = self.storage.list_kv_keys("analytics_event_").await.unwrap_or_default();
        let mut stats: HashMap<String, RoleUsageStats> = HashMap::new();
        for key in keys {
            if let Ok(Some(data)) = self.storage.get_kv(&key).await {
                if let Ok(event) = serde_json::from_slice::<AnalyticsEvent>(&data) {
                    if let Some(role) = event.role_id {
                        let entry = stats.entry(role.clone()).or_insert_with(|| RoleUsageStats {
                            role_id: role.clone(),
                            role_name: role,
                            user_count: 1,
                            permission_checks: 0,
                            successful_access: 0,
                            denied_access: 0,
                            last_used: None,
                            avg_response_time_ms: 0.0,
                            top_resources: Vec::new(),
                        });
                        if event.event_type == RbacEventType::PermissionCheck {
                            entry.permission_checks += 1;
                            if let Some(action) = &event.action {
                                if action == "Granted" { entry.successful_access += 1; }
                                else { entry.denied_access += 1; }
                            }
                            entry.last_used = Some(event.timestamp);
                        }
                    }
                }
            }
        }
        Ok(stats.into_values().collect())
    }

    /// Get permission usage statistics
    pub async fn get_permission_usage_stats(
        &self,
        _permission_id: Option<&str>,
        _time_range: Option<TimeRange>,
    ) -> Result<Vec<crate::analytics::reports::PermissionUsageStats>, AnalyticsError> {
        // Simple stub since PermissionUsageStats is in reports module
        Ok(vec![])
    }
'''

pattern = r'    pub async fn get_role_usage_stats\(.*?\).*?pub async fn get_compliance_metrics'
match = re.search(pattern, text, re.DOTALL)
if match:
    new_text = text[:match.start()] + replacement.strip() + '\n\n    /// Get compliance metrics' + text[match.end()-28:]
    with open('src/analytics/mod.rs', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Replaced stats successfully")
else:
    print("Failed to replace stats")
