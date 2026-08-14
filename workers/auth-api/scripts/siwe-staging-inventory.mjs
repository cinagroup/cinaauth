import { parse as parseToml } from "smol-toml";

const ROOT_KEYS = [
	"schemaVersion",
	"environment",
	"state",
	"origins",
	"workers",
	"resources",
	"identities",
	"contracts",
	"github",
];

const ORIGIN_KEYS = [
	"auth",
	"accounts",
	"admin",
	"delivery",
	"privacyErasure",
	"oidcDemo",
];

const WORKER_KEYS = [
	"auth",
	"accounts",
	"delivery",
	"privacyErasure",
	"oidcDemo",
	"admin",
];

const REQUIRED_GITHUB_SECRET_NAMES = [
	"SIWE_STAGING_CLOUDFLARE_API_TOKEN",
	"SIWE_STAGING_CLOUDFLARE_ACCOUNT_ID",
	"SIWE_STAGING_CINAAUTH_SECRET",
	"SIWE_STAGING_CINAAUTH_MIGRATION_TOKEN",
	"SIWE_STAGING_CINAAUTH_PRIVACY_EXPORT_KEY",
	"SIWE_STAGING_CINAAUTH_ERASURE_STORAGE_SECRET",
	"SIWE_STAGING_REOWN_PROJECT_ID",
];

const RESOURCE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,127}$/;
const SECRET_RECORD_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/;
const HEX_32_PATTERN = /^[a-f0-9]{32}$/;
const HEX_64_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN =
	/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const PLACEHOLDER_PATTERN =
	/(?:^|[_\s-])(todo|tbd|changeme|placeholder|replace(?:me)?)(?:$|[_\s-])|<[^>]+>/i;

const createIssue = (code, path, message) => ({ code, path, message });

const isRecord = (value) =>
	value !== null && typeof value === "object" && !Array.isArray(value);

const addIssue = (issues, code, path, message) => {
	issues.push(createIssue(code, path, message));
};

const checkExactKeys = (value, path, expectedKeys, issues) => {
	if (!isRecord(value)) {
		addIssue(issues, "invalid-type", path, "must be an object");
		return false;
	}

	const expected = new Set(expectedKeys);
	for (const key of Object.keys(value)) {
		if (!expected.has(key)) {
			addIssue(
				issues,
				"unknown-field",
				`${path}.${key}`,
				"field is not part of the staging inventory contract",
			);
		}
	}
	for (const key of expectedKeys) {
		if (!Object.hasOwn(value, key)) {
			addIssue(
				issues,
				"missing-field",
				`${path}.${key}`,
				"required field is missing",
			);
		}
	}
	return true;
};

const checkString = (
	value,
	path,
	issues,
	{ pattern, requireStaging = false, allowPlaceholder = false } = {},
) => {
	if (typeof value !== "string" || value.length === 0) {
		addIssue(issues, "invalid-type", path, "must be a non-empty string");
		return false;
	}
	if (!allowPlaceholder && PLACEHOLDER_PATTERN.test(value)) {
		addIssue(issues, "placeholder", path, "must not contain a placeholder");
	}
	if (pattern && !pattern.test(value)) {
		addIssue(issues, "invalid-format", path, "has an invalid format");
	}
	if (requireStaging && !value.toLowerCase().includes("staging")) {
		addIssue(
			issues,
			"missing-staging-label",
			path,
			"must be explicitly staging-labelled",
		);
	}
	return true;
};

const checkId = (value, path, pattern, issues) => {
	if (!checkString(value, path, issues, { pattern })) return;
	const compact = value.replaceAll("-", "");
	if (/^0+$/.test(compact)) {
		addIssue(issues, "invalid-id", path, "must not use an all-zero identifier");
	}
};

