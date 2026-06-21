# Cloudflare Workers 部署解决方案

## 问题诊断

在将 CinaAuth Next.js demo 部署到 Cloudflare Workers 时遇到了两个主要问题：

### 问题 1：CINAAUTH_URL 配置错误
**症状**：Worker 部署成功但页面无法访问
**原因**：`wrangler.toml` 中的 `CINAAUTH_URL` 设置为 demo 自己的域名 `https://demo-auth.cinagroup.com`，导致无限循环
**解决方案**：修改为指向实际的认证 Worker API：`https://auth.cinagroup.com`

### 问题 2：OpenNext middleware-manifest.json 动态 require 错误
**症状**：访问页面返回 500 Internal Server Error
**错误信息**：`Dynamic require of "/.next/server/middleware-manifest.json" is not supported`
**原因**：Next.js 16.x 在服务器端使用 `require()` 动态加载 manifest 文件，但 Cloudflare Workers 不支持动态 require
**解决方案**：在构建后修补 `handler.mjs`，将动态 require 替换为内联的 manifest 内容

## 实施的解决方案

### 1. 修复 wrangler.toml 配置
```toml
[vars]
CINAAUTH_URL = "https://auth.cinagroup.com"  # 指向实际的认证 API
```

### 2. 创建后构建补丁脚本
创建了 `post-build-patch.js` 脚本，自动修补 OpenNext 生成的 worker：

```javascript
// 读取 middleware-manifest.json
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

// 将动态 require 替换为内联 manifest
const oldPattern = 'getMiddlewareManifest(){return this.minimalMode?null:require(this.middlewareManifestPath)}';
const newPattern = `getMiddlewareManifest(){return this.minimalMode?null:${JSON.stringify(manifest)}}`;
```

### 3. 更新构建流程
修改 `build-cf.mjs`，在 OpenNext 构建后自动运行补丁脚本：

```javascript
// Step 4: Apply post-build patches
execSync("node post-build-patch.js", {
    stdio: "inherit",
    cwd: appDir,
});
```

### 4. 降级 Next.js 版本
从 Next.js 16.2.6 降级到 15.0.0 以获得更好的 OpenNext 兼容性

### 5. Worker 间通信：使用 Service Binding
**问题**：demo-auth.cinagroup.com 无法通过公网访问 auth.cinagroup.com（522 错误）
**原因**：Cloudflare Workers 不能通过公网域名互相访问，会导致循环检测
**解决方案**：使用 Cloudflare Service Binding 实现 Worker 间内部通信

#### 配置 Service Binding
在 `wrangler.toml` 中添加：
```toml
[[services]]
binding = "AUTH_WORKER"
service = "cinaauth-api"
```

#### 拦截 /api/auth/* 请求
在 `post-build-patch.js` 中添加 worker.js 补丁，拦截所有 `/api/auth/*` 请求并转发到 AUTH_WORKER：

```javascript
// Intercept /api/auth/* requests and forward to AUTH_WORKER service binding
if (url.pathname.startsWith("/api/auth/") && env.AUTH_WORKER) {
    const authRequest = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.method !== "GET" ? request.body : undefined,
    });
    
    // Forward to auth worker via service binding (internal network)
    const authResponse = await env.AUTH_WORKER.fetch(authRequest);
    
    // Add CORS headers
    const corsHeaders = new Headers(authResponse.headers);
    corsHeaders.set("Access-Control-Allow-Origin", "*");
    corsHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    corsHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    return new Response(authResponse.body, {
        status: authResponse.status,
        statusText: authResponse.statusText,
        headers: corsHeaders,
    });
}
```

**优势**：
- ✅ 零网络延迟（内部通信）
- ✅ 无需公网域名配置
- ✅ 自动处理 CORS
- ✅ 错误处理：如果 auth worker 不可用，返回 503 错误

## 部署结果

✅ **成功部署**：
- Worker: `cinaauth-demo`
- 自定义域名: `demo-auth.cinagroup.com`
- 首页: https://demo-auth.cinagroup.com/ ✅ (200 OK)
- 登录页: https://demo-auth.cinagroup.com/sign-in ✅
- **API 端点**: https://demo-auth.cinagroup.com/api/auth/* ✅ (通过 Service Binding 工作)

### 验证测试

```bash
# 测试首页
curl -I https://demo-auth.cinagroup.com/
# HTTP/2 200

# 测试 API 端点
curl https://demo-auth.cinagroup.com/api/auth/get-session
# null (正确的未认证响应)
```

## 修改的文件

1. **配置修复**
   - `wrangler.toml` - 修正 CINAAUTH_URL
   - `middleware.ts` - 临时移除以简化调试
   - `next.config.mjs` - 调整 Next.js 配置

2. **新增文件**
   - `post-build-patch.js` - 构建后自动补丁脚本
   - `build-cf.mjs` - 更新构建流程

3. **依赖更新**
   - `package.json` - Next.js 降级到 ^15.0.0

## 后续建议

1. **API 代理问题**：调查 Cloudflare Workers 的 fetch 超时限制，考虑使用 Worker-to-Worker 调用
2. **自动化部署**：确保 CI/CD 流程包含 `post-build-patch.js` 步骤
3. **监控**：添加 Cloudflare Worker 日志监控以捕获生产错误
4. **文档**：将此解决方案记录到项目文档中，供未来参考

## 参考资料

- [OpenNext Cloudflare 文档](https://opennextjs.cloudflare.com/)
- [Cloudflare Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)
- [Next.js 16 变更日志](https://nextjs.org/blog/next-16)
