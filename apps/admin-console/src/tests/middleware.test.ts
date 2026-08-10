import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

beforeEach(() => {
	vi.stubEnv("CINAUTH_BASE_URL", "https://auth.test");
	vi.stubEnv("CINAUTH_AUTH_URL", "https://auth-frontend.test");
});

const SESSION_COOKIE = "__Secure-cinaauth.session_token";

/**
 * Build a NextRequest with an optional session cookie. The middleware now does
 * a cookie-presence check (no network call to cinaauth) so role enforcement is
 * tested via the Route Handlers / Server Components, not here.
 */
function buildRequest(pathname: string, withSession: boolean): NextRequest {
	const headers: Record<string, string> = {};
	if (withSession) headers.cookie = `${SESSION_COOKIE}=test-token`;
	return new NextRequest(new URL(`https://admin.test${pathname}`), { headers });
}

async function runMiddleware(pathname: string, withSession: boolean): Promise<Response> {
	vi.resetModules();
	const mod = await import("@/middleware");
	const middleware = (mod as { middleware: (req: NextRequest) => Promise<Response> }).middleware;
	return middleware(buildRequest(pathname, withSession));
}

describe("middleware access control", () => {
	it("redirects to cinaauth sign-in when no session cookie", async () => {
		const res = await runMiddleware("/users", false);
		expect(res.status).toBeGreaterThanOrEqual(300);
		const loc = res.headers.get("location") ?? "";
		// Must redirect to the embedded /login page (not demo-auth).
		expect(loc).toContain("/login");
		expect(loc).toContain("callbackURL=");
	});

	it("allows through when session cookie present", async () => {
		const res = await runMiddleware("/users", true);
		expect(res.status).toBe(200);
	});

	it("allows through on audit page with session", async () => {
		const res = await runMiddleware("/audit", true);
		expect(res.status).toBe(200);
	});

	it("returns 401 JSON for api paths when no session", async () => {
		const res = await runMiddleware("/api/admin/session", false);
		expect(res.status).toBe(401);
		const body = (await res.json()) as { ok: boolean };
		expect(body.ok).toBe(false);
	});

	it("passes through api paths with session", async () => {
		const res = await runMiddleware("/api/admin/session", true);
		expect(res.status).toBe(200);
	});

	it("passes through public paths without a session cookie", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch");
		const res = await runMiddleware("/sign-in", false);
		expect(res.status).toBe(200);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("does not call cinaauth on navigation (cookie-only check)", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch");
		await runMiddleware("/dashboard", true);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
