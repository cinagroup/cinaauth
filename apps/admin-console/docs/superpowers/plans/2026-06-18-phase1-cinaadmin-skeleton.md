# Phase 1 — cinaadmin 骨架 + 访问控制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在空的 `cinaadmin` 目录搭建 Next.js 16 控制台骨架：黑金主题、i18n（en/zh）、`lib/cinaauth/` typed client、三层访问控制（middleware + 代理角色网关）、受保护 shell（侧边栏 + 顶栏 + impersonate 横幅占位）。本阶段不实现任何业务模块页面（留空占位），只打通"管理员能登录看到 shell，非管理员 403"。

**Architecture:** Next.js 16 App Router（RSC + Tailwind v4）部署 Cloudflare Pages。控制台不自建鉴权——重定向 `auth.cinagroup.com` 登录，消费其 `.cinagroup.com` 共享 cookie。会话解析在 Next.js middleware（edge）+ 每个 `/api/admin/*` Route Handler 二次校验。业务页面占位，下阶段填充。

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, i18next + react-i18next, Vitest + Testing Library, Base UI（组件原语，对齐 cinatoken 风格）。

**Repo:** `E:\cinagroup\cinaadmin`（全新，目前为空，除 docs/）

**Prerequisite:** Phase 0 已合并部署到 `auth.cinagroup.com`（本阶段依赖 cinaauth `/get-session` 与既有的 session cookie 机制；stats/wallet/audit 端点本阶段暂不消费，留到 Phase 2/3）。

**Spec reference:** `docs/superpowers/specs/2026-06-18-admin-console-design.md` §2, §3, §6.1, §6.2, §6.4

**关键约定：**
- 包管理器：`pnpm`（与 cinaauth/cinatoken 生态一致）
- TypeScript strict；ESLint + Prettier；Biome 可选（与生态一致即可）
- 环境变量走 Cloudflare Pages secrets，本地 `.env.local`
- 不提交，除非用户明确要求；Conventional Commits

---

## 文件结构（本阶段创建清单）

```
cinaadmin/
├── package.json
├── pnpm-lock.yaml
├── next.config.ts                # Cloudflare Pages 适配（@cloudflare/next-on-pages 或 Next 16 原生）
├── tsconfig.json
├── tailwind.config.ts            # 黑金主题 token
├── postcss.config.mjs
├── wrangler.toml                 # Pages 本地运行时配置（可选）
├── .env.example
├── .env.local                    # 本地（不入库）
├── .gitignore
├── biome.json / .eslintrc        # 二选一，与生态对齐
├── src/
│   ├── middleware.ts             # ① 边缘访问控制：会话 + 角色白名单
│   ├── app/
│   │   ├── layout.tsx            # 根布局：主题、字体、i18n provider
│   │   ├── globals.css           # Tailwind + 黑金 CSS 变量
│   │   ├── page.tsx              # 根重定向 → /dashboard 或 /sign-in
│   │   ├── (auth)/
│   │   │   └── callback/
│   │   │       └── page.tsx      # cinaauth 登录后回跳着陆（处理 callbackURL）
│   │   ├── (admin)/
│   │   │   ├── layout.tsx        # ② 受保护 shell：Sidebar + Topbar + ImpersonateBanner
│   │   │   ├── dashboard/page.tsx    # 占位（Phase 2 填充）
│   │   │   ├── users/page.tsx        # 占位
│   │   │   ├── sessions/page.tsx     # 占位
│   │   │   ├── audit/page.tsx        # 占位
│   │   │   ├── organizations/page.tsx# 占位
│   │   │   ├── api-keys/page.tsx     # 占位
│   │   │   └── settings/security/page.tsx # 占位
│   │   ├── (errors)/
│   │   │   ├── 403/page.tsx
│   │   │   └── not-found.tsx
│   │   └── api/
│   │       └── admin/
│   │           └── session/route.ts  # ③ GET 当前 admin 会话（供 client 取角色）
│   ├── lib/
│   │   ├── cinaauth/
│   │   │   ├── client.ts         # ④ typed fetch wrapper（CINAUTH_BASE_URL + service key）
│   │   │   ├── session.ts        # resolveAdminSession()：从请求 cookie 解析 cinaauth 会话
│   │   │   ├── config.ts         # 环境变量读取 + 校验
│   │   │   └── types.ts          # AdminSession、Role 等共享类型
│   │   └── i18n/
│   │       ├── index.ts          # i18next 初始化
│   │       └── locales/
│   │           ├── en.json
│   │           └── zh.json
│   ├── components/
│   │   ├── ui/                   # Base UI 原语（button/card/badge 等，黑金主题）
│   │   ├── layout/
│   │   │   ├── sidebar.tsx       # 侧边栏（7 导航项 + Production 徽章）
│   │   │   ├── topbar.tsx        # 顶栏（profile 下拉、语言切换、登出）
│   │   │   └── impersonate-banner.tsx # impersonate 横幅（Phase 1 仅检测占位）
│   │   └── theme/
│   │       └── provider.tsx      # 主题 provider（黑金）
│   └── tests/
│       ├── middleware.test.ts    # 角色网关单测
│       └── session.test.ts       # resolveAdminSession 单测
```