const parseCanonicalOrigin = (value, path, issues) => {
	if (!checkString(value, path, issues, { requireStaging: true })) return null;
	if (!value.startsWith("https://")) {
		addIssue(
			issues,
			"invalid-origin",
			path,
			"must be a canonical HTTPS origin",
		);
		return null;
	}

	const authority = value.slice("https://".length).split("/", 1)[0];
	if (!authority || authority.includes(":")) {
		addIssue(
			issues,
			"invalid-origin",
			path,
			"must not contain credentials or an explicit port",
		);
		return null;
	}

	try {
		const url = new URL(value);
		if (
			url.protocol !== "https:" ||
			url.origin !== value ||
			url.pathname !== "/" ||
			url.search ||
			url.hash ||
			url.username ||
			url.password
		) {
			addIssue(
				issues,
				"invalid-origin",
				path,
				"must be a canonical HTTPS origin",
			);
			return null;
		}
		return url;
	} catch {
		addIssue(
			issues,
			"invalid-origin",
			path,
			"must be a canonical HTTPS origin",
		);
		return null;
	}
};

const checkExactValue = (actual, expected, path, issues) => {
	if (actual !== expected) {
		addIssue(
			issues,
			"contract-mismatch",
			path,
			"does not match the fixed staging contract",
		);
	}
};

const checkExactArray = (
	actual,
	expected,
	path,
	issues,
	code = "contract-mismatch",
) => {
	if (
		!Array.isArray(actual) ||
		actual.length !== expected.length ||
		actual.some((value, index) => value !== expected[index])
	) {
		addIssue(issues, code, path, "does not match the fixed staging contract");
	}
};

const validateOrigins = (origins, issues) => {
	if (!checkExactKeys(origins, "origins", ORIGIN_KEYS, issues))
		return new Map();

	const parsed = new Map();
	for (const key of ORIGIN_KEYS) {
		const url = parseCanonicalOrigin(origins[key], `origins.${key}`, issues);
		if (url) parsed.set(key, url);
	}

	const seen = new Map();
	for (const [key, url] of parsed) {
		const previous = seen.get(url.origin);
		if (previous) {
			addIssue(
				issues,
				"duplicate-origin",
				`origins.${key}`,
				`must differ from origins.${previous}`,
			);
		} else {
			seen.set(url.origin, key);
		}
	}
	return parsed;
};

const validateWorkers = (workers, issues) => {
	if (!checkExactKeys(workers, "workers", WORKER_KEYS, issues)) return;
	for (const key of WORKER_KEYS.filter((key) => key !== "admin")) {
		checkString(workers[key], `workers.${key}`, issues, {
			pattern: RESOURCE_NAME_PATTERN,
			requireStaging: true,
		});
	}
	if (workers.admin !== null) {
		checkString(workers.admin, "workers.admin", issues, {
			pattern: RESOURCE_NAME_PATTERN,
			requireStaging: true,
		});
	}

	const names = WORKER_KEYS.map((key) => workers[key]).filter(
		(value) => typeof value === "string",
	);
	if (new Set(names).size !== names.length) {
		addIssue(
			issues,
			"duplicate-worker",
			"workers",
			"Worker names must be unique",
		);
	}
};

