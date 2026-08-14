# CinaAuth Cloudflare 部署指南

生产认证入口为 `https://auth.cinaseek.ai`。认证数据写入 PostgreSQL，Cloudflare
Worker 只能通过 Hyperdrive 连接；登录限流由 SQLite Durable Object 分片原子执行，
不再使用 D1 热行或 isolate 内存计数。

## 架构

```text
auth.cinaseek.ai (Custom Domain)
  -> cinaauth-api Worker
     -> HYPERDRIVE -> PostgreSQL
     -> RATE_LIMITER -> 256 个 RateLimitDurableObject 分片
     -> cinaauth-delivery Queue -> HTTPS 签名投递服务
```

`/api/auth/sign-in/*` 每个 IP/路径 60 秒最多 5 次。CinaAuth 的其他客户端接口
也使用同一个 DO `customStorage.consume()`，保留各插件自己的限流规则。

## 部署前准备

1. 在 Cloudflare Dashboard 创建 Hyperdrive，并只在 Dashboard 中填写 PostgreSQL
   主机、用户名和密码。不要把连接串放入 CLI 参数或仓库。
2. 记录 32 位 Hyperdrive ID，配置 `CINAAUTH_HYPERDRIVE_ID`。
3. 确认 `cinaauth-delivery` Queue 和 `cinaauth-delivery-dlq` 已存在。
4. 准备 Cloudflare API Token、Account ID；确认三个有状态 Worker secret 已存在于
   Cloudflare 远端。

```powershell
$env:CINAAUTH_HYPERDRIVE_ID = "<32 位 Hyperdrive ID>"
node scripts/check-cloudflare-preserved-secrets.mjs
pnpm --dir workers/auth-api run configure:hyperdrive
pnpm --dir workers/auth-api run check:production
pnpm --dir workers/auth-api run provision:secrets --deployment-target=production
pnpm --dir workers/auth-api run check:cloudflare
pnpm --dir workers/auth-api run build
pnpm --dir workers/auth-api run deploy
```

`CINAAUTH_SECRET`、`CINAAUTH_PRIVACY_EXPORT_KEY` 和 Privacy Worker 的
`CINAAUTH_ERASURE_STORAGE_SECRET` 只保留在现有 Cloudflare Worker 中；中央流水线仅
只读检查它们的名称，不从 GitHub 读取，也不在部署时重写。缺少任一名称时必须停止并
进入恢复或协调轮换流程，不能临时生成替代值。Cloudflare 的正常 `wrangler deploy`
会保留已挂载的 secret。

在这四项核心 secret 中，只有 `CINAAUTH_MIGRATION_TOKEN` 由 GitHub `production`
environment 提供，并由 Auth provisioner 明确更新。provisioner 还写入固定服务端点，
并且只更新本次显式提供且非空的 optional plugin secrets；未提供的 optional secret 不会
被选择。脚本通过 Wrangler stdin 写入，不会把值放进命令参数。商用全插件上线可设置
`CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS=1`，强制检查 Turnstile、Google、Generic OAuth、
Stripe 等输入。

Turnstile 必须同时配置 `CLOUDFLARE_TURNSTILE_SITE_KEY` 和
`CLOUDFLARE_TURNSTILE_SECRET_KEY`；只配置其中一个时能力发现保持关闭，密钥脚本也会
拒绝半配置。站点密钥是公开组件参数，由 `/api/auth/capabilities` 安全下发；Secret
只保存在 Auth Worker。Demo 完成挑战后通过 `x-captcha-response` 提交一次性令牌。

使用具备 `Turnstile Sites Write`（或 `Account Settings Write`）权限的 API Token
执行以下幂等命令。脚本只管理明确命名的 `CinaAuth Production` 组件，将其限制为
Managed 模式、无 Clearance，并绑定 CinaAuth 生产域名；Secret 只通过 Wrangler stdin
写入，不会输出到日志。

```powershell
pnpm --dir workers/auth-api run configure:turnstile -- --dry-run
pnpm --dir workers/auth-api run configure:turnstile
```

## PostgreSQL 迁移和 readiness

部署前应在 PostgreSQL 提供方创建可恢复备份。先预览、再应用迁移：

