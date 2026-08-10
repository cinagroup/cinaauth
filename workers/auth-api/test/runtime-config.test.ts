import { describe, expect, it } from "vitest";
import type { DeliveryMessage } from "../src/delivery";
import type { CloudflareBindings } from "../src/env";
import {
	getCutoverState,
	getMigrationFeatureSelection,
	getRuntimeConfigIssues,
	getVersionMetadata,
	isAuthorizedMigrationRequest,
	isFreshSecuritySession,
	requiresFreshSessionForMutation,
	secureEqual,
} from "../src/index";
import type { PrivacyExportMessage } from "../src/privacy-export";

const strong = (prefix: string) => `${prefix}-${"x".repeat(40)}`;

const makeEnv = (
	overrides: Partial<CloudflareBindings> = {},
): CloudflareBindings =>
	({
		CINAAUTH_SECRET: strong("auth"),
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
	it("accepts a complete production runtime configuration", () => {
		expect(getRuntimeConfigIssues(makeEnv())).toEqual([]);
	});

	it("reports each required production input without exposing secret values", () => {
		const issues = getRuntimeConfigIssues(
			makeEnv({
				CINAAUTH_SECRET: "",
				HYPERDRIVE: undefined as unknown as Hyperdrive,
				LEGACY_D1: undefined as unknown as D1Database,
				VERSION_METADATA: undefined as unknown as WorkerVersionMetadata,
				CINAAUTH_MIGRATION_TOKEN: "",
				CINAAUTH_DELIVERY_QUEUE: undefined as unknown as Queue<DeliveryMessage>,
				CINAAUTH_DELIVERY_SERVICE: undefined as unknown as Fetcher,
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
			"missing_hyperdrive_binding",
			"missing_legacy_d1_binding",
			"missing_version_metadata",
			"missing_cinaauth_migration_token",
			"missing_delivery_queue",
			"missing_delivery_service",
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
					CINAAUTH_MIGRATION_TOKEN: "short",
					CINAAUTH_DELIVERY_WEBHOOK_SECRET: "short",
					CINAAUTH_PRIVACY_EXPORT_KEY: "short",
					CINAAUTH_ERASURE_WEBHOOK_SECRET: "short",
				}),
			),
		).toEqual([
			"weak_cinaauth_secret",
			"weak_cinaauth_migration_token",
			"weak_delivery_webhook_secret",
			"weak_privacy_export_key",
			"weak_erasure_webhook_secret",
		]);
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
	});

	it("does not guard reads, workspace switching, slug checks, or GET requests", () => {
		for (const pathname of [
			"/api/auth/organization/list",
			"/api/auth/organization/get-full-organization",
			"/api/auth/organization/set-active",
			"/api/auth/organization/check-slug",
		]) {
			expect(requiresFreshSessionForMutation(pathname, "POST")).toBe(false);
		}
		expect(
			requiresFreshSessionForMutation(
				"/api/auth/organization/update-member-role",
				"GET",
			),
		).toBe(false);
	});
});
