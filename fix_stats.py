import re

with open('src/analytics/mod.rs', 'r', encoding='utf-8') as f:
    text = f.read()

replacement = '''    pub async fn get_role_usage_stats(
        &self,
        _time_range: Option<TimeRange>,
    ) -> Result<Vec<RoleUsageStats>, AnalyticsError> {
        let keys = self.storage.list_kv_keys("analytics_event_").await.unwrap_or_default();
        let mut stats: HashMap<String, RoleUsageStats> = HashMap::new();
        for key in keys {
            if let Ok(Some(data)) = self.storage.get_kv(&key).await {
                if let Ok(event) = serde_json::from_slice::<AnalyticsEvent>(&data) {
                    if event.event_type == RbacEventType::RoleAssignment {
                        if let Some(role) = event.role_id {
                            let entry = stats.entry(role.clone()).or_insert_with(|| RoleUsageStats {
                                role_id: role,
                                total_assignments: 0,
                                active_assignments: 0,
                                unique_users: 0,
                                average_duration_days: 0.0,
                            });
                            entry.total_assignments += 1;
                            entry.active_assignments += 1;
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
    ) -> Result<Vec<PermissionUsageStats>, AnalyticsError> {
        let keys = self.storage.list_kv_keys("analytics_event_").await.unwrap_or_default();
        let mut stats: HashMap<String, PermissionUsageStats> = HashMap::new();
        for key in keys {
            if let Ok(Some(data)) = self.storage.get_kv(&key).await {
                if let Ok(event) = serde_json::from_slice::<AnalyticsEvent>(&data) {
                    if event.event_type == RbacEventType::PermissionCheck {
                        if let Some(perm) = event.resource {
                            let entry = stats.entry(perm.clone()).or_insert_with(|| PermissionUsageStats {
                                permission_id: perm,
                                total_checks: 0,
                                granted_checks: 0,
                                denied_checks: 0,
                                unique_users: 0,
                                unused_days: 0,
                            });
                            entry.total_checks += 1;
                            if let Some(action) = &event.action {
                                if action == "Granted" { entry.granted_checks += 1; }
                                else { entry.denied_checks += 1; }
                            }
                        }
                    }
                }
            }
        }
        Ok(stats.into_values().collect())
    }'''

# Replace the two functions roughly correctly
pattern = r'    pub async fn get_role_usage_stats\(.*?\).*?pub async fn get_compliance_metrics'
match = re.search(pattern, text, re.DOTALL)
if match:
    new_text = text[:match.start()] + replacement + '\n\n    /// Get compliance metrics' + text[match.end()-28:]
    with open('src/analytics/mod.rs', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Replaced stats successfully")
else:
    print("Failed to replace stats")

