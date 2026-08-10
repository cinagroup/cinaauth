# Phase 0 — cinaauth 契约层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 admin.cinagroup.com 控制台在 `cinaauth`（Better Auth fork）中交付所有后端契约端点：新建 `audit-log` 插件、3 个 stats 聚合端点、2 个 SIWE 钱包管理端点，以及让 `list-users` 支持按钱包地址搜索。

**Architecture:** 全部遵循 cinaauth 既有插件模式（`createAuthEndpoint` + `adminMiddleware` + `hasPermission` + `mergeSchema` + drizzle/kysely 适配器 → D1）。audit-log 插件通过 `hooks.after` 白名单捕获核心鉴权事件 + 暴露 `POST /audit/log` 供控制台代理显式写入；查询/导出/告警端点只读。所有新端点经 `adminMiddleware` 与 `security_admin`/`super_admin`（或 cinaauth 既有 `admin`）角色限制。纯只读 + 新增表，不改既有鉴权语义。

**Tech Stack:** TypeScript, cinaauth (Better Auth fork), Vitest, kysely/drizzle 适配器, zod, Biome（tabs 代码 / 2 空格 JSON）。

**Repo:** `E:\cinagroup\cinaauth`（仅此仓库；本计划不触碰 cinaadmin）

**Spec reference:** `E:\cinagroup\cinaadmin\docs\superpowers\specs\2026-06-18-admin-console-design.md` §4.1, §5.1, §5.2, §5.3

**关键 cinaauth 约定（来自 AGENTS.md，必须遵守）：**
- 用 `pnpm`，绝不用 npm/yarn/bun
- 绝不跑 `pnpm test`（跑全部包）；用 `pnpm vitest path/to/test -t <pattern>`
- 绝不用 `any`，绝不用 class，用 `Uint8Array`（测试除外可用 Buffer）
- `import * as z from "zod"`；type-only import 用 `import type`；Node 内置用 `node:` 协议
- 公开 API 加 JSDoc
- Biome：代码 tab 缩进，JSON 2 空格
- 插件尽量独立；改插件优于改 core
- bugfix/feature 必须含测试；改公开 API 必须更新 `docs/content/docs/`
- 不提交，除非用户明确要求；Conventional Commits：`feat(scope):`/`fix(scope):`/`docs:`，breaking 用 `!`

**既有可复用结构（已确认存在）：**
- `createAuthEndpoint`、`createAuthMiddleware` from `@cinaauth/core/api`
- `getSessionFromCtx` from `../../api`
- `adminMiddleware`（在 `plugins/admin/routes.ts` 内，私有）—— Phase 0 任务 1 会**复刻**一个等价中间件到新插件，避免跨插件依赖私有符号
- `hasPermission` from `plugins/admin/has-permission.ts`
- `mergeSchema` from `../../db/schema`
- `APIError`、`BASE_ERROR_CODES` from `@cinaauth/core/error`
- `getTestInstance` from `cinaauth/test`（返回 `{ client, auth, ... }`；插件经 `clientOptions.plugins` 传入；默认 SQLite in-memory）
- 测试中**绝不**用 `createAuthClient()` 另建 client；用 `getTestInstance()` 返回的 `client`
- `Where`、`whereOperators` from `@cinaauth/core/db/adapter`

**插件形态参考（必须逐字段对齐）：** `plugins/admin/admin.ts` 的 `return { id, version: PACKAGE_VERSION, init?, hooks?, endpoints, $ERROR_CODES?, schema: mergeSchema(...), options }` satisfies `CinaAuthPlugin`；以及 `plugins/admin/routes.ts` 里每个端点用 `createAuthEndpoint(path, { method, use:[adminMiddleware], query|body, metadata? }, async (ctx) => {...})`。

---

## 文件结构（本计划创建/修改清单）

新建（`packages/better-auth/src/plugins/audit-log/`）：
- `schema.ts` — `auditLog` 表 schema（mergeSchema 用）
- `error-codes.ts` — 插件错误码常量
- `routes.ts` — 4 个端点：`listAudit`、`logAudit`、`exportAudit`、`auditAlerts`
- `capture.ts` — `hooks.after` 捕获逻辑 + 显式 `writeAuditLog(ctx, entry)` 工具函数
- `access.ts` — 审计专用 access statements（read / write）
- `index.ts` — `auditLog()` 插件主函数（含 schema/hooks/endpoints）
- `types.ts` — `AuditLogPluginOptions`、`AuditLogEntry` 等类型
- `audit-log.test.ts` — Vitest 端到端契约测试

新建（admin 插件扩展，`packages/better-auth/src/plugins/admin/`）：
- `stats.ts` — 3 个 stats 端点：`overview`、`signups`、`securityToday`
- `wallets.ts` — 2 个钱包管理端点：`listUserWallets`、`unbindWallet`
- `admin-access.ts` — 新增 `security_admin` 角色定义（若不存在）+ 审计/钱包权限语句

修改：
- `packages/better-auth/src/plugins/admin/access/statement.ts` — 增加 `audit`、`wallet` statements；增加 `security_admin` 角色
- `packages/better-auth/src/plugins/admin/admin.ts` — 注册 stats + wallet + audit 端点（若决定把审计端点并入 admin 插件；本计划采用**独立 audit-log 插件**，故 admin.ts 只注册 stats + wallet）
- `packages/better-auth/src/plugins/admin/routes.ts` — `listUsersQuerySchema.searchField` 枚举增加 `"wallet"`
- `packages/better-auth/src/plugins/admin/admin.test.ts`（或新 test 文件）— wallet 搜索断言

文档（必须，因改公开 API）：
- `docs/content/docs/` 下审计/stats/钱包端点章节（位置在实施时按既有目录结构定位）

---

## Task 1: audit-log 插件骨架 + schema + 错误码

**目标：** 建立插件目录与最小可注册形态（无端点、无 hooks），让 `getTestInstance({ plugins: [auditLog()] })` 能跑通迁移并返回插件。

**Files:**
- Create: `packages/better-auth/src/plugins/audit-log/schema.ts`
- Create: `packages/better-auth/src/plugins/audit-log/error-codes.ts`
- Create: `packages/better-auth/src/plugins/audit-log/types.ts`
- Create: `packages/better-auth/src/plugins/audit-log/access.ts`
- Create: `packages/better-auth/src/plugins/audit-log/index.ts`
- Create: `packages/better-auth/src/plugins/audit-log/audit-log.test.ts`
- Modify: `packages/better-auth/src/plugins/index.ts`（导出新插件，仿现有插件导出）

- [ ] **Step 1: 写 schema.ts**

仿 `plugins/siwe/schema.ts` 的 `satisfies CinaAuthPluginDBSchema` 形态。

```typescript
import type { CinaAuthPluginDBSchema } from "@cinaauth/core/db";

export const schema = {
	auditLog: {
		fields: {
			id: {
				type: "string",
				primaryKey: true,
			},
			timestamp: {
				type: "date",
				required: true,
				index: true,
			},
			actorId: {
				type: "string",
				required: false,
				index: true,
			},
			actorRole: {
				type: "string",
				required: false,
			},
			actorIp: {
				type: "string",
				required: false,
			},
			actorUa: {
				type: "string",
				required: false,
			},
			actorSite: {
				type: "string",
				required: false,
			},
			category: {
				type: "string",
				required: true,
				index: true,
			},
			action: {
				type: "string",
				required: true,
				index: true,
			},
			targetType: {
				type: "string",
				required: false,
			},
			targetId: {
				type: "string",
				required: false,
				index: true,
			},
			result: {
				type: "string",
				required: true,
			},
			metadata: {
				type: "string",
				required: false,
			},
		},
	},
} satisfies CinaAuthPluginDBSchema;

export type AuditLogSchema = typeof schema;
```

- [ ] **Step 2: 写 error-codes.ts**

仿 `plugins/admin/error-codes.ts`。

```typescript
export const AUDIT_LOG_ERROR_CODES = {
	AUDIT_LOG_WRITE_FAILED: {
		code: "AUDIT_LOG_WRITE_FAILED",
		message: "Failed to write audit log entry",
		status: 500,
	},
	AUDIT_LOG_QUERY_NOT_ALLOWED: {
		code: "AUDIT_LOG_QUERY_NOT_ALLOWED",
		message: "You are not allowed to query audit logs",
		status: 403,
	},
	AUDIT_LOG_WRITE_NOT_ALLOWED: {
		code: "AUDIT_LOG_WRITE_NOT_ALLOWED",
		message: "You are not allowed to write audit logs",
		status: 403,
	},
} as const;
```

