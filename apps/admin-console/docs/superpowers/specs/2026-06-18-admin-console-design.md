# admin.cinagroup.com — 用户 & 审计后台 设计方案

- **日期:** 2026-06-18
- **状态:** 待评审
- **仓库:** `cinaadmin`（新建）+ `cinaauth`（增量）
- **参考:** `admin.cinagroup.com 完整功能详解.md`（附件）；`cinagrop/cinatoken` `web/default`（视觉/风格参考）

---

## 1. 目标与范围

为 CinaGroup 运维/安全管理员构建统一后台 `admin.cinagroup.com`，基于 `cinaauth`（Better Auth fork）+ `cinawalletkit`（RainbowKit fork, SIWE 钱包登录），统一管理 cinachain / cinacoin / cinatoken / cinaseek 全生态账号、钱包绑定、会话、审计、权限与安全风控。

### 1.1 v1 范围（本次交付）

全部 6 个核心模块 + 轻量加固：

1. 数据总览仪表盘
2. 全量用户管理（含 SIWE 钱包绑定面板）
3. 会话管理
4. 审计日志中心（数字资产合规模块）
5. 组织 / 商户管理
6. API 密钥管理
7. 安全策略配置面板

**轻量加固：** 仅 `super_admin` / `security_admin` 角色网关（双层校验）。强制 2FA 登录门、Cloudflare WAF IP 白名单**仅作部署配置文档与代码 TODO**，不阻塞 v1。

### 1.2 明确不做（YAGNI）

- 实时 WebSocket 仪表盘（页面刷新 / 短 revalidate 即可）
- 自定义 BI 高级报表（CSV 导出足够；附件明确为"二次开发"）
- 内置邮件 / Webhook 告警引擎（附件承认的短板）
- 生产 / 预发实例切换（单实例，见 §2.2）
- 新增任何鉴权 provider（cinaauth 已具备 SIWE + email-otp + 2FA + organization）

---

## 2. 架构与部署

### 2.1 总体架构

```
                    ┌───────────────────────────────┐
   Admin browser ──▶│  admin.cinagroup.com          │  Next.js 16 App Router
   (super_admin,    │  Cloudflare Pages             │  (React 19 RSC + Tailwind)
    en/zh)          │  ─────────────────────        │
                    │  • Server Components 读取     │
                    │  • Route Handlers /api/admin  │  (typed proxy, session-checked)
                    │  • Service module (cinaauth   │
                    │    client, typed)             │
                    └───────────────┬───────────────┘
                                    │ server-side fetch, Bearer token
                                    │ (CINAUTH_ADMIN_SERVICE_KEY)
                                    ▼
                    ┌───────────────────────────────┐
                    │  auth.cinagroup.com           │  cinaauth (Better Auth fork)
                    │  Cloudflare Worker/Pages      │  ─ plugins: admin, siwe,
                    │                               │    two-factor, email-otp,
                    │                               │    organization, bearer(api-key),
                    │                               │    open-api, + NEW audit plugin
                    │                               │  ─ D1: 共享 user/session/
                    │                               │    account/wallet/audit 表
                    └───────────────────────────────┘
```

**两个仓库、两套部署、一个 D1：**

- **`cinaadmin`（新建）** → Cloudflare Pages 项目 `admin.cinagroup.com`。纯前端 + 服务端代理。**不绑定任何 D1**，仅通过 HTTP 调 cinaauth。
- **`cinaauth`（现有 `auth.cinagroup.com`）** → 拥有 D1。本次新增**一个插件**（`audit-log`）+ 少量只读聚合端点 + 钱包管理端点。

**为何这样切分：** 控制台是高敏感安全面，把所有数据所有权与业务规则留在 cinaauth，意味着每一次读 / 写都走单一可审计路径。控制台可独立重建 / 重部署而不触碰鉴权数据。

### 2.2 关键决策（来自 brainstorming）

