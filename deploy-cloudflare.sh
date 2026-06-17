#!/bin/bash
# CinaAuth Cloudflare 快速部署脚本
# 使用此脚本自动部署 Worker API 和 Pages 前端

set -e

echo "🚀 CinaAuth Cloudflare 部署脚本"
echo "================================"

# 检查 Wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI 未安装"
    echo "运行: npm install -g wrangler"
    exit 1
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo "❌ 未登录 Cloudflare"
    echo "运行: wrangler login"
    exit 1
fi

echo "✅ Wrangler 已安装并登录"

# 检查 D1 数据库
echo ""
echo " 检查 D1 数据库..."
DATABASE_ID=$(wrangler d1 list --json 2>/dev/null | grep -A1 '"cinaauth-db"' | grep 'id' | cut -d'"' -f4 || echo "")

if [ -z "$DATABASE_ID" ]; then
    echo "⚠️  D1 数据库 'cinaauth-db' 不存在"
    echo "运行: wrangler d1 create cinaauth-db"
    echo ""
    read -p "是否现在创建? (y/n): " CREATE_DB
    if [ "$CREATE_DB" = "y" ]; then
        wrangler d1 create cinaauth-db
        echo "✅ 数据库创建成功"
    else
        echo "❌ 需要 D1 数据库才能继续"
        exit 1
    fi
else
    echo "✅ 找到数据库: $DATABASE_ID"
fi

# 更新 wrangler.json
WORKER_CONFIG="demo/cloudflare-worker/wrangler.json"
if [ -f "$WORKER_CONFIG" ]; then
    echo ""
    echo "🔧 更新 Worker 配置..."
    # 使用 sed 替换 database_id
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/REPLACE_WITH_D1_DATABASE_ID/$DATABASE_ID/g" "$WORKER_CONFIG"
    else
        # Linux/Windows (Git Bash)
        sed -i "s/REPLACE_WITH_D1_DATABASE_ID/$DATABASE_ID/g" "$WORKER_CONFIG"
    fi
    echo "✅ Worker 配置已更新"
fi

# 部署 Worker API
echo ""
echo "🚀 部署 Worker API..."
cd demo/cloudflare-worker

if [ ! -d "node_modules" ]; then
    echo " 安装依赖..."
    cd ../..
    pnpm install
    cd demo/cloudflare-worker
fi

pnpm deploy
echo "✅ Worker API 部署成功"

# 应用数据库迁移
echo ""
echo "📊 应用数据库迁移..."
pnpm migrate:remote || curl -X POST https://auth.cinagroup.com/api/migrate
echo "✅ 迁移完成"

# 部署 Pages 前端
echo ""
echo "🚀 部署 Pages 前端..."
cd ../nextjs

if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    cd ../..
    pnpm install
    cd demo/nextjs
fi

pnpm build:cf
pnpm deploy:cf
echo "✅ Pages 前端部署成功"

echo ""
echo " 部署完成!"
echo ""
echo "📋 验证部署:"
echo "  - Auth API: https://auth.cinagroup.com"
echo "  - Demo 站点: https://demo-auth.cinagroup.com"
echo ""
echo " 验证命令:"
echo "  curl https://auth.cinagroup.com/"
