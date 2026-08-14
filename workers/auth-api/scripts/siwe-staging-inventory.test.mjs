import assert from "node:assert/strict";
import { test } from "node:test";

import {
	assertNoDeployableStagingConfig,
	parseStagingInventory,
	verifyStagingInventory,
} from "./siwe-staging-inventory.mjs";

const hex32 = (character) => character.repeat(32);
const hex64 = (character) => character.repeat(64);

const createReadyInventory = () => ({
	schemaVersion: 1,
	environment: "siwe-staging",
	state: "inventory-complete",
	origins: {
		auth: "https://auth.siwe-staging.invalid",
		accounts: "https://accounts.siwe-staging.invalid",
		admin: "https://admin.siwe-staging.invalid",
		delivery: "https://delivery.siwe-staging.invalid",
		privacyErasure: "https://erasure.siwe-staging.invalid",
		oidcDemo: "https://oidc.siwe-staging.invalid",
	},
	workers: {
		auth: "cinaauth-api-staging",
		accounts: "cinaauth-accounts-staging",
		delivery: "cinaauth-delivery-staging",
		privacyErasure: "cinaauth-privacy-erasure-staging",
		oidcDemo: "cinaauth-oidc-demo-staging",
		admin: null,
	},
	resources: {
		postgres: {
			organization: "cina-staging-org",
			database: "cinaauth-staging",
			branch: "siwe-staging",
		},
		hyperdrive: { id: hex32("1") },
		legacyD1: {
			databaseName: "cinaauth-db-staging",
			databaseId: "11111111-2222-4333-8444-555555555555",
		},
		privacyExportsR2: { bucketName: "cinaauth-privacy-exports-staging" },
		deliveryReplayKv: {
			namespaceName: "cinaauth-delivery-replay-staging",
			namespaceId: hex32("2"),
		},
		queues: {
			delivery: "cinaauth-delivery-staging",
			deliveryDlq: "cinaauth-delivery-dlq-staging",
			privacyExport: "cinaauth-privacy-export-staging",
			privacyExportDlq: "cinaauth-privacy-export-dlq-staging",
		},
		secretsStore: {
			storeName: "cinaauth-secrets-staging",
			storeId: hex32("3"),
			records: {
				deliveryWebhook: "CINAAUTH_DELIVERY_WEBHOOK_SECRET_STAGING_V2",
				erasureWebhook: "CINAAUTH_ERASURE_WEBHOOK_SECRET_STAGING_V2",
				adminOidcClient: "CINAADMIN_OIDC_CLIENT_SECRET_STAGING_V2",
				adminOidcBridge: "CINAADMIN_OIDC_BRIDGE_SECRET_STAGING_V2",
				deliveryConfigKek: "CINAAUTH_DELIVERY_CONFIG_KEK_STAGING_V1",
				erasureConfigKek: "CINAAUTH_ERASURE_CONFIG_KEK_STAGING_V1",
				adminOidcTransaction: null,
			},
		},
	},
	identities: {
		reown: {
			githubSecretName: "SIWE_STAGING_REOWN_PROJECT_ID",
			projectIdSha256: hex64("4"),
			allowedOrigins: ["https://accounts.siwe-staging.invalid"],
		},
		oidcDemo: {
			clientId: "cinaauth-oidc-demo-staging",
			issuer: "https://auth.siwe-staging.invalid",
			redirectUri: "https://oidc.siwe-staging.invalid/callback",
			postLogoutUri: "https://oidc.siwe-staging.invalid",
		},
		admin: {
			mode: "reserved",
			clientId: "cinaadmin-staging",
		},
	},
	contracts: {
		passkeyRpId: "siwe-staging.invalid",
		siweRpDomain: "accounts.siwe-staging.invalid",
		siweRpUri: "https://accounts.siwe-staging.invalid",
		siweAllowedChainIds: [1],
		siweAllowLegacy: false,
		siweAutoSignup: false,
		requireAuthWorkerBinding: true,
	},
	github: {
		environment: "siwe-staging",
		requiredSecretNames: [
			"SIWE_STAGING_CLOUDFLARE_API_TOKEN",
			"SIWE_STAGING_CLOUDFLARE_ACCOUNT_ID",
			"SIWE_STAGING_CINAAUTH_SECRET",
			"SIWE_STAGING_CINAAUTH_MIGRATION_TOKEN",
			"SIWE_STAGING_CINAAUTH_PRIVACY_EXPORT_KEY",
			"SIWE_STAGING_CINAAUTH_ERASURE_STORAGE_SECRET",
			"SIWE_STAGING_REOWN_PROJECT_ID",
		],
	},
});

