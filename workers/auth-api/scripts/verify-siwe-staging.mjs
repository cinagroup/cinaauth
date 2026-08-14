import { readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
	assertNoDeployableStagingConfig,
	verifyStagingInventory,
} from "./siwe-staging-inventory.mjs";

const USAGE =
	"Usage: node ./scripts/verify-siwe-staging.mjs [--foundation | --inventory <repo-relative-path>]";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workerDir = dirname(scriptDir);
const repoRoot = dirname(dirname(workerDir));

const WRANGLER_CONFIG_PATHS = [
	"workers/auth-api/wrangler.json",
	"workers/delivery/wrangler.json",
	"workers/privacy-erasure/wrangler.json",
	"apps/account-portal/wrangler.toml",
	"apps/admin-console/wrangler.jsonc",
	"apps/oidc-client-demo/wrangler.json",
];

const PRODUCTION_IDENTITY_SOURCE_PATHS = [
	"packages/auth-web-contract/src/oidc-demo.ts",
	"packages/auth-web-contract/src/admin-oidc.ts",
];

const WORKFLOW_DIRECTORY = ".github/workflows";
const PRODUCTION_REOWN_DIGEST_ENV = "SIWE_PRODUCTION_REOWN_PROJECT_ID_SHA256";
const STAGING_REOWN_DIGEST_ENV = "SIWE_STAGING_REOWN_PROJECT_ID_SHA256";
const SHA_256_PATTERN = /^[a-f0-9]{64}$/;

export const parseVerificationArguments = (args) => {
	if (args.length === 0 || (args.length === 1 && args[0] === "--foundation")) {
		return { mode: "foundation" };
	}
	if (
		args.length === 2 &&
		args[0] === "--inventory" &&
		typeof args[1] === "string" &&
		args[1].length > 0
	) {
		return { mode: "inventory", inventoryPath: args[1] };
	}
	throw new Error(USAGE);
};

const readWorkspaceSources = () =>
	WRANGLER_CONFIG_PATHS.map((path) => ({
		path,
		content: readFileSync(join(repoRoot, path), "utf8"),
	}));

const readWorkflowSources = () =>
	readdirSync(join(repoRoot, WORKFLOW_DIRECTORY), { withFileTypes: true })
		.filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
		.map((entry) => {
			const path = `${WORKFLOW_DIRECTORY}/${entry.name}`;
			return { path, content: readFileSync(join(repoRoot, path), "utf8") };
		});

export const parseProductionReownIdentityDigest = (environment) => {
	const digest = environment?.[PRODUCTION_REOWN_DIGEST_ENV];
	if (typeof digest !== "string" || digest.length === 0) {
		throw new Error(
			"Production Reown identity digest is required for inventory validation",
		);
	}
	if (!SHA_256_PATTERN.test(digest) || /^0+$/.test(digest)) {
		throw new Error(
			"Production Reown identity digest is invalid for inventory validation",
		);
	}
	return [digest];
};

export const parseStagingReownIdentityDigest = (environment) => {
	const digest = environment?.[STAGING_REOWN_DIGEST_ENV];
	if (typeof digest !== "string" || digest.length === 0) {
		throw new Error(
			"Staging Reown identity digest is required for inventory validation",
		);
	}
	if (!SHA_256_PATTERN.test(digest) || /^0+$/.test(digest)) {
		throw new Error(
			"Staging Reown identity digest is invalid for inventory validation",
		);
	}
	return digest;
};

const resolveRepoFile = (path) => {
	const absolutePath = resolve(repoRoot, path);
	const relativePath = relative(repoRoot, absolutePath);
	if (
		!relativePath ||
		relativePath === ".." ||
		relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
		isAbsolute(relativePath)
	) {
		throw new Error(
			"Inventory path must resolve to a file inside the repository",
		);
	}
	return absolutePath;
};

const renderIssues = (issues) =>
	issues
		.map((issue) => `[${issue.code}] ${issue.path}: ${issue.message}`)
		.join("\n");

export const runVerification = ({
	args = process.argv.slice(2),
	environment = process.env,
	loadInventory = (file) => JSON.parse(readFileSync(file, "utf8")),
	writeOutput = (message) => console.log(message),
	writeError = (message) => console.error(message),
} = {}) => {
	try {
		const options = parseVerificationArguments(args);
		const wranglerSources = readWorkspaceSources();
		const foundationIssues = assertNoDeployableStagingConfig({
			wranglerSources,
			workflowSources: readWorkflowSources(),
		});
		if (foundationIssues.length > 0) {
			writeError(renderIssues(foundationIssues));
			return 1;
		}

		if (options.mode === "foundation") {
			writeOutput(
				"SIWE staging foundation verified: no deployable staging environment or workflow is present.",
			);
			return 0;
		}

		const productionIdentityDigests =
			parseProductionReownIdentityDigest(environment);
		const stagingIdentityDigest = parseStagingReownIdentityDigest(environment);
		const inventoryFile = resolveRepoFile(options.inventoryPath);
		let inventory;
		try {
			inventory = loadInventory(inventoryFile);
		} catch {
			writeError("[invalid-inventory-file] inventory: must be readable JSON");
			return 1;
		}
		const result = verifyStagingInventory({
			inventory,
			productionConfigSources: [
				...wranglerSources.map((source) => source.content),
				...PRODUCTION_IDENTITY_SOURCE_PATHS.map((path) =>
					readFileSync(join(repoRoot, path), "utf8"),
				),
			],
			productionIdentityDigests,
			stagingIdentityDigest,
		});
		if (!result.ok) {
			writeError(renderIssues(result.issues));
			return 1;
		}

		writeOutput(
			"SIWE staging inventory contract verified. Deployment remains disabled until complete environment profiles and a reviewed workflow are added together.",
		);
		return 0;
	} catch (error) {
		writeError(
			error instanceof Error
				? error.message
				: "SIWE staging verification failed",
		);
		return 1;
	}
};

const invokedPath = process.argv[1]
	? pathToFileURL(resolve(process.argv[1])).href
	: null;
if (invokedPath === import.meta.url) {
	process.exitCode = runVerification();
}