| 决策点 | 选择 | 理由 |
|---|---|---|
| 基础项目 | 在 `cinaadmin` 全新构建 | 完全 CinaGroup 原生代码，干净 |
| 技术栈 | Next.js 16 App Router on Cloudflare Pages | SSR + Cloudflare 部署友好 |
| 数据访问 | **仅通过 cinaauth API**（不直连 D1） | 单一事实源、可审计、解耦 schema |
| 审计日志源 | **新建 cinaauth audit-log 插件** | 附件"better-auth-audit-log 插件"模型 |
| 钱包数据源 | **复用 cinaauth SIWE 插件表** | 单一事实源，无新表 |
| v1 范围 | 全 6 模块 + 轻量加固 | 最快可用 |
| 实例 | 单生产实例（侧边栏静态"Production"徽章） | 多实例切换延后 |
| 语言 | en + zh（i18next） | 覆盖运维受众，可扩展 |

### 2.3 环境变量（Cloudflare Pages secrets）

| 变量 | 用途 |
|---|---|
| `CINAUTH_BASE_URL` | `https://auth.cinagroup.com` |
| `CINAUTH_ADMIN_SERVICE_KEY` | 控制台→cinaauth 的服务标识 Bearer（仅标识调用方，不绕过角色权限） |
| `CINAADMIN_ALLOWED_ROLES` | `super_admin,security_admin`（角色网关白名单） |

本地开发：`.env.local` 指向本地 / staging cinaauth；`wrangler` 用于 Pages 运行时测试。

---

## 3. 管理员会话与访问控制

### 3.1 登录流程

控制台**不自建鉴权**——重定向到 cinaauth 登录并消费其会话。

```
1. Admin 访问 admin.cinagroup.com → middleware 检查 cinaauth 会话 cookie
2. 无/失效会话 → 重定向 auth.cinagroup.com/sign-in?callbackURL=https://admin...
3. Admin 在 cinaauth 登录 → 邮箱密码 或 SIWE 钱包（cinawalletkit）
                          → cinaauth two-factor：若未验证 2FA → 挑战（TOTP/backup）
4. cinaauth 写会话 cookie → 重定向回 admin.cinagroup.com
5. Console middleware 解析会话 → role ∈ {super_admin, security_admin}?
                                • 是 → 渲染应用
                                • 否 → 403 "权限不足"
```

**Cookie 域：** cinaauth 会话 cookie 作用域为 `.cinagroup.com`（共享子域），故 `admin.cinagroup.com` 可读。**v1 约束：** cinaauth 与 admin 须在同一 eTLD+1 下。

### 3.2 三层访问强制（纵深防御）

| 层 | 位置 | 校验内容 |
|---|---|---|
| 1. Next.js middleware | 每请求，edge | 有效 cinaauth 会话 + 角色白名单；不满足则重定向 / 403 |
| 2. 代理 Route Handler | 每个 mutation `/api/admin/*` | 再次校验会话与角色（不信任 middleware 单点） |
| 3. cinaauth admin 中间件 | 每个目标 mutation 端点 | `admin` 插件既有 `adminMiddleware` 已执行 `hasPermission` |

### 3.3 角色划分（复用 cinaauth 既有模型）

- **`super_admin`** — 全 6 模块完全 CRUD（建用户、封禁、impersonate、删除、设密码、API key、组织、安全策略）。
- **`security_admin`** — 用户读 + 封禁/解封 + 会话 + 审计读 + SIWE 解绑。**无**建/删用户、API key、安全策略编辑。
- 其他角色 → 403。

具体权限语句在 Phase 0 落地为 cinaauth `hasPermission` statements（见 §6 开放问题 2）。

### 3.4 服务密钥

`CINAUTH_ADMIN_SERVICE_KEY` 仅**标识调用方**，**不**绕过 cinaauth admin 权限校验。用户级操作走操作者自身的会话上下文，代理只附加 service key 头。

### 3.5 延后加固（v1 仅 TODO + 文档）

- 强制 2FA 登录门（cinaauth two-factor 已支持 `requireTwoFactor`，"管理员必须完成 2FA 才能进入控制台"的强门留作加固 pass）
- Cloudflare WAF IP 白名单（纯部署配置，附件 §11）

---

## 4. 数据层与 cinaauth 集成

### 4.1 服务模块 `lib/cinaauth/`

三部分：

1. **typed client**（`client.ts`）—— 薄 fetch 封装，基于 `CINAUTH_BASE_URL` + service key，返回 typed JSON，不把 cinaauth 内部结构泄漏到 UI。
2. **既有端点映射**（无需改 cinaauth）：

