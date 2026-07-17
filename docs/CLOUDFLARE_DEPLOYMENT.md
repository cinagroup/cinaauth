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

# 检查生产配置、CI 门禁、Queue/DLQ、迁移和 readiness 端点是否保持一致
pnpm --dir demo/cloudflare-worker run check:production

# 检查 Cloudflare 远端 D1、Queue/DLQ、Worker secret、zone/route 和公开端点状态
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... pnpm --dir demo/cloudflare-worker run check:cloudflare

# 商用全插件上线前，把 Turnstile、Google One Tap、Generic OAuth、Stripe 等第三方输入缺失升级为失败
CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS=1 CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... pnpm --dir demo/cloudflare-worker run check:cloudflare

# 可选：部署仓库内置的投递 Worker，给主 Worker 提供真实 HTTPS delivery webhook
pnpm --dir demo/delivery-worker run provision:secrets
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... pnpm --dir demo/delivery-worker run check:cloudflare
pnpm --dir demo/delivery-worker run build

# delivery Worker ready 后，再用脚本给主 Worker 写入核心 secret
pnpm --dir demo/cloudflare-worker run provision:secrets

# 本地开发测试
pnpm dev

# 部署到 Cloudflare
pnpm deploy
```

### 应用数据库迁移

部署后，通过受保护的 Worker 端点运行 CinaAuth 自带迁移器来创建数据库表。不要使用
`wrangler d1 migrations apply`：本 Worker 会按生产环境启用的插件动态生成 schema，
旧的静态 D1 migration 容易创建错误列名或漏掉插件表。

```bash
curl https://auth.cinagroup.com/api/migrate \
  -H "Authorization: Bearer $CINAAUTH_MIGRATION_TOKEN"

curl -X POST https://auth.cinagroup.com/api/migrate \
  -H "Authorization: Bearer $CINAAUTH_MIGRATION_TOKEN"
```

迁移前需要先在 Worker 上配置 `CINAAUTH_MIGRATION_TOKEN` secret。
`GET /api/migrate` 只预览待创建/待新增字段和必需表清单；`POST /api/migrate`
执行同一份迁移计划。迁移接口会返回 `Cache-Control: no-store`，避免运维结果被缓存。
`CINAAUTH_MIGRATION_TOKEN` 必须独立于 `CINAUTH_ADMIN_SERVICE_KEY`，建议至少 32 个字符；
迁移和 readiness 属于运维权限，不应复用 admin/audit token。

迁移后，用受保护的 readiness 端点确认生产 Worker 已经具备接流量条件：

```bash
curl https://auth.cinagroup.com/api/ready \
  -H "Authorization: Bearer $CINAAUTH_MIGRATION_TOKEN"
```

`GET /api/ready` 会检查运行时配置、必需 D1 表、Queue binding、HTTPS 投递 webhook
配置和数据库型 rate limit。它只返回布尔状态、缺失项和表名，不返回 secret 值；全部通过时
返回 HTTP 200，否则返回 HTTP 503 和结构化 JSON，响应同样带 `Cache-Control: no-store`。
响应中还会包含 `VERSION_METADATA` 的 `id`、`tag`、`timestamp`，方便把 CI readiness、
迁移失败、Workers Logs 和 Cloudflare rollback 精确对应到正在服务的 Worker 版本。

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

Worker 侧也必须设置 `CINAAUTH_SECRET`，且长度至少 32 个字符。生产 Worker 会在
auth secret、D1 binding、迁移 token、Queue binding、HTTPS 投递 webhook、
webhook secret 或 HTTPS `CINAAUTH_URL` 缺失时返回 `503`，并输出
`cinaauth.runtime_config_invalid` 结构化日志，避免 OTP、短信、Magic Link 等插件在
半配置状态下运行。

投递 webhook 请求会附带 `X-CinaAuth-Delivery-Id`、
`X-CinaAuth-Delivery-Timestamp` 和 `X-CinaAuth-Delivery-Signature`。下游服务应使用
`CINAAUTH_DELIVERY_WEBHOOK_SECRET` 对 `{timestamp}.{deliveryId}.{rawRequestBody}`
计算 HMAC-SHA256，并比对 `v1=` 前缀后的十六进制签名，同时拒绝过旧时间戳。
队列消费者按批并发投递单条消息，但 Worker 并发数受 `wrangler.json` 限制，默认最多
5 个 consumer、每批最多 10 条，避免邮件/SMS 服务在积压恢复时被打爆。

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
| `CINAAUTH_SECRET` | 至少 32 字符随机值 | Auth Worker session/token secret |
| `CINAAUTH_MIGRATION_TOKEN` | 与 Worker secret 同值 | CI 部署后调用 `/api/migrate` 和 `/api/ready` |
| `CINAAUTH_DELIVERY_WEBHOOK_SECRET` | 至少 32 字符随机值 | Auth Worker 与 delivery Worker 共享的 HMAC secret |
| `RESEND_API_KEY` | Resend API key | 邮件 OTP 和 Magic Link 投递 |
| `RESEND_EMAIL_FROM` | 例如 `CinaAuth <no-reply@cinagroup.com>` | Resend 发件人 |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | 短信 OTP 投递 |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | 短信 OTP 投递 |
| `TWILIO_FROM_NUMBER` | Twilio sender number | 短信 OTP 投递 |
| `CINAAUTH_DEMO_SECRET` | 至少 32 字符随机值 | Demo Worker 的 `CINAAUTH_SECRET` |

流水线会先部署 `demo/delivery-worker`：运行测试和 typecheck、dry-run 打包、部署
`cinaauth-delivery`、通过 `provision:secrets` 写入 Resend/Twilio/shared delivery secret，
再用 `check:cloudflare` 和带 shared delivery secret 授权头的
`https://cinaauth-delivery.cinagroup.com/ready` 确认投递服务已经 ready。

