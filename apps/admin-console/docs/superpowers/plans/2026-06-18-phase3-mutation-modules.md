# Phase 3 — 变更模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现控制台所有写操作模块，交付完整 v1 范围：② 用户 mutation（创建/编辑/封禁解封/设密码/impersonate/解绑钱包）、③ 会话吊销（单/批）、⑤ 组织/商户管理（CRUD + 成员 + 角色 + 邀请）、⑥ API 密钥管理（CRUD + 范围 + 过期 + 调用日志）、⑦ 安全策略面板。每个 mutation 经代理 Route Handler（二次角色校验 → 转发 cinaauth → 写审计）。

**Architecture:** 所有写操作走 `app/api/admin/*/route.ts`（POST/DELETE/PATCH）：`resolveAdminSession` + `hasAdminRole` 校验 → `cinaauthFetch` 转发 cinaauth admin 端点 →（无对应 cinaauth 端点的 console-only 操作）显式 `POST /audit/log` 写审计。UI 用 Client Component + TanStack Query Mutation + 确认对话框。角色差异：`super_admin` 全权限；`security_admin` 仅封禁/解封/会话/审计读/解绑钱包（UI 按 session.role 隐藏不可用操作）。

**Tech Stack:** Next.js 16, React 19, TanStack Query, Base UI（Dialog/Select/Switch），Vitest + Testing Library.

**Repo:** `E:\cinagroup\cinaadmin`

**Prerequisite:** Phase 0（cinaauth 端点）+ Phase 1（骨架/访问控制）+ Phase 2（读取模块 + 代理基础设施）已合并。

**Spec reference:** §4.2（代理层职责）、§5（审计）、§6.3（模块②③⑤⑥⑦）、§6.5（impersonate 横幅）

**关键约定：**
- **每个 mutation handler 固定 5 步**：① 解析 admin 会话 ② 角色校验（含 security_admin 细粒度） ③ 转发 cinaauth ④ 写审计（hooks.after 已覆盖的省略显式写；console-only 操作显式写） ⑤ 返回标准化响应
- UI 确认：破坏性操作（封禁/删除/解绑/吊销）必须经确认对话框
- impersonate 启动后横幅必须显示（Phase 1 已占位，本阶段接通）
- 权限差异：UI 按 `useAdminSession().role` 渲染/隐藏操作；后端 `hasPermission` 是最终防线

---

## 文件结构（本阶段新增）

```
src/
├── lib/
│   ├── auth-guard.ts            # requireSuperAdmin / requireSecurityAdmin 工具（代理内复用）
│   └── mutations.ts             # 客户端 mutation hook 工厂
├── components/
│   ├── confirm-dialog.tsx       # 破坏性操作确认
│   ├── role-guard.tsx           # <RoleGuard allow={["super_admin"]}> 子组件
│   └── ban-dialog.tsx           # 封禁对话框（时长 + 原因）
├── hooks/
│   └── use-admin-session.ts     # 客户端取当前 admin session（角色判断）
├── app/
│   ├── (admin)/
│   │   ├── users/new/page.tsx               # ② 手动建号
│   │   ├── users/[id]/impersonate/route.ts  # ② 启动 impersonate → 跳转
│   │   ├── organizations/
│   │   │   ├── page.tsx                     # ⑤ 列表
│   │   │   ├── new/page.tsx                 # ⑤ 创建
│   │   │   └── [id]/page.tsx                # ⑤ 详情（成员/角色/邀请）
│   │   ├── api-keys/
│   │   │   ├── page.tsx                     # ⑥ 列表
│   │   │   └── [id]/page.tsx                # ⑥ 详情（调用日志）
│   │   └── settings/security/page.tsx       # ⑦ 安全策略
│   └── api/admin/
│       ├── users/[id]/{ban,unban,password,remove}/route.ts
│       ├── users/create/route.ts
│       ├── users/[id]/update/route.ts
│       ├── users/[id]/wallets/[address]/route.ts   # DELETE 解绑
│       ├── sessions/[sid]/route.ts          # DELETE 吊销单会话
│       ├── sessions/bulk/route.ts           # POST 批量吊销
│       ├── organizations/...route.ts        # CRUD + 成员 + 邀请
│       └── api-keys/...route.ts             # CRUD + 范围
```