| Console 模块 | cinaauth 端点（admin 插件） |
|---|---|
| 用户列表 | `GET /admin/list-users` |
| 用户详情 | `GET /admin/get-user` |
| 创建用户 | `POST /admin/create-user` |
| 编辑用户 | `POST /admin/update-user` |
| 封禁/解封 | `POST /admin/ban-user` / `unban-user` |
| 删除用户 | `POST /admin/remove-user` |
| 设密码 | `POST /admin/set-password` |
| 模拟登录 | `POST /admin/impersonate-user` / `stop-impersonating` |
| 会话 | `GET /admin/list-user-sessions` / `POST /admin/revoke-session` / `revoke-user-sessions` |
| 组织 | organization 插件端点 |
| API key | bearer 插件端点 |
| 角色权限 | `POST /admin/has-permission` |

3. **新增 cinaauth 只读端点**（仪表盘聚合，避免 client 端 `listUsers` 计数过重）：

| 新端点 | 返回 |
|---|---|
| `GET /admin/stats/overview` | `{ totalUsers, newUsers30d, activeSessions, organizationCount, bannedCount, usersWithout2FA, loginChannels: { emailPassword, github, siwe } }`（`loginChannels` 用于仪表盘登录渠道饼图，按 `account.providerId` 分组计数） |
| `GET /admin/stats/signups?range=7d\|30d` | 每日注册数组 → 折线图 |
| `GET /admin/stats/security-today` | `{ failedLoginsToday, otpRequestsToday, geoAnomalyCount }` |

均位于 cinaauth 内部（D1 原子查询），service key 访问，同 `adminMiddleware` 角色控制，**只读**。

### 4.2 代理层 `app/api/admin/...`

每个 mutation 走 Route Handler，机械职责：

```
incoming POST /api/admin/users/:id/ban
  1. resolveAdminSession(request)   → 读 cinaauth 会话 cookie，经 /api/get-session 校验，返回 {userId, role}
  2. requireRole(session, allowed)  → 否则 403
  3. cinaauthAdmin.banUser(...)     → 带 service key 转发 cinaauth
  4. audit(...)                     → 写审计（见 §5）
  5. 返回标准化响应或错误
```

**为何用代理而非 Server Component 直连：** mutation 需要请求会话上下文（cookie 绑定请求）+ service key，Route Handler 是唯一同时持有两者的位置；单一可审计 mutation 点（每个 handler 调审计钩子）。读操作由 Server Component 直接 fetch，mutation 走代理。

### 4.3 DTO 标准化

cinaauth 返回其自有结构；`lib/cinaauth/` 每层有 typed DTO（user / session / account），仅暴露各模块所需最小字段（不外泄密码哈希、内部 id）。cinaauth 结构变更只动 adapter，UI 无感。

### 4.4 缓存与新鲜度

- 用户 / 会话 / 审计**不缓存**——安全敏感实时数据，每次加载重 fetch。
- 仪表盘 stats 最多缓存 30–60s（`fetch` cache / `revalidate`）。
- CSV 导出按需流式，不缓存。

### 4.5 错误处理约定

每个代理 handler 返回 `{ ok: true, data } | { ok: false, error: { code, message } }`。cinaauth 错误码（插件 `error-codes.ts`）映射到稳定的 console 错误码，UI 提示一致。

---

## 5. cinaauth Audit 插件 + SIWE 钱包面板

### 5.1 新 `audit-log` 插件（位于 `cinaauth/packages/better-auth/src/plugins/audit-log/`）

仿现有 `admin` / `access` 插件结构（`createAuthEndpoint`、`init`、`hooks`、`endpoints`、`schema`、`$ERROR_CODES`）。

**Schema（merge 到 D1）：**

```
auditLog
  id            string (pk)
  timestamp     date    (indexed)
  actorId       string? (操作者 userId；system/anonymous 为 null)
  actorRole     string?
  actorIp       string?
  actorUa       string?
  actorSite     string? (cinachain / cinacoin / cinatoken / cinaseek / admin)
  category      enum    (user | session | auth | admin | risk | wallet | org | apikey)
  action        string  (如 "user.ban", "session.revoke", "siwe.unbind", "user.login_failed")
  targetType    string? (user / session / wallet / org / apikey)
  targetId      string?
  result        enum    (success | failure)
  metadata      text    (JSON string：事件特定详情)
```