---

## Task 1: 项目初始化 + 依赖 + 配置

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.example`, `biome.json`

- [ ] **Step 1: 初始化 Next.js 16 + TypeScript**

Run（在 `E:\cinagroup\cinaadmin` 根，docs/ 已存在，用 `.` 当前目录）:
```bash
cd E:\cinagroup\cinaadmin
pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --use-pnpm --no-eslint --no-turbopack
```
> 若 `create-next-app` 拒绝在非空目录（docs/ 存在），先临时移走 docs/ 完成脚手架再移回；或用 `--yes`。保留 `docs/` 不被覆盖。

- [ ] **Step 2: 安装运行时依赖**

```bash
pnpm add i18next react-i18next i18next-browser-languagedetector @base-ui-components/react recharts @tanstack/react-table
```

- [ ] **Step 3: 安装开发依赖**

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react @cloudflare/next-on-pages wrangler
```

- [ ] **Step 4: 配置 next.config.ts（Cloudflare Pages 适配）**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: true,
	// Cloudflare Pages: 用 @cloudflare/next-on-pages 构建（或 Next 16 原生 @opennextjs/cloudflare）
	experimental: {
		// 按需启用
	},
};

export default nextConfig;
```

- [ ] **Step 5: 配置 tsconfig.json（确认 strict + paths）**

确保 `compilerOptions` 含：
```json
{
	"strict": true,
	"baseUrl": ".",
	"paths": { "@/*": ["./src/*"] },
	"types": ["@cloudflare/workers-types"]
}
```

- [ ] **Step 6: 配置 .env.example**

```bash
# cinaauth 接入
CINAUTH_BASE_URL=https://auth.cinagroup.com
CINAUTH_ADMIN_SERVICE_KEY=replace-with-cloudflare-pages-secret
CINAADMIN_ALLOWED_ROLES=super_admin,security_admin

# 应用
NEXT_PUBLIC_APP_NAME=CinaGroup Admin
```

`.env.local` 复制并填本地值（不入库）。

- [ ] **Step 7: .gitignore 含 .env.local、.next、node_modules、.wrangler**

- [ ] **Step 8: 初始化 git + 首次提交**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js 16 admin console"
```

---

## Task 2: 黑金主题 + Tailwind 配置 + 全局样式

**Files:**
- Create: `src/app/globals.css`, `tailwind.config.ts`, `src/components/theme/provider.tsx`

