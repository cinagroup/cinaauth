import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const API_BASE = "https://api.cloudflare.com/client/v4";
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export const PRESERVED_SECRET_INVENTORIES = [
	{
		workerName: "cinaauth-api",
		requiredNames: ["CINAAUTH_SECRET", "CINAAUTH_PRIVACY_EXPORT_KEY"],
	},
	{
		workerName: "cinaauth-privacy-erasure",
		requiredNames: ["CINAAUTH_ERASURE_STORAGE_SECRET"],
	},
];

const defaultSleep = (ms) =>
	new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

const getSecretNames = (body, workerName) => {
	if (
		typeof body !== "object" ||
		body === null ||
		body.success !== true ||
		!Array.isArray(body.result)
	) {
		throw new Error(
			`Cloudflare returned an invalid secret inventory for ${workerName}`,
		);
	}
	return new Set(
		body.result
			.map((item) =>
				typeof item === "object" &&
				item !== null &&
				typeof item.name === "string"
					? item.name
					: undefined,
			)
			.filter((name) => name !== undefined),
	);
};

const fetchSecretNames = async ({
	accountId,
	apiToken,
	workerName,
	fetchImpl,
	sleepImpl,
}) => {
	const url = `${API_BASE}/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(workerName)}/secrets`;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
		let response;
		try {
			response = await fetchImpl(url, {
				method: "GET",
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${apiToken}`,
				},
				signal: AbortSignal.timeout(10_000),
			});
		} catch {
			if (attempt < MAX_ATTEMPTS) {
				await sleepImpl(500 * attempt);
				continue;
			}
			throw new Error(
				`Cloudflare preserved secret inventory request failed for ${workerName}`,
			);
		}

		if (
			!response.ok &&
			attempt < MAX_ATTEMPTS &&
			(RETRYABLE_STATUS_CODES.has(response.status) || response.status >= 500)
		) {
			await sleepImpl(500 * attempt);
			continue;
		}
		if (!response.ok) {
			throw new Error(
				`Cloudflare preserved secret inventory request for ${workerName} returned HTTP ${response.status}`,
			);
		}

		let body;
		try {
			body = await response.json();
		} catch {
			throw new Error(
				`Cloudflare returned an invalid secret inventory for ${workerName}`,
			);
		}
		return getSecretNames(body, workerName);
	}
	throw new Error(
		`Cloudflare preserved secret inventory request failed for ${workerName}`,
	);
};

/**
 * Verify that stateful production secrets already exist on their Workers.
 * This reads only Cloudflare secret metadata; secret values are never returned.
 *
 * @param {{
 *   args?: string[];
 *   env?: Record<string, string | undefined>;
 *   fetchImpl?: typeof fetch;
 *   sleepImpl?: (ms: number) => Promise<void>;
 *   log?: (message: string) => void;
 * }} options
 */
export const runPreservedSecretInventoryCheck = async (options = {}) => {
	const args = options.args ?? process.argv.slice(2);
	if (args.length !== 0) {
		throw new Error("This read-only check does not accept arguments");
	}
	const env = options.env ?? process.env;
	const apiToken = env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN;
	const accountId = env.CLOUDFLARE_ACCOUNT_ID;
	if (!apiToken) {
		throw new Error("CLOUDFLARE_API_TOKEN or CF_API_TOKEN is required");
	}
	if (!accountId) {
		throw new Error("CLOUDFLARE_ACCOUNT_ID is required");
	}

	const fetchImpl = options.fetchImpl ?? fetch;
	const sleepImpl = options.sleepImpl ?? defaultSleep;
	for (const inventory of PRESERVED_SECRET_INVENTORIES) {
		const names = await fetchSecretNames({
			accountId,
			apiToken,
			workerName: inventory.workerName,
			fetchImpl,
			sleepImpl,
		});
		const missing = inventory.requiredNames.filter((name) => !names.has(name));
		if (missing.length > 0) {
			throw new Error(
				`Cloudflare Worker ${inventory.workerName} is missing preserved secret names: ${missing.join(", ")}`,
			);
		}
	}

	const log = options.log ?? console.log;
	log("Cloudflare preserved Worker secret inventory passed.");
};

export const isMain =
	typeof process.argv[1] === "string" &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
	try {
		await runPreservedSecretInventoryCheck();
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