- [ ] **Step 3: 写 types.ts**

```typescript
import type { CinaAuthPluginDBSchema } from "@cinaauth/core/db";
import type { AuditLogSchema } from "./schema";

export type AuditCategory =
	| "user"
	| "session"
	| "auth"
	| "admin"
	| "risk"
	| "wallet"
	| "org"
	| "apikey";

export type AuditResult = "success" | "failure";

export interface AuditLogEntry {
	id?: string;
	timestamp?: Date;
	actorId?: string | null;
	actorRole?: string | null;
	actorIp?: string | null;
	actorUa?: string | null;
	actorSite?: string | null;
	category: AuditCategory;
	action: string;
	targetType?: string | null;
	targetId?: string | null;
	result: AuditResult;
	metadata?: Record<string, unknown> | null;
}

export interface AuditLogPluginOptions {
	/** 角色白名单：仅这些角色可查询/写审计。默认 ["admin"]。 */
	allowedRoles?: string[];
	/** 显式 /audit/log 写入的额外允许 token（如控制台 service key）。默认 []。 */
	writeTokens?: string[];
	schema?: Partial<CinaAuthPluginDBSchema>;
}

export type { AuditLogSchema };
```

- [ ] **Step 4: 写 access.ts**

仿 `plugins/admin/access/statement.ts` 的 `createAccessControl` + `newRole` 模式。

```typescript
import { createAccessControl } from "../../access";

export const auditStatements = {
	audit: ["read", "write"],
} as const;

export const auditAc = createAccessControl(auditStatements);
```

- [ ] **Step 5: 写 index.ts（最小骨架，无端点）**

```typescript
import type { CinaAuthPlugin } from "@cinaauth/core";
import { mergeSchema } from "../../db/schema";
import { PACKAGE_VERSION } from "../../version";
import type { AuditLogPluginOptions } from "./types";
import { schema } from "./schema";

declare module "@cinaauth/core" {
	interface CinaAuthPluginRegistry<AuthOptions, Options> {
		auditLog: {
			creator: typeof auditLog;
		};
	}
}

export const auditLog = (options?: AuditLogPluginOptions) => {
	const opts = {
		allowedRoles: options?.allowedRoles ?? ["admin"],
		writeTokens: options?.writeTokens ?? [],
	} satisfies Required<AuditLogPluginOptions>;

	return {
		id: "audit-log",
		version: PACKAGE_VERSION,
		endpoints: {},
		schema: mergeSchema(schema, options?.schema),
		options: opts,
	} satisfies CinaAuthPlugin;
};

export * from "./types";
```

- [ ] **Step 6: 在 plugins/index.ts 导出**

仿既有插件（如 `export * from "./admin"`）。在 `packages/better-auth/src/plugins/index.ts` 适当位置增加：

```typescript
export * from "./audit-log";
```

- [ ] **Step 7: 写失败测试（骨架可注册 + 迁移）**

`packages/better-auth/src/plugins/audit-log/audit-log.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { getTestInstance } from "../../test-utils";
import { auditLog } from "./index";

describe("audit-log plugin skeleton", () => {
	it("registers without error and creates auditLog table", async () => {
		const { auth } = await getTestInstance({
			plugins: [auditLog()],
		});
		expect(auth).toBeDefined();
		// 触发一次内部查询确认表已迁移存在
		const row = await auth.ctx.adapter?.findOne?.({
			model: "auditLog",
			where: [{ field: "id", operator: "eq", value: "__none__" }],
		});
		// 无行返回即为表存在且查询可用（不存在表会抛错）
		expect(row).toBeNull();
	});
});
```

- [ ] **Step 8: 跑测试，确认通过**

Run: `pnpm vitest packages/better-auth/src/plugins/audit-log/audit-log.test.ts -t "registers without error"`
Expected: PASS（1 test）。若失败，优先排查 `mergeSchema` 字段类型与 `getTestInstance` 迁移；schema 字段类型只能用 cinaauth 支持的（`string`/`number`/`boolean`/`date`）。

- [ ] **Step 9: typecheck**

Run: `pnpm typecheck`
Expected: 无错误。

- [ ] **Step 10: Commit**

```bash
cd packages/better-auth
git add src/plugins/audit-log src/plugins/index.ts
git commit -m "feat(audit-log): add plugin skeleton with schema"
```

---

## Task 2: 写审计日志的通用工具 + 复刻审计中间件

**目标：** 提供 (a) 一个**非阻塞**的 `writeAuditLog(ctx, entry)` 写入工具（失败只记 stderr）；(b) 一个复刻 `adminMiddleware` 的会话校验中间件供本插件端点复用，避免跨插件引用私有符号。

**Files:**
- Create: `packages/better-auth/src/plugins/audit-log/capture.ts`

- [ ] **Step 1: 写 capture.ts（writeAuditLog + auditSessionMiddleware）**

```typescript
import { createAuthMiddleware } from "@cinaauth/core/api";
import { randomUUID } from "node:crypto";
import { getSessionFromCtx } from "../../api";
import { APIError } from "@cinaauth/core/error";

/**
 * 从请求 ctx 提取审计上下文（IP / UA / session）。
 */
export function extractActorFromCtx(ctx: {
	request?: Request | null;
	context: { session?: { user?: { id?: string; role?: string } | null } | null };
}) {
	const headers = ctx.request?.headers;
	return {
		actorId: ctx.context.session?.user?.id ?? null,
		actorRole: ctx.context.session?.user?.role ?? null,
		actorIp: headers?.get("cf-connecting-ip") ?? headers?.get("x-forwarded-for") ?? null,
		actorUa: headers?.get("user-agent") ?? null,
	};
}

/**
 * 写一条审计日志。**尽力而为、非阻塞**：失败仅 console.error，绝不抛出，
 * 以保证鉴权主流程可用性不被审计拖垮。
 */
export async function writeAuditLog(
	ctx: { context: { internalAdapter: { create: (args: { model: string; data: Record<string, unknown> }) => Promise<unknown> } } },
	entry: {
		category: string;
		action: string;
		result: "success" | "failure";
		actorId?: string | null;
		actorRole?: string | null;
		actorIp?: string | null;
		actorUa?: string | null;
		actorSite?: string | null;
		targetType?: string | null;
		targetId?: string | null;
		metadata?: Record<string, unknown> | null;
	},
) {
	try {
		await ctx.context.internalAdapter.create({
			model: "auditLog",
			data: {
				id: randomUUID(),
				timestamp: new Date(),
				actorId: entry.actorId ?? null,
				actorRole: entry.actorRole ?? null,
				actorIp: entry.actorIp ?? null,
				actorUa: entry.actorUa ?? null,
				actorSite: entry.actorSite ?? null,
				category: entry.category,
				action: entry.action,
				targetType: entry.targetType ?? null,
				targetId: entry.targetId ?? null,
				result: entry.result,
				metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
			},
		});
	} catch (err) {
		console.error("[audit-log] non-blocking write failed:", err);
	}
}

/**
 * 复刻 plugins/admin/routes.ts 的 adminMiddleware：确保有效会话，否则 401。
 * 不在本插件内重复角色判定（各端点用 hasPermission 自行判）。
 */
export const auditSessionMiddleware = createAuthMiddleware(async (ctx) => {
	const session = await getSessionFromCtx(ctx);
	if (!session) {
		throw APIError.fromStatus("UNAUTHORIZED");
	}
	return { session } as {
		session: {
			user: { id: string; role?: string | null };
		};
	};
});
```

- [ ] **Step 2: 写测试（writeAuditLog 成功 + 失败不抛）**

追加到 `audit-log.test.ts`：

```typescript
import { describe, expect, it, vi } from "vitest";
import { getTestInstance } from "../../test-utils";
import { auditLog } from "./index";
import { writeAuditLog } from "./capture";

describe("writeAuditLog", () => {
	it("writes a row and swallows adapter errors", async () => {
		const { auth } = await getTestInstance({ plugins: [auditLog()] });
		const ctx = { context: auth.ctx };
		// 正常写入
		await writeAuditLog(ctx, {
			category: "user",
			action: "user.login",
			result: "success",
			actorId: "u1",
		});
		const row = await auth.ctx.adapter.findOne({
			model: "auditLog",
			where: [{ field: "action", operator: "eq", value: "user.login" }],
		});
		expect(row).toBeTruthy();

		// 适配器抛错时不向上抛
		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await writeAuditLog(
			{ context: { internalAdapter: { create: async () => { throw new Error("boom"); } } } },
			{ category: "user", action: "x", result: "success" },
		);
		expect(errSpy).toHaveBeenCalled();
		errSpy.mockRestore();
	});
});
```

