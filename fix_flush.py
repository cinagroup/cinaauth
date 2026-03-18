import re

with open('src/analytics/mod.rs', 'r', encoding='utf-8') as f:
    text = f.read()

replacement = '''    async fn flush_events(&mut self) -> Result<(), AnalyticsError> {
        if self.event_buffer.is_empty() {
            return Ok(());
        }

        // Persist events to storage
        for event in &self.event_buffer {
            if let Ok(json_data) = serde_json::to_vec(event) {
                let key = format!("analytics_event_{}", event.id);
                // We use an arbitrary TTL of 90 days if data retention is enabled
                let ttl = std::time::Duration::from_secs(self.config.data_retention_days as u64 * 86400);
                let _ = self.storage.store_kv(&key, &json_data, Some(ttl)).await;
            }
        }

        // Clear the buffer
        self.event_buffer.clear();
        self.last_collection = Instant::now();

        Ok(())
    }'''

old_text = '''    async fn flush_events(&mut self) -> Result<(), AnalyticsError> {
        if self.event_buffer.is_empty() {
            return Ok(());
        }

        // Implementation would persist events to storage
        // For now, we'll just clear the buffer
        self.event_buffer.clear();
        self.last_collection = Instant::now();

        Ok(())
    }'''

if old_text in text:
    new_code = text.replace(old_text, replacement)
    with open('src/analytics/mod.rs', 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("Replaced successfully")
else:
    print("Could not find the exact text")