- [ ] **Step 1: tailwind.config.ts 定义黑金 token**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
	content: ["./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				// 黑金主题：深底 + 金色强调
				ink: { 950: "#0a0a0b", 900: "#121214", 800: "#1a1a1e", 700: "#242428" },
				gold: { 400: "#e6c068", 500: "#d4af37", 600: "#b8941f" },
				muted: "#6b6b73",
				danger: "#e05260",
				success: "#4caf7d",
			},
			fontFamily: {
				sans: ["var(--font-sans)", "system-ui", "sans-serif"],
				serif: ["var(--font-serif)", "Georgia", "serif"],
			},
		},
	},
	plugins: [],
};
export default config;
```

- [ ] **Step 2: globals.css 设置 CSS 变量 + 基础样式**

```css
@import "tailwindcss";

:root {
	--font-sans: "Inter", system-ui, sans-serif;
	--font-serif: "Playfair Display", Georgia, serif;
	--bg: #0a0a0b;
	--surface: #121214;
	--border: #242428;
	--gold: #d4af37;
	--text: #e8e8ea;
	--text-muted: #6b6b73;
}

html, body {
	background: var(--bg);
	color: var(--text);
	font-family: var(--font-sans);
}

/* 黑金强调：链接、焦点、激活态 */
a:focus-visible, button:focus-visible {
	outline: 2px solid var(--gold);
	outline-offset: 2px;
}
```

- [ ] **Step 3: theme/provider.tsx（简单 provider，预留暗色/亮色切换）**

```tsx
"use client";
import { createContext, useContext, type ReactNode } from "react";

type Theme = "dark"; // v1 仅暗色（黑金）
const ThemeContext = createContext<{ theme: Theme }>({ theme: "dark" });