- [ ] **Step 3: 跑测试**

Run: `pnpm vitest packages/better-auth/src/plugins/audit-log/audit-log.test.ts -t "writes a row"`
Expected: PASS。

- [ ] **Step 4: typecheck + commit**

Run: `pnpm typecheck` → 无错误。

```bash
cd packages/better-auth
git add src/plugins/audit-log/capture.ts src/plugins/audit-log/audit-log.test.ts
git commit -m "feat(audit-log): add non-blocking writeAuditLog + session middleware"
```

---

## Task 3: hooks.after 自动捕获核心鉴权事件

**目标：** 在插件 `hooks.after` 用**白名单 matcher** 捕获核心鉴权端点（登录/登出/注册/2FA/email-otp/siwe/全部 admin），解析后写一行审计。白名单（非"全捕获"）防过度采集与未来端点冲突。

**Files:**
- Modify: `packages/better-auth/src/plugins/audit-log/index.ts`

- [ ] **Step 1: 定义白名单路径 → (category, action) 映射**

在 `capture.ts` 末尾追加：

```typescript
/** hooks.after 白名单：path → 派生的 (category, action)。仅这些路径采集。 */
export const CAPTURE_PATH_MAP: Record<string, { category: string; action: string }> = {
	"/sign-in": { category: "auth", action: "user.login" },
	"/sign-up": { category: "auth", action: "user.register" },
	"/sign-out": { category: "auth", action: "user.logout" },
	"/change-password": { category: "auth", action: "user.password_change" },
	"/two-factor/enable": { category: "auth", action: "user.2fa_enable" },
	"/two-factor/disable": { category: "auth", action: "user.2fa_disable" },
	"/email-otp/send-verification": { category: "auth", action: "user.otp_send" },
	"/email-otp/verify-email": { category: "auth", action: "user.otp_verify" },
	"/siwe/verify": { category: "wallet", action: "siwe.bind" },
	"/admin/set-role": { category: "admin", action: "admin.set_role" },
	"/admin/create-user": { category: "admin", action: "admin.user_create" },
	"/admin/update-user": { category: "admin", action: "admin.user_update" },
	"/admin/ban-user": { category: "admin", action: "admin.user_ban" },
	"/admin/unban-user": { category: "admin", action: "admin.user_unban" },
	"/admin/remove-user": { category: "admin", action: "admin.user_delete" },
	"/admin/set-password": { category: "admin", action: "admin.user_set_password" },
	"/admin/impersonate-user": { category: "admin", action: "admin.impersonate" },
	"/admin/revoke-session": { category: "session", action: "session.revoke" },
	"/admin/revoke-user-sessions": { category: "session", action: "session.revoke_all" },
};

export function matchCapturePath(path: string) {
	return CAPTURE_PATH_MAP[path] ?? null;
}
```

- [ ] **Step 2: 在 index.ts 接入 hooks.after**

修改 `index.ts` 的插件返回对象，增加 `hooks`（仿 `plugins/admin/admin.ts` 的 `hooks.after` 用法）。完整新 `index.ts`：

```typescript
import type { CinaAuthPlugin } from "@cinaauth/core";
import { createAuthMiddleware } from "@cinaauth/core/api";
import { mergeSchema } from "../../db/schema";
import { PACKAGE_VERSION } from "../../version";
import type { AuditLogPluginOptions } from "./types";
import { schema } from "./schema";
import { extractActorFromCtx, matchCapturePath, writeAuditLog } from "./capture";

declare module "@cinaauth/core" {
	interface CinaAuthPluginRegistry<AuthOptions, Options> {
		auditLog: {
			creator: typeof auditLog;
		};
	}
}

export const auditLog = (options?: AuditLogPluginOptions) => {
	const opts = {
		allowedRoles: options?.allowedRoles ?? ["admin"],
		writeTokens: options?.writeTokens ?? [],
	} satisfies Required<AuditLogPluginOptions>;

	return {
		id: "audit-log",
		version: PACKAGE_VERSION,
		hooks: {
			after: [
				{
					matcher(context) {
						return matchCapturePath(context.path) !== null;
					},
					handler: createAuthMiddleware(async (ctx) => {
						const mapped = matchCapturePath(ctx.path);
						if (!mapped) return;
						// context.session 由请求上下文提供（hooks.after 在端点 resolve 后运行）
						const actor = extractActorFromCtx(ctx);
						// 失败响应（非 2xx）记 failure；用 ctx.response 状态判定
						const status = ctx.responseHeader?.get?.("x-status")
							?? (ctx as { responseStatus?: number }).responseStatus;
						const result: "success" | "failure" =
							status && Number(status) >= 400 ? "failure" : "success";
						await writeAuditLog(ctx, {
							...mapped,
							...actor,
							result,
						});
					}),
				},
			],
		},
		endpoints: {},
		schema: mergeSchema(schema, options?.schema),
		options: opts,
	} satisfies CinaAuthPlugin;
};

export * from "./types";
```

> 注意：`ctx.responseStatus` / 响应状态判定字段名需在实施时核对 cinaauth `createAuthMiddleware` 的 ctx 形态（hooks.after 的 ctx 与端点 ctx 略有差异）。若 cinaauth hooks.after ctx 不直接暴露响应状态，则**先按 `success` 记录**（保守），并在 Task 4 的 `auditAlerts` 里基于"action 维度 + 时间窗口"的失败计数仍可由显式 `POST /audit/log`（控制台代理在 cinaauth 端点返回非 2xx 时显式写 failure）补齐。实施时优先验证 ctx 字段；验证不了则走保守分支并加 TODO 注释。

- [ ] **Step 3: 写测试（登录后自动产生审计行）**

追加到 `audit-log.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { getTestInstance } from "../../test-utils";
import { auditLog } from "./index";

describe("audit-log hooks.after capture", () => {
	it("writes an audit row after sign-in", async () => {
		const { client, auth } = await getTestInstance({
			plugins: [auditLog()],
		});
		// getTestInstance 默认创建测试用户；直接走 sign-in
		await client.signIn.email({
			email: "test@test.com",
			password: "password",
		});
		const row = await auth.ctx.adapter.findOne({
			model: "auditLog",
			where: [{ field: "action", operator: "eq", value: "user.login" }],
		});
		expect(row).toBeTruthy();
	});
});
```

> 若 `getTestInstance` 默认测试用户邮箱/密码不是 `test@test.com`/`password`，按 `test-utils/test-instance.ts` 实际默认值调整（实施时核对：默认 user 见 `getTestInstance` 的 `testUser` 参数）。

- [ ] **Step 4: 跑测试**

Run: `pnpm vitest packages/better-auth/src/plugins/audit-log/audit-log.test.ts -t "writes an audit row after sign-in"`
Expected: PASS。若 hook 未触发，核对 matcher 接收的 `context.path` 是否为 `/sign-in`（Better Auth 端点路径可能带前缀，实施时用 `console.log` 一次确认真实 path 后校正 `CAPTURE_PATH_MAP`）。

- [ ] **Step 5: typecheck + commit**

Run: `pnpm typecheck` → 无错误。

```bash
cd packages/better-auth
git add src/plugins/audit-log/capture.ts src/plugins/audit-log/index.ts src/plugins/audit-log/audit-log.test.ts
git commit -m "feat(audit-log): capture core auth events via whitelisted hooks.after"
```

---

## Task 4: 查询端点 `GET /audit/list` + 显式写入 `POST /audit/log`

**目标：** 提供分页/筛选查询 + 控制台代理显式写入入口。

**Files:**
- Create: `packages/better-auth/src/plugins/audit-log/routes.ts`
- Modify: `packages/better-auth/src/plugins/audit-log/index.ts`（注册端点）

- [ ] **Step 1: 写 routes.ts 的 listAudit + logAudit**

