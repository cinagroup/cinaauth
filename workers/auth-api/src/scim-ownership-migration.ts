import type { Pool, PoolClient, QueryResultRow } from "pg";

const SCIM_MANAGEMENT_ROLES = new Set(["owner", "admin"]);
// Keep this aligned with packages/scim/src/routes.ts. These identifiers share
// the account-linking namespace and can never identify a SCIM provider.
const RESERVED_ACCOUNT_PROVIDER_IDS = new Set([
	"credential",
	"email-otp",
	"magic-link",
	"phone-number",
	"anonymous",
	"siwe",
	// Production has used these social namespaces. Keep them reserved even
	// during a temporary credential outage so another provider cannot claim
	// identifiers that existing account rows may still use.
	"google",
	"github",
]);
const INPUT_KEYS = new Set([
	"providerId",
	"organizationId",
	"ownerUserId",
	"apply",
]);

export type SCIMOwnershipMigrationInput = {
	providerId: string;
	organizationId: string;
	ownerUserId: string;
	apply: boolean;
};

type SCIMOwnershipMigrationStatus =
	| "ready"
	| "migrated"
	| "already_migrated"
	| "provider_not_found"
	| "organization_not_found"
	| "owner_not_found"
	| "owner_not_authorized"
	| "provider_id_collision"
	| "provider_has_accounts"
	| "provider_already_owned";

export type SCIMOwnershipMigrationResult = {
	mode: "preview" | "apply";
	status: SCIMOwnershipMigrationStatus;
	providerId: string;
	organizationId: string;
	ownerUserId: string;
	tokenRotated: boolean;
	accountCount?: number;
	scimToken?: string;
};

type SCIMOwnershipToken = {
	/** Full bearer value. Return it once; never persist or log it. */
	scimToken: string;
	/** SHA-256 of the random base token, matching the production SCIM config. */
	storedToken: string;
};

type MigrationOptions = {
	/** Configured social/generic provider ids sharing the account namespace. */
	reservedProviderIds?: readonly string[];
	createToken?: (
		providerId: string,
		organizationId: string,
	) => Promise<SCIMOwnershipToken>;
	createAuditId?: () => string;
	audit?: {
		actorIp?: string;
		actorUa?: string;
		actorSite?: string;
		versionId?: string;
	};
};

type ProviderRow = QueryResultRow & {
	id: string;
	providerId: string;
	organizationId: string | null;
	userId: string | null;
};

type IdRow = QueryResultRow & { id: string };
type MemberRow = QueryResultRow & { role: string };
type CountRow = QueryResultRow & { count: number | string };

const encodeBase64Url = (bytes: Uint8Array): string => {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
};

const isStrictIdentifier = (value: unknown): value is string =>
	typeof value === "string" &&
	value.length > 0 &&
	value.length <= 255 &&
	value.trim() === value &&
	!/[\u0000-\u001f\u007f]/.test(value);

/**
 * Parse the deployment-only migration request. Applying is deliberately opt-in;
 * omitting `apply` always produces a preview.
 */
export const parseSCIMOwnershipMigrationInput = (
	value: unknown,
	reservedProviderIds: readonly string[] = [],
): SCIMOwnershipMigrationInput | null => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const body = value as Record<string, unknown>;
	if (Object.keys(body).some((key) => !INPUT_KEYS.has(key))) return null;
	if (
		!isStrictIdentifier(body.providerId) ||
		body.providerId.includes(":") ||
		isReservedAccountProviderId(body.providerId, reservedProviderIds) ||
		!isStrictIdentifier(body.organizationId) ||
		!isStrictIdentifier(body.ownerUserId) ||
		(body.apply !== undefined && typeof body.apply !== "boolean")
	) {
		return null;
	}
	return {
		providerId: body.providerId,
		organizationId: body.organizationId,
		ownerUserId: body.ownerUserId,
		apply: body.apply === true,
	};
};

const isReservedAccountProviderId = (
	providerId: string,
	configuredProviderIds: readonly string[],
): boolean =>
	RESERVED_ACCOUNT_PROVIDER_IDS.has(providerId) ||
	configuredProviderIds.includes(providerId);

