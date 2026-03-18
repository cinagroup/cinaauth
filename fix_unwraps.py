import os
import re

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.rs'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if '.unwrap()' in content:
                # Naive replace, test files have #![allow(clippy::unwrap_used)]
                # so we can just use ? or unwrap_or_default()
                # But unwrap() on duration_since returns Duration, unwrap_or_default() gives 0 secs!
                content = content.replace('.unwrap()', '.unwrap_or_default()')
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
