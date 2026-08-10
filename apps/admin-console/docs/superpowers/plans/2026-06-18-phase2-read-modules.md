# Phase 2 — 读取/列表模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现控制台的只读业务模块：① 仪表盘（统计卡 + 渠道饼图 + 注册折线 + 安全看板）、② 用户列表 + 详情（6 tab，只读 + CSV 导出）、③ 会话列表 + 吊销、④ 审计日志中心（筛选 + 风险高亮 + CSV 导出）。本阶段全部为读取与导出，无写操作（写操作在 Phase 3）。

**Architecture:** Server Components 负责读（经 `cinaauthFetch` 调 Phase 0 端点，附 service key + 转发 admin cookie）；交互（分页、筛选、tab 切换）用 Client Component + SWR/TanStack Query。表格用 `@tanstack/react-table`，图表用 Recharts（黑金 token）。代理 Route Handler 仅用于 CSV 流式导出（避免长响应在 RSC 卡住）。

**Tech Stack:** Next.js 16 RSC, React 19, TanStack Query v5, TanStack Table v8, Recharts, Vitest + Testing Library.

**Repo:** `E:\cinagroup\cinaadmin`

**Prerequisite:** Phase 0（cinaauth 端点）+ Phase 1（骨架 + 访问控制）已合并。

**Spec reference:** §4.1, §4.4, §5.1（审计读取）, §6.3（模块①②③④）

**关键约定：**
- Server Component 读：`cinaauthFetch(path, { cookie })`，cookie 从 `headers()` 读取转发
- 不缓存用户/会话/审计（`revalidate: 0`）；stats 缓存 30–60s
- DTO 在 `lib/cinaauth/dto.ts` 集中定义，UI 只依赖 DTO
- 测试：每个模块至少 1 个组件测试 + 1 个数据映射测试

---

## 文件结构（本阶段新增）

```
src/
├── lib/
│   ├── cinaauth/
│   │   ├── dto.ts              # 各模块 typed DTO（UserDTO, SessionDTO, AuditLogDTO, StatsDTO...）
│   │   ├── admin-api.ts        # 高层方法：listUsers, getUser, listSessions, listAudit, statsOverview...
│   │   └── query-keys.ts       # TanStack Query keys
│   └── csv.ts                  # CSV 流式工具
├── components/
│   ├── charts/
│   │   ├── channel-pie.tsx     # 登录渠道饼图
│   │   ├── signup-line.tsx     # 注册趋势折线
│   │   └── stat-card.tsx       # 统计卡
│   ├── data-table/
│   │   ├── data-table.tsx      # 通用表格（基于 @tanstack/react-table）
│   │   └── filter-bar.tsx      # 筛选 chip + 模糊搜索
│   └── ui/（补充：badge, table, tabs, pagination 等）
├── app/
│   ├── (admin)/
│   │   ├── dashboard/page.tsx          # ① 仪表盘（Server Component）
│   │   ├── users/
│   │   │   ├── page.tsx                # ② 列表（client + RSC 混合）
│   │   │   └── [id]/page.tsx           # ② 详情（tab）
│   │   │       └── tabs/overview.tsx, wallets.tsx, third-party.tsx, sessions.tsx, login-trail.tsx, security.tsx
│   │   ├── sessions/page.tsx           # ③ 会话列表
│   │   └── audit/page.tsx              # ④ 审计中心
│   └── api/admin/
│       ├── users/route.ts              # GET 列表代理（可选，RSC 可直 fetch）
│       ├── audit/route.ts              # GET 审计列表代理
│       └── export/route.ts             # GET 流式 CSV（users / audit）
└── tests/
    ├── dto.test.ts
    └── components/（各组件测试）
```

---

## Task 1: DTO + 高层 admin-api + Query keys

**Files:**
- Create: `src/lib/cinaauth/dto.ts`, `src/lib/cinaauth/admin-api.ts`, `src/lib/cinaauth/query-keys.ts`

- [ ] **Step 1: dto.ts（集中 DTO，UI 唯一依赖）**

```typescript
export interface UserDTO {
	id: string;
	email: string;
	name: string | null;
	role: string;
	banned: boolean;
	banReason: string | null;
	banExpires: string | null;
	twoFactorEnabled: boolean;
	emailVerified: boolean;
	createdAt: string;
	image: string | null;
}

export interface WalletDTO {
	address: string;
	chainId: number;
	isPrimary: boolean;
	boundAt: string;
	boundIp: string | null;
	boundSite: string | null;
}

export interface SessionDTO {
	id: string;
	userId: string;
	createdAt: string;
	expiresAt: string;
	token: string;
	userAgent: string | null;
	ipAddress: string | null;
}

export interface AuditLogDTO {
	id: string;
	timestamp: string;
	category: string;
	action: string;
	result: "success" | "failure";
	actorId: string | null;
	actorRole: string | null;
	actorIp: string | null;
	actorUa: string | null;
	actorSite: string | null;
	targetType: string | null;
	targetId: string | null;
	metadata: Record<string, unknown> | null;
}

export interface StatsOverviewDTO {
	totalUsers: number;
	newUsers30d: number;
	activeSessions: number;
	organizationCount: number;
	bannedCount: number;
	usersWithout2FA: number;
	loginChannels: Record<string, number>;
}

export interface SignupPointDTO { date: string; count: number; }

export interface SecurityTodayDTO {
	failedLoginsToday: number;
	otpRequestsToday: number;
	geoAnomalyCount: number;
}
```