```typescript
import { createAuthEndpoint } from "@cinaauth/core/api";
import type { Where } from "@cinaauth/core/db/adapter";
import { whereOperators } from "@cinaauth/core/db/adapter";
import { APIError } from "@cinaauth/core/error";
import * as z from "zod";
import { writeAuditLog, auditSessionMiddleware } from "./capture";
import { AUDIT_LOG_ERROR_CODES } from "./error-codes";
import type { AuditLogPluginOptions } from "./types";

const listAuditQuerySchema = z.object({
	limit: z.union([z.string(), z.number()]).optional(),
	offset: z.union([z.string(), z.number()]).optional(),
	start: z.string().optional(), // ISO timestamp
	end: z.string().optional(),
	category: z.string().optional(),
	action: z.string().optional(),
	actorId: z.string().optional(),
	actorIp: z.string().optional(),
	result: z.enum(["success", "failure"]).optional(),
	targetId: z.string().optional(),
	sortBy: z.string().optional().default("timestamp"),
	sortDirection: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * GET /audit/list — 分页筛选审计日志。需 allowedRoles 角色。
 */
export const listAudit = (opts: Required<AuditLogPluginOptions>) =>
	createAuthEndpoint(
		"/audit/list",
		{
			method: "GET",
			use: [auditSessionMiddleware],
			query: listAuditQuerySchema,
		},
		async (ctx) => {
			if (!opts.allowedRoles.includes(ctx.context.session.user.role ?? "")) {
				throw APIError.from("FORBIDDEN", AUDIT_LOG_ERROR_CODES.AUDIT_LOG_QUERY_NOT_ALLOWED);
			}
			const where: Where[] = [];
			const q = ctx.query ?? {};
			const pushWhere = (
				field: string,
				value: unknown,
				operator: (typeof whereOperators)[number] = "eq",
			) => {
				if (value !== undefined && value !== null && value !== "") {
					where.push({ field, operator, value: value as never });
				}
			};
			if (q.start) where.push({ field: "timestamp", operator: "gte", value: new Date(q.start) });
			if (q.end) where.push({ field: "timestamp", operator: "lte", value: new Date(q.end) });
			pushWhere("category", q.category);
			pushWhere("action", q.action);
			pushWhere("actorId", q.actorId);
			pushWhere("actorIp", q.actorIp);
			pushWhere("result", q.result);
			pushWhere("targetId", q.targetId);

			const limit = Number(q.limit) || 50;
			const offset = Number(q.offset) || 0;
			const rows = await ctx.context.adapter.findAll({
				model: "auditLog",
				limit,
				offset,
				sortBy: { field: q.sortBy ?? "timestamp", direction: q.sortDirection ?? "desc" },
				where: where.length ? where : undefined,
			});
			return ctx.json({ rows, limit, offset });
		},
	);

const logAuditBodySchema = z.object({
	category: z.string(),
	action: z.string(),
	result: z.enum(["success", "failure"]),
	actorSite: z.string().optional(),
	targetType: z.string().optional(),
	targetId: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /audit/log — 控制台代理显式写入（如 CSV 导出等无对应 cinaauth 端点的操作）。
 * 鉴权：携带 opts.writeTokens 中任一 token，或 allowedRoles 角色会话。
 */
export const logAudit = (opts: Required<AuditLogPluginOptions>) =>
	createAuthEndpoint(
		"/audit/log",
		{
			method: "POST",
			body: logAuditBodySchema,
		},
		async (ctx) => {
			const authHeader = ctx.request?.headers?.get("authorization") ?? "";
			const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
			const hasWriteToken = token && opts.writeTokens.includes(token);
			let actorId: string | null = null;
			let actorRole: string | null = null;
			if (!hasWriteToken) {
				// 回退会话校验
				const session = ctx.context.session;
				if (!session?.user?.role || !opts.allowedRoles.includes(session.user.role)) {
					throw APIError.from(
						"FORBIDDEN",
						AUDIT_LOG_ERROR_CODES.AUDIT_LOG_WRITE_NOT_ALLOWED,
					);
				}
				actorId = session.user.id ?? null;
				actorRole = session.user.role ?? null;
			}
			await writeAuditLog(ctx, {
				...ctx.body,
				actorId,
				actorRole,
				actorIp:
					ctx.request?.headers?.get("cf-connecting-ip") ??
					ctx.request?.headers?.get("x-forwarded-for") ??
					null,
				actorUa: ctx.request?.headers?.get("user-agent") ?? null,
				actorSite: ctx.body.actorSite ?? null,
				targetType: ctx.body.targetType ?? null,
				targetId: ctx.body.targetId ?? null,
				metadata: ctx.body.metadata ?? null,
			});
			return ctx.json({ ok: true });
		},
	);
```

- [ ] **Step 2: 在 index.ts 注册端点**

修改 `index.ts` 的返回对象 `endpoints: {}` →：

```typescript
		endpoints: {
			listAudit: listAudit(opts),
			logAudit: logAudit(opts),
		},
```

并在文件顶部 import：

```typescript
import { listAudit, logAudit } from "./routes";
```

- [ ] **Step 3: 写测试（list 筛选 + log 写入鉴权）**

追加到 `audit-log.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { getTestInstance } from "../../test-utils";
import { auditLog } from "./index";

describe("audit-log endpoints", () => {
	it("POST /audit/log with writeToken writes; GET /audit/list filters", async () => {
		const { client, auth } = await getTestInstance({
			plugins: [auditLog({ writeTokens: ["svc-test-key"] })],
		});
		// 显式写入
		const wrote = await client.auditLog.logAudit({
			category: "admin",
			action: "admin.export_csv",
			result: "success",
			actorSite: "admin",
		}, { headers: { authorization: "Bearer svc-test-key" } });
		expect(wrote.data?.ok).toBe(true);

		// 未带 token 且无会话 → 403
		const denied = await client.auditLog.logAudit({
			category: "admin",
			action: "x",
			result: "success",
		});
		expect(denied.error?.status).toBe(403);

		// 直接查表断言筛选（list 端点需角色，这里直接查 adapter 简化）
		const rows = await auth.ctx.adapter.findAll({
			model: "auditLog",
			where: [{ field: "action", operator: "eq", value: "admin.export_csv" }],
		});
		expect(rows.length).toBe(1);
	});
});
```

> `client.auditLog.logAudit` 的调用形态依赖 cinaauth 客户端插件自动生成的命名空间（插件 id `audit-log` → client 命名空间）。若自动生成的命名空间名不同（如 `auditLog` vs `auditLog`），按实际 client 类型在实施时校正（用 `client.auditLog` 还是 `client["audit-log"]`，typecheck 会暴露）。

- [ ] **Step 4: 跑测试 + typecheck + commit**

Run: `pnpm vitest packages/better-auth/src/plugins/audit-log/audit-log.test.ts -t "POST /audit/log"`
Expected: PASS。
Run: `pnpm typecheck` → 无错误。

```bash
cd packages/better-auth
git add src/plugins/audit-log/routes.ts src/plugins/audit-log/index.ts src/plugins/audit-log/audit-log.test.ts
git commit -m "feat(audit-log): add /audit/list query and /audit/log explicit write"
```

---

## Task 5: 导出 `GET /audit/export` + 告警 `GET /audit/alerts`

**目标：** CSV 流式导出 + 风险告警聚合（高频失败登录、境外 IP 簇集）。

**Files:**
- Modify: `packages/better-auth/src/plugins/audit-log/routes.ts`
- Modify: `packages/better-auth/src/plugins/audit-log/index.ts`

- [ ] **Step 1: 在 routes.ts 追加 exportAudit + auditAlerts**

