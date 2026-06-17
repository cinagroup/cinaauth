#!/bin/bash
# Build and deploy CinaAuth Demo to Cloudflare Pages
set -e

echo "🔨 Building Next.js..."
CINAAUTH_SECRET=cinaauth-demo-secret-32-chars-long-xxx \
CINAAUTH_URL=https://demo-auth.cinagroup.com \
npx next build

echo "🧹 Fixing middleware manifests..."
echo '{"version":1,"functions":{}}' > .next/server/functions-config-manifest.json

echo "📦 Building OpenNext bundle..."
CINAAUTH_SECRET=cinaauth-demo-secret-32-chars-long-xxx \
CINAAUTH_URL=https://demo-auth.cinagroup.com \
npx @opennextjs/cloudflare build --skipBuild

echo "🚀 Deploying to Cloudflare Pages..."
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN \
wrangler pages deploy .open-next/dist --project-name=cinaauth-demo --branch=main --commit-dirty=true

echo "✅ Done!"