const validateResources = (resources, issues) => {
	if (
		!checkExactKeys(
			resources,
			"resources",
			[
				"postgres",
				"hyperdrive",
				"legacyD1",
				"privacyExportsR2",
				"deliveryReplayKv",
				"queues",
				"secretsStore",
			],
			issues,
		)
	) {
		return;
	}

	if (
		checkExactKeys(
			resources.postgres,
			"resources.postgres",
			["organization", "database", "branch"],
			issues,
		)
	) {
		for (const key of ["organization", "database", "branch"]) {
			checkString(
				resources.postgres[key],
				`resources.postgres.${key}`,
				issues,
				{
					pattern: RESOURCE_NAME_PATTERN,
				},
			);
		}
		if (
			![resources.postgres.database, resources.postgres.branch].some(
				(value) =>
					typeof value === "string" && value.toLowerCase().includes("staging"),
			)
		) {
			addIssue(
				issues,
				"missing-staging-label",
				"resources.postgres",
				"database or branch must be explicitly staging-labelled",
			);
		}
	}

	if (
		checkExactKeys(resources.hyperdrive, "resources.hyperdrive", ["id"], issues)
	) {
		checkId(
			resources.hyperdrive.id,
			"resources.hyperdrive.id",
			HEX_32_PATTERN,
			issues,
		);
	}

	if (
		checkExactKeys(
			resources.legacyD1,
			"resources.legacyD1",
			["databaseName", "databaseId"],
			issues,
		)
	) {
		checkString(
			resources.legacyD1.databaseName,
			"resources.legacyD1.databaseName",
			issues,
			{
				pattern: RESOURCE_NAME_PATTERN,
				requireStaging: true,
			},
		);
		checkId(
			resources.legacyD1.databaseId,
			"resources.legacyD1.databaseId",
			UUID_PATTERN,
			issues,
		);
	}

	if (
		checkExactKeys(
			resources.privacyExportsR2,
			"resources.privacyExportsR2",
			["bucketName"],
			issues,
		)
	) {
		checkString(
			resources.privacyExportsR2.bucketName,
			"resources.privacyExportsR2.bucketName",
			issues,
			{ pattern: RESOURCE_NAME_PATTERN, requireStaging: true },
		);
	}

	if (
		checkExactKeys(
			resources.deliveryReplayKv,
			"resources.deliveryReplayKv",
			["namespaceName", "namespaceId"],
			issues,
		)
	) {
		checkString(
			resources.deliveryReplayKv.namespaceName,
			"resources.deliveryReplayKv.namespaceName",
			issues,
			{ pattern: RESOURCE_NAME_PATTERN, requireStaging: true },
		);
		checkId(
			resources.deliveryReplayKv.namespaceId,
			"resources.deliveryReplayKv.namespaceId",
			HEX_32_PATTERN,
			issues,
		);
	}

	if (
		checkExactKeys(
			resources.queues,
			"resources.queues",
			["delivery", "deliveryDlq", "privacyExport", "privacyExportDlq"],
			issues,
		)
	) {
		for (const key of [
			"delivery",
			"deliveryDlq",
			"privacyExport",
			"privacyExportDlq",
		]) {
			checkString(resources.queues[key], `resources.queues.${key}`, issues, {
				pattern: RESOURCE_NAME_PATTERN,
				requireStaging: true,
			});
		}
		const queueNames = Object.values(resources.queues).filter(
			(value) => typeof value === "string",
		);
		if (new Set(queueNames).size !== queueNames.length) {
			addIssue(
				issues,
				"duplicate-resource",
				"resources.queues",
				"Queue names must be unique",
			);
		}
	}

	if (
		checkExactKeys(
			resources.secretsStore,
			"resources.secretsStore",
			["storeName", "storeId", "records"],
			issues,
		)
	) {
		checkString(
			resources.secretsStore.storeName,
			"resources.secretsStore.storeName",
			issues,
			{
				pattern: RESOURCE_NAME_PATTERN,
				requireStaging: true,
			},
		);
		checkId(
			resources.secretsStore.storeId,
			"resources.secretsStore.storeId",
			HEX_32_PATTERN,
			issues,
		);
		if (
			checkExactKeys(
				resources.secretsStore.records,
				"resources.secretsStore.records",
				[
					"deliveryWebhook",
					"erasureWebhook",
					"adminOidcClient",
					"adminOidcBridge",
					"deliveryConfigKek",
					"erasureConfigKek",
					"adminOidcTransaction",
				],
				issues,
			)
		) {
			for (const key of [
				"deliveryWebhook",
				"erasureWebhook",
				"adminOidcClient",
				"adminOidcBridge",
				"deliveryConfigKek",
				"erasureConfigKek",
			]) {
				checkString(
					resources.secretsStore.records[key],
					`resources.secretsStore.records.${key}`,
					issues,
					{ pattern: SECRET_RECORD_PATTERN, requireStaging: true },
				);
			}
			if (resources.secretsStore.records.adminOidcTransaction !== null) {
				checkString(
					resources.secretsStore.records.adminOidcTransaction,
					"resources.secretsStore.records.adminOidcTransaction",
					issues,
					{ pattern: SECRET_RECORD_PATTERN, requireStaging: true },
				);
			}
		}
	}
};

