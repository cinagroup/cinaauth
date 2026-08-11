import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const PLANETSCALE_RETENTION_EXCEPTION_CODE =
	"planetscale-postgres-backups-2d";

const retentionDays = (value, unit) => {
	const multipliers = {
		hour: 1 / 24,
		day: 1,
		week: 7,
		month: 31,
		year: 366,
	};
	const multiplier = multipliers[unit];
	return typeof value === "number" && multiplier
		? value * multiplier
		: Number.POSITIVE_INFINITY;
};

const frequencyHours = (value, unit) => {
	const multipliers = { hour: 1, day: 24, week: 168, month: 744 };
	const multiplier = multipliers[unit];
	return typeof value === "number" && multiplier
		? value * multiplier
		: Number.POSITIVE_INFINITY;
};

const isProductionPolicy = (policy) =>
	policy.target === undefined || policy.target === "production";

const backupTimestamp = (backup) => backup.started_at ?? backup.created_at;

const safeBackupEvidence = (backup) => ({
	id: backup.id,
	startedAt: backupTimestamp(backup) ?? null,
	expiresAt: backup.expires_at ?? null,
	deletedAt: backup.deleted_at ?? null,
	protected: backup.protected === true,
});

export const evaluateBackupEvidence = ({
	backups,
	policies,
	maximumRetentionDays,
	now,
	receipt,
}) => {
	const failures = [];
	const productionPolicies = policies.filter(isProductionPolicy);
	const requiredPolicies = productionPolicies.filter(
		(policy) => policy.required,
	);
	if (requiredPolicies.length === 0) {
		failures.push("No required production backup policy was returned");
	}
	if (
		!requiredPolicies.some(
			(policy) =>
				retentionDays(policy.retention_value, policy.retention_unit) <=
					maximumRetentionDays &&
				frequencyHours(policy.frequency_value, policy.frequency_unit) === 12,
		)
	) {
		failures.push(
			"The required production policy is not a 12-hour schedule within the configured retention limit",
		);
	}
	for (const policy of productionPolicies) {
		if (
			retentionDays(policy.retention_value, policy.retention_unit) >
			maximumRetentionDays
		) {
			failures.push(
				`Backup policy ${policy.id ?? "unknown"} exceeds the ${maximumRetentionDays}-day retention limit`,
			);
		}
	}

	const activeBackups = backups.filter((backup) => !backup.deleted_at);
	for (const backup of activeBackups) {
		if (backup.protected === true) {
			failures.push(
				`Backup ${backup.id ?? "unknown"} is protected from deletion`,
			);
		}
		if (!backup.expires_at || Number.isNaN(Date.parse(backup.expires_at))) {
			failures.push(`Backup ${backup.id ?? "unknown"} has no valid expiry`);
		}
		const policy = backup.backup_policy;
		if (
			policy &&
			retentionDays(policy.retention_value, policy.retention_unit) >
				maximumRetentionDays
		) {
			failures.push(
				`Backup ${backup.id ?? "unknown"} was created by an over-retained policy`,
			);
		}
	}

	let receiptEvidence;
	let pending = false;
	if (receipt) {
		const issuedAt = Date.parse(receipt.issuedAt);
		const retentionSnapshot = receipt.deletion?.retentionExceptions?.find(
			(exception) => exception.code === PLANETSCALE_RETENTION_EXCEPTION_CODE,
		);
		const purgeNoLaterThan = Date.parse(
			retentionSnapshot?.purgeNoLaterThan ?? "",
		);
		const expectedDeadline =
			issuedAt + maximumRetentionDays * 24 * 60 * 60 * 1_000;
		if (
			Number.isNaN(issuedAt) ||
			Number.isNaN(purgeNoLaterThan) ||
			retentionSnapshot?.maximumRetentionDays !== maximumRetentionDays ||
			purgeNoLaterThan !== expectedDeadline
		) {
			failures.push(
				"The receipt does not contain the expected signed PlanetScale purge deadline",
			);
		} else {
			const eligibleBackups = backups.filter((backup) => {
				const startedAt = Date.parse(backupTimestamp(backup) ?? "");
				return !Number.isNaN(startedAt) && startedAt <= issuedAt;
			});
			pending = now.getTime() < purgeNoLaterThan;
			if (!pending) {
				for (const backup of eligibleBackups) {
					if (
						!backup.deleted_at ||
						Number.isNaN(Date.parse(backup.deleted_at))
					) {
						failures.push(
							`Pre-deletion backup ${backup.id ?? "unknown"} is not deleted after the signed deadline`,
						);
					}
				}
			}
			receiptEvidence = {
				issuedAt: receipt.issuedAt,
				purgeNoLaterThan: retentionSnapshot.purgeNoLaterThan,
				deadlineReached: !pending,
				eligibleBackups: eligibleBackups.length,
				deletedBackups: eligibleBackups.filter((backup) => backup.deleted_at)
					.length,
			};
		}
	}

	return {
		status: failures.length > 0 ? "failed" : pending ? "pending" : "verified",
		failures,
		summary: {
			productionPolicies: productionPolicies.length,
			requiredPolicies: requiredPolicies.length,
			backups: backups.length,
			activeBackups: activeBackups.length,
			protectedBackups: activeBackups.filter((backup) => backup.protected)
				.length,
		},
		activeBackups: activeBackups.map(safeBackupEvidence),
		...(receiptEvidence ? { receiptEvidence } : {}),
	};
};

