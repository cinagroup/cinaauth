import type { CinaAuthDatabase } from "./database";
import { createDatabase } from "./database";
import type { CloudflareBindings } from "./env";

export const CINATOKEN_IDENTITY_EVENTS_QUEUE_NAME =
	"cinaauth-cinatoken-identity-events";
export const DEFAULT_CINATOKEN_IDENTITY_EVENTS_URL =
	"https://cinatoken.com/api/integrations/cinaauth/organization-events";
export const ORGANIZATION_IDENTITY_OUTBOX_CRON = "* * * * *";
export const ORGANIZATION_IDENTITY_OUTBOX_RETENTION_DAYS = 30;

const OUTBOX_TABLE = "cinaauth_cinatoken_identity_outbox";
const OUTBOX_CLAIM_LIMIT = 100;
const OUTBOX_LEASE_MS = 120_000;
const OUTBOX_BATCH_BYTES = 230 * 1024;
const OUTBOX_MAX_MESSAGE_BYTES = 128 * 1024;
const OUTBOX_MAX_REPLAY_EVENTS = 1_000;
const EVENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;

export type OrganizationIdentityEvent = {
	id: string;
	type:
		| "organization.upserted"
		| "organization.deleted"
		| "organization.membership.upserted"
		| "organization.membership.removed";
	occurredAt: string;
	organization: {
		id: string;
		name?: string;
		slug?: string | null;
		status?: "active" | "suspended" | "deleted";
		metadata?: Record<string, unknown> | null;
		updatedAt?: string;
	};
	membership?: {
		subject: string;
		email?: string | null;
		roles: string[];
		status?: "active" | "suspended" | "removed";
		updatedAt?: string;
	};
};

type OrganizationIdentityRuntimeEnv = {
	CINATOKEN_IDENTITY_EVENTS_SERVICE?: Pick<Fetcher, "fetch">;
	CINATOKEN_IDENTITY_EVENTS_URL?: string;
	CINATOKEN_IDENTITY_EVENTS_SECRET?: string;
};

type OrganizationIdentityOutboxRow = {
	id: string;
	event_id: string;
	payload: unknown;
	attempts: number;
};

export type OrganizationIdentityOutboxDrainResult = {
	claimed: number;
	queued: number;
	batches: number;
};

export type OrganizationIdentityOutboxReplayInput = {
	eventIds: string[];
};

const encoder = new TextEncoder();

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

const record = (value: unknown, name: string): Record<string, unknown> => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`${name} must be an object`);
	}
	return value as Record<string, unknown>;
};

const requiredText = (value: unknown, name: string) => {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`${name} must be a non-empty string`);
	}
	return value;
};

const optionalText = (value: unknown, name: string) => {
	if (value === undefined || value === null) return value;
	if (typeof value !== "string") throw new Error(`${name} must be a string`);
	return value;
};

const timestamp = (value: unknown, name: string) => {
	const text = requiredText(value, name);
	if (!Number.isFinite(Date.parse(text))) {
		throw new Error(`${name} must be an ISO timestamp`);
	}
	return new Date(text).toISOString();
};

const eventTypes = new Set<OrganizationIdentityEvent["type"]>([
	"organization.upserted",
	"organization.deleted",
	"organization.membership.upserted",
	"organization.membership.removed",
]);
const organizationStatuses = new Set<
	NonNullable<OrganizationIdentityEvent["organization"]["status"]>
>(["active", "suspended", "deleted"]);
const membershipStatuses = new Set<
	NonNullable<NonNullable<OrganizationIdentityEvent["membership"]>["status"]>
>(["active", "suspended", "removed"]);

