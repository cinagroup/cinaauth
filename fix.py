import re

with open('src/storage/core.rs', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('self.inner.list_kv_keys_by_prefix(prefix)', 'self.inner.list_kv_keys_by_prefix(_prefix)')
text = text.replace('Ok(self.client.list_kv_keys_by_prefix(prefix).await?)', 'Ok(self.client.list_kv_keys_by_prefix(_prefix).await?)')

with open('src/storage/core.rs', 'w', encoding='utf-8') as f:
    f.write(text)
print("Fixed")