- [ ] **Step 2: admin-api.ts（高层方法，包 cinaauthFetch + DTO 映射）**

```typescript
import { cinaauthFetch } from "./client";
import type {
	UserDTO, WalletDTO, SessionDTO, AuditLogDTO,
	StatsOverviewDTO, SignupPointDTO, SecurityTodayDTO,
} from "./dto";

function mapUser(u: Record<string, unknown>): UserDTO {
	return {
		id: String(u.id), email: String(u.email ?? ""), name: (u.name as string) ?? null,
		role: String(u.role ?? "user"), banned: Boolean(u.banned),
		banReason: (u.banReason as string) ?? null, banExpires: (u.banExpires as string) ?? null,
		twoFactorEnabled: Boolean(u.twoFactorEnabled), emailVerified: Boolean(u.emailVerified),
		createdAt: String(u.createdAt ?? new Date().toISOString()), image: (u.image as string) ?? null,
	};
}

export async function listUsers(cookie: string, params: {
	searchField?: "email" | "name" | "wallet"; searchValue?: string;
	limit?: number; offset?: number;
}): Promise<{ users: UserDTO[]; total: number }> {
	const qs = new URLSearchParams();
	if (params.searchField) qs.set("searchField", params.searchField);
	if (params.searchValue) qs.set("searchValue", params.searchValue);
	if (params.limit) qs.set("limit", String(params.limit));
	if (params.offset) qs.set("offset", String(params.offset));
	const res = await cinaauthFetch<{ users: Record<string, unknown>[]; total: number }>(
		`/admin/list-users?${qs}`, { cookie },
	);
	if (!res.ok || !res.data) throw new Error(res.error?.message ?? "listUsers failed");
	return { users: res.data.users.map(mapUser), total: res.data.total };
}

export async function getUser(cookie: string, id: string): Promise<UserDTO> {
	const res = await cinaauthFetch<{ user: Record<string, unknown> }>(`/admin/get-user?id=${encodeURIComponent(id)}`, { cookie });
	if (!res.ok || !res.data) throw new Error(res.error?.message ?? "getUser failed");
	return mapUser(res.data.user);
}

export async function listUserWallets(cookie: string, userId: string): Promise<WalletDTO[]> {
	const res = await cinaauthFetch<{ wallets: Record<string, unknown>[] }>(`/admin/list-user-wallets?userId=${encodeURIComponent(userId)}`, { cookie });
	if (!res.ok || !res.data) return [];
	return res.data.wallets.map((w) => ({
		address: String(w.address), chainId: Number(w.chainId), isPrimary: Boolean(w.isPrimary),
		boundAt: String(w.boundAt), boundIp: (w.boundIp as string) ?? null, boundSite: (w.boundSite as string) ?? null,
	}));
}

export async function listUserSessions(cookie: string, userId: string): Promise<SessionDTO[]> {
	const res = await cinaauthFetch<{ sessions: Record<string, unknown>[] }>(`/admin/list-user-sessions?userId=${encodeURIComponent(userId)}`, { cookie });
	if (!res.ok || !res.data) return [];
	return res.data.sessions.map((s) => ({
		id: String(s.id), userId: String(s.userId), createdAt: String(s.createdAt),
		expiresAt: String(s.expiresAt), token: String(s.token),
		userAgent: (s.userAgent as string) ?? null, ipAddress: (s.ipAddress as string) ?? null,
	}));
}

export async function listAudit(cookie: string, params: {
	limit?: number; offset?: number; category?: string; action?: string;
	actorId?: string; actorIp?: string; result?: "success" | "failure";
	start?: string; end?: string;
}): Promise<{ rows: AuditLogDTO[]; limit: number; offset: number }> {
	const qs = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
	const res = await cinaauthFetch<{ rows: Record<string, unknown>[]; limit: number; offset: number }>(`/audit/list?${qs}`, { cookie });
	if (!res.ok || !res.data) return { rows: [], limit: 0, offset: 0 };
	return {
		limit: res.data.limit, offset: res.data.offset,
		rows: res.data.rows.map((r) => ({
			id: String(r.id), timestamp: String(r.timestamp), category: String(r.category),
			action: String(r.action), result: (r.result as "success" | "failure"),
			actorId: (r.actorId as string) ?? null, actorRole: (r.actorRole as string) ?? null,
			actorIp: (r.actorIp as string) ?? null, actorUa: (r.actorUa as string) ?? null,
			actorSite: (r.actorSite as string) ?? null, targetType: (r.targetType as string) ?? null,
			targetId: (r.targetId as string) ?? null,
			metadata: r.metadata ? (JSON.parse(r.metadata as string) as Record<string, unknown>) : null,
		})),
	};
}

export async function statsOverview(cookie: string): Promise<StatsOverviewDTO> {
	const res = await cinaauthFetch<StatsOverviewDTO>(`/admin/stats/overview`, { cookie });
	if (!res.ok || !res.data) throw new Error(res.error?.message ?? "stats failed");
	return res.data;
}
export async function statsSignups(cookie: string, range: "7d" | "30d"): Promise<SignupPointDTO[]> {
	const res = await cinaauthFetch<{ data: SignupPointDTO[] }>(`/admin/stats/signups?range=${range}`, { cookie });
	if (!res.ok || !res.data) return [];
	return res.data.data;
}
export async function statsSecurityToday(cookie: string): Promise<SecurityTodayDTO> {
	const res = await cinaauthFetch<SecurityTodayDTO>(`/admin/stats/security-today`, { cookie });
	if (!res.ok || !res.data) return { failedLoginsToday: 0, otpRequestsToday: 0, geoAnomalyCount: 0 };
	return res.data;
}
```