/** Validate the immutable JSONB payload before handing it to Cloudflare Queues. */
export const parseOrganizationIdentityOutboxEvent = (
	payload: unknown,
	expectedEventId?: string,
): OrganizationIdentityEvent => {
	const input = record(payload, "identity outbox payload");
	const id = requiredText(input.id, "identity event id");
	if (expectedEventId !== undefined && id !== expectedEventId) {
		throw new Error("Identity outbox event id does not match its row");
	}
	if (typeof input.type !== "string" || !eventTypes.has(input.type as never)) {
		throw new Error("Identity outbox event type is unsupported");
	}
	const type = input.type as OrganizationIdentityEvent["type"];
	const occurredAt = timestamp(input.occurredAt, "identity event occurredAt");
	const rawOrganization = record(input.organization, "identity organization");
	const organization: OrganizationIdentityEvent["organization"] = {
		id: requiredText(rawOrganization.id, "identity organization id"),
	};
	const name = optionalText(rawOrganization.name, "identity organization name");
	if (typeof name === "string") organization.name = name;
	const slug = optionalText(rawOrganization.slug, "identity organization slug");
	if (slug !== undefined) organization.slug = slug;
	if (rawOrganization.status !== undefined) {
		if (
			typeof rawOrganization.status !== "string" ||
			!organizationStatuses.has(rawOrganization.status as never)
		) {
			throw new Error("Identity organization status is unsupported");
		}
		organization.status = rawOrganization.status as NonNullable<
			OrganizationIdentityEvent["organization"]["status"]
		>;
	}
	if (rawOrganization.metadata !== undefined) {
		organization.metadata =
			rawOrganization.metadata === null
				? null
				: record(rawOrganization.metadata, "identity organization metadata");
	}
	if (rawOrganization.updatedAt !== undefined) {
		organization.updatedAt = timestamp(
			rawOrganization.updatedAt,
			"identity organization updatedAt",
		);
	}
	if (type === "organization.upserted" && organization.name === undefined) {
		throw new Error("Identity organization upsert requires a name");
	}

	let membership: OrganizationIdentityEvent["membership"];
	if (type.startsWith("organization.membership.")) {
		const rawMembership = record(input.membership, "identity membership");
		if (
			!Array.isArray(rawMembership.roles) ||
			!rawMembership.roles.every((role) => typeof role === "string")
		) {
			throw new Error("Identity membership roles must be strings");
		}
		const roles = [...new Set(rawMembership.roles)].sort();
		if (type === "organization.membership.upserted" && roles.length === 0) {
			throw new Error("Identity membership upsert requires a role");
		}
		membership = {
			subject: requiredText(
				rawMembership.subject,
				"identity membership subject",
			),
			roles: type === "organization.membership.removed" ? [] : roles,
		};
		const email = optionalText(
			rawMembership.email,
			"identity membership email",
		);
		if (email !== undefined) membership.email = email;
		if (rawMembership.status !== undefined) {
			if (
				typeof rawMembership.status !== "string" ||
				!membershipStatuses.has(rawMembership.status as never)
			) {
				throw new Error("Identity membership status is unsupported");
			}
			membership.status = rawMembership.status as NonNullable<
				NonNullable<OrganizationIdentityEvent["membership"]>["status"]
			>;
		}
		if (rawMembership.updatedAt !== undefined) {
			membership.updatedAt = timestamp(
				rawMembership.updatedAt,
				"identity membership updatedAt",
			);
		}
		if (type === "organization.membership.removed") {
			membership.status = "removed";
		}
	}

	return {
		id,
		type,
		occurredAt,
		organization,
		...(membership ? { membership } : {}),
	};
};

/** Parse the protected operations request without accepting unknown fields. */
export const parseOrganizationIdentityOutboxReplayInput = (
	input: unknown,
): OrganizationIdentityOutboxReplayInput => {
	const body = record(input, "identity outbox replay request");
	if (Object.keys(body).some((key) => key !== "eventIds")) {
		throw new Error("Identity outbox replay request contains unknown fields");
	}
	if (!Array.isArray(body.eventIds)) {
		throw new Error("Identity outbox replay eventIds must be an array");
	}
	const eventIds = [
		...new Set(
			body.eventIds.map((value) =>
				typeof value === "string" ? value.trim() : "",
			),
		),
	];
	if (
		eventIds.length === 0 ||
		eventIds.length > OUTBOX_MAX_REPLAY_EVENTS ||
		eventIds.some((id) => !EVENT_ID_PATTERN.test(id))
	) {
		throw new Error(
			`Identity outbox replay requires 1-${OUTBOX_MAX_REPLAY_EVENTS} valid event ids`,
		);
	}
	return { eventIds };
};

const hmacSha256 = async (secret: string, payload: string) => {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(payload),
	);
	return [...new Uint8Array(signature)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
};

export const deliverOrganizationIdentityEvent = async (
	env: OrganizationIdentityRuntimeEnv,
	event: OrganizationIdentityEvent,
) => {
	const secret = env.CINATOKEN_IDENTITY_EVENTS_SECRET;
	if (!secret || secret.length < 32) {
		throw new Error("CinaToken identity event secret is not configured");
	}
	const body = JSON.stringify(event);
	const requestTimestamp = Math.floor(Date.now() / 1000).toString();
	const signature = await hmacSha256(secret, `${requestTimestamp}.${body}`);
	const request = new Request(
		env.CINATOKEN_IDENTITY_EVENTS_URL ?? DEFAULT_CINATOKEN_IDENTITY_EVENTS_URL,
		{
			method: "POST",
			signal: AbortSignal.timeout(10_000),
			headers: {
				"Content-Type": "application/json",
				"X-CinaAuth-Event-Timestamp": requestTimestamp,
				"X-CinaAuth-Signature": `v1=${signature}`,
			},
			body,
		},
	);
	const response = env.CINATOKEN_IDENTITY_EVENTS_SERVICE
		? await env.CINATOKEN_IDENTITY_EVENTS_SERVICE.fetch(request)
		: await fetch(request);
	const status = response.status;
	await response.body?.cancel().catch(() => undefined);
	if (status !== 200 && status !== 202) {
		throw new Error(
			`CinaToken identity event delivery failed with HTTP ${status}`,
		);
	}
};

