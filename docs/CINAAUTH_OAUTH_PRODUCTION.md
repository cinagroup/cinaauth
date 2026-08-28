# CinaAuth OAuth 生产接入手册

本文只覆盖 `accounts.cinaseek.ai` 的登录连接器。CinaAuth 仍以
`auth.cinaseek.ai` 的 Auth Worker 作为权威身份服务，但浏览器始终通过账号中心的
同源 `/api/auth/*` 入口发起请求，再由 Cloudflare Service Binding 转发。不要把
Generic OAuth 回调改到 Auth Worker 域名，否则 `state` 与登录会话 Cookie 会跨域丢失。

## 域名与回调矩阵

| 能力                                         | 供应商控制台配置                     | 生产值                                                                  |
| ------------------------------------------ | ---------------------------- | -------------------------------------------------------------------- |
| Google Social OAuth                        | Redirect URI                 | `https://accounts.cinaseek.ai/api/auth/callback/google`              |
| GitHub OAuth App                           | Authorization callback URL   | `https://accounts.cinaseek.ai/api/auth/callback/github`              |
| Generic OAuth/OIDC，供应商 ID 为 `<providerId>` | Redirect URI / Callback URL  | `https://accounts.cinaseek.ai/api/auth/oauth2/callback/<providerId>` |

Google 登录不使用 One Tap 或 Google Identity Services 浏览器组件。不要为当前登录 UI
配置 Authorized JavaScript origin，也不要向账号中心构建注入 Google Client ID。线上
`/api/auth/capabilities` 必须保持 `oneTap: false`；账号中心流水线会运行
`test:oauth-build` 和 `check:oauth-build`，阻止 One Tap 被重新启用。

## Google 与 GitHub Social OAuth

* Google 常规 OAuth 登录需要同时配置 `GOOGLE_CLIENT_ID` 与
  `GOOGLE_CLIENT_SECRET`；任一缺失时失败关闭，不注册 Provider，也不显示登录按钮。
* GitHub 登录需要同时配置 `GITHUB_CLIENT_ID` 与 `GITHUB_CLIENT_SECRET`；任一缺失时
  失败关闭，不注册 Provider，也不显示登录按钮。
* 两个供应商的回调都固定在 `accounts.cinaseek.ai`，由账号中心的 Service Binding
  转发到 Auth Worker。不要改成 `auth.cinaseek.ai`，否则发起登录时写入账号中心的
  state Cookie 不会随跨域回调返回。
* Google 和 GitHub 控制台都只登记各自的精确回调。不要使用通配符或旧 Demo 域名。
* 账号中心根据 `oauthProviders[].type === "social"` 调用 `signIn.social`；Generic OAuth
  仍调用 `signIn.oauth2`。Google 与 GitHub 使用相同的重定向按钮和回调模型。
* 账号中心只有 `/sign-in` 一个“登录或创建账号”入口。Google/GitHub 配置显式保持
  `disableImplicitSignUp: false` 与 `disableSignUp: false`：已有账号建立会话，首次通过
  供应商回调的用户直接创建账号，不再跳转到独立注册页。
* 此策略不启用隐式账号合并。邮箱不同或已存在其他身份时，仍必须登录后在 Security
  中显式关联；不要通过放宽 `disableImplicitLinking` 来规避冲突。

发布后分别验证 `/api/auth/sign-in/social` 发出的 `redirect_uri`、成功回调、拒绝授权、
state 不匹配、已有用户登录、首次用户建号、会话建立、注销和账号删除。只有真实供应商
端到端验收完成后，才能将相应连接器标记为生产可用。

## Generic OAuth/OIDC

### 供应商控制台

* `<providerId>` 必须是 1–64 位小写字母、数字、点、下划线或连字符，首尾必须是字母或
  数字；一个生产配置中不得重复。
* 在供应商控制台登记且仅登记精确回调：
  `https://accounts.cinaseek.ai/api/auth/oauth2/callback/<providerId>`。
* 优先使用 HTTPS OIDC discovery URL，并启用 PKCE。能提供 issuer identification 的
  供应商应配置 `issuer` 并启用 `requireIssuerValidation`。
* 只申请登录所需的最小 scopes。不要把业务 API 的高权限授权与身份登录混在一起。

### `GENERIC_OAUTH_CONFIG`

该 Worker Secret 是 1–20 个供应商对象组成的 JSON 数组。每个对象必须包含 Client ID、
精确的账号中心回调，以及 HTTPS discovery URL；没有 discovery 的供应商必须同时提供
HTTPS authorization、token 和 user-info endpoint。

```json
[
  {
    "providerId": "enterprise-idp",
    "discoveryUrl": "https://id.example.com/.well-known/openid-configuration",
    "issuer": "https://id.example.com",
    "requireIssuerValidation": true,
    "clientId": "replace-in-secret-store",
    "clientSecret": "replace-in-secret-store",
    "redirectURI": "https://accounts.cinaseek.ai/api/auth/oauth2/callback/enterprise-idp",
    "scopes": ["openid", "email", "profile"],
    "pkce": true
  }
]
```

代码会对整个数组执行失败关闭校验。任一供应商的 JSON、ID、HTTPS endpoint 或回调不合法
时，整个 Generic OAuth 能力不会启用，公开 capabilities 也不会展示这些供应商。不要使用
默认的 `https://auth.cinaseek.ai/api/auth/oauth2/callback/...` 回调。

### 安全写入与发布

在当前 PowerShell 进程设置 `GENERIC_OAUTH_CONFIG`，然后运行：

```powershell
pnpm --dir workers/auth-api run provision:secrets --deployment-target=production
pnpm --dir workers/auth-api run check:production
pnpm --dir workers/auth-api run check:cloudflare
```

`provision-secrets.mjs` 只通过环境变量读取配置并经 Wrangler stdin 写入，不应在命令参数、
日志、GitHub Actions 输出或受版本控制文件中打印 JSON。完成 Auth Worker 发布后，验证：

1. `/api/auth/capabilities` 只公开预期的 `providerId`，不含 Client ID/Secret 或 endpoint。
2. 账号中心只显示 capabilities 中已经启用的连接器。
3. 浏览器从 `accounts.cinaseek.ai/api/auth/sign-in/oauth2` 开始流程，供应商收到的
   `redirect_uri` 与控制台配置逐字符相同。
4. 回调返回 `accounts.cinaseek.ai/api/auth/oauth2/callback/<providerId>`，state 校验成功，
   会话 Cookie 只写入账号中心 origin。
5. 一次性账号可以登录、刷新页面保留会话、退出并重新登录；拒绝授权、state 不匹配和
   无效 code 都必须失败且不得建立会话。
6. 验收完成后删除测试账号，并保存不含令牌/用户隐私的测试时间、providerId、结果和
   对应审计事件。

真实 OAuth 账号必须走普通用户删除与 Privacy Erasure 链路；不要使用合成生命周期脚本的
管理员删除绕过外部处理方。`acceptance:production-lifecycle` 只为无真实邮箱、手机号、OAuth
连接或外部业务数据的 `@acceptance.invalid` 账号验证创建、会话签发、撤销和可靠清理，不能
替代本节的真实供应商回调与账号删除验收。

## 上线判定

“控制台已配置”或“capabilities 已出现”都不等于上线完成。每个 OAuth 连接器必须同时有：

* 供应商控制台截图或导出的非敏感配置证据；
* CinaAuth 静态门禁和远端预检通过；
* 真实供应商成功与失败路径端到端证据；
* 注销、解绑和账号删除时的令牌撤销/外部保留责任说明；
* 凭据轮换负责人、到期时间和回滚方案。
