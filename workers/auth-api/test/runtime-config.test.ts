import { ADMIN_OIDC_CLIENT_SECRET_PREFIX } from "@cinaauth/auth-web-contract";
import { describe, expect, it, vi } from "vitest";
import type { DeliveryMessage } from "../src/delivery";
import type { CloudflareBindings } from "../src/env";
import worker, {
	canReadAdminRateLimitConfig,
	getConfiguredAccountProviderIds,
	getCutoverState,
	getFreshSessionMutationRejection,
	getMigrationFeatureSelection,
	getRuntimeConfigIssues,
	getVersionMetadata,
	hasDatabaseInvariantTables,
	isAuthorizedMigrationRequest,
	isFreshSecuritySession,
	requiresFreshSessionForMutation,
	secureEqual,
} from "../src/index";
import { roles } from "../src/plugins";
import type { PrivacyExportMessage } from "../src/privacy-export";

const strong = (prefix: string) => `${prefix}-${"x".repeat(40)}`;

const makeEnv = (
	overrides: Partial<CloudflareBindings> = {},
): CloudflareBindings =>
	({
		CINAAUTH_SECRET: strong("auth"),
		CINAADMIN_OIDC_CLIENT_SECRET: `${ADMIN_OIDC_CLIENT_SECRET_PREFIX}${strong("admin-client")}`,
		CINAADMIN_OIDC_BRIDGE_SECRET: strong("admin-bridge"),
		CINAAUTH_MIGRATION_TOKEN: strong("migration"),
		CINAAUTH_DELIVERY_WEBHOOK_URL: "https://delivery.example.com/cinaauth",
		CINAAUTH_DELIVERY_WEBHOOK_SECRET: strong("delivery"),
		CINAAUTH_URL: "https://auth.cinaseek.ai",
		HYPERDRIVE: {
			connectionString: "postgres://hyperdrive.local/cinaauth",
		} as Hyperdrive,
		LEGACY_D1: {
			prepare: () => undefined,
		} as unknown as D1Database,
		CINAAUTH_CUTOVER_STATE: "live",
		CINAAUTH_DELIVERY_QUEUE: {
			send: async () => undefined,
		} as unknown as Queue<DeliveryMessage>,
		CINAAUTH_DELIVERY_SERVICE: {
			fetch: async () => Response.json({ success: true }),
		},
		CINAAUTH_ERASURE_SERVICE: {
			fetch: async () => Response.json({ success: true }),
		},
		CINAAUTH_PRIVACY_EXPORT_QUEUE: {
			send: async () => undefined,
		} as unknown as Queue<PrivacyExportMessage>,
		CINAAUTH_PRIVACY_EXPORTS: {
			put: async () => undefined,
			get: async () => undefined,
		} as unknown as R2Bucket,
		CINAAUTH_PRIVACY_EXPORT_KEY: strong("privacy-export"),
		CINAAUTH_ERASURE_WEBHOOK_URL:
			"https://privacy-controller.example.com/erase",
		CINAAUTH_ERASURE_WEBHOOK_SECRET: strong("privacy-erasure"),
		VERSION_METADATA: {
			id: "worker-version-id",
			tag: "worker-version-tag",
			timestamp: "2026-07-14T00:00:00.000Z",
		} as WorkerVersionMetadata,
		...overrides,
	}) as CloudflareBindings;