**采集——两路、不重复计算：**

1. **插件 `hooks.after`**（仿 admin 插件 `/list-sessions` 钩子）：matcher 白名单路由核心鉴权端点（`/sign-in`、`/sign-up`、`/sign-out`、`/2fa/*`、`/email-otp/*`、`/siwe/verify`、全部 `/admin/*`）→ handler 在端点 resolve 后写一行 `auditLog`，上下文取自 `ctx`（IP、UA、session、body）。覆盖 user/auth/risk 类别。
2. **代理显式 `auditLog()` 调用**（§4.2）：每个 mutation handler 在转发后调 `POST /audit/log`。覆盖"导出 CSV"等无对应 cinaauth 端点的 console-only 操作。类别 = `admin`。

**尽力而为、非阻塞：** 审计写失败记 stderr，绝不阻塞用户响应（鉴权可用性不应被审计拖垮）。

**新端点：**

| 端点 | 用途 |
|---|---|
| `GET /audit/list` | 分页、筛选（时间范围、category、action、actorId、actorIp、result、targetId）、排序；返回 DTO |
| `POST /audit/log` | 显式记录（代理使用；拒绝非内部 caller 除 service key） |
| `GET /audit/export` | 流式 CSV，同 `/list` 筛选 |
| `GET /audit/alerts` | 风险高亮：高频失败登录、境外 IP 簇集（基于 `/list` 数据计算，幂等） |

均经同 `adminMiddleware` + `security_admin` / `super_admin` 角色限制。

**保留：** D1 行不可由 console 删除；保留策略（附件要求 ≥90 天）由 D1 生命周期 / cron Worker 清理强制（部署配置，非代码）。

**风险高亮：** `result=failure` 且同 IP/actor 在窗口内超阈值行标红（附件 §IV.3）。标记在展示层（console），数据层仅存原始事实。

### 5.2 SIWE 钱包管理面板（扩展 admin + siwe 插件）

**数据源（已确认）：** SIWE 插件写两处——

- `walletAddress` 表：`userId, address, chainId, isPrimary, createdAt`
- `account` 行：`providerId: "siwe"`, `accountId: "<address>:<chainId>"`

用户详情页 → *Wallets (SIWE)* tab 需要：列出绑定钱包、显示绑定元数据（时间、IP、nonce）、解绑（强制移除）。

**绑定 IP/nonce 来源：** 不扩 SIWE schema，改从 audit-log 取（§5.1 在绑定处记 `siwe.bind` 含 IP/nonce）。Wallet tab join `walletAddress` + `auditLog where action=siwe.bind and targetId=address`。避免 schema 迁移，保持 SIWE 表精简。

**新 admin 端点（扩展 admin 插件，置于 admin 权限后，非独立 SIWE 插件）：**

| 端点 | 用途 |
|---|---|
| `GET /admin/list-user-wallets?userId=` | 返回 `[{address, chainId, isPrimary, boundAt, boundIp, boundSite}]` |
| `POST /admin/unbind-wallet` body `{userId, address, chainId}` | 删 `walletAddress` 行 + 匹配 `account` 行；吊销该钱包活跃会话；写 `siwe.unbind` 审计；需 `super_admin` 或 `security_admin` |

**解绑安全：** 销毁受影响地址会话（盗号场景）；始终审计（category `wallet`，action `siwe.unbind`，含 admin actor）；不静默移除主钱包——若解绑 `isPrimary`，插件挑剩余最早地址或置 null（操作前确认对话框明示）。

### 5.3 跨仓库影响

| 变更 | 仓库 |
|---|---|
| 新 `audit-log` 插件（schema、hooks、4 端点） | cinaauth |
| SIWE schema 丰富（可选）+ `/admin/list-user-wallets` + `/admin/unbind-wallet` | cinaauth（admin + siwe） |
| 3 个 stats 端点（§4.1） | cinaauth |
| 确认 `listUsers` 支持钱包地址搜索字段（否则加 join） | cinaauth |
| Wallet tab UI、解绑流程、审计表 UI、风险高亮 | cinaadmin |

