# CinaAuth Cloudflare 部署指南

本指南介绍如何将 CinaAuth 部署到 Cloudflare，包含两部分：
- **Worker API**：认证 API 服务，使用 D1 数据库
- **Pages**：Next.js 演示站点前端

## 架构概览

```
┌──────────────────────────────────────────────────────────┐
│                    Cloudflare                             │
│                                                          │
│  ┌─────────────────────┐      ┌──────────────────────┐  │
│  │  Pages (前端)        │      │  Workers (API)        │  │
│  │                     │      │                       │  │
│  │  demo-auth.cinagroup.com  │──────│  auth.cinagroup.com    │  │
│  │                     │      │                       │  │
│  │  Next.js 演示站点   │      │  Hono + CinaAuth      │  │
│  └─────────────────────┘      └──────────┬────────────┘  │
│                                          │                │
│                                 ┌────────▼────────────┐  │
│                                 │  D1 Database         │  │
│                                 │  (SQLite)            │  │
│                                 │  cinaauth-db         │  │
│                                 └──────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## 前置条件

1. **Cloudflare 账号**：前往 [cloudflare.com](https://cloudflare.com) 注册
2. **Wrangler CLI**：Cloudflare 命令行工具
3. **Node.js 22+** 和 **pnpm 11+**

## 步骤 1：安装 Wrangler 并登录

```bash
# 全局安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare（会打开浏览器授权）
wrangler login

# 验证登录
wrangler whoami
```

## 步骤 2：创建 D1 数据库

```bash
# 创建 D1 数据库
wrangler d1 create cinaauth-db

# 输出示例（请记录 database_id）：
# ✅ Successfully created DB 'cinaauth-db'
# ┌──────────────────────────────────────┐
# │ database_id = "xxxxxxxx-xxxx-..."    │  ← 复制这个
# │ name = "cinaauth-db"                 │
# └──────────────────────────────────────┘
```

将获得的 `database_id` 填入 `demo/cloudflare-worker/wrangler.json`：

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "cinaauth-db",
      "database_id": "你的-database-id"
    }
  ]
}
```

## 步骤 3：部署 Worker API

```bash
cd demo/cloudflare-worker

# 安装依赖（在 monorepo 根目录执行）
pnpm install

# 本地开发测试
pnpm dev

# 部署到 Cloudflare
pnpm deploy
```

### 应用数据库迁移

部署后，运行迁移来创建数据库表：

```bash
# 方法 1：通过 API 端点（推荐）
curl -X POST https://auth.cinagroup.com/api/migrate

# 方法 2：通过 Wrangler CLI（本地迁移）
pnpm migrate:remote
```

## 步骤 4：部署 Pages 前端

```bash
cd demo/nextjs

# 安装依赖（如未安装）
pnpm install

# 构建 Cloudflare 版本
pnpm build:cf

# 部署到 Cloudflare Pages
pnpm deploy:cf
```

### 配置环境变量

在 Cloudflare Dashboard 中为 Pages 项目设置环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `CINAAUTH_URL` | `https://auth.cinagroup.com` | Auth API 地址 |
| `CINAAUTH_SECRET` | （生成随机字符串） | 加密密钥 |

生成密钥：

```bash
openssl rand -base64 32
```

## 步骤 5：配置 DNS（可选）

如果你拥有 `cinagroup.com` 域名并添加到 Cloudflare：

1. 在 Cloudflare Dashboard → DNS 中添加记录：
   - `auth.cinagroup.com` → CNAME → Worker
   - `demo-auth.cinagroup.com` → CNAME → Pages

2. 在 Workers 设置中绑定自定义域名
3. 在 Pages 设置中绑定自定义域名

## CI/CD 自动化部署

项目包含 GitHub Actions 工作流：`.github/workflows/deploy-cloudflare.yml`

需要在 GitHub 仓库 Settings → Secrets 中添加：

| Secret | 值 | 说明 |
|--------|------|------|
| `CLOUDFLARE_API_TOKEN` | `YOUR_CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | （从 `wrangler whoami` 获取） | Cloudflare 账户 ID |

## 本地开发

### Worker API 本地开发

```bash
cd demo/cloudflare-worker

# 创建本地 D1 数据库
wrangler d1 create cinaauth-db --local

# 应用本地迁移
pnpm migrate:local

# 启动开发服务器
pnpm dev
# API 运行在 http://localhost:8787
```

### Next.js Demo 本地开发

```bash
cd demo/nextjs

# 创建 .env.local 文件
cat > .env.local << 'EOF'
CINAAUTH_URL=http://localhost:8787
CINAAUTH_SECRET=your-local-secret-at-least-32-chars
EOF

pnpm dev
# 前端运行在 http://localhost:3000
```

## 故障排查

### Worker 部署失败

```bash
# 检查 Wrangler 版本
wrangler --version

# 重新登录
wrangler logout
wrangler login
```

### D1 迁移失败

```bash
# 查看 D1 数据库列表
wrangler d1 list

# 检查数据库表
wrangler d1 execute cinaauth-db --command "SELECT name FROM sqlite_master WHERE type='table';"
```

### Pages 构建失败

```bash
# 检查 OpenNext 版本
npx @opennextjs/cloudflare --version

# 清理缓存重新构建
rm -rf .vercel node_modules/.cache
pnpm build:cf
```

## 相关文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [OpenNext Cloudflare 适配器](https://opennextjs.cloudflare/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