describe("runtime config guardrails", () => {
	it("does not inspect security invariants against a partial auth schema", () => {
		expect(hasDatabaseInvariantTables(["user", "account", "ssoProvider"])).toBe(
			false,
		);
		expect(
			hasDatabaseInvariantTables([
				"user",
				"account",
				"ssoProvider",
				"scimProvider",
			]),
		).toBe(true);
	});

	it("feeds fixed social and configured Generic OAuth ids into database invariants", () => {
		const generic = {
			providerId: "enterprise-idp",
			clientId: "client-id",
			pkce: true,
			discoveryUrl: "https://idp.example.com/.well-known/openid-configuration",
			redirectURI:
				"https://accounts.cinaseek.ai/api/auth/oauth2/callback/enterprise-idp",
		};
		expect(
			getConfiguredAccountProviderIds(
				makeEnv({ GENERIC_OAUTH_CONFIG: JSON.stringify([generic]) }),
			),
		).toEqual(["google", "github", "enterprise-idp"]);
	});

	it("maps target-user passkey permissions to production Admin roles", () => {
		expect(
			roles.super_admin.authorize({
				passkey: ["list", "revoke", "update"],
			}).success,
		).toBe(true);
		expect(
			roles.security_admin.authorize({ passkey: ["list", "revoke"] }).success,
		).toBe(true);
		expect(
			roles.security_admin.authorize({ passkey: ["update"] }).success,
		).toBe(false);
	});

	it("allows both active Admin roles to read rate-limit posture", () => {
		expect(canReadAdminRateLimitConfig("super_admin")).toBe(true);
		expect(canReadAdminRateLimitConfig("security_admin")).toBe(true);
		expect(canReadAdminRateLimitConfig("user")).toBe(false);
		expect(canReadAdminRateLimitConfig(undefined)).toBe(false);
	});

	it("accepts a complete production runtime configuration", () => {
		expect(getRuntimeConfigIssues(makeEnv())).toEqual([]);
	});

	it("reports each required production input without exposing secret values", () => {
		const issues = getRuntimeConfigIssues(
			makeEnv({
				CINAAUTH_SECRET: "",
				CINAADMIN_OIDC_CLIENT_SECRET: "",
				CINAADMIN_OIDC_BRIDGE_SECRET: "",
				HYPERDRIVE: undefined as unknown as Hyperdrive,
				LEGACY_D1: undefined as unknown as D1Database,
				VERSION_METADATA: undefined as unknown as WorkerVersionMetadata,
				CINAAUTH_MIGRATION_TOKEN: "",
				CINAAUTH_DELIVERY_QUEUE: undefined as unknown as Queue<DeliveryMessage>,
				CINAAUTH_DELIVERY_SERVICE: undefined as unknown as Fetcher,
				CINAAUTH_ERASURE_SERVICE: undefined as unknown as Fetcher,
				CINAAUTH_PRIVACY_EXPORT_QUEUE:
					undefined as unknown as Queue<PrivacyExportMessage>,
				CINAAUTH_PRIVACY_EXPORTS: undefined as unknown as R2Bucket,
				CINAAUTH_PRIVACY_EXPORT_KEY: "",
				CINAAUTH_ERASURE_WEBHOOK_URL: "http://privacy.example.com",
				CINAAUTH_ERASURE_WEBHOOK_SECRET: "",
				CINAAUTH_DELIVERY_WEBHOOK_URL: "http://delivery.example.com",
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: "",
				CINAAUTH_CUTOVER_STATE: undefined,
				CINAAUTH_URL: "http://auth.cinaseek.ai",
			}),
		);

		expect(issues).toEqual([
			"missing_cinaauth_secret",
			"missing_cinaadmin_oidc_client_secret",
			"missing_cinaadmin_oidc_bridge_secret",
			"missing_hyperdrive_binding",
			"missing_legacy_d1_binding",
			"missing_version_metadata",
			"missing_cinaauth_migration_token",
			"missing_delivery_queue",
			"missing_delivery_service",
			"missing_erasure_service",
			"invalid_delivery_webhook_url",
			"missing_delivery_webhook_secret",
			"missing_privacy_export_queue",
			"missing_privacy_export_bucket",
			"missing_privacy_export_key",
			"invalid_erasure_webhook_url",
			"missing_erasure_webhook_secret",
			"invalid_cinaauth_cutover_state",
			"invalid_cinaauth_url",
		]);
		expect(JSON.stringify(issues)).not.toContain("delivery.example.com");
	});

	it("marks weak operational secrets before deploy", () => {
		expect(
			getRuntimeConfigIssues(
				makeEnv({
					CINAAUTH_SECRET: "short",
					CINAADMIN_OIDC_CLIENT_SECRET: "short",
					CINAADMIN_OIDC_BRIDGE_SECRET: "short",
					CINAAUTH_MIGRATION_TOKEN: "short",
					CINAAUTH_DELIVERY_WEBHOOK_SECRET: "short",
					CINAAUTH_PRIVACY_EXPORT_KEY: "short",
					CINAAUTH_ERASURE_WEBHOOK_SECRET: "short",
				}),
			),
		).toEqual([
			"weak_cinaauth_secret",
			"weak_cinaadmin_oidc_client_secret",
			"weak_cinaadmin_oidc_bridge_secret",
			"weak_cinaauth_migration_token",
			"weak_delivery_webhook_secret",
			"weak_privacy_export_key",
			"weak_erasure_webhook_secret",
		]);
	});

	it("rejects an unprefixed Admin OIDC client secret", () => {
		expect(
			getRuntimeConfigIssues(
				makeEnv({
					CINAADMIN_OIDC_CLIENT_SECRET: strong("admin-client"),
				}),
			),
		).toContain("weak_cinaadmin_oidc_client_secret");
	});

	it("rejects a partially configured erasure processor", () => {
		expect(
			getRuntimeConfigIssues(
				makeEnv({ CINAAUTH_ERASURE_WEBHOOK_SECRET: undefined }),
			),
		).toContain("missing_erasure_webhook_secret");
	});

	it("extracts version metadata for readiness and structured logs", () => {
		expect(getVersionMetadata(makeEnv())).toEqual({
			id: "worker-version-id",
			tag: "worker-version-tag",
			timestamp: "2026-07-14T00:00:00.000Z",
		});
		expect(
			getVersionMetadata(
				makeEnv({
					VERSION_METADATA: undefined as unknown as WorkerVersionMetadata,
				}),
			),
		).toEqual({
			id: null,
			tag: null,
			timestamp: null,
		});
	});

	it("fails closed to maintenance unless the cutover state is live", () => {
		expect(getCutoverState(makeEnv())).toBe("live");
		expect(
			getCutoverState(makeEnv({ CINAAUTH_CUTOVER_STATE: "maintenance" })),
		).toBe("maintenance");
		expect(
			getCutoverState(makeEnv({ CINAAUTH_CUTOVER_STATE: undefined })),
		).toBe("maintenance");
	});
});