---

## Task 1: 共享：auth-guard + RoleGuard + ConfirmDialog + useAdminSession

**Files:**
- Create: `src/lib/auth-guard.ts`, `src/components/role-guard.tsx`, `src/components/confirm-dialog.tsx`, `src/hooks/use-admin-session.ts`

- [ ] **Step 1: auth-guard.ts（代理内角色校验工具）**

```typescript
import { resolveAdminSession } from "@/lib/cinaauth/session";
import type { NextRequest } from "next/server";
import type { AdminSession } from "@/lib/cinaauth/types";

export async function requireAdmin(request: NextRequest): Promise<AdminSession> {
	const session = await resolveAdminSession(request);
	if (!session) {
		throw new Response(JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED" } }), { status: 401 });
	}
	return session;
}
export function requireRole(session: AdminSession, roles: string[]) {
	if (!roles.includes(session.role)) {
		throw new Response(JSON.stringify({ ok: false, error: { code: "FORBIDDEN", message: "Insufficient role" } }), { status: 403 });
	}
}
export const SUPER_ADMIN_ONLY = ["super_admin"];
export const ADMIN_AND_SECURITY = ["super_admin", "security_admin"];
```

- [ ] **Step 2: use-admin-session.ts（客户端取会话 + 缓存）**

```typescript
"use client";
import { useQuery } from "@tanstack/react-query";
import type { AdminSession } from "@/lib/cinaauth/types";
export function useAdminSession() {
	return useQuery({
		queryKey: ["admin-session"],
		queryFn: async () => {
			const r = await fetch("/api/admin/session");
			const d = await r.json();
			return (d.ok ? d.data : null) as AdminSession | null;
		},
		staleTime: 60_000,
	});
}
```

- [ ] **Step 3: role-guard.tsx（按角色渲染/隐藏）**

```tsx
"use client";
import { useAdminSession } from "@/hooks/use-admin-session";
export function RoleGuard({ allow, children, fallback = null }: { allow: string[]; children: React.ReactNode; fallback?: React.ReactNode }) {
	const { data: session } = useAdminSession();
	if (!session || !allow.includes(session.role)) return <>{fallback}</>;
	return <>{children}</>;
}
```

- [ ] **Step 4: confirm-dialog.tsx（破坏性确认）**

```tsx
"use client";
import { useState, type ReactNode } from "react";
export function ConfirmDialog({ trigger, title, description, confirmText = "确认", danger, onConfirm }: {
	trigger: ReactNode; title: string; description: string; confirmText?: string; danger?: boolean; onConfirm: () => void;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<span onClick={() => setOpen(true)}>{trigger}</span>
			{open && (
				<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
					<div className="bg-ink-900 border border-ink-700 rounded-lg p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
						<h3 className="font-serif text-lg text-gold-500">{title}</h3>
						<p className="text-sm text-muted mt-2">{description}</p>
						<div className="flex justify-end gap-2 mt-4">
							<button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm border border-ink-700 rounded">取消</button>
							<button onClick={() => { onConfirm(); setOpen(false); }} className={`px-3 py-1.5 text-sm rounded ${danger ? "bg-danger text-white" : "bg-gold-500 text-ink-950"}`}>{confirmText}</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
```

- [ ] **Step 5: 单测 + commit**

`src/tests/auth-guard.test.ts`：`requireRole` 对 super_admin/security_admin/user 的放行/抛错。
```bash
git add -A && git commit -m "feat(guard): add auth-guard, RoleGuard, ConfirmDialog, useAdminSession"
```

---

## Task 2: 用户 mutation（创建/编辑/封禁/解封/设密码/删除）

**Files:**
- Create: 6 个 route handlers + `users/new/page.tsx` + ban-dialog + 详情页操作按钮

- [ ] **Step 1: api/admin/users/create/route.ts（仅 super_admin）**

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireRole, SUPER_ADMIN_ONLY } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";

