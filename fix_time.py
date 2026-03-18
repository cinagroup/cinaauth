import os

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.rs'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            orig = content
            # Fix system time
            content = content.replace('.duration_since(UNIX_EPOCH)\n                .unwrap()', '.duration_since(UNIX_EPOCH).unwrap_or_default()')
            content = content.replace('.duration_since(std::time::UNIX_EPOCH)\n                .unwrap()', '.duration_since(std::time::UNIX_EPOCH).unwrap_or_default()')
            content = content.replace('.duration_since(std::time::UNIX_EPOCH)\n            .unwrap()', '.duration_since(std::time::UNIX_EPOCH).unwrap_or_default()')
            content = content.replace('.duration_since(UNIX_EPOCH)\n                    .unwrap()', '.duration_since(UNIX_EPOCH).unwrap_or_default()')
            content = content.replace('.duration_since(UNIX_EPOCH)\n            .unwrap()', '.duration_since(UNIX_EPOCH).unwrap_or_default()')
            # generic
            content = content.replace('.duration_since(UNIX_EPOCH).unwrap()', '.duration_since(UNIX_EPOCH).unwrap_or_default()')
            
            if content != orig:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