export function ThemeProvider({ children }: { children: ReactNode }) {
	return <ThemeContext.Provider value={{ theme: "dark" }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
```

- [ ] **Step 4: 验证 dev 启动**

Run: `pnpm dev`
Expected: `http://localhost:3000` 可访问，黑底页面无报错。Ctrl-C 退出。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(theme): add CinaGroup black-gold theme tokens and global styles"
```

---

## Task 3: i18next 初始化 + en/zh locale

**Files:**
- Create: `src/lib/i18n/index.ts`, `src/lib/i18n/locales/en.json`, `src/lib/i18n/locales/zh.json`, `src/app/layout.tsx`（接 provider）

- [ ] **Step 1: en.json（扁平 JSON，key 为英文，对齐 cinatoken 约定）**

```json
{
	"app.name": "CinaGroup Admin",
	"nav.overview": "Overview",
	"nav.users": "Users",
	"nav.sessions": "Sessions",
	"nav.organizations": "Organizations",
	"nav.apiKeys": "API Keys",
	"nav.auditLog": "Audit Log",
	"nav.securityPolicy": "Security Policy",
	"nav.accounts": "Accounts",
	"nav.compliance": "Compliance & Security",
	"common.signOut": "Sign out",
	"common.loading": "Loading…",
	"error.403.title": "Access denied",
	"error.403.message": "You do not have permission to access the admin console.",
	"impersonate.banner": "Acting as {{user}}",
	"impersonate.stop": "Stop impersonating",
	"instance.production": "Production"
}
```

- [ ] **Step 2: zh.json（同 key，中文值）**

```json
{
	"app.name": "CinaGroup 管理后台",
	"nav.overview": "总览",
	"nav.users": "用户",
	"nav.sessions": "会话",
	"nav.organizations": "组织",
	"nav.apiKeys": "API 密钥",
	"nav.auditLog": "审计日志",
	"nav.securityPolicy": "安全策略",
	"nav.accounts": "账户",
	"nav.compliance": "合规与安全",
	"common.signOut": "登出",
	"common.loading": "加载中…",
	"error.403.title": "访问被拒",
	"error.403.message": "您没有权限访问管理后台。",
	"impersonate.banner": "正在以 {{user}} 身份操作",
	"impersonate.stop": "停止模拟",
	"instance.production": "生产环境"
}
```

- [ ] **Step 3: i18n/index.ts（client 初始化）**

```typescript
"use client";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

if (!i18n.isInitialized) {
	void i18n
		.use(LanguageDetector)
		.use(initReactI18next)
		.init({
			resources: { en: { translation: en }, zh: { translation: zh } },
			fallbackLng: "en",
			interpolation: { escapeValue: false },
		});
}
export default i18n;
```

- [ ] **Step 4: layout.tsx 接入 i18n + 主题 provider**

```tsx
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "@/lib/i18n"; // 触发 client 初始化
import { ThemeProvider } from "@/components/theme/provider";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-serif", subsets: ["latin"] });

export const metadata: Metadata = {
	title: "CinaGroup Admin",
	description: "CinaGroup 用户与审计管理后台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={`${inter.variable} ${playfair.variable}`}>
			<body>
				<ThemeProvider>{children}</ThemeProvider>
			</body>
		</html>
	);
}
```

- [ ] **Step 5: 验证 + commit**

Run: `pnpm dev` → 无 i18n 报错。
```bash
git add -A
git commit -m "feat(i18n): add i18next with en/zh locales"
```

---

## Task 4: `lib/cinaauth/` typed client + session 解析

**Files:**
- Create: `src/lib/cinaauth/config.ts`, `src/lib/cinaauth/types.ts`, `src/lib/cinaauth/session.ts`, `src/lib/cinaauth/client.ts`

- [ ] **Step 1: config.ts（环境变量读取 + 校验）**

```typescript
function required(name: string, fallback?: string): string {
	const v = process.env[name] ?? fallback;
	if (!v) throw new Error(`Missing required env: ${name}`);
	return v;
}

export const cinaauthConfig = {
	baseUrl: required("CINAUTH_BASE_URL", "http://localhost:2025"),
	serviceKey: required("CINAUTH_ADMIN_SERVICE_KEY", "dev-service-key"),
	allowedRoles: (process.env.CINAADMIN_ALLOWED_ROLES ?? "super_admin,security_admin")
		.split(",")
		.map((r) => r.trim())
		.filter(Boolean),
};
```

- [ ] **Step 2: types.ts**

```typescript
export type AdminRole = "super_admin" | "security_admin" | "admin" | "user" | string;

export interface AdminSession {
	userId: string;
	role: AdminRole;
	email?: string;
	name?: string;
	impersonatedBy?: string | null; // 非 null = 处于 impersonate
}

export interface StandardResponse<T> {
	ok: boolean;
	data?: T;
	error?: { code: string; message: string };
}
```

- [ ] **Step 3: session.ts — resolveAdminSession()**

解析 cinaauth 会话：从请求 cookie 取 cinaauth session token，调 cinaauth `/api/get-session` 校验，返回 `AdminSession | null`。

```typescript
import { cinaauthConfig } from "./config";
import type { AdminSession } from "./types";

/**
 * 从 Next.js Request 解析 cinaauth admin 会话。
 * 调 cinaauth /api/get-session 校验。返回 null 表示无有效会话。
 */
export async function resolveAdminSession(
	request: Request,
): Promise<AdminSession | null> {
	const cookie = request.headers.get("cookie") ?? "";
	if (!cookie) return null;
	try {
		const res = await fetch(`${cinaauthConfig.baseUrl}/api/get-session`, {
			headers: { cookie },
			next: { revalidate: 0 },
		});
		if (!res.ok) return null;
		const data = (await res.json()) as {
			session?: { userId: string } | null;
			user?: { id: string; role?: string; email?: string; name?: string; impersonatedBy?: string | null } | null;
		};
		if (!data.session || !data.user) return null;
		return {
			userId: data.user.id,
			role: data.user.role ?? "user",
			email: data.user.email,
			name: data.user.name,
			impersonatedBy: data.user.impersonatedBy ?? null,
		};
	} catch {
		return null;
	}
}

export function hasAdminRole(role: string | undefined): boolean {
	return !!role && cinaauthConfig.allowedRoles.includes(role);
}
```

> 注意：cinaauth `/api/get-session` 的响应结构（`session` + `user`，及 user 是否含 `role`/`impersonatedBy`）需在实施时核对 cinaauth client 的 `getSession()` 返回形态，必要时调整解构。`role` 字段由 admin 插件注入 user。

- [ ] **Step 4: client.ts — 服务端 cinaauth 调用封装**

```typescript
import { cinaauthConfig } from "./config";
import type { StandardResponse } from "./types";

/**
 * 服务端调用 cinaauth（Server Component / Route Handler 内）。
 * 自动附加 service key 头。调用者负责传入 admin 会话 cookie（转发用户上下文）。
 */
export async function cinaauthFetch<T>(
	path: string,
	opts: { method?: string; body?: unknown; cookie?: string } = {},
): Promise<StandardResponse<T>> {
	const headers: Record<string, string> = {
		authorization: `Bearer ${cinaauthConfig.serviceKey}`,
	};
	if (opts.cookie) headers.cookie = opts.cookie;
	if (opts.body) headers["content-type"] = "application/json";

	try {
		const res = await fetch(`${cinaauthConfig.baseUrl}${path}`, {
			method: opts.method ?? "GET",
			headers,
			body: opts.body ? JSON.stringify(opts.body) : undefined,
			next: { revalidate: 0 },
			cache: "no-store",
		});
		const data = (await res.json().catch(() => null)) as T;
		if (!res.ok) {
			return { ok: false, error: { code: `CINAUTH_${res.status}`, message: `cinaauth ${path} failed` } };
		}
		return { ok: true, data };
	} catch (err) {
		return { ok: false, error: { code: "CINAUTH_UNREACHABLE", message: String(err) } };
	}
}
```

- [ ] **Step 5: 写测试（resolveAdminSession + hasAdminRole）**

`src/tests/session.test.ts`（Vitest + fetch mock）：

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveAdminSession, hasAdminRole } from "@/lib/cinaauth/session";

beforeEach(() => {
	vi.stubEnv("CINAADMIN_ALLOWED_ROLES", "super_admin,security_admin");
});

describe("hasAdminRole", () => {
	it("allows whitelisted roles", () => {
		expect(hasAdminRole("super_admin")).toBe(true);
		expect(hasAdminRole("security_admin")).toBe(true);
		expect(hasAdminRole("user")).toBe(false);
		expect(hasAdminRole(undefined)).toBe(false);
	});
});

describe("resolveAdminSession", () => {
	it("returns null when no cookie", async () => {
		const req = new Request("https://admin.test/api/x");
		expect(await resolveAdminSession(req)).toBeNull();
	});

	it("returns session when cinaauth responds 200 with session+user", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ session: { userId: "u1" }, user: { id: "u1", role: "super_admin", email: "a@b.c" } }), { status: 200 }),
		);
		const req = new Request("https://admin.test/api/x", { headers: { cookie: "s=1" } });
		const s = await resolveAdminSession(req);
		expect(s?.role).toBe("super_admin");
		fetchMock.mockRestore();
	});
});
```

`vitest.config.ts`：
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
	plugins: [react()],
	test: { environment: "jsdom", globals: true },
	resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

- [ ] **Step 6: 跑测试 + commit**

Run: `pnpm vitest run`
Expected: 4 tests PASS。
```bash
git add -A
git commit -m "feat(cinaauth): add typed client and admin session resolver"
```

---

## Task 5: middleware（边缘访问控制）

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: 写 middleware.ts**

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { cinaauthConfig } from "@/lib/cinaauth/config";

const PUBLIC_PATHS = ["/sign-in", "/api/auth", "/_next", "/favicon.ico"];

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
		return NextResponse.next();
	}

	// 调 cinaauth 校验会话 + 角色（edge fetch）
	const cookie = request.headers.get("cookie") ?? "";
	let role: string | undefined;
	try {
		const res = await fetch(`${cinaauthConfig.baseUrl}/api/get-session`, {
			headers: { cookie },
			cache: "no-store",
		});
		if (res.ok) {
			const data = (await res.json()) as { user?: { role?: string } | null };
			role = data.user?.role;
		}
	} catch {
		/* network error → treat as unauthenticated */
	}

	if (!role || !cinaauthConfig.allowedRoles.includes(role)) {
		// 重定向到 cinaauth 登录（带 callbackURL）；若是 api 路径返回 401
		if (pathname.startsWith("/api/")) {
			return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "role not allowed" } }, { status: 401 });
		}
		const signInUrl = new URL(`${cinaauthConfig.baseUrl}/sign-in`);
		signInUrl.searchParams.set("callbackURL", request.url);
		return NextResponse.redirect(signInUrl);
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: 写测试（middleware 重定向 / 放行 / api 401）**