Auth Worker job 只会在 delivery Worker ready 后运行。它会先对 Worker 运行 `pnpm run check`，
通过 `provision:secrets` 写入 `CINAAUTH_SECRET`、`CINAAUTH_MIGRATION_TOKEN`、
`CINAAUTH_DELIVERY_WEBHOOK_URL=https://cinaauth-delivery.cinagroup.com/cinaauth/delivery` 和
`CINAAUTH_DELIVERY_WEBHOOK_SECRET`，并用 `pnpm run check:cloudflare` 确认 Cloudflare
里已经存在配置的 D1、Queue/DLQ、zone/route，以及 Worker secrets，再运行
`pnpm run build`。确认 Wrangler types、TypeScript、Worker 回归测试和 dry-run 打包都通过后才部署。CI 会在部署前校验
`CINAAUTH_SECRET`、`CINAAUTH_MIGRATION_TOKEN`、`CINAAUTH_DELIVERY_WEBHOOK_SECRET` 和
`CINAAUTH_DEMO_SECRET` 均至少 32 个字符。Worker 部署完成后，CI 会依次调用
`GET /api/migrate`、使用 `wrangler d1 time-travel info cinaauth-db` 记录迁移前的
Time Travel 恢复点（迁移出错时可用 `wrangler d1 time-travel restore cinaauth-db --bookmark=<id>`
回滚）、`POST /api/migrate` 和 `GET /api/ready`；只有线上迁移和 readiness
检查都通过，才继续部署 `demo-auth.cinagroup.com`。Demo 构建时服务端
`CINAAUTH_URL` 固定指向 `https://auth.cinagroup.com`，客户端
`NEXT_PUBLIC_CINAAUTH_API_URL` 指向 `https://demo-auth.cinagroup.com`，避免 demo 自己
调用自己形成认证 API 回环。Demo Worker 部署后，CI 会继续请求
`https://demo-auth.cinagroup.com/` 和
`https://demo-auth.cinagroup.com/api/auth/get-session`，确认公网首页和 demo auth proxy 都
已经可用。

## 本地开发

### Worker API 本地开发

```bash
cd demo/cloudflare-worker

# 启动开发服务器
pnpm dev
# API 运行在 http://localhost:8787
```

本地 D1 会由 Wrangler 模拟；需要初始化表结构时，对本地 Worker 调用同一个迁移端点，
并传入本地 `.dev.vars` 中配置的 `CINAAUTH_MIGRATION_TOKEN`。
可以从 `demo/cloudflare-worker/.dev.vars.example` 复制模板到 `.dev.vars`，再填入本地
32 字符以上的测试 secret。`.dev.vars` 已被 Git 忽略，避免本地密钥误提交。

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

# 无 Wrangler 权限时，也可以通过受保护端点确认线上状态
curl https://auth.cinagroup.com/api/ready \
  -H "Authorization: Bearer $CINAAUTH_MIGRATION_TOKEN"
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