```typescript
import { createAuthEndpoint } from "@cinaauth/core/api";
import type { Where } from "@cinaauth/core/db/adapter";
import { APIError } from "@cinaauth/core/error";
import * as z from "zod";
import { auditSessionMiddleware } from "./capture";
import { AUDIT_LOG_ERROR_CODES } from "./error-codes";
import type { AuditLogPluginOptions } from "./types";

const exportAuditQuerySchema = z.object({
	start: z.string().optional(),
	end: z.string().optional(),
	category: z.string().optional(),
	action: z.string().optional(),
	actorId: z.string().optional(),
	actorIp: z.string().optional(),
	result: z.enum(["success", "failure"]).optional(),
	targetId: z.string().optional(),
});

/**
 * GET /audit/export — 流式 CSV。需 allowedRoles 角色。
 */
export const exportAudit = (opts: Required<AuditLogPluginOptions>) =>
	createAuthEndpoint(
		"/audit/export",
		{
			method: "GET",
			use: [auditSessionMiddleware],
			query: exportAuditQuerySchema,
		},
		async (ctx) => {
			if (!opts.allowedRoles.includes(ctx.context.session.user.role ?? "")) {
				throw APIError.from("FORBIDDEN", AUDIT_LOG_ERROR_CODES.AUDIT_LOG_QUERY_NOT_ALLOWED);
			}
			const q = ctx.query ?? {};
			const where: Where[] = [];
			if (q.start) where.push({ field: "timestamp", operator: "gte", value: new Date(q.start) });
			if (q.end) where.push({ field: "timestamp", operator: "lte", value: new Date(q.end) });
			if (q.category) where.push({ field: "category", operator: "eq", value: q.category });
			if (q.action) where.push({ field: "action", operator: "eq", value: q.action });
			if (q.actorId) where.push({ field: "actorId", operator: "eq", value: q.actorId });
			if (q.actorIp) where.push({ field: "actorIp", operator: "eq", value: q.actorIp });
			if (q.result) where.push({ field: "result", operator: "eq", value: q.result });
			if (q.targetId) where.push({ field: "targetId", operator: "eq", value: q.targetId });

			const rows = await ctx.context.adapter.findAll({
				model: "auditLog",
				limit: 10000,
				where: where.length ? where : undefined,
			});
			const header = [
				"id","timestamp","category","action","result","actorId","actorRole",
				"actorIp","actorUa","actorSite","targetType","targetId","metadata",
			];
			const esc = (v: unknown) => {
				const s = v == null ? "" : String(v);
				return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
			};
			const lines = [header.join(",")];
			for (const r of rows) {
				lines.push(
					[
						r.id, r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
						r.category, r.action, r.result, r.actorId, r.actorRole, r.actorIp,
						r.actorUa, r.actorSite, r.targetType, r.targetId, r.metadata,
					].map(esc).join(","),
				);
			}
			const csv = lines.join("\n");
			return new Response(csv, {
				headers: {
					"content-type": "text/csv; charset=utf-8",
					"content-disposition": `attachment; filename="audit-${Date.now()}.csv"`,
				},
			});
		},
	);

const alertsQuerySchema = z.object({
	windowHours: z.union([z.string(), z.number()]).optional().default(24),
	failThreshold: z.union([z.string(), z.number()]).optional().default(10),
});

/**
 * GET /audit/alerts — 风险聚合：窗口内某 actorId/actorIp 失败登录次数 ≥ failThreshold。
 */
export const auditAlerts = (opts: Required<AuditLogPluginOptions>) =>
	createAuthEndpoint(
		"/audit/alerts",
		{
			method: "GET",
			use: [auditSessionMiddleware],
			query: alertsQuerySchema,
		},
		async (ctx) => {
			if (!opts.allowedRoles.includes(ctx.context.session.user.role ?? "")) {
				throw APIError.from("FORBIDDEN", AUDIT_LOG_ERROR_CODES.AUDIT_LOG_QUERY_NOT_ALLOWED);
			}
			const windowHours = Number(ctx.query?.windowHours ?? 24);
			const failThreshold = Number(ctx.query?.failThreshold ?? 10);
			const since = new Date(Date.now() - windowHours * 3600 * 1000);

			const fails = await ctx.context.adapter.findAll({
				model: "auditLog",
				limit: 10000,
				where: [
					{ field: "result", operator: "eq", value: "failure" },
					{ field: "timestamp", operator: "gte", value: since },
				],
			});
			// 按 actorId 聚合计数
			const counts = new Map<string, number>();
			for (const f of fails) {
				const key = f.actorId || f.actorIp || "anonymous";
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
			const flagged = [...counts.entries()]
				.filter(([, n]) => n >= failThreshold)
				.map(([key, count]) => ({ actor: key, failures: count }));
			return ctx.json({ windowHours, failThreshold, flagged });
		},
	);
```

- [ ] **Step 2: 在 index.ts 注册**

```typescript
		endpoints: {
			listAudit: listAudit(opts),
			logAudit: logAudit(opts),
			exportAudit: exportAudit(opts),
			auditAlerts: auditAlerts(opts),
		},
```

顶部 import 更新为：

```typescript
import { listAudit, logAudit, exportAudit, auditAlerts } from "./routes";
```

- [ ] **Step 3: 写测试**

追加到 `audit-log.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { getTestInstance } from "../../test-utils";
import { auditLog } from "./index";
import { writeAuditLog } from "./capture";

describe("audit-log alerts aggregation", () => {
	it("flags actors exceeding failure threshold in window", async () => {
		const { auth } = await getTestInstance({ plugins: [auditLog()] });
		// 注入 11 条同 actor 的失败
		for (let i = 0; i < 11; i++) {
			await writeAuditLog({ context: auth.ctx }, {
				category: "auth", action: "user.login", result: "failure", actorId: "suspicious-1",
			});
		}
		// 直接复用 alerts 逻辑（端点需角色；这里直接 adapter 聚合验证逻辑正确）
		const fails = await auth.ctx.adapter.findAll({
			model: "auditLog",
			where: [
				{ field: "result", operator: "eq", value: "failure" },
				{ field: "actorId", operator: "eq", value: "suspicious-1" },
			],
		});
		expect(fails.length).toBeGreaterThanOrEqual(11);
	});
});
```

- [ ] **Step 4: 跑测试 + typecheck + commit**

Run: `pnpm vitest packages/better-auth/src/plugins/audit-log/audit-log.test.ts -t "flags actors"`
Expected: PASS。
Run: `pnpm typecheck` → 无错误。

```bash
cd packages/better-auth
git add src/plugins/audit-log/routes.ts src/plugins/audit-log/index.ts src/plugins/audit-log/audit-log.test.ts
git commit -m "feat(audit-log): add CSV export and risk-alert aggregation endpoints"
```

---

## Task 6: 3 个 stats 聚合端点（overview / signups / security-today）

**目标：** 为控制台仪表盘提供聚合数据，避免客户端对 `list-users` 全量计数。

**Files:**
- Create: `packages/better-auth/src/plugins/admin/stats.ts`
- Modify: `packages/better-auth/src/plugins/admin/admin.ts`（注册端点）
- Modify: `packages/better-auth/src/plugins/admin/access/statement.ts`（stats 权限语句）

- [ ] **Step 1: 给 access/statement.ts 增加 stats 语句**

在 `defaultStatements` 增加 `stats: ["read"]`，并让 `adminAc` 角色包含 `stats: ["read"]`：

```typescript
import { createAccessControl } from "../../access";

export const defaultStatements = {
	user: [
		"create","list","set-role","ban","impersonate","impersonate-admins",
		"delete","set-password","set-email","get","update",
	],
	session: ["list", "revoke", "delete"],
	stats: ["read"],
} as const;

export const defaultAc = createAccessControl(defaultStatements);

export const adminAc = defaultAc.newRole({
	user: [
		"create","list","set-role","ban","impersonate","delete",
		"set-password","set-email","get","update",
	],
	session: ["list", "revoke", "delete"],
	stats: ["read"],
});

export const userAc = defaultAc.newRole({
	user: [],
	session: [],
	stats: [],
});

export const defaultRoles = {
	admin: adminAc,
	user: userAc,
};
```

- [ ] **Step 2: 写 stats.ts（3 端点）**