`src/tests/middleware.test.ts`：

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// middleware 是默认导出，需动态 import（mock fetch 先于 import）
beforeEach(() => vi.stubEnv("CINAADMIN_ALLOWED_ROLES", "super_admin,security_admin"));

async function runMiddleware(role: string | undefined, pathname: string, fetchStatus = 200) {
	vi.resetModules();
	vi.spyOn(globalThis, "fetch").mockResolvedValue(
		new Response(role ? JSON.stringify({ user: { role } }) : "{}", { status: fetchStatus }),
	);
	const { default: middleware } = await import("@/middleware");
	const req = new NextRequest(new URL(`https://admin.test${pathname}`), { headers: { cookie: "s=1" } });
	return middleware(req);
}

describe("middleware access control", () => {
	it("redirects non-admin to cinaauth sign-in", async () => {
		const res = await runMiddleware("user", "/users");
		expect(res.status).toBeGreaterThanOrEqual(300);
		const loc = res.headers.get("location") ?? "";
		expect(loc).toContain("/sign-in");
	});

	it("allows super_admin", async () => {
		const res = await runMiddleware("super_admin", "/users");
		expect(res.status).toBe(200);
	});

	it("returns 401 json for api paths when unauthenticated", async () => {
		const res = await runMiddleware(undefined, "/api/admin/session", 401);
		expect(res.status).toBe(401);
	});
});
```

- [ ] **Step 3: 跑测试 + commit**

Run: `pnpm vitest run src/tests/middleware.test.ts`
Expected: 3 PASS。
```bash
git add -A
git commit -m "feat(access): add edge middleware role gate"
```

---

## Task 6: `/api/admin/session` Route Handler（二次校验 + 供 client 取会话）

**Files:**
- Create: `src/app/api/admin/session/route.ts`

- [ ] **Step 1: 写 route.ts**

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { resolveAdminSession, hasAdminRole } from "@/lib/cinaauth/session";

export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) {
		return NextResponse.json(
			{ ok: false, error: { code: "FORBIDDEN", message: "Insufficient role" } },
			{ status: 403 },
		);
	}
	return NextResponse.json({ ok: true, data: session });
}
```

