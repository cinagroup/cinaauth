import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getCloudflareContext: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
	getCloudflareContext: mocks.getCloudflareContext,
}));

const STAGING_AUTH_ORIGIN = "https://auth.siwe-staging.cinaseek.ai";
const STAGING_ACCOUNT_ORIGIN = "https://accounts.siwe-staging.cinaseek.ai";

const loadAuth = async () => {
	vi.resetModules();
	return import("./auth");
};

const request = () =>
	new Request(`${STAGING_ACCOUNT_ORIGIN}/api/auth/get-session`, {
		headers: { cookie: "cinaauth.session_token=signed" },
	});

describe("Account Auth Worker transport policy", () => {
	beforeEach(() => {
		mocks.getCloudflareContext.mockReset();
		vi.stubEnv("CINAAUTH_URL", STAGING_AUTH_ORIGIN);
		vi.stubEnv("CINAAUTH_REQUIRE_AUTH_WORKER_BINDING", "true");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("returns a no-store 503 without public fallback when the binding is missing", async () => {
		mocks.getCloudflareContext.mockResolvedValue({ env: {} });
		const publicFetch = vi.fn(async () => Response.json({ unexpected: true }));
		vi.stubGlobal("fetch", publicFetch);
		const { forwardAuthRequest } = await loadAuth();

		const response = await forwardAuthRequest(request());

		expect(response.status).toBe(503);
		expect(response.headers.get("cache-control")).toBe("no-store");
		await expect(response.json()).resolves.toEqual({
			code: "AUTH_SERVICE_UNAVAILABLE",
			message: "Authentication service is temporarily unavailable.",
		});
		expect(publicFetch).not.toHaveBeenCalled();
	});

	it("returns 503 when Cloudflare context resolution fails in required mode", async () => {
		mocks.getCloudflareContext.mockRejectedValue(
			new Error("Cloudflare context unavailable"),
		);
		const publicFetch = vi.fn(async () => Response.json({ unexpected: true }));
		vi.stubGlobal("fetch", publicFetch);
		const { forwardAuthRequest } = await loadAuth();

		const response = await forwardAuthRequest(request());

		expect(response.status).toBe(503);
		expect(publicFetch).not.toHaveBeenCalled();
	});

	it("treats malformed binding policy values as fail-closed", async () => {
		vi.stubEnv("CINAAUTH_REQUIRE_AUTH_WORKER_BINDING", "TRUE");
		mocks.getCloudflareContext.mockResolvedValue({ env: {} });
		const publicFetch = vi.fn(async () => Response.json({ unexpected: true }));
		vi.stubGlobal("fetch", publicFetch);
		const { forwardAuthRequest } = await loadAuth();

		const response = await forwardAuthRequest(request());

		expect(response.status).toBe(503);
		expect(publicFetch).not.toHaveBeenCalled();
	});

	it("allows the public transport only for an exact false local policy", async () => {
		vi.stubEnv("CINAAUTH_REQUIRE_AUTH_WORKER_BINDING", "false");
		mocks.getCloudflareContext.mockRejectedValue(
			new Error("Wrangler is not running"),
		);
		const publicFetch = vi.fn(
			async (_request: Request) => new Response(null, { status: 204 }),
		);
		vi.stubGlobal("fetch", publicFetch);
		const { forwardAuthRequest } = await loadAuth();

		const response = await forwardAuthRequest(request());

		expect(response.status).toBe(204);
		expect(publicFetch).toHaveBeenCalledOnce();
		const proxied = publicFetch.mock.calls[0]?.[0];
		expect(proxied).toBeInstanceOf(Request);
		expect(proxied?.url).toBe(`${STAGING_AUTH_ORIGIN}/api/auth/get-session`);
	});

	it("uses a configured binding without touching the public transport", async () => {
		const bindingFetch = vi.fn(async () => Response.json(null));
		mocks.getCloudflareContext.mockResolvedValue({
			env: { AUTH_WORKER: { fetch: bindingFetch } },
		});
		const publicFetch = vi.fn(async () => Response.json({ unexpected: true }));
		vi.stubGlobal("fetch", publicFetch);
		const { forwardAuthRequest } = await loadAuth();

		const response = await forwardAuthRequest(request());

		expect(response.status).toBe(200);
		expect(bindingFetch).toHaveBeenCalledOnce();
		expect(publicFetch).not.toHaveBeenCalled();
	});

	it("uses the binding for server-owned upstream probes", async () => {
		const bindingFetch = vi.fn(async (_request: Request) =>
			Response.json({ keys: [] }),
		);
		mocks.getCloudflareContext.mockResolvedValue({
			env: { AUTH_WORKER: { fetch: bindingFetch } },
		});
		const publicFetch = vi.fn(async () => Response.json({ unexpected: true }));
		vi.stubGlobal("fetch", publicFetch);
		const { fetchAuthServiceRequest } = await loadAuth();

		const response = await fetchAuthServiceRequest("/api/auth/jwks", {
			headers: { Accept: "application/json" },
		});

		expect(response.status).toBe(200);
		expect(bindingFetch).toHaveBeenCalledOnce();
		const upstream = bindingFetch.mock.calls[0]?.[0];
		expect(upstream).toBeInstanceOf(Request);
		expect(upstream?.url).toBe(`${STAGING_AUTH_ORIGIN}/api/auth/jwks`);
		expect(publicFetch).not.toHaveBeenCalled();
	});

	it("rejects a cross-origin server probe before resolving the binding", async () => {
		const bindingFetch = vi.fn(async () => Response.json({ unexpected: true }));
		mocks.getCloudflareContext.mockResolvedValue({
			env: { AUTH_WORKER: { fetch: bindingFetch } },
		});
		const publicFetch = vi.fn(async () => Response.json({ unexpected: true }));
		vi.stubGlobal("fetch", publicFetch);
		const { fetchAuthServiceRequest } = await loadAuth();

		const response = await fetchAuthServiceRequest("//attacker.example/jwks");

		expect(response.status).toBe(503);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(bindingFetch).not.toHaveBeenCalled();
		expect(publicFetch).not.toHaveBeenCalled();
	});

	it("never retries a failing binding through the public transport", async () => {
		const bindingFailure = new Error("Auth Worker invocation failed");
		const bindingFetch = vi.fn(async () => {
			throw bindingFailure;
		});
		mocks.getCloudflareContext.mockResolvedValue({
			env: { AUTH_WORKER: { fetch: bindingFetch } },
		});
		const publicFetch = vi.fn(async () => Response.json({ unexpected: true }));
		vi.stubGlobal("fetch", publicFetch);
		const { forwardAuthRequest } = await loadAuth();

		await expect(forwardAuthRequest(request())).rejects.toBe(bindingFailure);
		expect(bindingFetch).toHaveBeenCalledOnce();
		expect(publicFetch).not.toHaveBeenCalled();
	});

	it("fails closed before a binding call when the required Auth URL is missing", async () => {
		vi.stubEnv("CINAAUTH_URL", undefined);
		const bindingFetch = vi.fn(async () => Response.json(null));
		mocks.getCloudflareContext.mockResolvedValue({
			env: { AUTH_WORKER: { fetch: bindingFetch } },
		});
		const publicFetch = vi.fn(async () => Response.json({ unexpected: true }));
		vi.stubGlobal("fetch", publicFetch);
		const { forwardAuthRequest } = await loadAuth();

		const response = await forwardAuthRequest(request());

		expect(response.status).toBe(503);
		expect(bindingFetch).not.toHaveBeenCalled();
		expect(publicFetch).not.toHaveBeenCalled();
	});

	it("fails closed before a binding call when the required Auth URL is invalid", async () => {
		vi.stubEnv("CINAAUTH_URL", "https://auth.example.com/untrusted-path");
		const bindingFetch = vi.fn(async () => Response.json(null));
		mocks.getCloudflareContext.mockResolvedValue({
			env: { AUTH_WORKER: { fetch: bindingFetch } },
		});
		const publicFetch = vi.fn(async () => Response.json({ unexpected: true }));
		vi.stubGlobal("fetch", publicFetch);
		const { forwardAuthRequest } = await loadAuth();

		const response = await forwardAuthRequest(request());

		expect(response.status).toBe(503);
		expect(bindingFetch).not.toHaveBeenCalled();
		expect(publicFetch).not.toHaveBeenCalled();
	});

	it("propagates the fail-closed 503 through the server facade", async () => {
		mocks.getCloudflareContext.mockResolvedValue({ env: {} });
		const publicFetch = vi.fn(async () => Response.json(null));
		vi.stubGlobal("fetch", publicFetch);
		const { auth } = await loadAuth();

		await expect(auth.api.getSession()).rejects.toThrow(
			"CinaSeek request failed with HTTP 503",
		);
		expect(publicFetch).not.toHaveBeenCalled();
	});
});
