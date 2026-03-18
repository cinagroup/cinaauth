import re

for filename in ['src/analytics/compliance.rs', 'src/analytics/reports.rs']:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    parts = content.split('pub fn new(')
    if len(parts) > 1:
        first_part = parts[0]
        rest = parts[1]
        args, body = rest.split(') -> Self {', 1)
        if 'storage' not in args:
            new_args = args + ", storage: Arc<dyn AuthStorage>"
            content = first_part + "pub fn new(" + new_args + ") -> Self {" + body
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)

print("updated compliance and reports")
