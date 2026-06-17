// Create a single-file worker by concatenating handler + export wrapper
const fs = require('fs');
const path = require('path');

const handlerPath = path.join(__dirname, '.open-next', 'server-functions', 'default', 'handler.mjs');
const outputPath = path.join(__dirname, '.open-next', 'single-worker.mjs');

let handler = fs.readFileSync(handlerPath, 'utf8');

// Remove the existing export default (whatever it is)
handler = handler.replace(/export\s+default\s+nextConfig\s*;?/, '');

// Add our worker fetch handler at the end
handler += '\n\nvar __handler = await createMainHandler();\nexport default {\n  async fetch(request, env, ctx) {\n    return __handler(request, env, ctx);\n  }\n};\n';

fs.writeFileSync(outputPath, handler, 'utf8');
console.log('Single worker file created:', outputPath, '(' + handler.length + ' bytes)');