test("accepts a complete isolated inventory", () => {
	const result = parseStagingInventory(createReadyInventory());

	assert.equal(result.ok, true);
	assert.equal(result.value?.state, "inventory-complete");
});

test("rejects unknown fields, placeholders, and secret-like values without echoing them", () => {
	const inventory = createReadyInventory();
	inventory.resources.hyperdrive.token = "do-not-print-this-token";
	inventory.resources.legacyD1.databaseId =
		"00000000-0000-0000-0000-000000000000";
	inventory.resources.privacyExportsR2.bucketName = "TODO";

	const result = parseStagingInventory(inventory);
	const rendered = JSON.stringify(result.issues);

	assert.equal(result.ok, false);
	assert.match(rendered, /unknown-field/);
	assert.match(rendered, /placeholder/);
	assert.match(rendered, /invalid-id/);
	assert.doesNotMatch(rendered, /do-not-print-this-token/);
});

test("rejects non-canonical or duplicate origins and inconsistent identity contracts", () => {
	const inventory = createReadyInventory();
	inventory.origins.auth = "https://auth.siwe-staging.invalid:443";
	inventory.origins.admin = inventory.origins.accounts;
	inventory.identities.reown.allowedOrigins = [inventory.origins.auth];
	inventory.identities.oidcDemo.issuer = inventory.origins.accounts;
	inventory.contracts.passkeyRpId = "unrelated.invalid";
	inventory.contracts.siweRpDomain = "auth.siwe-staging.invalid";

	const result = parseStagingInventory(inventory);
	const codes = new Set(result.issues.map((issue) => issue.code));

	assert.equal(result.ok, false);
	assert.equal(codes.has("invalid-origin"), true);
	assert.equal(codes.has("duplicate-origin"), true);
	assert.equal(codes.has("contract-mismatch"), true);
});

test("rejects production identifier reuse and reports only paths", () => {
	const inventory = createReadyInventory();
	inventory.workers.auth = "cinaauth-api";
	inventory.origins.delivery = "https://delivery.production.invalid";

	const result = verifyStagingInventory({
		inventory,
		productionConfigSources: [
			'{"name":"cinaauth-api","route":"https://delivery.production.invalid"}',
		],
	});
	const rendered = JSON.stringify(result.issues);

	assert.equal(result.ok, false);
	assert.match(rendered, /production-collision/);
	assert.doesNotMatch(rendered, /delivery\.production\.invalid/);
});

test("rejects a reused production Reown identity digest without logging it", () => {
	const inventory = createReadyInventory();
	const productionDigest = inventory.identities.reown.projectIdSha256;

	const result = verifyStagingInventory({
		inventory,
		productionIdentityDigests: [productionDigest],
	});
	const rendered = JSON.stringify(result.issues);

	assert.equal(result.ok, false);
	assert.ok(
		result.issues.some(
			(issue) =>
				issue.code === "production-collision" &&
				issue.path === "identities.reown.projectIdSha256",
		),
	);
	assert.doesNotMatch(rendered, new RegExp(productionDigest));
});

test("binds the inventory to the protected staging Reown identity digest", () => {
	const inventory = createReadyInventory();
	const unexpectedDigest = "d".repeat(64);

	const result = verifyStagingInventory({
		inventory,
		stagingIdentityDigest: unexpectedDigest,
	});
	const rendered = JSON.stringify(result.issues);

	assert.equal(result.ok, false);
	assert.ok(
		result.issues.some((issue) => issue.code === "identity-digest-mismatch"),
	);
	assert.doesNotMatch(rendered, new RegExp(unexpectedDigest));
});

test("keeps the SIWE security contract fixed to mainnet and fail-closed signup", () => {
	const inventory = createReadyInventory();
	inventory.contracts.siweAllowedChainIds = [1, 8453];
	inventory.contracts.siweAllowLegacy = true;
	inventory.contracts.siweAutoSignup = true;
	inventory.contracts.requireAuthWorkerBinding = false;

	const result = parseStagingInventory(inventory);

	assert.equal(result.ok, false);
	assert.ok(
		result.issues.filter((issue) => issue.code === "contract-mismatch")
			.length >= 4,
	);
});

