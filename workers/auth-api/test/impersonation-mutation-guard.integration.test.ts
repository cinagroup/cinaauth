import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { ImpersonationMutationGuardSession } from "../src/impersonation-mutation-guard";
import { createImpersonationMutationGuardMiddleware } from "../src/impersonation-mutation-guard";

type TestVariables = {
	session: ImpersonationMutationGuardSession | null;
};

type TestEnv = {
	Variables: TestVariables;
};

const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"];

const makeApp = (
	session: ImpersonationMutationGuardSession | null,
	options: {
		auditFailure?: boolean;
	} = {},
) => {
	const app = new Hono<TestEnv>();
	const downstream = vi.fn();
	const writeAudit = options.auditFailure
		? vi.fn(async () => {
				throw new Error("audit unavailable");
			})
		: vi.fn(async () => undefined);
	const logEvent = vi.fn();

	app.use("*", async (c, next) => {
		c.set("session", session);
		await next();
	});
	app.use(
		"/api/auth/*",
		createImpersonationMutationGuardMiddleware<TestEnv>({
			getSession: async (c) => c.var.session,
			getAuditWriter: () => ({
				serviceKey: "test-admin-service-key",
				write: writeAudit,
			}),
			getVersion: () => ({ id: "test-version" }),
			logEvent,
		}),
	);
	app.post("/api/auth/admin/send-verification", (c) => {
		downstream(c.req.path, c.req.method);
		return c.json({ ok: true });
	});
	app.on(METHODS, "/api/auth/*", (c) => {
		downstream(c.req.path, c.req.method);
		return c.json({ ok: true });
	});

	return { app, downstream, logEvent, writeAudit };
};

const impersonatedSession = {
	user: { id: "target-user-id" },
	session: { impersonatedBy: "original-admin-id" },
} satisfies ImpersonationMutationGuardSession;

describe("impersonation mutation Hono middleware", () => {
	it("blocks a concrete Auth route registered after the middleware", async () => {
		const { app, downstream, logEvent, writeAudit } =
			makeApp(impersonatedSession);

		const response = await app.request(
			"https://auth.test/api/auth/admin/send-verification",
			{ method: "POST", headers: { "user-agent": "guard-test" } },
		);

		expect(response.status).toBe(403);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(await response.json()).toEqual({
			code: "IMPERSONATION_NOT_ALLOWED",
			message: "Account changes are unavailable while impersonating",
		});
		expect(downstream).not.toHaveBeenCalled();
		expect(writeAudit).toHaveBeenCalledOnce();
		const auditInput = writeAudit.mock.calls[0]?.[0];
		expect(auditInput?.headers.get("authorization")).toBe(
			"Bearer test-admin-service-key",
		);
		expect(auditInput?.headers.get("user-agent")).toBe("guard-test");
		expect(auditInput?.body).toMatchObject({
			targetId: "target-user-id",
			metadata: {
				actorId: "original-admin-id",
				requestMethod: "POST",
				requestPath: "/api/auth/admin/send-verification",
			},
		});
		expect(logEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				level: "warn",
				message: "cinaauth.impersonation_mutation.rejected",
			}),
		);
		expect(JSON.stringify(logEvent.mock.calls)).not.toContain(
			"test-admin-service-key",
		);
	});

	it.each([
		["anonymous", null],
		[
			"ordinary session",
			{
				user: { id: "ordinary-user-id" },
				session: { impersonatedBy: null },
			} satisfies ImpersonationMutationGuardSession,
		],
	])("preserves %s requests", async (_label, session) => {
		const { app, downstream, writeAudit } = makeApp(session);

		const response = await app.request(
			"https://auth.test/api/auth/change-password",
			{ method: "POST" },
		);

		expect(response.status).toBe(200);
		expect(downstream).toHaveBeenCalledOnce();
		expect(writeAudit).not.toHaveBeenCalled();
	});

	it.each([
		["/api/auth/admin/stop-impersonating", "POST"],
		["/api/auth/sign-out", "POST"],
		["/api/auth/oauth2/end-session", "GET"],
		["/api/auth/sso/saml2/logout/provider", "POST"],
		["/api/auth/sso/saml2/sp/slo/provider", "GET"],
		["/api/auth/sso/saml2/sp/slo/provider", "POST"],
	])("preserves the recovery route %s %s", async (pathname, method) => {
		const { app, downstream } = makeApp(impersonatedSession);

		const response = await app.request(`https://auth.test${pathname}`, {
			method,
		});

		expect(response.status).toBe(200);
		expect(downstream).toHaveBeenCalledOnce();
	});

	it.each([
		["/api/auth/token", "GET"],
		["/api/auth/token", "HEAD"],
		["/api/auth/change-password///", "POST"],
	])("blocks canonicalized state changes at %s %s", async (pathname, method) => {
		const { app, downstream } = makeApp(impersonatedSession);

		const response = await app.request(`https://auth.test${pathname}`, {
			method,
		});

		expect(response.status).toBe(403);
		expect(downstream).not.toHaveBeenCalled();
	});

	it("fails closed when the durable audit write fails", async () => {
		const { app, downstream, logEvent } = makeApp(impersonatedSession, {
			auditFailure: true,
		});

		const response = await app.request(
			"https://auth.test/api/auth/change-password",
			{ method: "POST" },
		);

		expect(response.status).toBe(403);
		expect(downstream).not.toHaveBeenCalled();
		expect(logEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				level: "error",
				message: "cinaauth.impersonation_mutation.audit_failed",
			}),
		);
		expect(JSON.stringify(logEvent.mock.calls)).not.toContain(
			"test-admin-service-key",
		);
	});

	it("registers the production guard before every concrete Auth route", () => {
		const source = readFileSync(
			new URL("../src/index.ts", import.meta.url),
			"utf8",
		);
		const guardRegistration = source.indexOf(
			"createImpersonationMutationGuardMiddleware<AppEnv>({",
		);
		const guardUseRegistration = source.lastIndexOf(
			"app.use(",
			guardRegistration,
		);
		const directAuthRouteRegistrations = [
			...source.matchAll(
				/app\.(?:use|get|post|put|patch|delete)\(\s*["']\/api\/auth/g,
			),
		].map((match) => match.index);
		const onAuthRouteRegistrations = [
			...source.matchAll(/app\.on\([\s\S]{0,500}?["']\/api\/auth/g),
		].map((match) => match.index);
		const firstAuthRouteRegistration = Math.min(
			...directAuthRouteRegistrations,
			...onAuthRouteRegistrations,
		);

		expect(guardRegistration).toBeGreaterThan(-1);
		expect(guardUseRegistration).toBeGreaterThan(-1);
		expect(firstAuthRouteRegistration).toBe(guardUseRegistration);
	});
});