均遵循 cinaauth 既有模式，含测试（按 cinaauth `AGENTS.md`：fix/feature 必须含测试，Conventional Commits，PR 指向 main）。

---

## 6. UI 模块、路由与信息架构

### 6.1 App Router 路由树

```
app/
├── layout.tsx                    根布局：主题 provider、i18n、字体（CinaGroup 黑金）
├── (auth)/                       无侧边栏组（登录在 auth.cinagroup.com；此组留回跳/登出页）
│   └── callback/route.ts         可选：cinaauth 登录后回跳着陆
├── (admin)/                      受保护 console shell（侧边栏 + 顶栏）
│   ├── layout.tsx                middleware 保护；渲染 Sidebar + Topbar + 内容
│   ├── page.tsx                  ① 仪表盘
│   ├── users/
│   │   ├── page.tsx              ② 用户列表（筛选、搜索、批量、CSV 导出）
│   │   ├── new/page.tsx          ② 手动建号
│   │   └── [id]/
│   │       ├── page.tsx          ② 用户详情（tab 式）
│   │       └── impersonate/route.ts  ② 启动 impersonate → 跳转
│   ├── sessions/page.tsx         ③ 会话管理
│   ├── audit/page.tsx            ④ 审计日志中心
│   ├── organizations/
│   │   ├── page.tsx              ⑤ 组织/商户列表
│   │   ├── [id]/page.tsx         ⑤ 组织详情（成员、角色、邀请）
│   │   └── new/page.tsx          ⑤ 创建组织
│   ├── api-keys/
│   │   ├── page.tsx              ⑥ API 密钥管理
│   │   └── [id]/page.tsx         ⑥ 密钥详情（调用日志、频次）
│   └── settings/security/page.tsx ⑦ 安全策略面板
├── api/admin/                    代理 Route Handlers（§4.2）
│   ├── users/...
│   ├── sessions/...
│   ├── organizations/...
│   ├── api-keys/...
│   ├── audit/route.ts
│   ├── stats/route.ts
│   └── export/route.ts
└── (errors)/
    ├── 403/page.tsx
    └── not-found.tsx
```

### 6.2 侧边栏信息架构（对应附件 6 模块）

```
CinaGroup Admin            ← logo + "Production" 徽章（静态）
─────────────────────
Overview            ① 仪表盘
Accounts
  ├ Users           ② 用户管理
  ├ Sessions        ③ 会话
  ├ Organizations   ⑤ 组织/商户
  └ API Keys        ⑥ API 密钥
Compliance & Security
  ├ Audit Log       ④ 审计日志中心
  └ Security Policy ⑦ 安全策略
─────────────────────
[admin avatar] super_admin    ← profile 下拉、语言切换（en/zh）、登出
```

### 6.3 各模块页面能力（映射附件 §三–§八）

**① 仪表盘**（`(admin)/page.tsx`，Server Component）
- 4 统计卡（总用户、30 天新增、活跃会话、组织数）— `/admin/stats/overview`
- 登录渠道饼图（邮箱密码 / GitHub OAuth / SIWE）— 账户 provider 计数衍生
- 7/30 天注册趋势折线图 — `/admin/stats/signups`
- 安全看板（当日失败登录、OTP 刷量、封禁数、未开 2FA 高危账号）— `/admin/stats/security-today` + overview
- 图表库：**Recharts**（轻、React 原生、SSR 友好），黑金主题 token

**② 用户管理**（`users/`）
- **列表：** `@tanstack/react-table`（同 cinatoken `components/data-table`），筛选 chip（邮箱、钱包、状态、登录方式、组织、注册时间范围）、防抖模糊搜索、分页、CSV 导出
- **批量：** 批量封禁/解封、批量导出选中
- **详情页**（tab = 各 server-fetched 子区）：
  - *Overview*：基础信息 + 注册来源站点（cinachain/cinacoin/…）、2FA 状态、备注（高资产标记）
  - *Wallets (SIWE)*：绑定地址表（地址、绑定时间、绑定 IP、nonce）— **Unbind** 按钮（见 §5.2）
  - *Third-party*：GitHub OAuth 记录
  - *Sessions*：该用户实时会话；逐个 / 批量吊销
  - *Login trail*：登录历史（IP、UA、结果、时间）— 来自审计
  - *Security*：密码修改历史、OTP 验证记录