- [ ] **Step 2: 手动验证（启动 dev + mock）**

Run: `pnpm dev`，访问 `http://localhost:3000/api/admin/session`（无 cookie → 403）。
Expected: `{"ok":false,"error":{"code":"FORBIDDEN",...}}`，HTTP 403。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(api): add /api/admin/session route handler"
```

---

## Task 7: 受保护 shell（Sidebar + Topbar + ImpersonateBanner）

**Files:**
- Create: `src/components/layout/sidebar.tsx`, `src/components/layout/topbar.tsx`, `src/components/layout/impersonate-banner.tsx`, `src/app/(admin)/layout.tsx`

- [ ] **Step 1: sidebar.tsx（7 导航项 + Production 徽章）**

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

const NAV = [
	{ group: null, items: [{ href: "/dashboard", key: "nav.overview" }] },
	{
		group: "nav.accounts",
		items: [
			{ href: "/users", key: "nav.users" },
			{ href: "/sessions", key: "nav.sessions" },
			{ href: "/organizations", key: "nav.organizations" },
			{ href: "/api-keys", key: "nav.apiKeys" },
		],
	},
	{
		group: "nav.compliance",
		items: [
			{ href: "/audit", key: "nav.auditLog" },
			{ href: "/settings/security", key: "nav.securityPolicy" },
		],
	},
];

export function Sidebar() {
	const { t } = useTranslation();
	const pathname = usePathname();
	return (
		<aside className="w-60 shrink-0 border-r border-ink-700 bg-ink-900 flex flex-col">
			<div className="px-4 py-5 flex items-center gap-2 border-b border-ink-700">
				<span className="font-serif text-gold-500 text-lg">CinaGroup</span>
				<span className="text-xs px-2 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/30">
					{t("instance.production")}
				</span>
			</div>
			<nav className="flex-1 px-2 py-3 space-y-4">
				{NAV.map((section) => (
					<div key={section.group ?? "top"}>
						{section.group && (
							<div className="px-2 mb-1 text-xs uppercase tracking-wide text-muted">{t(section.group)}</div>
						)}
						{section.items.map((item) => {
							const active = pathname === item.href || pathname.startsWith(item.href + "/");
							return (
								<Link
									key={item.href}
									href={item.href}
									className={`block px-3 py-2 rounded text-sm transition ${active ? "bg-gold-500/10 text-gold-400" : "text-text hover:bg-ink-800"}`}
								>
									{t(item.key)}
								</Link>
							);
						})}
					</div>
				))}
			</nav>
		</aside>
	);
}
```