export async function POST(request: NextRequest) {
	let session;
	try { session = await requireAdmin(request); } catch (e) { return e as Response; }
	try { requireRole(session, SUPER_ADMIN_ONLY); } catch (e) { return e as Response; }
	const body = await request.json();
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/create-user", { method: "POST", body, cookie });
	// 审计：admin.user_create 已由 hooks.after 覆盖，无需显式写
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
```

- [ ] **Step 2: ban/unban/password/remove/update route handlers**

`users/[id]/ban/route.ts`（super_admin + security_admin）：
```typescript
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireRole, ADMIN_AND_SECURITY } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	let session; try { session = await requireAdmin(request); } catch (e) { return e as Response; }
	try { requireRole(session, ADMIN_AND_SECURITY); } catch (e) { return e as Response; }
	const body = await request.json(); // { banReason, banExpires } 或 { expirationTime }
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/ban-user", { method: "POST", body: { userId: id, ...body }, cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
```
> `unban/route.ts`（path `/admin/unban-user`）、`password/route.ts`（path `/admin/set-password`，SUPER_ADMIN_ONLY）、`remove/route.ts`（DELETE，path `/admin/remove-user`，SUPER_ADMIN_ONLY）、`update/route.ts`（PATCH，path `/admin/update-user`）同理，仅 path/method/角色 不同。每个文件 < 20 行。

- [ ] **Step 3: ban-dialog.tsx（时长选择 + 原因）**

```tsx
"use client";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
export function BanDialog({ userId }: { userId: string }) {
	const [duration, setDuration] = useState("permanent");
	const [reason, setReason] = useState("");
	const ban = async () => {
		const expires = duration === "7d" ? new Date(Date.now() + 7*864e5).toISOString()
			: duration === "30d" ? new Date(Date.now() + 30*864e5).toISOString() : undefined;
		await fetch(`/api/admin/users/${userId}/ban`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ banReason: reason, ...(expires && { expirationTime: expires }) }) });
		location.reload();
	};
	return (
		<ConfirmDialog trigger={<button className="text-danger text-sm">封禁</button>} title="封禁用户" description="" danger confirmText="封禁" onConfirm={ban}>
			<div className="space-y-3 mt-3">
				<select value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-ink-800 border border-ink-700 rounded px-3 py-2 w-full">
					<option value="7d">7 天</option><option value="30d">30 天</option><option value="permanent">永久</option>
				</select>
				<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="封禁原因（审计留痕）" className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2" />
			</div>
		</ConfirmDialog>
	);
}
```
> 注意：`ConfirmDialog` 的 children 在 description 处渲染——需把 `description` 改为可选并支持 children，或调整 ConfirmDialog 让 description 区可放自定义内容。实施时调整 ConfirmDialog 接受 `children` 作为正文。

- [ ] **Step 4: 详情页操作区（RoleGuard 区分）**

在 `users/[id]/page.tsx` 详情头部增加操作区：
```tsx
<RoleGuard allow={["super_admin", "security_admin"]}>
	<BanDialog userId={user.id} />
</RoleGuard>
<RoleGuard allow={["super_admin"]} fallback={null}>
	<button onClick={resetPassword}>设密码（下发 OTP）</button>
	<button onClick={removeUser}>删除</button>