/**
 * Create a replacement SCIM bearer whose encoded claims include the destination
 * organization. The database receives only the random base token's SHA-256.
 */
export const createSCIMOwnershipToken = async (
	providerId: string,
	organizationId: string,
	randomBytes?: Uint8Array,
): Promise<SCIMOwnershipToken> => {
	const entropy = randomBytes
		? new Uint8Array(randomBytes)
		: crypto.getRandomValues(new Uint8Array(32));
	if (entropy.byteLength < 32) {
		throw new Error(
			"SCIM migration token rotation requires 256 bits of entropy",
		);
	}
	const baseToken = encodeBase64Url(entropy);
	const bearerPayload = new TextEncoder().encode(
		`${baseToken}:${providerId}:${organizationId}`,
	);
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(baseToken),
	);
	return {
		scimToken: encodeBase64Url(bearerPayload),
		storedToken: encodeBase64Url(new Uint8Array(digest)),
	};
};

const hasSCIMManagementRole = (role: string): boolean =>
	role
		.split(",")
		.map((candidate) => candidate.trim())
		.some((candidate) => SCIM_MANAGEMENT_ROLES.has(candidate));

const resultFor = (
	input: SCIMOwnershipMigrationInput,
	status: SCIMOwnershipMigrationStatus,
	extra: Pick<SCIMOwnershipMigrationResult, "tokenRotated"> &
		Partial<Pick<SCIMOwnershipMigrationResult, "accountCount" | "scimToken">>,
): SCIMOwnershipMigrationResult => ({
	mode: input.apply ? "apply" : "preview",
	status,
	providerId: input.providerId,
	organizationId: input.organizationId,
	ownerUserId: input.ownerUserId,
	...extra,
});

