import re

with open('src/analytics/dashboard.rs', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('''pub struct DashboardManager {
    config: DashboardConfig,
    dashboards: HashMap<String, Dashboard>,
}''', '''pub struct DashboardManager {
    config: DashboardConfig,
    #[allow(dead_code)]
    storage: Arc<dyn AuthStorage>,
    dashboards: HashMap<String, Dashboard>,
}''')

text = text.replace('''    pub fn new(config: DashboardConfig, storage: Arc<dyn AuthStorage>) -> Self {
        Self {
            config,
            dashboards: HashMap::new(),
        }
    }''', '''    pub fn new(config: DashboardConfig, storage: Arc<dyn AuthStorage>) -> Self {
        Self {
            config,
            storage,
            dashboards: HashMap::new(),
        }
    }''')

with open('src/analytics/dashboard.rs', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated dashboard manager.")