const validateIdentities = (
	identities,
	origins,
	workers,
	resources,
	issues,
) => {
	if (
		!checkExactKeys(
			identities,
			"identities",
			["reown", "oidcDemo", "admin"],
			issues,
		)
	) {
		return;
	}

	if (
		checkExactKeys(
			identities.reown,
			"identities.reown",
			["githubSecretName", "projectIdSha256", "allowedOrigins"],
			issues,
		)
	) {
		checkExactValue(
			identities.reown.githubSecretName,
			"SIWE_STAGING_REOWN_PROJECT_ID",
			"identities.reown.githubSecretName",
			issues,
		);
		checkId(
			identities.reown.projectIdSha256,
			"identities.reown.projectIdSha256",
			HEX_64_PATTERN,
			issues,
		);
		checkExactArray(
			identities.reown.allowedOrigins,
			[origins?.accounts],
			"identities.reown.allowedOrigins",
			issues,
		);
	}

	if (
		checkExactKeys(
			identities.oidcDemo,
			"identities.oidcDemo",
			["clientId", "issuer", "redirectUri", "postLogoutUri"],
			issues,
		)
	) {
		checkString(
			identities.oidcDemo.clientId,
			"identities.oidcDemo.clientId",
			issues,
			{
				pattern: RESOURCE_NAME_PATTERN,
				requireStaging: true,
			},
		);
		checkExactValue(
			identities.oidcDemo.issuer,
			origins?.auth,
			"identities.oidcDemo.issuer",
			issues,
		);
		checkExactValue(
			identities.oidcDemo.redirectUri,
			typeof origins?.oidcDemo === "string"
				? `${origins.oidcDemo}/callback`
				: undefined,
			"identities.oidcDemo.redirectUri",
			issues,
		);
		checkExactValue(
			identities.oidcDemo.postLogoutUri,
			origins?.oidcDemo,
			"identities.oidcDemo.postLogoutUri",
			issues,
		);
	}

	if (
		checkExactKeys(
			identities.admin,
			"identities.admin",
			["mode", "clientId"],
			issues,
		)
	) {
		if (!new Set(["reserved", "deployed"]).has(identities.admin.mode)) {
			addIssue(
				issues,
				"invalid-enum",
				"identities.admin.mode",
				"must be reserved or deployed",
			);
		}
		checkString(
			identities.admin.clientId,
			"identities.admin.clientId",
			issues,
			{
				pattern: RESOURCE_NAME_PATTERN,
				requireStaging: true,
			},
		);
		if (identities.admin.mode === "reserved") {
			checkExactValue(workers?.admin, null, "workers.admin", issues);
			checkExactValue(
				resources?.secretsStore?.records?.adminOidcTransaction,
				null,
				"resources.secretsStore.records.adminOidcTransaction",
				issues,
			);
		} else if (identities.admin.mode === "deployed") {
			if (typeof workers?.admin !== "string") {
				addIssue(
					issues,
					"contract-mismatch",
					"workers.admin",
					"must name the deployed Admin Worker",
				);
			}
			if (
				typeof resources?.secretsStore?.records?.adminOidcTransaction !==
				"string"
			) {
				addIssue(
					issues,
					"contract-mismatch",
					"resources.secretsStore.records.adminOidcTransaction",
					"must name the deployed Admin transaction secret record",
				);
			}
		}
	}
};

const validateContracts = (contracts, origins, issues) => {
	if (
		!checkExactKeys(
			contracts,
			"contracts",
			[
				"passkeyRpId",
				"siweRpDomain",
				"siweRpUri",
				"siweAllowedChainIds",
				"siweAllowLegacy",
				"siweAutoSignup",
				"requireAuthWorkerBinding",
			],
			issues,
		)
	) {
		return;
	}

	checkString(contracts.passkeyRpId, "contracts.passkeyRpId", issues, {
		pattern: /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/,
		requireStaging: true,
	});
	const accountsHostname = origins?.accounts;
	if (
		typeof accountsHostname === "string" &&
		typeof contracts.passkeyRpId === "string" &&
		accountsHostname !== contracts.passkeyRpId &&
		!accountsHostname.endsWith(`.${contracts.passkeyRpId}`)
	) {
		addIssue(
			issues,
			"contract-mismatch",
			"contracts.passkeyRpId",
			"must equal the Accounts hostname or one of its parent domains",
		);
	}
	checkExactValue(
		contracts.siweRpDomain,
		accountsHostname,
		"contracts.siweRpDomain",
		issues,
	);
	checkExactValue(
		contracts.siweRpUri,
		origins?.accountsOrigin,
		"contracts.siweRpUri",
		issues,
	);
	checkExactArray(
		contracts.siweAllowedChainIds,
		[1],
		"contracts.siweAllowedChainIds",
		issues,
	);
	checkExactValue(
		contracts.siweAllowLegacy,
		false,
		"contracts.siweAllowLegacy",
		issues,
	);
	checkExactValue(
		contracts.siweAutoSignup,
		false,
		"contracts.siweAutoSignup",
		issues,
	);
	checkExactValue(
		contracts.requireAuthWorkerBinding,
		true,
		"contracts.requireAuthWorkerBinding",
		issues,
	);
};

