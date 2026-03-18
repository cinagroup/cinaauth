import re

def update_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Apply the trait import if missing
    if 'use crate::storage::AuthStorage;' not in content and 'AuthStorage' not in content:
        content = content.replace('use serde::{', 'use crate::storage::AuthStorage;\nuse std::sync::Arc;\nuse serde::{')

    # Manager
    if filename.endswith('mod.rs'):
        if 'storage: Arc<dyn AuthStorage>' not in content:
            content = content.replace(
'''pub struct AnalyticsManager {
    config: AnalyticsConfig,
    event_buffer: Vec<AnalyticsEvent>,
    last_collection: Instant,
}''',
'''pub struct AnalyticsManager {
    config: AnalyticsConfig,
    storage: Arc<dyn AuthStorage>,
    event_buffer: Vec<AnalyticsEvent>,
    last_collection: Instant,
}''')
            content = content.replace(
'''    pub fn new(config: AnalyticsConfig) -> Self {
        Self {
            config,
            event_buffer: Vec::new(),
            last_collection: Instant::now(),
        }
    }''',
'''    pub fn new(config: AnalyticsConfig, storage: Arc<dyn AuthStorage>) -> Self {
        Self {
            config,
            storage,
            event_buffer: Vec::new(),
            last_collection: Instant::now(),
        }
    }''')

    # Monitor
    for struct_name, config_name in [('ComplianceMonitor', 'ComplianceConfig'),
                                     ('ReportGenerator', 'ReportConfig'),
                                     ('MetricsCollector', 'MetricsConfig'),
                                     ('DashboardGenerator', 'DashboardConfig')]:
        if struct_name in content:
            # Change struct
            pattern_struct = r'pub struct ' + struct_name + r' \{\n(\s*)///.*?\n(\s*)_config: ' + config_name + r'(,.*?)?\}'
            replacement_struct = 'pub struct ' + struct_name + ' {\\n\\1_config: ' + config_name + ',\\n\\1storage: Arc<dyn AuthStorage>\\3}'
            content = re.sub(pattern_struct, replacement_struct, content, flags=re.DOTALL)
            
            # Change new
            pattern_new = r'pub fn new\(config: ' + config_name + r'\) -> Self \{\n(\s*)Self \{\n(\s*)_config: config(.*?)\n\s*\}\n(\s*)\}'
            replacement_new = 'pub fn new(config: ' + config_name + ', storage: Arc<dyn AuthStorage>) -> Self {\\n\\1Self {\\n\\2_config: config,\\n\\2storage\\3\\n\\1}\\n\\4}'
            content = re.sub(pattern_new, replacement_new, content, flags=re.DOTALL)

    # In mod.rs tests
    if filename.endswith('mod.rs'):
        content = content.replace('AnalyticsManager::new(config)', 'AnalyticsManager::new(config, crate::storage::memory::MemoryStorage::new_arc())')
    # In other tests
    content = content.replace('::new(config)', '::new(config, crate::storage::memory::MemoryStorage::new_arc())')
    content = content.replace('::new(ComplianceConfig::default())', '::new(ComplianceConfig::default(), crate::storage::memory::MemoryStorage::new_arc())')
    content = content.replace('::new(DashboardConfig::default())', '::new(DashboardConfig::default(), crate::storage::memory::MemoryStorage::new_arc())')
    content = content.replace('::new(MetricsConfig::default())', '::new(MetricsConfig::default(), crate::storage::memory::MemoryStorage::new_arc())')
    content = content.replace('::new(ReportConfig::default())', '::new(ReportConfig::default(), crate::storage::memory::MemoryStorage::new_arc())')
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

for f in ['src/analytics/mod.rs', 'src/analytics/compliance.rs', 'src/analytics/dashboard.rs', 'src/analytics/metrics.rs', 'src/analytics/reports.rs']:
    update_file(f)

print("Updated analytics models.")