type IdentityQueueMessage = Pick<
	Message<OrganizationIdentityEvent>,
	"ack" | "attempts" | "body" | "id" | "retry"
>;

const handleIdentityMessage = async (
	message: IdentityQueueMessage,
	env: OrganizationIdentityRuntimeEnv,
) => {
	try {
		await deliverOrganizationIdentityEvent(env, message.body);
		message.ack();
	} catch (error) {
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.cinatoken_identity.delivery_failed",
				eventId: message.body.id,
				eventType: message.body.type,
				queueMessageId: message.id,
				attempts: message.attempts,
				error: errorMessage(error),
			}),
		);
		message.retry({
			delaySeconds: Math.min(900, 2 ** message.attempts * 10),
		});
	}
};

export const handleOrganizationIdentityBatch = async (
	batch: Pick<MessageBatch<OrganizationIdentityEvent>, "messages">,
	env: OrganizationIdentityRuntimeEnv,
) => {
	await Promise.all(
		batch.messages.map((message) => handleIdentityMessage(message, env)),
	);
};

const claimOrganizationIdentityOutbox = async (
	database: CinaAuthDatabase,
	lockToken: string,
) => {
	const result = await database.query<OrganizationIdentityOutboxRow>(
		`WITH candidates AS (
			SELECT "id"
			FROM "${OUTBOX_TABLE}"
			WHERE "queued_at" IS NULL
				AND "available_at" <= CURRENT_TIMESTAMP
				AND ("locked_until" IS NULL OR "locked_until" <= CURRENT_TIMESTAMP)
			ORDER BY "id"
			LIMIT $1
			FOR UPDATE SKIP LOCKED
		)
		UPDATE "${OUTBOX_TABLE}" AS identity_outbox
		SET "lock_token" = $2,
			"locked_until" = CURRENT_TIMESTAMP + ($3::DOUBLE PRECISION * INTERVAL '1 millisecond'),
			"attempts" = identity_outbox."attempts" + 1
		FROM candidates
		WHERE identity_outbox."id" = candidates."id"
		RETURNING
			identity_outbox."id"::TEXT AS "id",
			identity_outbox."event_id",
			identity_outbox."payload",
			identity_outbox."attempts"`,
		[OUTBOX_CLAIM_LIMIT, lockToken, OUTBOX_LEASE_MS],
	);
	return result.rows;
};

const markOrganizationIdentityOutboxQueued = async (
	database: CinaAuthDatabase,
	lockToken: string,
	rows: readonly OrganizationIdentityOutboxRow[],
) => {
	if (rows.length === 0) return;
	await database.query(
		`UPDATE "${OUTBOX_TABLE}"
		SET "queued_at" = CURRENT_TIMESTAMP,
			"locked_until" = NULL,
			"lock_token" = NULL,
			"last_error" = NULL
		WHERE "lock_token" = $1 AND "id" = ANY($2::BIGINT[])`,
		[lockToken, rows.map((row) => row.id)],
	);
};

const releaseOrganizationIdentityOutbox = async (
	database: CinaAuthDatabase,
	lockToken: string,
	rows: readonly OrganizationIdentityOutboxRow[],
	error: unknown,
) => {
	if (rows.length === 0) return;
	const attempts = Math.max(...rows.map((row) => row.attempts));
	const delaySeconds = Math.min(900, 10 * 2 ** Math.max(0, attempts - 1));
	await database.query(
		`UPDATE "${OUTBOX_TABLE}"
		SET "available_at" = CURRENT_TIMESTAMP + ($3::DOUBLE PRECISION * INTERVAL '1 second'),
			"locked_until" = NULL,
			"lock_token" = NULL,
			"last_error" = LEFT($4, 2048)
		WHERE "lock_token" = $1 AND "id" = ANY($2::BIGINT[])`,
		[lockToken, rows.map((row) => row.id), delaySeconds, errorMessage(error)],
	);
};

