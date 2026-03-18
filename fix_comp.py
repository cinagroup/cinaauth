import re

with open('src/analytics/mod.rs', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('/// Get compliance metricsnc fn get_compliance_metrics(', '/// Get compliance metrics\n    pub async fn get_compliance_metrics(')

with open('src/analytics/mod.rs', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed.")