test("requires staging-specific GitHub secret names", () => {
	const inventory = createReadyInventory();
	inventory.github.requiredSecretNames[6] = "REOWN_PROJECT_ID";
	inventory.identities.reown.githubSecretName = "REOWN_PROJECT_ID";

	const result = parseStagingInventory(inventory);

	assert.equal(result.ok, false);
	assert.ok(result.issues.some((issue) => issue.code === "unsafe-secret-name"));
});

test("foundation mode rejects partial Wrangler environments and staging deploy workflows", () => {
	const issues = assertNoDeployableStagingConfig({
		wranglerSources: [
			{
				path: "workers/auth-api/wrangler.json",
				content: '{"env":{"staging":{"vars":{}}}}',
			},
			{
				path: "apps/account-portal/wrangler.toml",
				content: '[env.staging.vars]\nCINAAUTH_URL = "https://auth.invalid"',
			},
			{
				path: "workers/delivery/wrangler.toml",
				content: '[env."staging".vars] # valid TOML comment',
			},
			{
				path: "workers/privacy-erasure/wrangler.jsonc",
				content: '{"env" /* comment */ : {"staging": {}}}',
			},
			{
				path: "workers/array-table/wrangler.toml",
				content: '[["env"."staging".services]]\nbinding = "AUTH_WORKER"',
			},
			{
				path: "workers/dotted-key/wrangler.toml",
				content: 'env."staging".vars.CINAAUTH_URL = "https://auth.invalid"',
			},
			{
				path: "workers/escaped-key/wrangler.jsonc",
				content: '{"\\u0065nv": {"\\u0073taging": {}}}',
			},
			{
				path: "workers/unicode-key/wrangler.toml",
				content: String.raw`["\U00000065nv"."staging".vars]
CINAAUTH_URL = "https://auth.invalid"`,
			},
		],
		workflowSources: [
			{
				path: ".github/workflows/renamed-release.yml",
				content: "name: Release\nrun: wrangler deploy --env staging",
			},
		],
	});

	assert.equal(issues.length, 9);
	assert.ok(
		issues.every((issue) => issue.code === "deployable-staging-config"),
	);
});

test("foundation mode rejects indirect and quoted staging workflow writes", () => {
	const issues = assertNoDeployableStagingConfig({
		wranglerSources: [],
		workflowSources: [
			{
				path: ".github/workflows/quoted.yml",
				content: 'run: wrangler deploy --env "staging"',
			},
			{
				path: ".github/workflows/shell-variable.yml",
				content:
					'env:\n  TARGET_ENV: staging\nsteps:\n  - run: wrangler deploy --env "$TARGET_ENV"',
			},
			{
				path: ".github/workflows/expression.yml",
				content:
					'inputs:\n  target_env:\n    default: staging\nsteps:\n  - run: wrangler deploy --env "${{ inputs.target_env }}"',
			},
			{
				path: ".github/workflows/short-env.yml",
				content: "run: wrangler deploy -e staging",
			},
		],
	});

	assert.equal(issues.length, 4);
	assert.ok(
		issues.every((issue) => issue.code === "deployable-staging-config"),
	);
});

test("foundation mode fails closed when a Wrangler config cannot be parsed", () => {
	const issues = assertNoDeployableStagingConfig({
		wranglerSources: [
			{
				path: "workers/auth-api/wrangler.jsonc",
				content: '{"name": "cinaauth-api", broken}',
			},
			{
				path: "workers/auth-api/wrangler.toml",
				content: '[env.staging.vars\nCINAAUTH_URL = "https://auth.invalid"',
			},
		],
		workflowSources: [],
	});

	assert.deepEqual(issues, [
		{
			code: "invalid-wrangler-config",
			path: "workers/auth-api/wrangler.jsonc",
			message:
				"must be valid JSON, JSONC, or TOML before staging can be assessed",
		},
		{
			code: "invalid-wrangler-config",
			path: "workers/auth-api/wrangler.toml",
			message:
				"must be valid JSON, JSONC, or TOML before staging can be assessed",
		},
	]);
});

test("foundation mode accepts the absence of deployable staging configuration", () => {
	const issues = assertNoDeployableStagingConfig({
		wranglerSources: [
			{
				path: "workers/auth-api/wrangler.json",
				content: '{"name":"cinaauth-api"}',
			},
			{
				path: "apps/account-portal/wrangler.toml",
				content: 'name = "cinaauth-demo"',
			},
		],
		workflowSources: [
			{
				path: ".github/workflows/ci.yml",
				content: "name: CI\nrun: pnpm test",
			},
		],
	});

	assert.deepEqual(issues, []);
});