- [ ] **Step 3: query-keys.ts**

```typescript
export const qk = {
	users: (params: Record<string, unknown>) => ["users", params] as const,
	user: (id: string) => ["user", id] as const,
	userWallets: (id: string) => ["user", id, "wallets"] as const,
	userSessions: (id: string) => ["user", id, "sessions"] as const,
	sessions: (params: Record<string, unknown>) => ["sessions", params] as const,
	audit: (params: Record<string, unknown>) => ["audit", params] as const,
	statsOverview: ["stats", "overview"] as const,
	statsSignups: (range: string) => ["stats", "signups", range] as const,
	statsSecurity: ["stats", "security"] as const,
};
```

- [ ] **Step 4: dto 映射测试**

`src/tests/dto.test.ts`：

```typescript
import { describe, expect, it } from "vitest";

describe("DTO mapping safety", () => {
	it("handles missing fields with defaults", async () => {
		const { listUsers } = await import("@/lib/cinaauth/admin-api");
		// mock cinaauthFetch
		vi.mock("@/lib/cinaauth/client", () => ({
			cinaauthFetch: vi.fn().mockResolvedValue({ ok: true, data: { users: [{ id: "1" }], total: 1 } }),
		}));
		const r = await listUsers("", {});
		expect(r.users[0].email).toBe("");
		expect(r.users[0].role).toBe("user");
	});
});
```
> 补充 `vi` import 自 vitest。

- [ ] **Step 5: 跑测试 + commit**

Run: `pnpm vitest run src/tests/dto.test.ts` → PASS。
```bash
git add -A && git commit -m "feat(data): add DTOs, admin-api layer, and query keys"
```

---

## Task 2: 通用 DataTable + FilterBar + UI 原语

**Files:**
- Create: `src/components/data-table/data-table.tsx`, `src/components/data-table/filter-bar.tsx`, `src/components/ui/{table,badge,tabs,pagination,skeleton}.tsx`

- [ ] **Step 1: ui/table.tsx（基于 @tanstack/react-table 的渲染壳）**

```tsx
"use client";
import { flexRender, type Table } from "@tanstack/react-table";

export function DataTable<T>({ table }: { table: Table<T> }) {
	return (
		<div className="rounded-lg border border-ink-700 overflow-hidden">
			<table className="w-full text-sm">
				<thead className="bg-ink-800 text-muted">
					{table.getHeaderGroups().map((hg) => (
						<tr key={hg.id}>
							{hg.headers.map((h) => (
								<th key={h.id} className="px-4 py-3 text-left font-medium">
									{flexRender(h.column.columnDef.header, h.getContext())}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody>
					{table.getRowModel().rows.map((row) => (
						<tr key={row.id} className="border-t border-ink-700 hover:bg-ink-800/50">
							{row.getVisibleCells().map((cell) => (
								<td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
```

- [ ] **Step 2: ui/badge.tsx（状态徽章：正常/封禁/失败高亮）**