- **操作**（super_admin 内）：编辑资料、设密码（下发重置 OTP）、封禁（7 天 / 30 天 / 永久 + 原因）、解封、impersonate（醒目"模拟中"横幅）、强制解绑钱包

**③ 会话**（`sessions/`）：全局会话表；逐个吊销；逐用户批量吊销；"僵尸会话"过滤（长期未活跃）辅助清理 KV

**④ 审计日志中心**（`audit/`）：见 §5.1

**⑤ 组织**（`organizations/`）：列表（创建时间、成员数、管理员、所属站点）；成员管理（添加/移除、角色：发行员 / 只读）；邀请链接（生成、失效、回收）；按商户隔离视图（商户仅看自身发行 Token 数据）

**⑥ API 密钥**（`api-keys/`）：创建/启用/禁用；设过期时间 + 范围（仅查用户 / 仅验签 SIWE）；绑定业务服务（NewAI 网关、区块同步、统计脚本）；每密钥调用日志（频次、来源 IP）

**⑦ 安全策略**（`settings/security/`）：可视化调全局参数——OTP TTL / 每日上限、密码错误锁定阈值、封禁时长、强制 2FA 开关（可单独开 cinacoin/cinatoken 资金站）、可信域名配置（同步 `auth.cinagroup.com` trustedOrigins）；经 cinaauth admin 配置端点读写

### 6.4 共享 UI 基底

复用 cinatoken `web/default/src/components/ui` 原语 + `components/data-table`，按 CinaGroup 黑金主题（深底、金色强调）token 化。i18n 用 **i18next + react-i18next**（en/zh，同 cinatoken 库/约定），翻译文件扁平 JSON。

### 6.5 Impersonate 横幅

impersonate 中任何页渲染持久不可关闭顶栏横幅（"Acting as \<user\> — Stop impersonating"），链 `/api/admin/users/[id]/impersonate/stop`。cinaauth 通过 `admin_session` cookie 追踪；横幅在 Session 中 server-side 检测 `impersonatedBy`。

---

## 7. 分阶段实施

### Phase 0 — cinaauth 契约（先行）
- `audit-log` 插件：schema + 两路采集 + `GET /audit/list`、`/audit/export`、`/audit/alerts`、`POST /audit/log`
- 3 个 stats 端点：`/admin/stats/overview`、`/signups`、`/security-today`
- 钱包管理端点：`/admin/list-user-wallets`、`/admin/unbind-wallet`
- 确认 `listUsers` 接受钱包地址搜索字段（缺则加 join）
- 测试 + 文档（按 cinaauth AGENTS.md）
- **DoD：** 所有端点在部署的 auth.cinagroup.com 上返回正确 typed JSON、角色受限

### Phase 1 — cinaadmin 骨架 + 访问控制
- Next.js 16 应用，Cloudflare Pages 配置，黑金主题，移植 UI 原语，i18n（en/zh）
- middleware + 代理角色网关（super_admin/security_admin），重定向 cinaauth 登录，`.cinagroup.com` cookie 域，`lib/cinaauth/` typed client
- `(admin)/layout.tsx` shell：侧边栏、顶栏、impersonate 横幅、profile/语言下拉
- **DoD：** admin 能登录、看到 shell；非 admin 收 403；登出有效

### Phase 2 — 读取/列表模块（仪表盘、用户、会话、审计）
- 仪表盘（统计卡、渠道饼图、注册图、安全看板）——消费 Phase 0 stats
- 用户列表 + 详情 tabs（Overview、Wallets、Third-party、Sessions、Login trail、Security）——只读 + CSV 导出
- 会话列表 + 吊销（单/批）
- 审计日志中心（筛选、风险高亮、CSV 导出）
- **DoD：** 运维可监控、可只读检索全平台

### Phase 3 — 变更模块（用户操作、组织、API 密钥、安全策略）
- 用户 mutation：创建、编辑、封禁/解封（7/30/永久 + 原因）、设密码（OTP）、impersonate（带横幅）、解绑钱包
- 组织 CRUD、成员、角色、邀请链接、租户隔离视图
- API 密钥 CRUD、范围、过期、调用日志视图
- 安全策略面板（OTP 限制、锁定、强制 2FA 开关、可信源）
- 每个 mutation 经代理且审计（Phase 0 审计钩子）
- **DoD：** 附件全部范围交付为 v1

