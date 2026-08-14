import {
	ADMIN_OIDC_CLIENT_ID,
	ADMIN_OIDC_CLIENT_SECRET_PREFIX,
	ADMIN_OIDC_REDIRECT_URI,
} from "@cinaauth/auth-web-contract";
import { describe, expect, it, vi } from "vitest";
import {
	ensureAdminOidcClient,
	hashOidcClientSecret,
	isAdminOidcAuthorizationRequest,
} from "../src/admin-oidc-client";

const CLIENT_SECRET_PAYLOAD =
	"cinaadmin-client-secret-with-at-least-32-characters";
const CLIENT_SECRET = `${ADMIN_OIDC_CLIENT_SECRET_PREFIX}${CLIENT_SECRET_PAYLOAD}`;
const ADMIN_ORIGIN = "https://admin.cinaseek.ai";

describe("Admin OIDC client bootstrap", () => {
	it("recognizes only authorize requests for the fixed Admin client", () => {
		const authorizeUrl = new URL(
			"https://auth.cinaseek.ai/api/auth/oauth2/authorize",
		);
		authorizeUrl.searchParams.set("client_id", ADMIN_OIDC_CLIENT_ID);

		expect(isAdminOidcAuthorizationRequest(new Request(authorizeUrl))).toBe(
			true,
		);
		expect(
			isAdminOidcAuthorizationRequest(
				new Request(authorizeUrl, { method: "POST" }),
			),
		).toBe(false);
		authorizeUrl.searchParams.set("client_id", "untrusted-client");
		expect(isAdminOidcAuthorizationRequest(new Request(authorizeUrl))).toBe(
			false,
		);
	});

	it("stores only the hash for a confidential PKCE client", async () => {
		const query = vi.fn(async (_sql: string, _values: readonly unknown[]) => ({
			rows: [],
		}));

		await ensureAdminOidcClient({ query }, CLIENT_SECRET, ADMIN_ORIGIN);

		const [sql, values] = query.mock.calls[0] ?? [];
		expect(sql).toContain('INSERT INTO "oauthClient"');
		expect(values).toContain(ADMIN_OIDC_CLIENT_ID);
		expect(values).toContain(JSON.stringify([ADMIN_OIDC_REDIRECT_URI]));
		expect(values).toContain("client_secret_basic");
		expect(values).toContain(false);
		expect(values).toContain(true);
		expect(values).not.toContain(CLIENT_SECRET);
		expect(values).toContain(await hashOidcClientSecret(CLIENT_SECRET_PAYLOAD));
	});

	it("rejects an unprefixed or weak client secret before querying", async () => {
		const query = vi.fn(async () => ({ rows: [] }));

		await expect(
			ensureAdminOidcClient({ query }, CLIENT_SECRET_PAYLOAD, ADMIN_ORIGIN),
		).rejects.toThrow(new RegExp(ADMIN_OIDC_CLIENT_SECRET_PREFIX, "i"));
		await expect(
			ensureAdminOidcClient(
				{ query },
				`${ADMIN_OIDC_CLIENT_SECRET_PREFIX}short`,
				ADMIN_ORIGIN,
			),
		).rejects.toThrow(/at least 32/i);
		expect(query).not.toHaveBeenCalled();
	});

	it("derives the registered redirect URIs from the configured Admin origin", async () => {
		const query = vi.fn(async () => ({ rows: [] }));
		const stagingOrigin = "https://admin-siwe-staging.cinaseek.ai";

		await ensureAdminOidcClient({ query }, CLIENT_SECRET, stagingOrigin);

		const values = query.mock.calls[0]?.[1] ?? [];
		expect(values).toContain(
			JSON.stringify([`${stagingOrigin}/api/auth/oidc/callback`]),
		);
		expect(values).toContain(JSON.stringify([`${stagingOrigin}/login`]));
		expect(values).not.toContain(JSON.stringify([ADMIN_OIDC_REDIRECT_URI]));
	});
});
