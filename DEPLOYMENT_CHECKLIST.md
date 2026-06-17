# CinaAuth Cloudflare 部署检查清单

## ✅ 已完成的配置

### 1. 品牌替换
- [x] npm scope: `@cinaauth/*` → `@cinaauth/*`
- [x] 包名: `cinaauth` → `cinaauth`
- [x] 环境变量: `BETTER_AUTH_*` → `CINAAUTH_*`
- [x] 域名: `cinaauth.com` → `cinagroup.com`
- [x] UI 品牌: `Better Auth` → `CinaAuth`
- [x] 总计修改 1089+ 个文件

### 2. Cloudflare Worker API (demo/cloudflare-worker)
- [x] package.json - 依赖配置
- [x] wrangler.json - Worker 配置 (D1 绑定、路由)
- [x] src/index.ts - Hono 入口 + 认证路由
- [x] src/auth.ts - CinaAuth 配置
- [x] src/auth-schema.ts - Drizzle schema
- [x] src/db.ts - D1 数据库初始化
- [x] drizzle/0000_init.sql - 数据库迁移
- [x] tsconfig.json - TypeScript 配置

### 3. Next.js Demo 适配 (demo/nextjs)
- [x] open-next.config.ts - Cloudflare Pages 构建配置
- [x] wrangler.toml - Pages 环境变量
- [x] next.config.ts - 移除 libsql 外部包
- [x] lib/metadata.ts - 移除 Vercel 特定代码
- [x] package.json - 添加 Cloudflare 构建脚本

### 4. CI/CD 配置
- [x] .github/workflows/deploy-cloudflare.yml - GitHub Actions

### 5. 文档
- [x] docs/CLOUDFLARE_DEPLOYMENT.md - 完整部署指南

### 6. Workspace 配置
- [x] pnpm-workspace.yaml - 添加 demo/** 到 workspace

---

## 🚀 部署步骤（需要手动执行）

### 步骤 1: 安装 Wrangler 并登录
```bash
npm install -g wrangler
wrangler login
wrangler whoami
```

### 步骤 2: 创建 D1 数据库
```bash
wrangler d1 create cinaauth-db
```
**记录返回的 `database_id`**

### 步骤 3: 更新 Worker 配置
编辑 `demo/cloudflare-worker/wrangler.json`，将 `REPLACE_WITH_D1_DATABASE_ID` 替换为实际的 database_id：
```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "cinaauth-db",
      "database_id": "你的-actual-database-id"
    }
  ]
}
```

### 步骤 4: 安装依赖
```bash
# 在项目根目录
pnpm install
```

### 步骤 5: 部署 Worker API
```bash
cd demo/cloudflare-worker
pnpm deploy
```

### 步骤 6: 应用数据库迁移
部署成功后，调用迁移端点：
```bash
curl -X POST https://auth.cinagroup.com/api/migrate
```

或者使用 Wrangler CLI：
```bash
cd demo/cloudflare-worker
pnpm migrate:remote
```

### 步骤 7: 部署 Pages 前端
```bash
cd demo/nextjs
pnpm build:cf
pnpm deploy:cf
```

### 步骤 8: 配置 DNS（可选）
如果你有 `cinagroup.com` 域名并添加到 Cloudflare：

1. 在 Cloudflare Dashboard → DNS 添加记录：
   - `auth.cinagroup.com` → CNAME → Worker
   - `demo-auth.cinagroup.com` → CNAME → Pages

2. 在 Workers 设置中绑定自定义域名：`auth.cinagroup.com`
3. 在 Pages 设置中绑定自定义域名：`demo-auth.cinagroup.com`

### 步骤 9: 配置环境变量
在 Cloudflare Dashboard 中为 Pages 项目设置环境变量：
- `CINAAUTH_URL`: `https://auth.cinagroup.com`
- `CINAAUTH_SECRET`: （生成随机字符串，至少 32 字符）

生成密钥：
```bash
openssl rand -base64 32
```

### 步骤 10: 配置 GitHub Secrets（用于自动部署）
在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：
- `CLOUDFLARE_API_TOKEN`: `YOUR_CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`: 从 `wrangler whoami` 获取

---

## 📋 验证部署

### Worker API 验证
```bash
# 健康检查
curl https://auth.cinagroup.com/

# 应该返回：
# {"name":"CinaAuth API","status":"running","version":"1.0.0"}
```

### Pages 验证
访问 https://demo-auth.cinagroup.com 查看演示站点

### 数据库验证
```bash
# 查看表结构
wrangler d1 execute cinaauth-db --command "SELECT name FROM sqlite_master WHERE type='table';"

# 应该看到：user, session, account, verification, jwks
```

---

## 🔧 本地开发

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
CINAAUTH_SECRET=your-local-secret-at-least-32-chars-long
EOF

pnpm dev
# 前端运行在 http://localhost:3000
```

---

## 📝 故障排查

### Worker 部署失败
```bash
# 检查 Wrangler 版本
wrangler --version

# 重新登录
wrangler logout
wrangler login
```

### Pages 构建失败
```bash
# 清理缓存
rm -rf .vercel node_modules/.cache

# 重新安装依赖
pnpm install --force

# 重新构建
pnpm build:cf
```

### D1 迁移失败
```bash
# 检查数据库是否存在
wrangler d1 list

# 重新应用迁移
wrangler d1 execute cinaauth-db --file=./drizzle/0000_init.sql --remote
```

---

## 📚 相关文档

- [完整部署指南](./docs/CLOUDFLARE_DEPLOYMENT.md)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [OpenNext Cloudflare](https://opennextjs.cloudflare/)