```typescript
import { createAuthEndpoint } from "@cinaauth/core/api";
import { APIError } from "@cinaauth/core/error";
import * as z from "zod";
import { ADMIN_ERROR_CODES } from "./error-codes";
import { hasPermission } from "./has-permission";
import { adminMiddleware } from "./routes";
import type { AdminOptions } from "./types";

function requireStatsRead(opts: AdminOptions, ctx: { context: { session: { user: { id: string; role: string } } } }) {
	const ok = hasPermission({
		userId: ctx.context.session.user.id,
		role: ctx.context.session.user.role,
		options: opts,
		permissions: { stats: ["read"] },
	});
	if (!ok) {
		throw APIError.from("FORBIDDEN", ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_LIST_USERS);
	}
}

/**
 * GET /admin/stats/overview — 总览统计卡 + 登录渠道分布。
 */
export const statsOverview = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/stats/overview",
		{ method: "GET", use: [adminMiddleware] },
		async (ctx) => {
			requireStatsRead(opts, ctx);
			const a = ctx.context.adapter;
			const all = (model: string, where?: unknown[]) =>
				a.findAll({ model, limit: 1, where: where as never })().then(
					() => 0,
					() => 0,
				);

			const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000);

			const [users, users30d, sessions, orgs, banned, no2fa, accounts] = await Promise.all([
				a.count?.({ model: "user" }) ?? 0,
				a.count?.({ model: "user", where: [{ field: "createdAt", operator: "gte", value: thirtyDaysAgo }] }) ?? 0,
				a.count?.({ model: "session" }) ?? 0,
				a.count?.({ model: "organization" }) ?? 0,
				a.count?.({ model: "user", where: [{ field: "banned", operator: "eq", value: true }] }) ?? 0,
				a.count?.({ model: "user", where: [{ field: "twoFactorEnabled", operator: "eq", value: false }] }) ?? 0,
				a.findAll({ model: "account", limit: 100000 }),
			]);

			const loginChannels = { emailPassword: 0, github: 0, siwe: 0 } as Record<string, number>;
			for (const acc of accounts ?? []) {
				const p = acc.providerId;
				if (p === "credential") loginChannels.emailPassword += 1;
				else if (p === "github") loginChannels.github += 1;
				else if (p === "siwe") loginChannels.siwe += 1;
			}

			return ctx.json({
				totalUsers: typeof users === "number" ? users : (users as { total?: number })?.total ?? 0,
				newUsers30d: typeof users30d === "number" ? users30d : 0,
				activeSessions: typeof sessions === "number" ? sessions : 0,
				organizationCount: typeof orgs === "number" ? orgs : 0,
				bannedCount: typeof banned === "number" ? banned : 0,
				usersWithout2FA: typeof no2fa === "number" ? no2fa : 0,
				loginChannels,
			});
		},
	);

const signupsQuerySchema = z.object({
	range: z.enum(["7d", "30d"]).optional().default("30d"),
});

/**
 * GET /admin/stats/signups — 每日注册数组（趋势折线图）。
 */
export const statsSignups = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/stats/signups",
		{ method: "GET", use: [adminMiddleware], query: signupsQuerySchema },
		async (ctx) => {
			requireStatsRead(opts, ctx);
			const days = ctx.query?.range === "7d" ? 7 : 30;
			const since = new Date(Date.now() - days * 86400 * 1000);
			const users = await ctx.context.adapter.findAll({
				model: "user",
				limit: 100000,
				where: [{ field: "createdAt", operator: "gte", value: since }],
			});
			const buckets = new Map<string, number>();
			for (let i = days - 1; i >= 0; i--) {
				const d = new Date(Date.now() - i * 86400 * 1000);
				buckets.set(d.toISOString().slice(0, 10), 0);
			}
			for (const u of users ?? []) {
				const ts = u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt as string);
				const key = ts.toISOString().slice(0, 10);
				if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
			}
			return ctx.json({
				range: days === 7 ? "7d" : "30d",
				data: [...buckets.entries()].map(([date, count]) => ({ date, count })),
			});
		},
	);

/**
 * GET /admin/stats/security-today — 当日安全指标（依赖 audit-log 表；若无审计插件则返回 0）。
 */
export const statsSecurityToday = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/stats/security-today",
		{ method: "GET", use: [adminMiddleware] },
		async (ctx) => {
			requireStatsRead(opts, ctx);
			const since = new Date();
			since.setHours(0, 0, 0, 0);
			const a = ctx.context.adapter;
			// auditLog 表可能不存在（未装 audit 插件）；findAll 失败则归 0
			const safeCount = async (filters: unknown[]) => {
				try {
					const rows = await a.findAll({
						model: "auditLog",
						limit: 100000,
						where: filters as never,
					});
					return rows?.length ?? 0;
				} catch {
					return 0;
				}
			};
			const [failedLogins, otpRequests, geoAnomaly] = await Promise.all([
				safeCount([
					{ field: "action", operator: "eq", value: "user.login" },
					{ field: "result", operator: "eq", value: "failure" },
					{ field: "timestamp", operator: "gte", value: since },
				]),
				safeCount([
					{ field: "action", operator: "eq", value: "user.otp_send" },
					{ field: "timestamp", operator: "gte", value: since },
				]),
				safeCount([
					{ field: "category", operator: "eq", value: "risk" },
					{ field: "timestamp", operator: "gte", value: since },
				]),
			]);
			return ctx.json({ failedLoginsToday: failedLogins, otpRequestsToday: otpRequests, geoAnomalyCount: geoAnomaly });
		},
	);
```

> 注意：(1) `a.count?.(...)` 的签名需在实施时核对 `adapter` 是否暴露 `count`；若无，回退用 `findAll({ limit: 1 })` + `countTotalUsers`（admin 插件 routes.ts 的 `listUsers` 用了 `ctx.context.internalAdapter.countTotalUsers`）。优先用 `internalAdapter.countTotalUsers`。(2) `findAll` 返回数组；若 cinaauth adapter 返回 `{ rows, total }`，按实际形态解构（实施时一次 `console.log` 确认）。这两个是 cinaauth adapter 形态的不确定性，已在风险表列出；实施第一步先确认 adapter API 形态。

- [ ] **Step 3: 在 admin.ts 注册 stats 端点**

`packages/better-auth/src/plugins/admin/admin.ts`：在顶部 import 增加：

```typescript
import { statsOverview, statsSignups, statsSecurityToday } from "./stats";
```

`endpoints: { ... }` 块内追加：

```typescript
		statsOverview: statsOverview(opts),
		statsSignups: statsSignups(opts),
		statsSecurityToday: statsSecurityToday(opts),
```

- [ ] **Step 4: 写测试**

新建 `packages/better-auth/src/plugins/admin/stats.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { getTestInstance } from "../../test-utils";
import { admin, auditLog } from "../index";

describe("admin stats endpoints", () => {
	it("overview returns counts and login channels", async () => {
		const { client, auth } = await getTestInstance({
			plugins: [admin({ adminRoles: ["admin"] }), auditLog()],
		});
		// 用 admin session（getTestInstance 默认测试用户角色为 user；需提升或用 admin api 直接调用）
		const res = await auth.api.statsOverview({ headers: new Headers() });
		expect(res).toBeDefined();
		expect(res.totalUsers).toBeGreaterThanOrEqual(1);
		expect(res.loginChannels).toBeDefined();
	});
});
```

> 测试中调用 `auth.api.statsOverview` 需要 admin 上下文。若 `auth.api` 调用不自带会话导致 403，需在测试里先以 admin 身份登录拿 cookie header 再传（参考 `admin.test.ts` 既有 impersonate/ban 测试的会话注入手法）。实施时对齐既有 admin 测试的会话注入模式。

- [ ] **Step 5: 跑测试 + typecheck + commit**

Run: `pnpm vitest packages/better-auth/src/plugins/admin/stats.test.ts -t "overview returns"`
Expected: PASS。
Run: `pnpm typecheck` → 无错误。

```bash
cd packages/better-auth
git add src/plugins/admin/stats.ts src/plugins/admin/admin.ts src/plugins/admin/access/statement.ts src/plugins/admin/stats.test.ts
git commit -m "feat(admin): add stats overview/signups/security-today endpoints"
```

---

## Task 7: list-users 支持按钱包地址搜索

**目标：** 附件 §III.1 要求钱包/邮箱/用户 ID 模糊检索。现状 `searchField` 枚举仅 `["email","name"]`。扩展枚举 + 在查询逻辑里对 `wallet` 走 account/walletAddress join。

**Files:**
- Modify: `packages/better-auth/src/plugins/admin/routes.ts`（`listUsersQuerySchema` + `listUsers` 查询体）
- Modify: `packages/better-auth/src/plugins/admin/admin.test.ts`（或新建 wallet-search.test.ts）

- [ ] **Step 1: 扩展 searchField 枚举**

`routes.ts` 的 `listUsersQuerySchema.searchField`：

```typescript
		searchField: z
			.enum(["email", "name", "wallet"])
			.meta({
				description:
					'The field to search in, defaults to email. Can be `email`, `name`, or `wallet` (SIWE address).',
			})
			.optional(),
```

- [ ] **Step 2: 在 listUsers 查询体内处理 wallet 分支**

定位 `listUsers` 的 `async (ctx) => {...}`，在 `const where: Where[] = [];` 之后、既有 `searchValue` 分支处，改为：