const toQueueBatches = (
	rows: readonly OrganizationIdentityOutboxRow[],
): Array<{
	rows: OrganizationIdentityOutboxRow[];
	messages: MessageSendRequest<OrganizationIdentityEvent>[];
}> => {
	const batches: Array<{
		rows: OrganizationIdentityOutboxRow[];
		messages: MessageSendRequest<OrganizationIdentityEvent>[];
	}> = [];
	let currentRows: OrganizationIdentityOutboxRow[] = [];
	let currentMessages: MessageSendRequest<OrganizationIdentityEvent>[] = [];
	let currentBytes = 0;

	for (const row of rows) {
		const event = parseOrganizationIdentityOutboxEvent(
			row.payload,
			row.event_id,
		);
		const eventBytes = encoder.encode(JSON.stringify(event)).byteLength;
		if (eventBytes > OUTBOX_MAX_MESSAGE_BYTES) {
			throw new Error(`Identity outbox event ${event.id} exceeds Queue limits`);
		}
		if (
			currentMessages.length > 0 &&
			(currentMessages.length >= 100 ||
				currentBytes + eventBytes > OUTBOX_BATCH_BYTES)
		) {
			batches.push({ rows: currentRows, messages: currentMessages });
			currentRows = [];
			currentMessages = [];
			currentBytes = 0;
		}
		currentRows.push(row);
		currentMessages.push({ body: event, contentType: "json" });
		currentBytes += eventBytes;
	}
	if (currentMessages.length > 0) {
		batches.push({ rows: currentRows, messages: currentMessages });
	}
	return batches;
};

/**
 * Claims a short lease, durably writes events to Queue in bounded batches, then
 * marks only confirmed rows as queued. A crash after Queue acceptance can cause
 * a duplicate with the same event id; CinaToken's inbox makes that safe.
 */
export const drainOrganizationIdentityOutbox = async (
	env: CloudflareBindings,
	databaseOverride?: CinaAuthDatabase,
): Promise<OrganizationIdentityOutboxDrainResult> => {
	const database = databaseOverride ?? createDatabase(env);
	const ownsDatabase = databaseOverride === undefined;
	const lockToken = crypto.randomUUID();
	let remaining: OrganizationIdentityOutboxRow[] = [];
	let queued = 0;
	let batches = 0;
	try {
		remaining = await claimOrganizationIdentityOutbox(database, lockToken);
		const claimed = remaining.length;
		for (const batch of toQueueBatches(remaining)) {
			await env.CINATOKEN_IDENTITY_EVENTS_QUEUE.sendBatch(batch.messages);
			await markOrganizationIdentityOutboxQueued(
				database,
				lockToken,
				batch.rows,
			);
			queued += batch.rows.length;
			batches += 1;
			const completed = new Set(batch.rows.map((row) => row.id));
			remaining = remaining.filter((row) => !completed.has(row.id));
		}
		return { claimed, queued, batches };
	} catch (error) {
		await releaseOrganizationIdentityOutbox(
			database,
			lockToken,
			remaining,
			error,
		).catch((releaseError) => {
			console.error(
				JSON.stringify({
					level: "error",
					message: "cinaauth.cinatoken_identity.outbox_release_failed",
					error: errorMessage(releaseError),
				}),
			);
		});
		throw error;
	} finally {
		if (ownsDatabase) await database.end().catch(() => undefined);
	}
};

/** Requeue retained rows with their stable event ids for an idempotent replay. */
export const replayOrganizationIdentityOutbox = async (
	database: CinaAuthDatabase,
	eventIds: readonly string[],
): Promise<number> => {
	const ids = parseOrganizationIdentityOutboxReplayInput({ eventIds }).eventIds;
	const result = await database.query<{ event_id: string }>(
		`UPDATE "${OUTBOX_TABLE}"
		SET "queued_at" = NULL,
			"available_at" = CURRENT_TIMESTAMP,
			"locked_until" = NULL,
			"lock_token" = NULL,
			"attempts" = 0,
			"last_error" = NULL,
			"replay_count" = "replay_count" + 1
		WHERE "event_id" = ANY($1::TEXT[])
		RETURNING "event_id"`,
		[ids],
	);
	return result.rows.length;
};

/** Retain enough delivery history for incident replay without unbounded growth. */
export const pruneOrganizationIdentityOutbox = async (
	database: CinaAuthDatabase,
	now = new Date(),
): Promise<number> => {
	const cutoff = new Date(
		now.getTime() -
			ORGANIZATION_IDENTITY_OUTBOX_RETENTION_DAYS * 24 * 60 * 60 * 1_000,
	);
	const result = await database.query(
		`DELETE FROM "${OUTBOX_TABLE}"
		WHERE "queued_at" IS NOT NULL AND "queued_at" < $1`,
		[cutoff],
	);
	return result.rowCount ?? 0;
};