</RoleGuard>
```

- [ ] **Step 5: users/new/page.tsx（建号表单，super_admin）**

最小表单：email、name、password、role（select）。提交 POST `/api/admin/users/create`。成功后跳回列表。

- [ ] **Step 6: 集成测试（ban 流程 + 角色拒绝）+ commit**

`src/tests/api/ban.test.ts`：mock cinaauthFetch，模拟 security_admin 调 ban → ok；user 调 ban → 403。
```bash
git add -A && git commit -m "feat(users): add create/edit/ban/unban/password/remove mutations with role gating"
```

---

## Task 3: impersonate（启动/停止 + 横幅接通）

**Files:**
- Create: `src/app/(admin)/users/[id]/impersonate/route.ts`, 修改 `impersonate-banner.tsx` 接通停止

- [ ] **Step 1: impersonate/route.ts（启动 → 写 admin_session cookie → 跳转业务站或本站）**

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireRole, SUPER_ADMIN_ONLY } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	let session; try { session = await requireAdmin(request); } catch (e) { return e as Response; }
	try { requireRole(session, SUPER_ADMIN_ONLY); } catch (e) { return e as Response; }
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/impersonate-user", { method: "POST", body: { userId: id }, cookie });
	if (!res.ok) return NextResponse.json(res, { status: 502 });
	// cinaauth 已写 admin_session cookie（通过 set-cookie 响应头）；前端跳转
	return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: impersonate-banner.tsx 接通停止按钮**

```tsx
"use client";
// ... 同 Phase 1，停止按钮 onClick:
onClick={() => fetch(`/api/admin/users/impersonate/stop`, { method: "POST" }).then(() => location.reload())}
```
> 新建 `src/app/api/admin/users/impersonate/stop/route.ts`：POST → `cinaauthFetch("/admin/stop-impersonating", { method: "POST", cookie })`，转发 set-cookie。

- [ ] **Step 3: 详情页 impersonate 按钮（super_admin + 确认）**

```tsx
<RoleGuard allow={["super_admin"]}>
	<ConfirmDialog trigger={<button>模拟登录</button>} title="模拟登录" description="将以该用户身份操作，所有操作审计留痕" onConfirm={() => fetch(`/api/admin/users/${user.id}/impersonate`, { method: "POST" }).then(() => location.reload())} />