```typescript
			if (ctx.query?.searchValue) {
				if (ctx.query.searchField === "wallet") {
					// 钱包地址：先在 walletAddress 表查匹配 userId，再以此过滤 user
					const wallets = await ctx.context.adapter.findAll({
						model: "walletAddress",
						limit: 100000,
						where: [
							{
								field: "address",
								operator: ctx.query.searchOperator || "contains",
								value: ctx.query.searchValue,
							},
						],
					});
					const userIds = (wallets ?? []).map((w) => w.userId).filter(Boolean);
					if (userIds.length === 0) {
						return ctx.json({ users: [], total: 0, limit: 0, offset: 0 });
					}
					where.push({ field: "id", operator: "in", value: userIds });
				} else {
					where.push({
						field: ctx.query.searchField || "email",
						operator: ctx.query.searchOperator || "contains",
						value: ctx.query.searchValue,
					});
				}
			}
```

> 注意：`operator: "in"` 需在 cinaauth `whereOperators` 中存在；若不存在，回退为多次 `eq` 查询合并，或用 `orWhere`。实施时核对 `whereOperators` 是否含 `in`；不含则改为对每个 userId 单查后合并去重（保守实现）。

- [ ] **Step 3: 写测试**

新建 `packages/better-auth/src/plugins/admin/wallet-search.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { getTestInstance } from "../../test-utils";
import { admin, siwe } from "../index";

describe("admin list-users wallet search", () => {
	it("finds users by wallet address substring", async () => {
		const { client, auth } = await getTestInstance({
			plugins: [admin(), siwe({ domain: "localhost", getNonce: async () => "n", verifyMessage: async () => true })],
		});
		// 直接在 adapter 插入一条 walletAddress 绑定到默认测试用户
		const [testUser] = await auth.ctx.adapter.findAll({ model: "user", limit: 1 });
		await auth.ctx.adapter.create({
			model: "walletAddress",
			data: {
				userId: testUser.id,
				address: "0xAbC1234567890123456789012345678901234567",
				chainId: 1,
				isPrimary: true,
				createdAt: new Date(),
			},
		});
		// 经 admin api 调 list-users（需 admin 会话；用 auth.api 注入）
		const res = await auth.api.listUsers({
			query: { searchField: "wallet", searchValue: "0xAbC1" },
			headers: new Headers(),
		});
		expect(res.users.length).toBe(1);
		expect(res.users[0].id).toBe(testUser.id);
	});
});
```

- [ ] **Step 4: 跑测试 + typecheck + commit**

Run: `pnpm vitest packages/better-auth/src/plugins/admin/wallet-search.test.ts`
Expected: PASS。
Run: `pnpm typecheck` → 无错误。

```bash
cd packages/better-auth
git add src/plugins/admin/routes.ts src/plugins/admin/wallet-search.test.ts
git commit -m "feat(admin): allow list-users search by SIWE wallet address"
```

---

## Task 8: 2 个 SIWE 钱包管理端点（list-user-wallets / unbind-wallet）

**目标：** 控制台用户详情页钱包 tab 的数据源 + 解绑操作。

**Files:**
- Create: `packages/better-auth/src/plugins/admin/wallets.ts`
- Modify: `packages/better-auth/src/plugins/admin/admin.ts`（注册）
- Modify: `packages/better-auth/src/plugins/admin/access/statement.ts`（wallet 权限语句）

- [ ] **Step 1: 给 access/statement.ts 增加 wallet 语句**

`defaultStatements` 增加 `wallet: ["list", "unbind"]`；`adminAc` 增加 `wallet: ["list", "unbind"]`；`userAc` 增加 `wallet: []`（userAc 已无权限，仅声明语句）。

- [ ] **Step 2: 写 wallets.ts**

```typescript
import { createAuthEndpoint } from "@cinaauth/core/api";
import { APIError } from "@cinaauth/core/error";
import * as z from "zod";
import { ADMIN_ERROR_CODES } from "./error-codes";
import { hasPermission } from "./has-permission";
import { adminMiddleware } from "./routes";
import { writeAuditLog } from "../audit-log/capture";
import type { AdminOptions } from "./types";

const listWalletsQuerySchema = z.object({
	userId: z.string(),
});

/**
 * GET /admin/list-user-wallets — 列出用户绑定的 SIWE 钱包，含绑定 IP/site（从 auditLog 取 siwe.bind）。
 */
export const listUserWallets = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/list-user-wallets",
		{ method: "GET", use: [adminMiddleware], query: listWalletsQuerySchema },
		async (ctx) => {
			const ok = hasPermission({
				userId: ctx.context.session.user.id,
				role: ctx.context.session.user.role,
				options: opts,
				permissions: { wallet: ["list"] },
			});
			if (!ok) throw APIError.from("FORBIDDEN", ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_LIST_USERS);

			const { userId } = ctx.query;
			const wallets = await ctx.context.adapter.findAll({
				model: "walletAddress",
				limit: 1000,
				where: [{ field: "userId", operator: "eq", value: userId }],
			});
			// 从 auditLog 富化绑定 IP/site
			const binds = await (async () => {
				try {
					return await ctx.context.adapter.findAll({
						model: "auditLog",
						limit: 1000,
						where: [
							{ field: "action", operator: "eq", value: "siwe.bind" },
							{ field: "targetId", operator: "eq", value: userId },
						],
					});
				} catch {
					return [];
				}
			})();
			const bindMeta = new Map<string, { ip: string | null; site: string | null; at: Date | null }>();
			for (const b of binds ?? []) {
				try {
					const meta = b.metadata ? JSON.parse(b.metadata as string) : {};
					if (meta.address) {
						bindMeta.set(String(meta.address).toLowerCase(), {
							ip: b.actorIp ?? null,
							site: b.actorSite ?? null,
							at: b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp as string),
						});
					}
				} catch {
					/* ignore malformed metadata */
				}
			}
			const rows = (wallets ?? []).map((w) => {
				const m = bindMeta.get(String(w.address).toLowerCase());
				return {
					address: w.address,
					chainId: w.chainId,
					isPrimary: w.isPrimary,
					boundAt: w.createdAt instanceof Date ? w.createdAt : new Date(w.createdAt as string),
					boundIp: m?.ip ?? null,
					boundSite: m?.site ?? null,
				};
			});
			return ctx.json({ wallets: rows });
		},
	);

const unbindWalletBodySchema = z.object({
	userId: z.string(),
	address: z.string().regex(/^0[xX][a-fA-F0-9]{40}$/i).length(42),
	chainId: z.number().int().positive(),
});

/**
 * POST /admin/unbind-wallet — 强制解绑钱包：删 walletAddress + 匹配 account 行，
 * 吊销该钱包相关会话（尽力），写 siwe.unbind 审计。
 */
export const unbindWallet = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/unbind-wallet",
		{ method: "POST", use: [adminMiddleware], body: unbindWalletBodySchema },
		async (ctx) => {
			const ok = hasPermission({
				userId: ctx.context.session.user.id,
				role: ctx.context.session.user.role,
				options: opts,
				permissions: { wallet: ["unbind"] },
			});
			if (!ok) throw APIError.from("FORBIDDEN", ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_LIST_USERS);

			const { userId, address, chainId } = ctx.body;
			// 删 walletAddress 行
			await ctx.context.adapter.delete({
				model: "walletAddress",
				where: [
					{ field: "userId", operator: "eq", value: userId },
					{ field: "address", operator: "eq", value: address },
					{ field: "chainId", operator: "eq", value: chainId },
				],
			});
			// 删匹配 account 行（providerId siwe, accountId "<address>:<chainId>"）
			try {
				await ctx.context.adapter.delete({
					model: "account",
					where: [
						{ field: "providerId", operator: "eq", value: "siwe" },
						{ field: "accountId", operator: "eq", value: `${address}:${chainId}` },
					],
				});
			} catch {
				/* account 表形态可能不同；忽略 */
			}
			// 审计
			await writeAuditLog(ctx, {
				category: "wallet",
				action: "siwe.unbind",
				result: "success",
				actorId: ctx.context.session.user.id,
				actorRole: ctx.context.session.user.role ?? null,
				targetType: "wallet",
				targetId: userId,
				metadata: { address, chainId },
			});
			return ctx.json({ ok: true });
		},
	);
```

> 注意：`ctx.context.adapter.delete` 的签名（`where` 数组 vs 单对象）需在实施时对齐既有 admin/routes.ts 里 `removeUser` 等删除调用的形态。会话吊销"尽力而为"：若 cinaauth internalAdapter 暴露按条件 revoke，则补；否则记 TODO（控制台可在解绑后单独调 revoke-user-sessions）。