```powershell
$headers = @{ Authorization = "Bearer $env:CINAAUTH_MIGRATION_TOKEN" }
Invoke-RestMethod https://auth.cinaseek.ai/api/migrate -Headers $headers
Invoke-RestMethod https://auth.cinaseek.ai/api/migrate -Method Post -Headers $headers
Invoke-RestMethod https://auth.cinaseek.ai/api/ready -Headers $headers
```

`/api/ready` 检查 Hyperdrive、PostgreSQL 必需表、Queue、投递 webhook、
`RATE_LIMITER` 和 `VERSION_METADATA`；成功返回 200，未就绪返回 503。响应带
`Cache-Control: no-store`，不返回 secret、连接串或数据库密码。
`check:cloudflare` 在当前进程同时拥有 `CINAAUTH_MIGRATION_TOKEN` 时会执行受保护的
详细 readiness，并要求 cutover、数据库和运行时配置全部通过；没有该 token 时只
验证端点仍返回 403，并明确标记详细验收未执行。Delivery Worker 同理：提供
`CINAAUTH_DELIVERY_WEBHOOK_SECRET` 时会同时验证邮件、短信和重放 KV。

真实投递验收必须显式执行，避免自动化意外向真实用户发送消息。设置获批的
`CINAAUTH_ACCEPTANCE_EMAIL`、E.164 格式的 `CINAAUTH_ACCEPTANCE_PHONE` 和
`CINAAUTH_DELIVERY_WEBHOOK_SECRET` 后运行：

```powershell
pnpm --dir workers/delivery run acceptance:providers -- --send
```

脚本覆盖 Email OTP、Magic Link、密码重置、手机 OTP、手机重置 OTP，并重复一个
Delivery ID 验证 KV 去重。只有操作员确认邮箱和手机均收到消息后，才可将真实投递
E2E 标记为通过。

`cinaauth-delivery.cinagroup.com` 使用 Worker Custom Domain，由 Cloudflare 管理 DNS
目标和证书；不要改回缺少代理 DNS 记录的 route-only 主机名。
投递 Worker 使用 `X-CinaAuth-Delivery-Signature` 验证签名，认证 Worker 不会把
投递密钥写入日志或响应。

Durable Object 使用 `exports.RateLimitDurableObject` 声明 SQLite 存储，首次
`wrangler deploy` 自动创建命名空间。`auth.cinaseek.ai` 使用 Custom Domain，
Cloudflare 自动管理 DNS 记录和证书；如果已有同名 CNAME，需要先处理冲突。

GitHub Actions 还需要 `CINAAUTH_HYPERDRIVE_ID`、`CLOUDFLARE_API_TOKEN`、
`CLOUDFLARE_ACCOUNT_ID`、`CINAAUTH_MIGRATION_TOKEN` 及启用功能对应的 optional
凭据。不要在 GitHub 中创建 `CINAAUTH_SECRET`、`CINAAUTH_PRIVACY_EXPORT_KEY` 或
`CINAAUTH_ERASURE_STORAGE_SECRET`；投递共享密钥与提供商凭据按各自的 Secrets Store
或部署后控制面流程管理。
流水线只有在迁移与 `/api/ready` 都成功后，才继续检查
`accounts.cinaseek.ai/api/auth/get-session`。

完整运维说明见 `workers/auth-api/DEPLOYMENT.md`。

## PostgreSQL 切换保护

保留现有 `cinaauth-db`，并仅以只读回滚源 `LEGACY_D1` 绑定。首次部署必须把
`CINAAUTH_CUTOVER_STATE` 临时覆盖为 `maintenance`，先执行普通
`/api/migrate` 建表，再预览并执行 `/api/migrate/d1`。D1 复制只接受独立的
一次性 `CINAAUTH_D1_MIGRATION_TOKEN`，响应只返回各表行数，且只有 PostgreSQL
与 D1 行数全部相等才提交事务。验证后部署仓库中的 `live` 状态并立即移除
一次性 secret。认证请求和 `/api/ready` 还会要求事务内生成的
`cinaauth_cutover_history` 标记；缺少该标记时保持 503。认证与会话的
Hyperdrive 查询缓存必须保持禁用。