</RoleGuard>
```

- [ ] **Step 4: commit**

```bash
git add -A && git commit -m "feat(impersonate): wire start/stop with banner and super_admin gating"
```

---

## Task 4: 解绑钱包 + 会话吊销（单/批）

**Files:**
- Create: `users/[id]/wallets/[address]/route.ts`, `sessions/[sid]/route.ts`, `sessions/bulk/route.ts`, 修改 wallets tab

- [ ] **Step 1: 解绑 route（DELETE，ADMIN_AND_SECURITY）**

```typescript
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; address: string }> }) {
	const { id, address } = await params;
	let session; try { session = await requireAdmin(request); } catch (e) { return e as Response; }
	try { requireRole(session, ADMIN_AND_SECURITY); } catch (e) { return e as Response; }
	const { chainId } = await request.json();
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/unbind-wallet", { method: "POST", body: { userId: id, address, chainId }, cookie });
	// siwe.unbind 审计已由 cinaauth 端点内写
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
```

- [ ] **Step 2: wallets tab 加解绑按钮（确认对话框）**

```tsx
<ConfirmDialog trigger={<button className="text-danger text-xs">解绑</button>} title="解绑钱包" description={`将解绑 ${w.address}，该钱包会话将吊销`} danger onConfirm={async () => {
	await fetch(`/api/admin/users/${userId}/wallets/${w.address}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ chainId: w.chainId }) });
	refetch();
}} />
```

- [ ] **Step 3: sessions/[sid]/route.ts（DELETE 单会话）+ sessions/bulk/route.ts（POST 批量）**

单会话：`cinaauthFetch("/admin/revoke-session", { method: "POST", body: { sessionId: sid }, cookie })`，ADMIN_AND_SECURITY。
批量：`cinaauthFetch("/admin/revoke-user-sessions", { method: "POST", body: { userId }, cookie })`，ADMIN_AND_SECURITY。

- [ ] **Step 4: 会话页加吊销按钮**

单行"吊销"（确认）+ 用户详情 sessions tab"吊销全部"（确认）。

- [ ] **Step 5: 测试 + commit**

```bash
git add -A && git commit -m "feat(wallets,sessions): add wallet unbind and session revoke (single/bulk)"
```

---

## Task 5: 组织/商户管理（⑤）

**Files:**
- Create: `organizations/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, api proxies

- [ ] **Step 1: 组织 API 代理（CRUD + 成员 + 邀请）**

基于 cinaauth organization 插件端点（实施时核对实际路径，常见：`/organization/create`, `/organization/list`, `/organization/get`, `/organization/update`, `/organization/delete`, `/organization/add-member`, `/organization/remove-member`, `/organization/invite`, `/organization/revoke-invitation`）。每个创建对应 route handler：
- `api/admin/organizations/route.ts`（GET list / POST create，SUPER_ADMIN_ONLY for create）
- `api/admin/organizations/[id]/route.ts`（GET / PATCH / DELETE）
- `api/admin/organizations/[id]/members/route.ts`（POST add / DELETE remove）
- `api/admin/organizations/[id]/invitations/route.ts`（POST invite / DELETE revoke）

形态同 Task 2 的代理（requireAdmin → requireRole → cinaauthFetch → 返回）。

- [ ] **Step 2: organizations/page.tsx（列表）**

表格：创建时间、成员数、管理员、所属业务站点。`<RoleGuard allow={["super_admin"]}>新建组织</RoleGuard>`。

- [ ] **Step 3: new/page.tsx（创建表单）+ [id]/page.tsx（详情：成员表 + 角色分配 + 邀请链接管理）**

详情页 tab：成员（添加/移除、角色：发行员/只读）、邀请链接（生成/失效/回收）。租户隔离：UI 注明"商户仅可查看自身发行 Token 数据"（v1 后端隔离由 organization 插件 role 控制；前端仅展示当前 org 数据）。

- [ ] **Step 4: 测试（组织创建 + 成员添加）+ commit**

```bash
git add -A && git commit -m "feat(organizations): add org CRUD, members, invitations"
```

---

## Task 6: API 密钥管理（⑥）

**Files:**
- Create: `api-keys/page.tsx`, `[id]/page.tsx`, api proxies

- [ ] **Step 1: 密钥 API 代理（基于 cinaauth bearer 插件端点）**

实施时核对 bearer 插件端点路径（常见：`/api-key/create`, `/api-key/list`, `/api-key/get`, `/api-key/update`, `/api-key/delete`, `/api-key/verify`）。创建：
- `api/admin/api-keys/route.ts`（GET list / POST create，SUPER_ADMIN_ONLY）
- `api/admin/api-keys/[id]/route.ts`（GET / PATCH enable/disable+expiration+scope / DELETE）
- `api/admin/api-keys/[id]/logs/route.ts`（GET 调用日志，若 bearer 插件无则从 audit-log 取 `action=apikey.*`）

- [ ] **Step 2: api-keys/page.tsx（列表 + 创建）**

表格：密钥名、绑定业务服务、范围、过期时间、状态。创建表单：name、scope（仅查用户/仅验签 SIWE）、expiration、绑定服务（NewAI 网关/区块同步/统计脚本）。

- [ ] **Step 3: [id]/page.tsx（调用日志视图）**

展示该密钥调用频次、来源 IP（来自 audit 或 bearer 插件日志）。

- [ ] **Step 4: 测试 + commit**

```bash
git add -A && git commit -m "feat(api-keys): add key CRUD, scopes, expiration, call logs"
```

---

## Task 7: 安全策略面板（⑦）

**Files:**
- Create: `settings/security/page.tsx`, `api/admin/settings/route.ts`

- [ ] **Step 1: settings/route.ts（GET/PATCH 经 cinaauth admin 配置端点）**

实施时核对 cinaauth 是否暴露全局安全配置读写端点（two-factor/email-otp 插件的 config）。若无可写端点，v1 仅**只读展示 + 文档说明**（注明"安全参数调整在 auth.cinagroup.com 配置文件 / D1 settings 表"）。GET 读取当前配置返回给 UI。

```typescript
export async function GET(request: NextRequest) {
	let session; try { session = await requireAdmin(request); } catch (e) { return e as Response; }
	try { requireRole(session, SUPER_ADMIN_ONLY); } catch (e) { return e as Response; }
	const cookie = request.headers.get("cookie") ?? "";
	// v1：聚合各插件 config 只读（需 cinaauth 暴露或直接返回静态默认 + TODO）
	return NextResponse.json({ ok: true, data: { otpTtl: "15m", otpDailyMax: 10, lockoutThreshold: 5, banDuration: "permanent", force2fa: { cinacoin: false, cinatoken: false }, trustedOrigins: [] } });
}
```

- [ ] **Step 2: settings/security/page.tsx（可视化表单）**

字段：OTP 过期时长、每日最大发送、密码错误锁定阈值、封禁时长、强制 2FA 开关（cinacoin/cinatoken switch）、可信域名列表（tag-input）。提交 PATCH（v1 若无后端端点，提交时显示 toast"配置变更需在 auth.cinagroup.com 应用"并禁用提交，或写入 D1 settings 表若存在）。

- [ ] **Step 3: commit**

```bash
git add -A && git commit -m "feat(security): add security policy panel (read + editable where supported)"
```

---

## Task 8: E2E 冒烟 + 角色矩阵验证

**Files:**
- Create: `src/tests/e2e/role-matrix.test.ts`

- [ ] **Step 1: 角色矩阵测试**

用 mock cinaauth 验证：super_admin 可访问所有 mutation；security_admin 可 ban/unban/revoke/unbind，被 create/remove/password/impersonate/org/apikey/settings 拒绝（403）；user 全部拒绝。

- [ ] **Step 2: 关键流程冒烟（手动 + 记录）**

在本地 dev 连真实 staging cinaauth，手动跑：建用户 → 封禁 → 解封 → impersonate（看横幅）→ 停止 → 解绑钱包 → 吊销会话 → 导出审计 CSV。记录结果到 PR 描述。

- [ ] **Step 3: 全量测试 + typecheck + 最终提交**

Run: `pnpm vitest run` → 全绿。
Run: `pnpm typecheck` → 无错误。
```bash
git add -A && git commit -m "test: add role matrix and smoke validation for v1"
```

---

## Phase 3 DoD（交付确认清单 = v1 完整范围）

- [ ] 用户 mutation：创建（super_admin）、编辑、封禁（7/30/永久 + 原因，admin+security）、解封、设密码、删除、模拟登录（含横幅 + 停止）
- [ ] 钱包解绑（admin+security，含审计）
- [ ] 会话吊销：单会话 + 批量（admin+security）
- [ ] 组织：CRUD（super_admin）+ 成员/角色 + 邀请链接
- [ ] API 密钥：CRUD + 范围 + 过期 + 调用日志
- [ ] 安全策略：面板展示 + 可编辑项（受 cinaauth 端点支持度限制）
- [ ] 所有 mutation 经代理二次角色校验；破坏性操作经确认对话框
- [ ] RoleGuard 隐藏不可用操作；后端 hasPermission 最终防线
- [ ] 角色矩阵测试通过；冒烟流程记录
- [ ] `pnpm typecheck` 通过
- [ ] Conventional Commits 提交（未 push）

---

## v1 收尾（跨阶段）

- [ ] 所有 4 阶段计划完成后，更新 spec 的"已实现"标记
- [ ] 部署 admin.cinagroup.com 到 Cloudflare Pages（生产 secrets）
- [ ] 配置 Cloudflare WAF IP 白名单（部署配置，spec §11）
- [ ] 文档：运维 runbook（登录、常用操作、审计查询、导出）

---

## 风险与核对点

1. **cinaauth organization / bearer 插件端点路径**：实施时先核对插件实际暴露的端点（各插件 routes.ts），按真实路径调整代理。若插件端点不足（如无邀请链接回收），UI 该项标 disabled + TODO，不阻塞 v1 其他部分。
2. **impersonate cookie 跨子域**：cinaauth `admin_session` cookie 需 `.cinagroup.com` 域；本地 dev 需用 hosts 把 admin/auth 都指向 localhost 才能测全流程。
3. **安全策略可写性**：若 cinaauth 无全局配置端点，v1 安全面板降级为只读 + 文档（spec §IX.3 已承认"简易运维"）。明确标注不阻塞 v1。
4. **审计显式写时机**：hooks.after 覆盖的 cinaauth 原生 mutation 不重复写；console-only 操作（如组织邀请生成若不经 cinaauth）才显式 `POST /audit/log`。实施时按"是否有对应 cinaauth 端点"判断。