describe("SCIM ownership migration route boundary", () => {
	it("rejects requests without the migration credential and disables caching", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		try {
			const response = await worker.fetch(
				new Request(
					"https://auth.cinaseek.ai/api/migrate/scim-provider-ownership",
					{
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							providerId: "legacy-scim",
							organizationId: "org-1",
							ownerUserId: "owner-1",
						}),
					},
				),
				makeEnv(),
				{} as ExecutionContext,
			);

			expect(response.status).toBe(403);
			expect(response.headers.get("cache-control")).toBe("no-store");
			expect(await response.json()).toEqual({ error: "Forbidden" });
			expect(JSON.stringify(warn.mock.calls)).not.toContain("migration-");
		} finally {
			warn.mockRestore();
		}
	});

	it("rejects invalid input before opening Hyperdrive", async () => {
		const env = makeEnv();
		const response = await worker.fetch(
			new Request(
				"https://auth.cinaseek.ai/api/migrate/scim-provider-ownership",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${env.CINAAUTH_MIGRATION_TOKEN}`,
						"content-type": "application/json",
					},
					body: JSON.stringify({ providerId: "legacy-scim" }),
				},
			),
			env,
			{} as ExecutionContext,
		);

		expect(response.status).toBe(400);
		expect(response.headers.get("cache-control")).toBe("no-store");
	});

	it("rejects a configured social provider id before opening Hyperdrive", async () => {
		const env = makeEnv({
			GOOGLE_CLIENT_ID: "configured-google-client",
			GOOGLE_CLIENT_SECRET: "configured-google-secret",
		});
		const response = await worker.fetch(
			new Request(
				"https://auth.cinaseek.ai/api/migrate/scim-provider-ownership",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${env.CINAAUTH_MIGRATION_TOKEN}`,
						"content-type": "application/json",
					},
					body: JSON.stringify({
						providerId: "google",
						organizationId: "org-1",
						ownerUserId: "owner-1",
						apply: true,
					}),
				},
			),
			env,
			{} as ExecutionContext,
		);

		expect(response.status).toBe(400);
		expect(response.headers.get("cache-control")).toBe("no-store");
	});
});

