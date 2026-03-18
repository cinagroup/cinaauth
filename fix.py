import re

with open('src/analytics/mod.rs', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('let mut over_privileged_users = 0;', 'let over_privileged_users = 0;')

with open('src/analytics/mod.rs', 'w', encoding='utf-8') as f:
    f.write(text)

with open('src/storage/core.rs', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('async fn list_kv_keys(&self, prefix: &str) -> Result<Vec<String>> {', 'async fn list_kv_keys(&self, _prefix: &str) -> Result<Vec<String>> {')

with open('src/storage/core.rs', 'w', encoding='utf-8') as f:
    f.write(text)
print("Warnings fixed.")