```tsx
export function Badge({ variant = "default", children }: { variant?: "default" | "danger" | "gold" | "muted"; children: React.ReactNode }) {
	const styles = {
		default: "bg-ink-800 text-text",
		danger: "bg-danger/15 text-danger border-danger/30",
		gold: "bg-gold-500/15 text-gold-400 border-gold-500/30",
		muted: "bg-ink-800 text-muted",
	};
	return <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${styles[variant]}`}>{children}</span>;
}
```

- [ ] **Step 3: filter-bar.tsx（搜索 + 筛选 chip，防抖）**

```tsx
"use client";
import { useState, useEffect } from "react";

export interface FilterState {
	searchField?: string; searchValue?: string; [k: string]: unknown;
}

export function FilterBar({ fields, onChange }: {
	fields: { label: string; value: string }[];
	onChange: (f: FilterState) => void;
}) {
	const [field, setField] = useState(fields[0]?.value ?? "email");
	const [value, setValue] = useState("");
	useEffect(() => {
		const t = setTimeout(() => onChange({ searchField: field, searchValue: value }), 350);
		return () => clearTimeout(t);
	}, [field, value, onChange]);
	return (
		<div className="flex gap-2 mb-4">
			<select value={field} onChange={(e) => setField(e.target.value)} className="bg-ink-800 border border-ink-700 rounded px-3 py-2">
				{fields.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
			</select>
			<input value={value} onChange={(e) => setValue(e.target.value)} placeholder="搜索…" className="flex-1 bg-ink-800 border border-ink-700 rounded px-3 py-2" />
		</div>
	);
}
```

- [ ] **Step 4: ui/pagination.tsx, ui/tabs.tsx, ui/skeleton.tsx**

最小实现（prev/next 按钮；tab 用 `@base-ui-components/react` 的 Tabs 或自实现；skeleton 用 animate-pulse）。每个文件 < 30 行。

- [ ] **Step 5: 组件测试（DataTable 渲染 + Badge 变体）**

`src/tests/components/data-table.test.tsx`：
```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { useReactTable, getCoreRowModel, type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";

it("renders rows", () => {
	const data = [{ a: "x" }];
	const cols: ColumnDef<{ a: string }>[] = [{ accessorKey: "a", header: "A" }];
	function Wrap() {
		const table = useReactTable({ data, columns: cols, getCoreRowModel: getCoreRowModel() });
		return <DataTable table={table} />;
	}
	render(<Wrap />);
	expect(screen.getByText("x")).toBeTruthy();
});
```

- [ ] **Step 6: 跑测试 + commit**

Run: `pnpm vitest run` → PASS。
```bash
git add -A && git commit -m "feat(ui): add DataTable, FilterBar, and shared UI primitives"
```

---

## Task 3: 仪表盘（统计卡 + 饼图 + 折线 + 安全看板）

**Files:**
- Create: `src/components/charts/{stat-card,channel-pie,signup-line}.tsx`, `src/app/(admin)/dashboard/page.tsx`

- [ ] **Step 1: stat-card.tsx**

```tsx
export function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
	return (
		<div className="rounded-lg border border-ink-700 bg-ink-900 p-5">
			<div className="text-xs uppercase tracking-wide text-muted">{label}</div>
			<div className="font-serif text-3xl text-gold-500 mt-2">{value}</div>
			{hint && <div className="text-xs text-muted mt-1">{hint}</div>}
		</div>
	);
}
```

- [ ] **Step 2: channel-pie.tsx（Recharts 饼图，黑金）**

```tsx
"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = ["#d4af37", "#6b6b73", "#242428"];

export function ChannelPie({ channels }: { channels: Record<string, number> }) {
	const data = [
		{ name: "Email/Password", value: channels.emailPassword ?? 0 },
		{ name: "GitHub", value: channels.github ?? 0 },
		{ name: "SIWE", value: channels.siwe ?? 0 },
	].filter((d) => d.value > 0);
	if (data.length === 0) return <div className="text-muted text-sm">暂无数据</div>;
	return (
		<ResponsiveContainer width="100%" height={240}>
			<PieChart>
				<Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
					{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
				</Pie>
				<Tooltip contentStyle={{ background: "#121214", border: "1px solid #242428" }} />
				<Legend wrapperStyle={{ color: "#6b6b73" }} />
			</PieChart>
		</ResponsiveContainer>
	);
}
```

- [ ] **Step 3: signup-line.tsx（折线）**

```tsx
"use client";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export function SignupLine({ data }: { data: { date: string; count: number }[] }) {
	return (
		<ResponsiveContainer width="100%" height={240}>
			<LineChart data={data}>
				<CartesianGrid stroke="#242428" strokeDasharray="3 3" />
				<XAxis dataKey="date" stroke="#6b6b73" fontSize={11} />
				<YAxis stroke="#6b6b73" fontSize={11} allowDecimals={false} />
				<Tooltip contentStyle={{ background: "#121214", border: "1px solid #242428" }} />
				<Line type="monotone" dataKey="count" stroke="#d4af37" strokeWidth={2} dot={false} />
			</LineChart>
		</ResponsiveContainer>
	);
}
```

- [ ] **Step 4: dashboard/page.tsx（Server Component）**

```tsx
import { cookies } from "next/headers";
import { StatCard } from "@/components/charts/stat-card";
import { ChannelPie } from "@/components/charts/channel-pie";
import { SignupLine } from "@/components/charts/signup-line";
import { statsOverview, statsSignups, statsSecurityToday } from "@/lib/cinaauth/admin-api";

export const revalidate = 45; // stats 缓存 45s

export default async function DashboardPage() {
	const cookieStore = await cookies();
	const cookie = cookieStore.toString();
	const [overview, signups, security] = await Promise.all([
		statsOverview(cookie), statsSignups(cookie, "30d"), statsSecurityToday(cookie),
	]).catch(() => [null, [], null]);

	if (!overview) return <div className="text-muted">数据加载失败</div>;
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-4 gap-4">
				<StatCard label="总用户" value={overview.totalUsers} />
				<StatCard label="30 天新增" value={overview.newUsers30d} />
				<StatCard label="活跃会话" value={overview.activeSessions} />
				<StatCard label="组织数" value={overview.organizationCount} />
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="rounded-lg border border-ink-700 bg-ink-900 p-5">
					<div className="text-sm text-muted mb-2">登录渠道分布</div>
					<ChannelPie channels={overview.loginChannels} />
				</div>
				<div className="rounded-lg border border-ink-700 bg-ink-900 p-5">
					<div className="text-sm text-muted mb-2">30 天注册趋势</div>
					<SignupLine data={signups} />
				</div>
			</div>
			<div className="rounded-lg border border-ink-700 bg-ink-900 p-5">
				<div className="text-sm text-muted mb-3">安全看板</div>
				<div className="grid grid-cols-4 gap-4">
					<StatCard label="今日失败登录" value={security?.failedLoginsToday ?? 0} />
					<StatCard label="今日 OTP 请求" value={security?.otpRequestsToday ?? 0} />
					<StatCard label="封禁账号" value={overview.bannedCount} />
					<StatCard label="未开 2FA" value={overview.usersWithout2FA} hint="高危资金账号" />
				</div>
			</div>
		</div>
	);
}
```

- [ ] **Step 5: 验证（dev + mock 数据）+ commit**

Run: `pnpm dev`，访问 `/dashboard`，无 cinaauth 时显示"数据加载失败"（符合预期）。
```bash
git add -A && git commit -m "feat(dashboard): add stats cards, channel pie, signup line, security panel"
```

---

## Task 4: 用户列表（筛选 + 分页 + CSV 导出）

**Files:**
- Create: `src/app/(admin)/users/page.tsx`, `src/app/api/admin/export/route.ts`

- [ ] **Step 1: export/route.ts（流式 CSV，支持 users/audit）**

```typescript
import { type NextRequest } from "next/server";
import { resolveAdminSession, hasAdminRole } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { cinaauthConfig } from "@/lib/cinaauth/config";

export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) {
		return new Response("forbidden", { status: 403 });
	}
	const { searchParams } = new URL(request.url);
	const kind = searchParams.get("kind") ?? "users"; // users | audit
	const cookie = request.headers.get("cookie") ?? "";

	const path = kind === "audit" ? `/audit/export?${searchParams}` : `/admin/list-users?${searchParams}&limit=10000`;
	const res = await cinaauthFetch<unknown>(path, { cookie });
	if (!res.ok || !res.data) return new Response("upstream error", { status: 502 });

	let csv = "";
	const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
	if (kind === "users") {
		const d = res.data as { users: Record<string, unknown>[] };
		const cols = ["id", "email", "name", "role", "banned", "createdAt"];
		csv = [cols.join(","), ...d.users.map((u) => cols.map((c) => esc(u[c])).join(","))].join("\n");
	} else {
		// audit: cinaauth 已返回 CSV 文本
		csv = res.data as string;
	}
	return new Response(csv, {
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": `attachment; filename="${kind}-${Date.now()}.csv"`,
		},
	});
}
```

> 注意：`/audit/export` 返回 CSV 文本（Phase 0 Task 5），`/admin/list-users` 返回 JSON。export route 按类型分流。users 导出用 JSON→CSV 转换（限 10000 行）。

- [ ] **Step 2: users/page.tsx（client 列表 + 筛选 + 分页 + 导出按钮）**

```tsx
"use client";
import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useReactTable, getCoreRowModel, type ColumnDef } from "@tanstack/react-table";
import { FilterBar } from "@/components/data-table/filter-bar";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { UserDTO } from "@/lib/cinaauth/dto";