- [ ] **Step 2: topbar.tsx（profile 下拉 + 语言切换 + 登出占位）**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminSession } from "@/lib/cinaauth/types";

export function Topbar() {
	const { t, i18n } = useTranslation();
	const [session, setSession] = useState<AdminSession | null>(null);

	useEffect(() => {
		fetch("/api/admin/session").then((r) => r.json()).then((d) => d.ok && setSession(d.data));
	}, []);

	return (
		<header className="h-14 flex items-center justify-between px-6 border-b border-ink-700 bg-ink-900">
			<div className="text-sm text-muted">{session?.email ?? ""}</div>
			<div className="flex items-center gap-3">
				<select
					value={i18n.language?.startsWith("zh") ? "zh" : "en"}
					onChange={(e) => i18n.changeLanguage(e.target.value)}
					className="bg-ink-800 border border-ink-700 rounded px-2 py-1 text-sm"
				>
					<option value="en">EN</option>
					<option value="zh">中文</option>
				</select>
				<button
					onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_CINAUTH_BASE_URL ?? ""}/sign-out`; }}
					className="text-sm text-muted hover:text-text"
				>
					{t("common.signOut")}
				</button>
			</div>
		</header>
	);
}
```

- [ ] **Step 3: impersonate-banner.tsx（占位：检测 impersonatedBy）**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function ImpersonateBanner() {
	const { t } = useTranslation();
	const [acting, setActing] = useState<string | null>(null);
	useEffect(() => {
		fetch("/api/admin/session").then((r) => r.json()).then((d) => {
			if (d.ok && d.data?.impersonatedBy) setActing(d.data.email ?? d.data.userId);
		});
	}, []);
	if (!acting) return null;
	return (
		<div className="bg-gold-500/15 border-b border-gold-500/40 text-gold-400 text-sm px-6 py-2 flex items-center justify-between">
			<span>{t("impersonate.banner", { user: acting })}</span>
			<button className="underline">{t("impersonate.stop")}</button>
		</div>
	);
}
```

- [ ] **Step 4: (admin)/layout.tsx（组合 shell）**

```tsx
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ImpersonateBanner } from "@/components/layout/impersonate-banner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-screen">
			<Sidebar />
			<div className="flex-1 flex flex-col">
				<Topbar />
				<ImpersonateBanner />
				<main className="flex-1 overflow-auto p-6">{children}</main>
			</div>
		</div>
	);
}
```

- [ ] **Step 5: 各业务页面占位**

为 `dashboard`, `users`, `sessions`, `audit`, `organizations`, `api-keys`, `settings/security` 各创建 `page.tsx`：

```tsx
export default function Page() {
	return <div className="text-muted">（Phase 2/3 实现）</div>;
}
```

- [ ] **Step 6: 根 page.tsx 重定向**

```tsx
import { redirect } from "next/navigation";
export default function Home() {
	redirect("/dashboard");
}
```

- [ ] **Step 7: 403 页面**

`src/app/(errors)/403/page.tsx`：
```tsx
"use client";
import { useTranslation } from "react-i18next";
export default function Forbidden() {
	const { t } = useTranslation();
	return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-2">
			<h1 className="font-serif text-gold-500 text-2xl">{t("error.403.title")}</h1>
			<p className="text-muted">{t("error.403.message")}</p>
		</div>
	);
}
```

- [ ] **Step 8: 验证 + commit**

Run: `pnpm dev`，访问根 → 重定向 dashboard；侧边栏 7 项可见；切换语言生效。
```bash
git add -A
git commit -m "feat(shell): add admin layout with sidebar, topbar, impersonate banner"
```

---

## Task 8: Cloudflare Pages 部署配置 + 本地 wrangler 验证

**Files:**
- Create: `wrangler.toml`（或 `wrangler.jsonc`）, 调整 `package.json` scripts

- [ ] **Step 1: package.json scripts**

```json
{
	"scripts": {
		"dev": "next dev",
		"build": "next build",
		"build:cf": "npx @cloudflare/next-on-pages",
		"preview": "wrangler pages dev .",
		"test": "vitest run",
		"test:watch": "vitest",
		"typecheck": "tsc --noEmit"
	}
}
```

- [ ] **Step 2: wrangler.toml**

```toml
name = "cinaadmin"
compatibility_date = "2026-06-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".next"

