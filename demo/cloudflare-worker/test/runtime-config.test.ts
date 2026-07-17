import { describe, expect, it } from "vitest";
import {
	getRuntimeConfigIssues,
	getVersionMetadata,
	isAuthorizedMigrationRequest,
	secureEqual,
} from "../src/index";
import type { CloudflareBindings } from "../src/env";
import type { DeliveryMessage } from "../src/delivery";

const strong = (prefix: string) => `${prefix}-${"x".repeat(40)}`;

const makeEnv = (
	overrides: Partial<CloudflareBindings> = {},
): CloudflareBindings =>
	({
		CINAAUTH_SECRET: strong("auth"),
		CINAAUTH_MIGRATION_TOKEN: strong("migration"),
		CINAAUTH_DELIVERY_WEBHOOK_URL: "https://delivery.example.com/cinaauth",
		CINAAUTH_DELIVERY_WEBHOOK_SECRET: strong("delivery"),
		CINAAUTH_URL: "https://auth.cinagroup.com",
		DB: {
			prepare: () => {
				throw new Error("not used by runtime config tests");
			},
		} as unknown as D1Database,
		CINAAUTH_DELIVERY_QUEUE: {
			send: async () => undefined,
		} as unknown as Queue<DeliveryMessage>,
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
				DB: undefined as unknown as D1Database,
				VERSION_METADATA: undefined as unknown as WorkerVersionMetadata,
				CINAAUTH_MIGRATION_TOKEN: "",
				CINAAUTH_DELIVERY_QUEUE: undefined as unknown as Queue<DeliveryMessage>,
				CINAAUTH_DELIVERY_WEBHOOK_URL: "http://delivery.example.com",
				CINAAUTH_DELIVERY_WEBHOOK_SECRET: "",
				CINAAUTH_URL: "http://auth.cinagroup.com",
			}),
		);

		expect(issues).toEqual([
			"missing_cinaauth_secret",
			"missing_d1_binding",
			"missing_version_metadata",
			"missing_cinaauth_migration_token",
			"missing_delivery_queue",
			"invalid_delivery_webhook_url",
			"missing_delivery_webhook_secret",
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
				}),
			),
		).toEqual([
			"weak_cinaauth_secret",
			"weak_cinaauth_migration_token",
			"weak_delivery_webhook_secret",
		]);
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
});

describe("migration authorization", () => {
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

	it("compares migration tokens by hash instead of direct string equality", async () => {
		await expect(secureEqual("same-token", "same-token")).resolves.toBe(true);
		await expect(secureEqual("same-token", "different-token")).resolves.toBe(
			false,
		);
		await expect(secureEqual(undefined, "same-token")).resolves.toBe(false);
	});
});