const validateGithub = (github, issues) => {
	if (
		!checkExactKeys(
			github,
			"github",
			["environment", "requiredSecretNames"],
			issues,
		)
	) {
		return;
	}
	checkExactValue(
		github.environment,
		"siwe-staging",
		"github.environment",
		issues,
	);
	if (!Array.isArray(github.requiredSecretNames)) {
		addIssue(
			issues,
			"invalid-type",
			"github.requiredSecretNames",
			"must be an array",
		);
		return;
	}
	const configured = new Set(github.requiredSecretNames);
	const expected = new Set(REQUIRED_GITHUB_SECRET_NAMES);
	if (
		configured.size !== github.requiredSecretNames.length ||
		configured.size !== expected.size ||
		[...expected].some((name) => !configured.has(name))
	) {
		addIssue(
			issues,
			"unsafe-secret-name",
			"github.requiredSecretNames",
			"must use only the dedicated SIWE staging secret names",
		);
	}
	for (let index = 0; index < github.requiredSecretNames.length; index += 1) {
		const name = github.requiredSecretNames[index];
		if (typeof name !== "string" || !name.startsWith("SIWE_STAGING_")) {
			addIssue(
				issues,
				"unsafe-secret-name",
				`github.requiredSecretNames.${index}`,
				"must use a dedicated SIWE staging secret name",
			);
		}
	}
};

const createOriginContract = (inventory, parsedOrigins) => ({
	auth: parsedOrigins.get("auth")?.hostname,
	accounts: parsedOrigins.get("accounts")?.hostname,
	admin: parsedOrigins.get("admin")?.hostname,
	delivery: parsedOrigins.get("delivery")?.hostname,
	privacyErasure: parsedOrigins.get("privacyErasure")?.hostname,
	oidcDemo: parsedOrigins.get("oidcDemo")?.hostname,
	authOrigin: inventory?.origins?.auth,
	accountsOrigin: inventory?.origins?.accounts,
	adminOrigin: inventory?.origins?.admin,
	deliveryOrigin: inventory?.origins?.delivery,
	privacyErasureOrigin: inventory?.origins?.privacyErasure,
	oidcDemoOrigin: inventory?.origins?.oidcDemo,
});

/**
 * Validate a complete, public-only SIWE staging inventory.
 *
 * The result never includes rejected field values in its issues, so it is safe
 * to render in CI logs. Secret values are not part of this contract.
 */
export const parseStagingInventory = (value) => {
	const issues = [];
	if (!checkExactKeys(value, "inventory", ROOT_KEYS, issues)) {
		return { ok: false, issues };
	}

	checkExactValue(value.schemaVersion, 1, "schemaVersion", issues);
	checkExactValue(value.environment, "siwe-staging", "environment", issues);
	checkExactValue(value.state, "inventory-complete", "state", issues);

	const parsedOrigins = validateOrigins(value.origins, issues);
	const origins = createOriginContract(value, parsedOrigins);
	validateWorkers(value.workers, issues);
	validateResources(value.resources, issues);
	validateIdentities(
		value.identities,
		value.origins,
		value.workers,
		value.resources,
		issues,
	);
	validateContracts(value.contracts, origins, issues);
	validateGithub(value.github, issues);

	if (issues.length > 0) return { ok: false, issues };
	return { ok: true, value };
};

