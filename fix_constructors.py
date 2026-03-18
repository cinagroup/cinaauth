import re

for filename in ['src/analytics/compliance.rs', 'src/analytics/reports.rs', 'src/analytics/dashboard.rs', 'src/analytics/metrics.rs']:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We need to add storage: Arc<dyn AuthStorage> as a parameter to 
ew()
    # Find pub fn new( and add the parameter.
    
    if "storage: Arc<dyn AuthStorage>" not in content.split('pub fn new')[1].split('{')[0]:
        content = re.sub(
            r'pub fn new\((.*?)\)\s*->\s*Self\s*\{', 
            r'pub fn new(\1, storage: Arc<dyn AuthStorage>) -> Self {', 
            content, 
            flags=re.DOTALL
        )
        
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

print("Constructors updated")