const fetchPages = async ({ authorization, path, query }) => {
	const data = [];
	let page = 1;
	for (;;) {
		const url = new URL(`https://api.planetscale.com/v1${path}`);
		url.searchParams.set("page", String(page));
		url.searchParams.set("per_page", "100");
		for (const [name, value] of Object.entries(query ?? {})) {
			url.searchParams.set(name, String(value));
		}
		const response = await fetch(url, {
			headers: { Authorization: authorization, Accept: "application/json" },
		});
		if (!response.ok) {
			throw new Error(
				`PlanetScale API ${response.status} while reading ${url.pathname}`,
			);
		}
		const payload = await response.json();
		if (!Array.isArray(payload.data)) {
			throw new Error("PlanetScale API returned an invalid paginated response");
		}
		data.push(...payload.data);
		if (!payload.next_page) return data;
		page = payload.next_page;
	}
};

const parseArguments = (values) => {
	const options = {
		organization: "cinagroup",
		database: "cinaauth",
		branch: "main",
		maximumRetentionDays: 2,
	};
	for (let index = 0; index < values.length; index += 1) {
		const name = values[index];
		const value = values[index + 1];
		if (name === "--receipt" && value) options.receiptFile = value;
		else if (name === "--organization" && value) options.organization = value;
		else if (name === "--database" && value) options.database = value;
		else if (name === "--branch" && value) options.branch = value;
		else if (name === "--maximum-retention-days" && value) {
			options.maximumRetentionDays = Number.parseInt(value, 10);
		} else {
			throw new Error(`Unknown or incomplete argument: ${name}`);
		}
		index += 1;
	}
	if (
		!Number.isInteger(options.maximumRetentionDays) ||
		options.maximumRetentionDays < 1
	) {
		throw new Error("--maximum-retention-days must be a positive integer");
	}
	return options;
};

const canonicalize = (value) => {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) {
		return `[${value.map((item) => canonicalize(item)).join(",")}]`;
	}
	return `{${Object.entries(value)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
		.join(",")}}`;
};

const main = async () => {
	const options = parseArguments(process.argv.slice(2));
	const tokenId = process.env.PLANETSCALE_SERVICE_TOKEN_ID;
	const token = process.env.PLANETSCALE_SERVICE_TOKEN;
	if (!tokenId || !token) {
		throw new Error(
			"PLANETSCALE_SERVICE_TOKEN_ID and PLANETSCALE_SERVICE_TOKEN are required",
		);
	}
	const organization = encodeURIComponent(options.organization);
	const database = encodeURIComponent(options.database);
	const branch = encodeURIComponent(options.branch);
	const authorization = `${tokenId}:${token}`;
	const [policies, backups] = await Promise.all([
		fetchPages({
			authorization,
			path: `/organizations/${organization}/databases/${database}/backup-policies`,
		}),
		fetchPages({
			authorization,
			path: `/organizations/${organization}/databases/${database}/branches/${branch}/backups`,
			query: { all: true, state: "success" },
		}),
	]);
	let receipt;
	if (options.receiptFile) {
		const parsed = JSON.parse(await readFile(options.receiptFile, "utf8"));
		receipt = parsed.deletionReceipt ?? parsed;
	}
	const evidence = evaluateBackupEvidence({
		backups,
		policies,
		maximumRetentionDays: options.maximumRetentionDays,
		now: new Date(),
		receipt,
	});
	const report = {
		schemaVersion: 1,
		verifiedAt: new Date().toISOString(),
		source: "https://api.planetscale.com/v1",
		requiredPermission: "read_backups",
		scope: {
			organization: options.organization,
			database: options.database,
			branch: options.branch,
		},
		assurance:
			"PlanetScale control-plane retention and deletion state; this is not a physical-media sanitization certificate",
		...evidence,
	};
	const reportDigest = createHash("sha256")
		.update(canonicalize(report))
		.digest("hex");
	console.log(JSON.stringify({ ...report, reportDigest }, null, 2));
	process.exitCode =
		evidence.status === "verified" ? 0 : evidence.status === "pending" ? 2 : 1;
};

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