const getCollisionCandidates = (inventory) => [
	...ORIGIN_KEYS.map((key) => [`origins.${key}`, inventory.origins?.[key]]),
	...WORKER_KEYS.map((key) => [`workers.${key}`, inventory.workers?.[key]]),
	[
		"resources.postgres.organization",
		inventory.resources?.postgres?.organization,
	],
	["resources.postgres.database", inventory.resources?.postgres?.database],
	["resources.postgres.branch", inventory.resources?.postgres?.branch],
	["resources.hyperdrive.id", inventory.resources?.hyperdrive?.id],
	[
		"resources.legacyD1.databaseName",
		inventory.resources?.legacyD1?.databaseName,
	],
	["resources.legacyD1.databaseId", inventory.resources?.legacyD1?.databaseId],
	[
		"resources.privacyExportsR2.bucketName",
		inventory.resources?.privacyExportsR2?.bucketName,
	],
	[
		"resources.deliveryReplayKv.namespaceName",
		inventory.resources?.deliveryReplayKv?.namespaceName,
	],
	[
		"resources.deliveryReplayKv.namespaceId",
		inventory.resources?.deliveryReplayKv?.namespaceId,
	],
	...["delivery", "deliveryDlq", "privacyExport", "privacyExportDlq"].map(
		(key) => [`resources.queues.${key}`, inventory.resources?.queues?.[key]],
	),
	[
		"resources.secretsStore.storeName",
		inventory.resources?.secretsStore?.storeName,
	],
	[
		"resources.secretsStore.storeId",
		inventory.resources?.secretsStore?.storeId,
	],
	...[
		"deliveryWebhook",
		"erasureWebhook",
		"adminOidcClient",
		"adminOidcBridge",
		"deliveryConfigKek",
		"erasureConfigKek",
		"adminOidcTransaction",
	].map((key) => [
		`resources.secretsStore.records.${key}`,
		inventory.resources?.secretsStore?.records?.[key],
	]),
	["identities.oidcDemo.clientId", inventory.identities?.oidcDemo?.clientId],
	["identities.admin.clientId", inventory.identities?.admin?.clientId],
	["contracts.passkeyRpId", inventory.contracts?.passkeyRpId],
];

/** Validate the inventory and reject identifiers quoted in production configs. */
export const verifyStagingInventory = ({
	inventory,
	productionConfigSources = [],
	productionIdentityDigests = [],
	stagingIdentityDigest,
}) => {
	const parsed = parseStagingInventory(inventory);
	const issues = parsed.ok ? [] : [...parsed.issues];

	for (const [path, candidate] of getCollisionCandidates(inventory ?? {})) {
		if (typeof candidate !== "string" || candidate.length === 0) continue;
		const quoted = JSON.stringify(candidate);
		if (
			productionConfigSources.some(
				(source) => typeof source === "string" && source.includes(quoted),
			)
		) {
			addIssue(
				issues,
				"production-collision",
				path,
				"must not reuse an identifier from a production configuration",
			);
		}
	}
	if (
		typeof inventory?.identities?.reown?.projectIdSha256 === "string" &&
		productionIdentityDigests.includes(
			inventory.identities.reown.projectIdSha256,
		)
	) {
		addIssue(
			issues,
			"production-collision",
			"identities.reown.projectIdSha256",
			"must not reuse the production Reown project identity",
		);
	}
	if (
		typeof stagingIdentityDigest === "string" &&
		inventory?.identities?.reown?.projectIdSha256 !== stagingIdentityDigest
	) {
		addIssue(
			issues,
			"identity-digest-mismatch",
			"identities.reown.projectIdSha256",
			"must match the protected staging Reown project identity",
		);
	}

	return issues.length > 0
		? { ok: false, issues }
		: { ok: true, value: inventory };
};

const stripJsonComments = (content) => {
	let output = "";
	let inString = false;
	let escaped = false;
	let lineComment = false;
	let blockComment = false;
	for (let index = 0; index < content.length; index += 1) {
		const character = content[index];
		const next = content[index + 1];
		if (lineComment) {
			if (character === "\n" || character === "\r") {
				lineComment = false;
				output += character;
			} else {
				output += " ";
			}
			continue;
		}
		if (blockComment) {
			if (character === "*" && next === "/") {
				blockComment = false;
				output += "  ";
				index += 1;
			} else {
				output += character === "\n" || character === "\r" ? character : " ";
			}
			continue;
		}
		if (inString) {
			output += character;
			if (escaped) {
				escaped = false;
			} else if (character === "\\") {
				escaped = true;
			} else if (character === '"') {
				inString = false;
			}
			continue;
		}
		if (character === '"') {
			inString = true;
			output += character;
			continue;
		}
		if (character === "/" && next === "/") {
			lineComment = true;
			output += "  ";
			index += 1;
			continue;
		}
		if (character === "/" && next === "*") {
			blockComment = true;
			output += "  ";
			index += 1;
			continue;
		}
		output += character;
	}
	if (inString || blockComment) return null;
	return output;
};