describe("migration authorization", () => {
	it("accepts only the explicit advanced-organization migration feature", () => {
		expect(
			getMigrationFeatureSelection(
				new URL("https://auth.cinaseek.ai/api/migrate"),
			),
		).toEqual({ feature: undefined });
		expect(
			getMigrationFeatureSelection(
				new URL(
					"https://auth.cinaseek.ai/api/migrate?feature=organization-advanced",
				),
			),
		).toEqual({ feature: "organization-advanced" });
		expect(
			getMigrationFeatureSelection(
				new URL("https://auth.cinaseek.ai/api/migrate?feature=unknown"),
			),
		).toEqual({ error: "invalid_migration_feature" });
		expect(
			getMigrationFeatureSelection(
				new URL(
					"https://auth.cinaseek.ai/api/migrate?feature=organization-advanced&feature=organization-advanced",
				),
			),
		).toEqual({ error: "invalid_migration_feature" });
	});

	it("accepts bearer and explicit migration-token headers", async () => {
		const env = makeEnv();

		await expect(
			isAuthorizedMigrationRequest(
				new Headers({
					Authorization: `Bearer ${env.CINAAUTH_MIGRATION_TOKEN}`,
				}),
				env,
			),
		).resolves.toBe(true);
		await expect(
			isAuthorizedMigrationRequest(
				new Headers({
					"x-cinaauth-migration-token": env.CINAAUTH_MIGRATION_TOKEN!,
				}),
				env,
			),
		).resolves.toBe(true);
	});

	it("does not fall back to the admin service key", async () => {
		const env = makeEnv({
			CINAUTH_ADMIN_SERVICE_KEY: strong("admin"),
		});

		await expect(
			isAuthorizedMigrationRequest(
				new Headers({
					Authorization: `Bearer ${env.CINAUTH_ADMIN_SERVICE_KEY}`,
				}),
				env,
			),
		).resolves.toBe(false);
	});

	it("accepts the ephemeral D1 cutover token without replacing the permanent token", async () => {
		const env = makeEnv({
			CINAAUTH_D1_MIGRATION_TOKEN: strong("d1-cutover"),
		});

		await expect(
			isAuthorizedMigrationRequest(
				new Headers({
					Authorization: `Bearer ${env.CINAAUTH_D1_MIGRATION_TOKEN}`,
				}),
				env,
			),
		).resolves.toBe(true);
	});

	it("compares migration tokens by hash instead of direct string equality", async () => {
		await expect(secureEqual("same-token", "same-token")).resolves.toBe(true);
		await expect(secureEqual("same-token", "different-token")).resolves.toBe(
			false,
		);
		await expect(secureEqual(undefined, "same-token")).resolves.toBe(false);
	});
});