### 后续（Post-v1，文档化、不阻塞）
- 加固 pass：管理员登录强制 2FA 门、Cloudflare WAF IP 白名单配置校验
- 生产 / 预发实例切换器
- 额外语言（fr/ru/ja/vi）
- Webhook / 邮件告警对接
- 自定义高级报表

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| cinaauth `listUsers` 不能按钱包地址搜 | 用户钱包模糊搜索失效（附件 §III.1） | Phase 0 验证；缺则加 join 作为契约一部分。早发现 |
| 跨子域 cookie 作用域（`auth.`↔`admin.`）某些配置下失效 | admin 无法保持登录 | Phase 1 纯访问控制——先验证；回退：console 每调用传 cinaauth 会话 token（bearer 模式）不依赖 cookie |
| audit 插件 `hooks.after` 捕获不足/过度或与 cinaauth 未来端点冲突 | 审计漏或重复计算 | matcher 白名单（显式路径列表），非"全捕获"；尽力而为写不阻塞鉴权。Phase 0 测试 |
| D1 审计量（每次登录/操作写一行） | 成本/性能 | 只索引列；时间戳分页；保留由 D1 生命周期（cron）而非代码约束；stats 聚合并缓存 30–60s |
| 跨仓库协调（cinaauth + cinaadmin 同步发布） | 计划摩擦 | cinaauth 契约端点版本化；console 锁版本范围；Phase 0 先部署 |
| 受保护品牌冲突——cinaauth 是 Better Auth fork | 合规 | cinaauth 的 README/AGENTS.md 无受保护品牌字段（不同于 cinatoken）；仅在 cinaauth **新增**文件，从不改/删标识符；cinaadmin 全新，品牌完全自控 |
| 无内置告警（附件承认短板） | 运维须手动看 | v1 接受；审计 `/alerts` 端点供数据，Webhook 可后接 |

---

## 9. 开放问题（spec 已合理解决，列出待确认）

1. **CSV 导出保留"≥90 天"** —— 由 D1 生命周期 cron 强制（D1 无内置 TTL）。**假设：** 90 天最小、可配置。
2. **security_admin 权限边界** —— 附件述可封禁/解封 + 解绑钱包 + 读，不可建/删/API key/策略。**假设：** 映射 cinaauth permission statements，Phase 0 细化。可调。
3. **impersonate 会话 TTL** —— 复用 cinaauth `admin_session` cookie，不自创 TTL。**假设：** 继承 cinaauth 默认会话 TTL；横幅 + Stop 按钮覆盖手动结束。

---

## 10. 测试策略

- **cinaauth 侧（Phase 0）：** 每个新端点 / 插件含 Vitest 单测（按 cinaauth AGENTS.md：fix/feature 必须含测试）；adapter 测试覆盖 D1（经 drizzle-adapter）。
- **cinaadmin 侧：**
  - 代理 Route Handler：用 cinaauth mock（`getTestInstance()` from `cinaauth/test`）跑端到端契约测试
  - 访问控制：role gate 单测（super_admin / security_admin / 其他 → 期望行为）
  - UI：组件单测（Vitest + Testing Library），关键流程（封禁、解绑、impersonate、CSV 导出）e2e
- **跨仓契约：** Phase 0 端点的 typed response 作为 cinaadmin 的契约测试 fixture，防漂移

---

## 附录 A：与 Cina 生态联动（附件 §九，落地映射）

| 联动 | 实现 |
|---|---|
| 与 auth.cinagroup.com | 共用 D1（user/session/account/wallet/audit）；console 操作实时经 cinaauth 同步 |
| 与 relay.cinagroup.com | 钱包绑定记录关联中继会话（Phase 3 后续可加 relay 会话查看） |
| 与 RainbowKit 前端 SIWE | SIWE 绑定全留存，Wallet tab 审计资金账户钱包操作 |
| 四大业务站统一管控 | 一处后台管全部用户（actorSite 字段区分来源） |