const removeJsonTrailingCommas = (content) => {
	let output = "";
	let inString = false;
	let escaped = false;
	for (let index = 0; index < content.length; index += 1) {
		const character = content[index];
		if (inString) {
			output += character;
			if (escaped) {
				escaped = false;
			} else if (character === "\\") {
				escaped = true;
			} else if (character === '"') {
				inString = false;
			}
			continue;
		}
		if (character === '"') {
			inString = true;
			output += character;
			continue;
		}
		if (character === ",") {
			let cursor = index + 1;
			while (/\s/.test(content[cursor] ?? "")) cursor += 1;
			if (content[cursor] === "}" || content[cursor] === "]") continue;
		}
		output += character;
	}
	return output;
};

const parseJsonc = (content) => {
	const withoutComments = stripJsonComments(content);
	if (withoutComments === null) return null;
	try {
		return JSON.parse(removeJsonTrailingCommas(withoutComments));
	} catch {
		return null;
	}
};

const inspectWranglerSource = (source) => {
	if (/\.toml$/i.test(source.path)) {
		try {
			const parsed = parseToml(source.content);
			if (!isRecord(parsed)) return { valid: false, hasStaging: false };
			return {
				valid: true,
				hasStaging:
					isRecord(parsed.env) && Object.hasOwn(parsed.env, "staging"),
			};
		} catch {
			return { valid: false, hasStaging: false };
		}
	}
	if (/\.jsonc?$/i.test(source.path)) {
		const parsed = parseJsonc(source.content);
		if (!isRecord(parsed)) return { valid: false, hasStaging: false };
		return {
			valid: true,
			hasStaging: isRecord(parsed.env) && Object.hasOwn(parsed.env, "staging"),
		};
	}
	return { valid: false, hasStaging: false };
};

const hasDeployableStagingWorkflow = (source) => {
	if (/(?:^|[\\/])deploy-siwe-staging\.ya?ml$/i.test(source.path)) return true;
	const normalizedCommands = source.content.replace(/(?:\\|`)\r?\n\s*/g, " ");
	const hasWranglerEnvironmentSelector =
		/--env(?=\s|=)/i.test(source.content) ||
		/\bwrangler(?:\.cmd)?\b[^\r\n]{0,512}\s-e(?=\s|=)/i.test(
			normalizedCommands,
		) ||
		/\bCLOUDFLARE_ENV\b/i.test(source.content);
	const mentionsStaging = /\bstaging\b/i.test(source.content);
	const writesRemoteState =
		/\b(?:wrangler(?:-action)?|deploy|provision|configure|migrate|secret\s+(?:put|bulk))\b/i.test(
			source.content,
		);
	return (
		writesRemoteState && (hasWranglerEnvironmentSelector || mentionsStaging)
	);
};

/**
 * Foundation gate: reject partial deployable staging configuration.
 *
 * A complete environment and its write workflow are introduced together only
 * after every external resource identifier has been reviewed.
 */
export const assertNoDeployableStagingConfig = ({
	wranglerSources,
	workflowSources = [],
}) => {
	const issues = [];
	for (const source of wranglerSources) {
		const inspection = inspectWranglerSource(source);
		if (!inspection.valid) {
			addIssue(
				issues,
				"invalid-wrangler-config",
				source.path,
				"must be valid JSON, JSONC, or TOML before staging can be assessed",
			);
		} else if (inspection.hasStaging) {
			addIssue(
				issues,
				"deployable-staging-config",
				source.path,
				"must not contain env.staging before the complete reviewed inventory exists",
			);
		}
	}
	for (const source of workflowSources) {
		if (hasDeployableStagingWorkflow(source)) {
			addIssue(
				issues,
				"deployable-staging-config",
				source.path,
				"must not write staging state before the complete reviewed inventory and environment profiles",
			);
		}
	}
	return issues;
};
