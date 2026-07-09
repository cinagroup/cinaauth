#!/usr/bin/env bash
# Deploy docs to Cloudflare Pages (static).
#
# The docs site is a Next.js + Fumadocs SSR app, but its Worker bundle
# (handler.mjs ~58MB, due to shiki language packs) exceeds Cloudflare's
# 64 MiB uncompressed Worker limit. Since all documentation pages are
# pre-rendered (SSG/○), we deploy the static assets + prerendered HTML
# to Cloudflare Pages instead. Dynamic API routes (/api/og, /api/chat)
# are not served in this mode.
set -euo pipefail

echo "📦 Building docs (OpenNext + Next.js)..."
BETA_DOCS_SKIP=1 pnpm build:cf

echo ""
echo "📋 Assembling Pages deploy directory (assets + prerendered HTML)..."
DEPLOY_DIR=$(mktemp -d)
trap 'rm -rf "$DEPLOY_DIR"' EXIT

# Static assets (JS/CSS/images/favicon)
cp -r .open-next/assets/* "$DEPLOY_DIR/"

# Prerendered HTML pages from Next.js server output
cp -r .next/server/app/* "$DEPLOY_DIR/" 2>/dev/null || true

FILE_COUNT=$(find "$DEPLOY_DIR" -type f | wc -l)
echo "   $FILE_COUNT files ready"

echo ""
echo "🚀 Deploying to Cloudflare Pages (cinaauth-docs)..."
npx wrangler pages deploy "$DEPLOY_DIR" \
  --project-name cinaauth-docs \
  --branch main

echo ""
echo "✅ Done. Site: https://cinaauth-docs.pages.dev"
