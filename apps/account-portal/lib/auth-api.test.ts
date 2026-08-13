import { describe, expect, it, vi } from "vitest";
import {
	createAuthProxyRequest,
	createAuthProxyResponse,
	createServerAuthApi,
	resolveAuthClientBaseURL,
	shouldSkipOAuthProxy,
} from "./auth-api";

const jsonResponse = (value: unknown, status = 200) =>
	new Response(JSON.stringify(value), {
		status,
		headers: { "Content-Type": "application/json" },
	});

describe("server auth API", () => {
	it("keeps Generic OAuth state and callback cookies on the account origin", () => {
		expect(shouldSkipOAuthProxy("/api/auth/sign-in/oauth2")).toBe(true);
		expect(
			shouldSkipOAuthProxy("/api/auth/oauth2/callback/enterprise-idp"),
		).toBe(true);
		expect(shouldSkipOAuthProxy("/api/auth/sign-in/social")).toBe(false);

		const signIn = createAuthProxyRequest(
			new Request("https://accounts.cinaseek.ai/api/auth/sign-in/oauth2"),
		);
		expect(signIn.url).toBe("https://auth.cinaseek.ai/api/auth/sign-in/oauth2");
		expect(signIn.headers.get("x-skip-oauth-proxy")).toBe("1");

		const callback = createAuthProxyRequest(
			new Request(
				"https://accounts.cinaseek.ai/api/auth/oauth2/callback/enterprise-idp?code=code&state=state",
			),
		);
		expect(callback.headers.get("x-skip-oauth-proxy")).toBe("1");
		expect(callback.url).toContain(
			"https://auth.cinaseek.ai/api/auth/oauth2/callback/enterprise-idp",
		);
	});

	it("keeps browser authentication on the relying-party origin", () => {
		expect(
			resolveAuthClientBaseURL(
				"https://accounts.cinaseek.ai",
				"https://auth.cinaseek.ai",
			),
		).toBe("https://accounts.cinaseek.ai");
		expect(resolveAuthClientBaseURL(undefined, "https://auth.internal")).toBe(
			"https://auth.internal",
		);
	});

	it("forwards session cookies through the auth Worker binding", async () => {
		const fetch = vi.fn(async (request: Request) =>
			jsonResponse({
				user: { id: "user-1", email: "user@cinaseek.ai", name: "User" },
				session: { id: "session-1", userId: "user-1" },
			}),
		);
		const api = createServerAuthApi({ fetch });

		const session = await api.getSession({
			headers: new Headers({ cookie: "cinaauth.session_token=signed" }),
		});

		expect(session?.user.id).toBe("user-1");
		const request = fetch.mock.calls[0]?.[0];
		expect(request).toBeInstanceOf(Request);
		expect(request?.url).toBe("https://auth.cinaseek.ai/api/auth/get-session");
		expect(request?.headers.get("cookie")).toBe(
			"cinaauth.session_token=signed",
		);
	});

	it("uses the production endpoint contract for server-rendered pages", async () => {
		const fetch = vi.fn(async (request: Request) => {
			const path = new URL(request.url).pathname;
			if (path.endsWith("/capabilities")) {
				return jsonResponse({ version: 3, billing: false });
			}
			if (path.endsWith("/entitlements")) {
				return jsonResponse({ version: 1, mode: "unmetered" });
			}
			if (path.endsWith("/list-sessions")) return jsonResponse([]);
			if (path.endsWith("/list-accounts")) return jsonResponse([]);
			if (path.endsWith("/list-user-passkeys")) return jsonResponse([]);
			if (path.endsWith("/api-key/list")) {
				return jsonResponse({ apiKeys: [], total: 0, limit: 100, offset: 0 });
			}
			if (path.endsWith("/list-device-sessions")) return jsonResponse([]);
			if (path.endsWith("/organization/list")) return jsonResponse([]);
			return jsonResponse(null);
		});
		const api = createServerAuthApi({ fetch });

		await api.getCapabilities();
		await api.getEntitlements();
		await api.listSessions();
		await api.listUserAccounts();
		await api.listPasskeys();
		await api.listApiKeys();
		await api.listDeviceSessions();
		await api.listOrganizations();
		await api.listOAuthClients();
		await api.listOAuthConsents();

		expect(
			fetch.mock.calls.map(([request]) => new URL(request.url).pathname),
		).toEqual([
			"/api/auth/capabilities",
			"/api/auth/entitlements",
			"/api/auth/list-sessions",
			"/api/auth/list-accounts",
			"/api/auth/passkey/list-user-passkeys",
			"/api/auth/api-key/list",
			"/api/auth/multi-session/list-device-sessions",
			"/api/auth/organization/list",
			"/api/auth/oauth2/get-clients",
			"/api/auth/oauth2/get-consents",
		]);
	});

	it("serializes OAuth client queries and rejects upstream errors", async () => {
		const okFetch = vi.fn(async (_request: Request) =>
			jsonResponse({ client_id: "client-1", client_name: "Cina App" }),
		);
		const api = createServerAuthApi({ fetch: okFetch });

		await api.getOAuthClientPublic({
			query: { client_id: "client-1" },
		});

		expect(okFetch.mock.calls[0]?.[0].url).toBe(
			"https://auth.cinaseek.ai/api/auth/oauth2/public-client?client_id=client-1",
		);

		const failedApi = createServerAuthApi({
			fetch: async () => jsonResponse({ error: "Forbidden" }, 403),
		});
		await expect(failedApi.listSessions()).rejects.toThrow(
			"CinaSeek request failed with HTTP 403",
		);
	});

	it("scopes server-rendered organization audit requests to one tenant", async () => {
		const fetch = vi.fn(async (_request: Request) =>
			jsonResponse({ rows: [], total: 0, limit: 20, offset: 0 }),
		);
		const api = createServerAuthApi({ fetch });

		await api.listOrganizationAudit("organization-1", {
			headers: new Headers({ cookie: "cinaauth.session_token=signed" }),
			query: { limit: 20 },
		});

		const request = fetch.mock.calls[0]?.[0];
		expect(request?.url).toBe(
			"https://auth.cinaseek.ai/api/auth/audit/organization?limit=20&organizationId=organization-1",
		);
		expect(request?.headers.get("cookie")).toBe(
			"cinaauth.session_token=signed",
		);
	});

	it("loads enterprise identity inventories through the Worker binding", async () => {
		const fetch = vi.fn(async (request: Request) => {
			const path = new URL(request.url).pathname;
			if (path.endsWith("/sso/providers")) {
				return jsonResponse({ providers: [] });
			}
			return jsonResponse({ providers: [] });
		});
		const api = createServerAuthApi({ fetch });

		await api.listSSOProviders();
		await api.listSCIMProviderConnections();

		expect(
			fetch.mock.calls.map(([request]) => new URL(request.url).pathname),
		).toEqual([
			"/api/auth/sso/providers",
			"/api/auth/scim/list-provider-connections",
		]);
	});

	it("builds a same-contract proxy request for the Service Binding", async () => {
		const incoming = new Request(
			"https://accounts.cinaseek.ai/api/auth/sign-in/email?callbackURL=%2Fdashboard",
			{
				method: "POST",
				headers: {
					cookie: "cinaauth.session_token=signed",
					"content-type": "application/json",
					host: "accounts.cinaseek.ai",
					origin: "https://accounts.cinaseek.ai",
				},
				body: JSON.stringify({ email: "user@cinaseek.ai" }),
			},
		);

		const proxied = createAuthProxyRequest(incoming);

		expect(proxied.url).toBe(
			"https://auth.cinaseek.ai/api/auth/sign-in/email?callbackURL=%2Fdashboard",
		);
		expect(proxied.method).toBe("POST");
		expect(proxied.headers.get("host")).toBeNull();
		expect(proxied.headers.get("cookie")).toBe("cinaauth.session_token=signed");
		expect(proxied.headers.get("origin")).toBe("https://accounts.cinaseek.ai");
		expect(await proxied.json()).toEqual({ email: "user@cinaseek.ai" });
	});

	it("preserves every Set-Cookie header returned by sign-in", async () => {
		const upstreamHeaders = new Headers({
			"Content-Type": "application/json",
		});
		upstreamHeaders.append(
			"Set-Cookie",
			"cinaauth.session_token=signed; Path=/; HttpOnly; Secure; SameSite=Lax",
		);
		upstreamHeaders.append(
			"Set-Cookie",
			"cinaauth.session_data=cached; Path=/; Max-Age=300; HttpOnly; Secure; SameSite=Lax",
		);
		const upstream = new Response('{"token":"signed"}', {
			status: 200,
			headers: upstreamHeaders,
		});

		const proxied = createAuthProxyResponse(upstream);

		expect(proxied.headers.getSetCookie()).toEqual([
			"cinaauth.session_token=signed; Path=/; HttpOnly; Secure; SameSite=Lax",
			"cinaauth.session_data=cached; Path=/; Max-Age=300; HttpOnly; Secure; SameSite=Lax",
		]);
		expect(proxied.headers.get("cache-control")).toBe("no-store");
		expect(await proxied.json()).toEqual({ token: "signed" });
	});
});