const PAGE = 20;

export default function UsersPage() {
	const [filter, setFilter] = useState<{ searchField?: string; searchValue?: string }>({});
	const [offset, setOffset] = useState(0);
	const { data, isFetching } = useQuery({
		queryKey: ["users", filter, offset],
		queryFn: async () => {
			const r = await fetch("/api/admin/users?" + new URLSearchParams({
				...(filter.searchField ? { searchField: filter.searchField } : {}),
				...(filter.searchValue ? { searchValue: filter.searchValue } : {}),
				limit: String(PAGE), offset: String(offset),
			}));
			return r.json() as Promise<{ ok: boolean; data?: { users: UserDTO[]; total: number } }>;
		},
		placeholderData: keepPreviousData,
	});
	const users = data?.data?.users ?? [];
	const total = data?.data?.total ?? 0;

	const cols = useMemo<ColumnDef<UserDTO>[]>(() => [
		{ accessorKey: "email", header: "邮箱", cell: ({ row }) => <Link href={`/users/${row.original.id}`} className="text-gold-400 hover:underline">{row.original.email}</Link> },
		{ accessorKey: "name", header: "用户名" },
		{ accessorKey: "role", header: "角色" },
		{ header: "状态", cell: ({ row }) => row.original.banned ? <Badge variant="danger">封禁</Badge> : <Badge>正常</Badge> },
		{ accessorKey: "createdAt", header: "注册时间", cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString() },
	], []);

	const table = useReactTable({ data: users, columns: cols, getCoreRowModel: getCoreRowModel() });

	return (
		<div>
			<div className="flex justify-between items-center mb-4">
				<h1 className="font-serif text-xl text-gold-500">用户管理</h1>
				<a href={`/api/admin/export?kind=users&${new URLSearchParams(filter as Record<string, string>)}`} className="text-sm text-gold-400">导出 CSV</a>
			</div>
			<FilterBar fields={[{ label: "邮箱", value: "email" }, { label: "用户名", value: "name" }, { label: "钱包", value: "wallet" }]} onChange={(f) => { setFilter(f); setOffset(0); }} />
			<DataTable table={table} />
			<div className="flex justify-between items-center mt-4 text-sm text-muted">
				<span>共 {total} 条</span>
				<div className="flex gap-2">
					<button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} className="px-3 py-1 border border-ink-700 rounded disabled:opacity-30">上一页</button>
					<button disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)} className="px-3 py-1 border border-ink-700 rounded disabled:opacity-30">下一页</button>
				</div>
			</div>
		</div>
	);
}
```

- [ ] **Step 3: api/admin/users/route.ts（列表代理，转发 cinaauth）**

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { resolveAdminSession, hasAdminRole } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) return NextResponse.json({ ok: false }, { status: 403 });
	const qs = new URL(request.url).searchParams.toString();
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/admin/list-users?${qs}`, { cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
```

- [ ] **Step 4: 验证 + commit**

Run: `pnpm dev` → `/users` 渲染空表（无 cinaauth 数据），筛选/分页 UI 可交互。
```bash
git add -A && git commit -m "feat(users): add user list with filters, pagination, CSV export"
```

---

## Task 5: 用户详情（6 tab 只读）

**Files:**
- Create: `src/app/(admin)/users/[id]/page.tsx` + `tabs/{overview,wallets,third-party,sessions,login-trail,security}.tsx`

- [ ] **Step 1: page.tsx（Server Component 取用户 + tab 容器）**

```tsx
import { cookies } from "next/headers";
import Link from "next/link";
import { getUser } from "@/lib/cinaauth/admin-api";
import { UserTabs } from "./user-tabs";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const cookie = (await cookies()).toString();
	const user = await getUser(cookie, id).catch(() => null);
	if (!user) return <div className="text-muted">用户不存在</div>;
	return (
		<div>
			<Link href="/users" className="text-sm text-muted">← 返回列表</Link>
			<h1 className="font-serif text-xl text-gold-500 mt-2">{user.email}</h1>
			<UserTabs userId={id} user={user} cookie={cookie} />
		</div>
	);
}
```

- [ ] **Step 2: user-tabs.tsx（client tab 切换，按需 fetch）**

```tsx
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OverviewTab } from "./tabs/overview";
import { WalletsTab } from "./tabs/wallets";
import { SessionsTab } from "./tabs/sessions";
import { LoginTrailTab } from "./tabs/login-trail";
import type { UserDTO } from "@/lib/cinaauth/dto";