[vars]
NEXT_PUBLIC_APP_NAME = "CinaGroup Admin"
```

- [ ] **Step 3: 本地 wrangler 预览构建产物**

Run: `pnpm build && pnpm preview`
Expected: wrangler pages dev 起本地预览，控制台可加载（会因无真实 cinaauth cookie 走重定向，符合预期）。

- [ ] **Step 4: typecheck + commit**

Run: `pnpm typecheck` → 无错误。
```bash
git add -A
git commit -m "chore(deploy): add Cloudflare Pages build and wrangler config"
```

---

## Phase 1 DoD（交付确认清单）

- [ ] Next.js 16 项目可 `pnpm dev` 启动，黑金主题渲染
- [ ] i18n en/zh 切换生效，7 导航项可见
- [ ] middleware：非白名单角色 → 重定向 cinaauth `/sign-in`；api 路径 → 401
- [ ] `/api/admin/session` 二次校验：无会话/无角色 → 403；有效 → 返回 session
- [ ] `resolveAdminSession` + `hasAdminRole` + middleware 单测通过
- [ ] shell（侧边栏 + 顶栏 + impersonate 横幅占位）渲染，7 业务页占位
- [ ] `pnpm build:cf` + wrangler 预览可跑
- [ ] `pnpm typecheck` 通过
- [ ] Conventional Commits 提交（未 push）

---

## 风险与核对点

1. **cinaauth `/api/get-session` 响应形态**：实施第一步用真实/本地 cinaauth curl 一次确认 `session`/`user`/`role`/`impersonatedBy` 字段，调整 `resolveAdminSession` 解构。
2. **Next 16 + Cloudflare Pages 适配**：Next 16 可能原生支持 `@opennextjs/cloudflare`；优先用它，回退 `@cloudflare/next-on-pages`。以构建产物能跑为准。
3. **edge middleware fetch cinaauth**：middleware 在 edge 运行，`fetch` cinaauth 需 cinaauth 支持 CORS/跨域 cookie；本阶段 middleware 直接转发 cookie，cinaauth 同域（`.cinagroup.com`）应无碍。本地 dev 需配置 cinaauth `baseURL` 指向本地实例。
4. **`NEXT_PUBLIC_CINAUTH_BASE_URL`**：登出跳转用的公开变量，需在 `.env` 设。