const writeMigrationAudit = async (
	client: PoolClient,
	result: SCIMOwnershipMigrationResult,
	options: MigrationOptions,
): Promise<void> => {
	const successful = new Set<SCIMOwnershipMigrationStatus>([
		"ready",
		"migrated",
		"already_migrated",
	]).has(result.status);
	const metadata = JSON.stringify({
		mode: result.mode,
		status: result.status,
		organizationId: result.organizationId,
		ownerUserId: result.ownerUserId,
		accountCount: result.accountCount ?? null,
		tokenRotated: result.tokenRotated,
		versionId: options.audit?.versionId ?? null,
	});
	await client.query(
		`INSERT INTO "auditLog" (
			"id", "timestamp", "actorId", "actorRole", "actorIp", "actorUa",
			"actorSite", "category", "action", "targetType", "targetId",
			"result", "metadata"
		) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		[
			options.createAuditId?.() ?? crypto.randomUUID(),
			new Date(),
			"migration_token",
			options.audit?.actorIp ?? null,
			options.audit?.actorUa ?? null,
			options.audit?.actorSite ?? "auth-worker",
			"provisioning",
			result.mode === "apply"
				? "scim.provider_ownership.claim"
				: "scim.provider_ownership.preview",
			"scimProvider",
			result.providerId,
			successful ? "success" : "failure",
			metadata,
		],
	);
};

/**
 * Claim one legacy SCIM provider for a verified organization owner/admin.
 *
 * This operation is intentionally deployment-only. It never discovers or
 * bulk-assigns providers, never touches SCIM-managed accounts, and never
 * rebinds a provider that has any existing owner field. The apply path holds a
 * serializable transaction and writes its audit row before commit.
 */
export const migrateLegacySCIMProviderOwnership = async (
	pool: Pick<Pool, "connect">,
	input: SCIMOwnershipMigrationInput,
	options: MigrationOptions = {},
): Promise<SCIMOwnershipMigrationResult> => {
	if (
		isReservedAccountProviderId(
			input.providerId,
			options.reservedProviderIds ?? [],
		)
	) {
		return resultFor(input, "provider_id_collision", { tokenRotated: false });
	}

	const client = await pool.connect();
	const finish = async (result: SCIMOwnershipMigrationResult) => {
		await writeMigrationAudit(client, result, options);
		await client.query("COMMIT");
		return result;
	};

	try {
		await client.query(
			input.apply
				? "BEGIN ISOLATION LEVEL SERIALIZABLE"
				: "BEGIN ISOLATION LEVEL REPEATABLE READ",
		);
		await client.query("SET LOCAL statement_timeout = '10s'");
		await client.query("SET LOCAL lock_timeout = '5s'");
		const ssoProvider = await client.query<IdRow>(
			'SELECT "id" FROM "ssoProvider" WHERE "providerId" = $1',
			[input.providerId],
		);
		if (ssoProvider.rows[0]) {
			const result = resultFor(input, "provider_id_collision", {
				tokenRotated: false,
			});
			await client.query("COMMIT");
			return result;
		}
		const providerResult = await client.query<ProviderRow>(
			`SELECT "id", "providerId", "organizationId", "userId"
			 FROM "scimProvider"
			 WHERE "providerId" = $1${input.apply ? " FOR UPDATE" : ""}`,
			[input.providerId],
		);
		const provider = providerResult.rows[0];
		if (!provider) {
			return await finish(
				resultFor(input, "provider_not_found", { tokenRotated: false }),
			);
		}

		const organization = await client.query<IdRow>(
			'SELECT "id" FROM "organization" WHERE "id" = $1',
			[input.organizationId],
		);
		if (!organization.rows[0]) {
			return await finish(
				resultFor(input, "organization_not_found", { tokenRotated: false }),
			);
		}

		const owner = await client.query<IdRow>(
			'SELECT "id" FROM "user" WHERE "id" = $1',
			[input.ownerUserId],
		);
		if (!owner.rows[0]) {
			return await finish(
				resultFor(input, "owner_not_found", { tokenRotated: false }),
			);
		}

		const membership = await client.query<MemberRow>(
			`SELECT "role" FROM "member"
			 WHERE "organizationId" = $1 AND "userId" = $2`,
			[input.organizationId, input.ownerUserId],
		);
		if (
			!membership.rows[0] ||
			!hasSCIMManagementRole(membership.rows[0].role)
		) {
			return await finish(
				resultFor(input, "owner_not_authorized", { tokenRotated: false }),
			);
		}

		if (provider.organizationId !== null || provider.userId !== null) {
			const exactDestination =
				provider.organizationId === input.organizationId &&
				provider.userId === input.ownerUserId;
			return await finish(
				resultFor(
					input,
					exactDestination ? "already_migrated" : "provider_already_owned",
					{ tokenRotated: false },
				),
			);
		}

		const accountResult = await client.query<CountRow>(
			'SELECT COUNT(*)::int AS "count" FROM "account" WHERE "providerId" = $1',
			[input.providerId],
		);
		const accountCount = Number(accountResult.rows[0]?.count ?? 0);
		if (!Number.isSafeInteger(accountCount) || accountCount < 0) {
			throw new Error("Invalid SCIM account count returned by PostgreSQL");
		}
		if (accountCount > 0) {
			return await finish(
				resultFor(input, "provider_has_accounts", {
					accountCount,
					tokenRotated: false,
				}),
			);
		}

		if (!input.apply) {
			return await finish(
				resultFor(input, "ready", {
					accountCount,
					tokenRotated: false,
				}),
			);
		}

		const token = await (options.createToken ?? createSCIMOwnershipToken)(
			input.providerId,
			input.organizationId,
		);
		const updated = await client.query<IdRow>(
			`UPDATE "scimProvider"
			 SET "organizationId" = $1, "userId" = $2, "scimToken" = $3
			 WHERE "id" = $4 AND "organizationId" IS NULL AND "userId" IS NULL
			 RETURNING "id"`,
			[input.organizationId, input.ownerUserId, token.storedToken, provider.id],
		);
		if (updated.rows.length !== 1) {
			throw new Error("SCIM provider ownership changed concurrently");
		}

		return await finish(
			resultFor(input, "migrated", {
				accountCount,
				tokenRotated: true,
				scimToken: token.scimToken,
			}),
		);
	} catch (error) {
		await client.query("ROLLBACK").catch(() => undefined);
		throw error;
	} finally {
		client.release();
	}
};