const TABS = ["overview", "wallets", "third-party", "sessions", "login-trail", "security"] as const;
type Tab = typeof TABS[number];

export function UserTabs({ userId, user }: { userId: string; user: UserDTO; cookie: string }) {
	const [tab, setTab] = useState<Tab>("overview");
	return (
		<div className="mt-4">
			<div className="flex gap-1 border-b border-ink-700">
				{TABS.map((t) => (
					<button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm ${tab === t ? "text-gold-400 border-b-2 border-gold-500" : "text-muted"}`}>{t}</button>
				))}
			</div>
			<div className="mt-4">
				{tab === "overview" && <OverviewTab user={user} />}
				{tab === "wallets" && <WalletsTab userId={userId} />}
				{tab === "third-party" && <div className="text-muted">第三方绑定（Phase 2 简化）</div>}
				{tab === "sessions" && <SessionsTab userId={userId} />}
				{tab === "login-trail" && <LoginTrailTab userId={userId} />}
				{tab === "security" && <div className="text-muted">2FA: {user.twoFactorEnabled ? "已开启" : "未开启"}</div>}
			</div>
		</div>
	);
}
```

- [ ] **Step 3: tabs/overview.tsx, wallets.tsx, sessions.tsx, login-trail.tsx**

`overview.tsx`：展示 user 基础字段（注册时间、邮箱、角色、封禁状态、2FA、来源站点占位）。

`wallets.tsx`：`useQuery` 调 `/api/admin/users/[id]/wallets` → 表格（address、chainId、isPrimary、boundAt、boundIp、boundSite）。本阶段只读，解绑按钮留 Phase 3。

`sessions.tsx`：`useQuery` 调 `/api/admin/users/[id]/sessions` → 表格（创建/过期时间、IP、UA）。本阶段只读。

`login-trail.tsx`：`useQuery` 调 `/api/admin/audit?targetId=userId&action=user.login` → 表格（时间、IP、UA、result）。失败行标红。

每个 tab 文件 < 60 行，复用 DataTable + Badge。

- [ ] **Step 4: api/admin/users/[id]/{wallets,sessions}/route.ts（代理）**

```typescript
// wallets/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { resolveAdminSession, hasAdminRole } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) return NextResponse.json({ ok: false }, { status: 403 });
	const res = await cinaauthFetch(`/admin/list-user-wallets?userId=${id}`, { cookie: request.headers.get("cookie") ?? "" });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
```
> sessions/route.ts 同理，path `/admin/list-user-sessions?userId=${id}`。

- [ ] **Step 5: 组件测试（wallets tab 渲染）+ commit**

`src/tests/components/wallets-tab.test.tsx`：mock fetch 返回钱包数据，断言表格渲染地址。
```bash
git add -A && git commit -m "feat(users): add user detail with 6 read-only tabs"
```

---

## Task 6: 会话管理列表

**Files:**
- Create: `src/app/(admin)/sessions/page.tsx`, `src/app/api/admin/sessions/route.ts`

- [ ] **Step 1: sessions/route.ts（代理 cinaauth list-sessions）**

仿 users/route.ts，path `/admin/list-sessions?${qs}`。

- [ ] **Step 2: sessions/page.tsx**

```tsx
"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReactTable, getCoreRowModel, type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import type { SessionDTO } from "@/lib/cinaauth/dto";

export default function SessionsPage() {
	const { data } = useQuery({
		queryKey: ["sessions", "all"],
		queryFn: async () => {
			const r = await fetch("/api/admin/sessions?limit=100");
			return r.json() as Promise<{ ok: boolean; data?: { sessions: SessionDTO[] } }>;
		},
	});
	const sessions = data?.data?.sessions ?? [];
	const cols = useMemo<ColumnDef<SessionDTO>[]>(() => [
		{ accessorKey: "userId", header: "用户 ID" },
		{ accessorKey: "createdAt", header: "创建时间", cell: ({ row }) => new Date(row.original.createdAt).toLocaleString() },
		{ accessorKey: "expiresAt", header: "过期时间", cell: ({ row }) => new Date(row.original.expiresAt).toLocaleString() },
		{ accessorKey: "ipAddress", header: "IP" },
		{ accessorKey: "userAgent", header: "设备" },
	], []);
	const table = useReactTable({ data: sessions, columns: cols, getCoreRowModel: getCoreRowModel() });
	return (
		<div>
			<h1 className="font-serif text-xl text-gold-500 mb-4">会话管理</h1>
			<DataTable table={table} />
		</div>
	);
}
```
> 吊销操作（单/批）留 Phase 3；本阶段只读列表。

- [ ] **Step 3: commit**

```bash
git add -A && git commit -m "feat(sessions): add read-only session list"
```

---

## Task 7: 审计日志中心（筛选 + 风险高亮 + CSV 导出）

**Files:**
- Create: `src/app/(admin)/audit/page.tsx`, `src/app/api/admin/audit/route.ts`

- [ ] **Step 1: audit/route.ts（代理 /audit/list）**

仿 users/route.ts，path `/audit/list?${qs}`，DTO 映射。

- [ ] **Step 2: audit/page.tsx（筛选 + 失败行标红 + 导出）**

```tsx
"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReactTable, getCoreRowModel, type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import type { AuditLogDTO } from "@/lib/cinaauth/dto";

export default function AuditPage() {
	const [category, setCategory] = useState("");
	const [result, setResult] = useState("");
	const { data } = useQuery({
		queryKey: ["audit", category, result],
		queryFn: async () => {
			const qs = new URLSearchParams({ limit: "100", ...(category && { category }), ...(result && { result }) });
			const r = await fetch(`/api/admin/audit?${qs}`);
			return r.json() as Promise<{ ok: boolean; data?: { rows: AuditLogDTO[] } }>;
		},
	});
	const rows = data?.data?.rows ?? [];
	const cols = useMemo<ColumnDef<AuditLogDTO>[]>(() => [
		{ accessorKey: "timestamp", header: "时间", cell: ({ row }) => new Date(row.original.timestamp).toLocaleString() },
		{ accessorKey: "category", header: "类别" },
		{ accessorKey: "action", header: "操作" },
		{ accessorKey: "actorId", header: "操作者" },
		{ accessorKey: "actorIp", header: "IP" },
		{ header: "结果", cell: ({ row }) => row.original.result === "failure" ? <Badge variant="danger">失败</Badge> : <Badge>成功</Badge> },
	], []);
	const table = useReactTable({ data: rows, columns: cols, getCoreRowModel: getCoreRowModel() });
	return (
		<div>
			<div className="flex justify-between items-center mb-4">
				<h1 className="font-serif text-xl text-gold-500">审计日志</h1>
				<a href={`/api/admin/export?kind=audit&${new URLSearchParams({ ...(category && { category }), ...(result && { result }) })}`} className="text-sm text-gold-400">导出 CSV</a>
			</div>
			<div className="flex gap-2 mb-4">
				<select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-ink-800 border border-ink-700 rounded px-3 py-2">
					<option value="">全部类别</option>
					{["user","session","auth","admin","risk","wallet","org","apikey"].map((c) => <option key={c} value={c}>{c}</option>)}
				</select>
				<select value={result} onChange={(e) => setResult(e.target.value)} className="bg-ink-800 border border-ink-700 rounded px-3 py-2">
					<option value="">全部结果</option>
					<option value="success">成功</option>
					<option value="failure">失败</option>
				</select>
			</div>
			<DataTable table={table} />
		</div>
	);
}
```

- [ ] **Step 3: 风险高亮（failure 行整行标红背景）**

在 DataTable 行渲染时，若 `row.original.result === "failure"`，行 className 加 `bg-danger/5`。（修改 DataTable 接受 `rowClassName` 回调，或在 audit 专用表格内联。）

- [ ] **Step 4: 组件测试（audit 表格失败行高亮）+ commit**

`src/tests/components/audit-table.test.tsx`：mock 返回 1 success + 1 failure，断言 failure 行有 danger class。
```bash
git add -A && git commit -m "feat(audit): add audit log center with filters, failure highlight, CSV export"
```

---

## Phase 2 DoD（交付确认清单）

- [ ] 仪表盘：4 统计卡 + 渠道饼图 + 注册折线 + 安全看板渲染，stats 缓存 ~45s
- [ ] 用户列表：邮箱/用户名/钱包筛选 + 分页 + CSV 导出
- [ ] 用户详情：6 tab（overview/wallets/third-party/sessions/login-trail/security）只读渲染
- [ ] 会话列表：只读，字段齐全
- [ ] 审计中心：类别/结果筛选 + 失败行标红 + CSV 导出
- [ ] 所有只读数据 `revalidate: 0`（stats 除外）
- [ ] DTO 映射 + DataTable + Badge + 审计高亮单测通过
- [ ] `pnpm typecheck` 通过
- [ ] Conventional Commits 提交（未 push）

---

## 风险与核对点

1. **cinaauth 响应字段名**（如 session 的 `ipAddress`/`userAgent`、user 的 `twoFactorEnabled`）：实施时对每个 DTO 字段 curl 一次真实端点确认，必要时调整 `mapUser`/`mapSession`。
2. **list-sessions vs list-user-sessions**：全局会话列表用 cinaauth `/list-sessions`（admin 插件已有）；用户会话用 `/admin/list-user-sessions`。确认两者路径。
3. **CSV users 导出限 10000 行**：超出时需分页导出；v1 接受限制，文档注明。
4. **TanStack Query 在 RSC**：dashboard 用 RSC 直 fetch（无需 query）；列表页用 client + Query。SSR 首屏可选（用 `prefetchQuery` + `HydrationBoundary`），v1 客户端 fetch 即可。
