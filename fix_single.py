import re

def fix(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # For single line Self { _config: config }
    content = re.sub(r'Self \{ _config: config \}', r'Self { _config: config, storage }', content)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

fix('src/analytics/compliance.rs')
fix('src/analytics/reports.rs')