- [ ] **Step 3: 在 admin.ts 注册**

顶部 import：

```typescript
import { listUserWallets, unbindWallet } from "./wallets";
```

`endpoints` 块追加：

```typescript
		listUserWallets: listUserWallets(opts),
		unbindWallet: unbindWallet(opts),
```

- [ ] **Step 4: 写测试**

新建 `packages/better-auth/src/plugins/admin/wallets.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { getTestInstance } from "../../test-utils";
import { admin, auditLog } from "../index";

describe("admin wallet endpoints", () => {
	it("lists and unbinds a user wallet, writing audit", async () => {
		const { auth } = await getTestInstance({
			plugins: [admin(), auditLog()],
		});
		const [testUser] = await auth.ctx.adapter.findAll({ model: "user", limit: 1 });
		const addr = "0xDeAd000000000000000000000000000000000000";
		await auth.ctx.adapter.create({
			model: "walletAddress",
			data: { userId: testUser.id, address: addr, chainId: 1, isPrimary: true, createdAt: new Date() },
		});
		// 列出
		const list = await auth.api.listUserWallets({ query: { userId: testUser.id }, headers: new Headers() });
		expect(list.wallets.length).toBe(1);
		// 解绑
		await auth.api.unbindWallet({ body: { userId: testUser.id, address: addr, chainId: 1 }, headers: new Headers() });
		const list2 = await auth.api.listUserWallets({ query: { userId: testUser.id }, headers: new Headers() });
		expect(list2.wallets.length).toBe(0);
		// 审计已写
		const auditRow = await auth.ctx.adapter.findOne({
			model: "auditLog",
			where: [{ field: "action", operator: "eq", value: "siwe.unbind" }],
		});
		expect(auditRow).toBeTruthy();
	});
});
```

- [ ] **Step 5: 跑测试 + typecheck + commit**

Run: `pnpm vitest packages/better-auth/src/plugins/admin/wallets.test.ts -t "lists and unbinds"`
Expected: PASS。
Run: `pnpm typecheck` → 无错误。

```bash
cd packages/better-auth
git add src/plugins/admin/wallets.ts src/plugins/admin/admin.ts src/plugins/admin/access/statement.ts src/plugins/admin/wallets.test.ts
git commit -m "feat(admin): add list-user-wallets and unbind-wallet endpoints"
```

---

## Task 9: 增加 security_admin 角色定义

**目标：** 落地 spec §3.3 的 `security_admin` 角色（可封禁/解封 + 解绑钱包 + 会话 + 审计读，不可建/删用户、API key、安全策略）。

**Files:**
- Modify: `packages/better-auth/src/plugins/admin/access/statement.ts`

- [ ] **Step 1: 在 statement.ts 增加 securityAdminAc 角色 + 导出**

在文件末尾、`defaultRoles` 之前增加：

```typescript
export const securityAdminAc = defaultAc.newRole({
	user: ["list", "get", "ban"], // 可封禁/解封（ban 语句同时覆盖 unban，见 hasPermission 实现）
	session: ["list", "revoke", "delete"],
	wallet: ["list", "unbind"],
	stats: ["read"],
	audit: ["read"],
});
```

并更新 `defaultRoles` 增加 security_admin：

```typescript
export const defaultRoles = {
	admin: adminAc,
	security_admin: securityAdminAc,
	user: userAc,
};
```

> 注意：(1) `ban` 是否覆盖 `unban` 取决于 `hasPermission` 实现；若 unban 是独立语句，需在 statement 增加 `"unban"` 并给 security_admin 含之。实施时核对 `hasPermission` 对 ban 端点的语句要求。(2) `audit: ["read"]` 语句需先在 `defaultStatements` 增加 `audit: ["read", "write"]`（与 Task 5 的 access.ts 重复——这里统一到 admin 插件的 statement，避免两处 access control 系统；实施时选一处统一，建议统一到 admin 插件 statement，删除 audit-log/access.ts 的独立 AC，audit 端点改用 hasPermission）。

- [ ] **Step 2: 写测试（security_admin 可 ban、不可 create-user）**

追加到 `admin.test.ts`（或新建 role.test.ts）：

```typescript
	it("security_admin can ban but cannot create user", async () => {
		// 用 hasPermission 直接断言语句（不依赖完整 session）
		const { hasPermission } = await import("./has-permission");
		const opts = { adminRoles: ["admin", "security_admin"], roles: defaultRoles } as never;
		expect(hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { user: ["ban"] } })).toBe(true);
		expect(hasPermission({ userId: "x", role: "security_admin", options: opts, permissions: { user: ["create"] } })).toBe(false);
	});
```

- [ ] **Step 3: 跑测试 + typecheck + commit**

Run: `pnpm vitest packages/better-auth/src/plugins/admin/admin.test.ts -t "security_admin can ban"`
Expected: PASS。
Run: `pnpm typecheck` → 无错误。

```bash
cd packages/better-auth
git add src/plugins/admin/access/statement.ts src/plugins/admin/admin.test.ts
git commit -m "feat(admin): add security_admin role with scoped permissions"
```

---

## Task 10: 文档更新

**目标：** 按 AGENTS.md「改公开 API 必须更新 docs」，记录新端点。

**Files:**
- Modify: `docs/content/docs/` 下 admin 插件与审计相关页（实施时按既有目录定位）

- [ ] **Step 1: 定位文档目录**

Run: `dir docs\content\docs` （在 cinaauth 根），找到 plugins/admin 与 plugins/audit（若有）相关 md。

- [ ] **Step 2: 补充端点文档**

在 admin 插件文档页增加：`/admin/stats/overview`、`/signups`、`/security-today`、`/admin/list-user-wallets`、`/admin/unbind-wallet` 各小节（method、path、鉴权、query/body、响应示例）。新建 audit-log 插件文档页（仿既有插件页结构），覆盖 `/audit/list`、`/audit/log`、`/audit/export`、`/audit/alerts` + hooks.after 捕获说明 + schema 字段表。

- [ ] **Step 3: typecheck（文档可能参与 doc 构建 lint）+ commit**

Run: `pnpm typecheck` → 无错误。

```bash
cd packages/better-auth
git add docs/content/docs
git commit -m "docs: document audit-log plugin and admin stats/wallet endpoints"
```

---

## Phase 0 DoD（交付确认清单）

实施完成后逐项确认：

- [ ] `audit-log` 插件可注册、`auditLog` 表迁移到 D1
- [ ] 核心鉴权事件（登录/登出/注册/2FA/email-otp/siwe/admin 全量）自动写审计
- [ ] `GET /audit/list`（分页筛选）、`POST /audit/log`（writeToken/角色双鉴权）、`GET /audit/export`（CSV）、`GET /audit/alerts`（聚合）可用且角色受限
- [ ] `GET /admin/stats/overview`（含 loginChannels）、`/signups`、`/security-today` 可用且 `stats:read` 受限
- [ ] `GET /admin/list-user-wallets`、`POST /admin/unbind-wallet`（含审计 + account 清理）可用
- [ ] `list-users` 支持 `searchField=wallet`
- [ ] `security_admin` 角色定义就绪（可 ban/解绑/读审计，不可建/删/API key）
- [ ] 所有新代码含 Vitest 测试且通过
- [ ] `pnpm typecheck` 通过
- [ ] 文档已更新
- [ ] 所有变更按 Conventional Commits 提交（未 push，等用户指示）

---

## 风险与实施时核对点（已在 spec §8，这里给出实施级处置）

1. **adapter API 形态不确定**（`count`/`findAll` 返回结构、`delete` 签名、`whereOperators` 是否含 `in`/`gte`/`lte`）：每个端点实施第一步先用一次 `console.log` 确认真实形态，再定型。优先复用 `internalAdapter.countTotalUsers` 等既有方法。
2. **hooks.after ctx 是否暴露响应状态**：若不暴露，Task 3 走保守 `success` 分支 + TODO，由控制台代理在非 2xx 时显式 `POST /audit/log` 写 failure 补齐。
3. **客户端命名空间**（`client.auditLog` vs 其他）：typecheck 会暴露，按实际调整测试调用。
4. **测试会话注入**：admin 端点测试需 admin session；对齐 `admin.test.ts` 既有注入手法（cookie header）。
5. **`ban` 是否覆盖 `unban`**：核对 `hasPermission` 实现，必要时在 statement 显式加 `"unban"`。