describe("sensitive self-service session policy", () => {
	it("accepts only non-future sessions inside the 15-minute window", () => {
		const now = Date.parse("2026-08-09T12:15:00.000Z");
		expect(isFreshSecuritySession("2026-08-09T12:01:00.000Z", now)).toBe(true);
		expect(isFreshSecuritySession("2026-08-09T12:00:00.000Z", now)).toBe(false);
		expect(isFreshSecuritySession("2026-08-09T12:16:00.000Z", now)).toBe(false);
	});

	it("guards API key, organization, enterprise identity, OAuth client, consent, and billing mutations", () => {
		for (const pathname of [
			"/api/auth/api-key/create",
			"/api/auth/api-key/update",
			"/api/auth/api-key/delete",
			"/api/auth/organization/create",
			"/api/auth/organization/update",
			"/api/auth/organization/delete",
			"/api/auth/organization/invite-member",
			"/api/auth/organization/cancel-invitation",
			"/api/auth/organization/remove-member",
			"/api/auth/organization/update-member-role",
			"/api/auth/organization/leave",
			"/api/auth/organization/create-role",
			"/api/auth/organization/update-role",
			"/api/auth/organization/delete-role",
			"/api/auth/organization/create-team",
			"/api/auth/organization/update-team",
			"/api/auth/organization/remove-team",
			"/api/auth/organization/add-team-member",
			"/api/auth/organization/remove-team-member",
			"/api/auth/sso/register",
			"/api/auth/sso/update-provider",
			"/api/auth/sso/delete-provider",
			"/api/auth/sso/request-domain-verification",
			"/api/auth/sso/verify-domain",
			"/api/auth/scim/generate-token",
			"/api/auth/scim/delete-provider-connection",
			"/api/auth/oauth2/register",
			"/api/auth/oauth2/create-client",
			"/api/auth/oauth2/update-client",
			"/api/auth/oauth2/client/rotate-secret",
			"/api/auth/oauth2/delete-client",
			"/api/auth/oauth2/update-consent",
			"/api/auth/oauth2/delete-consent",
			"/api/auth/subscription/upgrade",
			"/api/auth/subscription/cancel",
			"/api/auth/subscription/restore",
			"/api/auth/subscription/billing-portal",
		]) {
			expect(requiresFreshSessionForMutation(pathname, "POST")).toBe(true);
		}
		expect(
			requiresFreshSessionForMutation("/api/auth/sso/register///", "POST"),
		).toBe(true);
		expect(
			requiresFreshSessionForMutation(
				"/api/auth/scim/generate-token/extra",
				"POST",
			),
		).toBe(false);
	});

	it("guards high-risk Admin mutations but leaves impersonation recovery unblocked", () => {
		for (const pathname of [
			"/api/auth/admin/create-user",
			"/api/auth/admin/revoke-user-session",
			"/api/auth/admin/revoke-user-sessions",
			"/api/auth/admin/ban-user",
			"/api/auth/admin/unban-user",
			"/api/auth/admin/remove-user",
			"/api/auth/admin/set-role",
			"/api/auth/admin/update-user",
			"/api/auth/admin/set-user-password",
			"/api/auth/admin/reset-2fa",
			"/api/auth/admin/unbind-wallet",
			"/api/auth/admin/delete-user-passkey",
			"/api/auth/admin/update-user-passkey",
			"/api/auth/admin/impersonate-user",
		]) {
			expect(requiresFreshSessionForMutation(pathname, "POST")).toBe(true);
		}

		expect(
			requiresFreshSessionForMutation(
				"/api/auth/admin/stop-impersonating",
				"POST",
			),
		).toBe(false);
		expect(
			requiresFreshSessionForMutation(
				"/api/auth/admin/send-verification",
				"POST",
			),
		).toBe(false);
	});

	it("guards self-service passkey deletion with the authoritative 15-minute window", () => {
		const now = Date.parse("2026-08-09T12:15:00.000Z");
		expect(
			requiresFreshSessionForMutation(
				"/api/auth/passkey/delete-passkey",
				"POST",
			),
		).toBe(true);
		expect(
			getFreshSessionMutationRejection(
				"/api/auth/passkey/delete-passkey",
				"POST",
				"2026-08-09T12:00:00.000Z",
				now,
			),
		).toEqual({
			status: 403,
			code: "SESSION_NOT_FRESH",
			message: "Recent authentication required",
		});
		expect(
			requiresFreshSessionForMutation(
				"/api/auth/passkey/list-user-passkeys",
				"GET",
			),
		).toBe(false);
	});

	it("rejects a high-risk Admin mutation when the authoritative session is not fresh", () => {
		const now = Date.parse("2026-08-09T12:15:00.000Z");

		expect(
			getFreshSessionMutationRejection(
				"/api/auth/admin/ban-user",
				"POST",
				"2026-08-09T12:00:00.000Z",
				now,
			),
		).toEqual({
			status: 403,
			code: "SESSION_NOT_FRESH",
			message: "Recent authentication required",
		});
		expect(
			getFreshSessionMutationRejection(
				"/api/auth/admin/ban-user",
				"POST",
				undefined,
				now,
			),
		).toEqual({
			status: 401,
			code: "UNAUTHORIZED",
			message: "Authentication required",
		});
		expect(
			getFreshSessionMutationRejection(
				"/api/auth/admin/ban-user",
				"POST",
				"2026-08-09T12:01:00.000Z",
				now,
			),
		).toBeUndefined();
		expect(
			getFreshSessionMutationRejection(
				"/api/auth/admin/stop-impersonating",
				"POST",
				undefined,
				now,
			),
		).toBeUndefined();
	});

	it("does not guard reads, workspace switching, slug checks, or GET requests", () => {
		for (const pathname of [
			"/api/auth/organization/list",
			"/api/auth/organization/get-full-organization",
			"/api/auth/organization/set-active",
			"/api/auth/organization/check-slug",
			"/api/auth/admin/list-user-passkeys",
		]) {
			expect(requiresFreshSessionForMutation(pathname, "POST")).toBe(false);
		}
		expect(
			requiresFreshSessionForMutation(
				"/api/auth/organization/update-member-role",
				"GET",
			),
		).toBe(false);
		expect(
			requiresFreshSessionForMutation("/api/auth/audit/export", "GET"),
		).toBe(true);
		expect(requiresFreshSessionForMutation("/api/auth/audit/list", "GET")).toBe(
			false,
		);
	});

	it("rejects stale audit CSV export without blocking ordinary audit reads", () => {
		const now = Date.parse("2026-08-09T12:15:00.000Z");

		expect(
			getFreshSessionMutationRejection(
				"/api/auth/audit/export",
				"GET",
				"2026-08-09T12:00:00.000Z",
				now,
			),
		).toEqual({
			status: 403,
			code: "SESSION_NOT_FRESH",
			message: "Recent authentication required",
		});
		expect(
			getFreshSessionMutationRejection(
				"/api/auth/audit/list",
				"GET",
				undefined,
				now,
			),
		).toBeUndefined();
	});
});
