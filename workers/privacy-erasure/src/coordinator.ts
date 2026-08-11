import { DurableObject } from "cloudflare:workers";
import type { PrivacyErasureEnv } from "./env";
import type {
	CompletedTargetResult,
	ErasureOperation,
	ErasureTarget,
	TargetErasureResult,
} from "./protocol";
import { eraseTarget, hmacDigest, parseTargets } from "./protocol";

export type CoordinatorResult =
	| {
			kind: "completed";
			result: {
				status: "completed";
				completedAt: string;
				evidenceId: string;
			};
	  }
	| { kind: "pending"; retryAfterSeconds: number }
	| {
			kind: "conflict";
			code: "OPERATION_SUBJECT_CONFLICT" | "TARGET_SET_CHANGED";
	  }
	| { kind: "unavailable" };

type OperationRow = {
	operationId: string;
	subjectDigest: string;
	targetSetDigest: string;
	targetSetVersion: number;
	status: "pending" | "completed";
	completedAt: string | null;
	evidenceId: string | null;
	leaseToken: string | null;
	leaseExpiresAt: number | null;
};

type TargetRow = {
	targetId: string;
	status: "pending" | "completed" | "not-applicable";
	completedAt: string | null;
	evidenceDigest: string | null;
	retryAfterSeconds: number | null;
};

type TargetOutcome = {
	targetId: string;
	result: TargetErasureResult;
};

const LEASE_DURATION_MS = 20_000;
const DEFAULT_RETRY_SECONDS = 30;
const SUBJECT_DIGEST_DOMAIN = "cinaauth.privacy.erasure.subject.v1";
const TARGET_SET_DOMAIN_V1 = "cinaauth.privacy.erasure.target-set.v1";
const TARGET_SET_DOMAIN_V2 = "cinaauth.privacy.erasure.target-set.v2";
const TARGET_EVIDENCE_DOMAIN = "cinaauth.privacy.erasure.target-evidence.v1";
const FINAL_EVIDENCE_DOMAIN = "cinaauth.privacy.erasure.final-evidence.v1";

const maxRetryAfter = (rows: TargetRow[]) =>
	Math.max(
		DEFAULT_RETRY_SECONDS,
		...rows.map(({ retryAfterSeconds }) => retryAfterSeconds ?? 0),
	);

/**
 * One SQLite-backed coordinator exists per stable privacy deletion operation.
 * Only keyed subject/evidence digests and public-safe target IDs are persisted.
 */
export class ErasureCoordinator extends DurableObject<PrivacyErasureEnv> {
	constructor(ctx: DurableObjectState, env: PrivacyErasureEnv) {
		super(ctx, env);
		void ctx.blockConcurrencyWhile(async () => {
			this.migrate();
		});
	}

	private migrate() {
		this.ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
				id INTEGER PRIMARY KEY,
				applied_at TEXT NOT NULL
			);
		`);
		const version = this.ctx.storage.sql
			.exec<{ version: number }>(
				"SELECT COALESCE(MAX(id), 0) AS version FROM _sql_schema_migrations",
			)
			.one().version;
		if (version < 1) {
			this.ctx.storage.sql.exec(`
				CREATE TABLE IF NOT EXISTS erasure_operations (
					operation_id TEXT PRIMARY KEY,
					subject_digest TEXT NOT NULL,
					target_set_digest TEXT NOT NULL,
					status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
					completed_at TEXT,
					evidence_id TEXT,
					lease_token TEXT,
					lease_expires_at INTEGER,
					created_at TEXT NOT NULL,
					updated_at TEXT NOT NULL
				);
				CREATE TABLE IF NOT EXISTS erasure_targets (
					target_id TEXT PRIMARY KEY,
					status TEXT NOT NULL CHECK (
						status IN ('pending', 'completed', 'not-applicable')
					),
					completed_at TEXT,
					evidence_digest TEXT,
					retry_after_seconds INTEGER,
					updated_at TEXT NOT NULL
				);
				INSERT INTO _sql_schema_migrations (id, applied_at)
				VALUES (1, datetime('now'));
			`);
		}
		if (version < 2) {
			this.ctx.storage.sql.exec(`
				ALTER TABLE erasure_operations
					ADD COLUMN target_set_version INTEGER NOT NULL DEFAULT 1;
				INSERT INTO _sql_schema_migrations (id, applied_at)
				VALUES (2, datetime('now'));
			`);
		}
	}

	private readOperation() {
		return this.ctx.storage.sql
			.exec<OperationRow>(
				`SELECT operation_id AS operationId,
					subject_digest AS subjectDigest,
					target_set_digest AS targetSetDigest,
					target_set_version AS targetSetVersion,
					status,
					completed_at AS completedAt,
					evidence_id AS evidenceId,
					lease_token AS leaseToken,
					lease_expires_at AS leaseExpiresAt
				 FROM erasure_operations
				 LIMIT 1`,
			)
			.toArray()[0];
	}

	private readTargets() {
		return this.ctx.storage.sql
			.exec<TargetRow>(
				`SELECT target_id AS targetId,
					status,
					completed_at AS completedAt,
					evidence_digest AS evidenceDigest,
					retry_after_seconds AS retryAfterSeconds
				 FROM erasure_targets
				 ORDER BY target_id`,
			)
			.toArray();
	}

	private createOperation(
		operation: ErasureOperation,
		subjectDigest: string,
		targetSetDigest: string,
		targetIds: string[],
	) {
		const now = new Date().toISOString();
		this.ctx.storage.sql.exec(
			`INSERT INTO erasure_operations (
				operation_id, subject_digest, target_set_digest, target_set_version,
				status,
				created_at, updated_at
			 ) VALUES (?, ?, ?, 2, 'pending', ?, ?)`,
			operation.operationId,
			subjectDigest,
			targetSetDigest,
			now,
			now,
		);
		for (const targetId of targetIds) {
			this.ctx.storage.sql.exec(
				`INSERT INTO erasure_targets (target_id, status, updated_at)
				 VALUES (?, 'pending', ?)`,
				targetId,
				now,
			);
		}
	}

	private acquireLease(token: string, expiresAt: number) {
		this.ctx.storage.sql.exec(
			`UPDATE erasure_operations
			 SET lease_token = ?, lease_expires_at = ?, updated_at = ?`,
			token,
			expiresAt,
			new Date().toISOString(),
		);
	}

	private releaseLease(token: string) {
		this.ctx.storage.sql.exec(
			`UPDATE erasure_operations
			 SET lease_token = NULL, lease_expires_at = NULL, updated_at = ?
			 WHERE lease_token = ?`,
			new Date().toISOString(),
			token,
		);
	}

	private async persistOutcome(outcome: TargetOutcome) {
		const now = new Date().toISOString();
		if (outcome.result.status === "pending") {
			this.ctx.storage.sql.exec(
				`UPDATE erasure_targets
				 SET retry_after_seconds = ?, updated_at = ?
				 WHERE target_id = ? AND status = 'pending'`,
				outcome.result.retryAfterSeconds ?? null,
				now,
				outcome.targetId,
			);
			return;
		}
		const result: CompletedTargetResult = outcome.result;
		const evidenceDigest = await hmacDigest(
			TARGET_EVIDENCE_DOMAIN,
			`${outcome.targetId}\n${result.status}\n${result.completedAt}\n${result.evidenceId}`,
			this.env.CINAAUTH_ERASURE_STORAGE_SECRET,
		);
		this.ctx.storage.sql.exec(
			`UPDATE erasure_targets
			 SET status = ?, completed_at = ?, evidence_digest = ?,
				retry_after_seconds = NULL, updated_at = ?
			 WHERE target_id = ? AND status = 'pending'`,
			result.status,
			result.completedAt,
			evidenceDigest,
			now,
			outcome.targetId,
		);
	}

	private async finalize(rows: TargetRow[]): Promise<CoordinatorResult> {
		const completedAt = new Date().toISOString();
		const evidenceInput = rows
			.map(
				(row) =>
					`${row.targetId}\n${row.status}\n${row.completedAt}\n${row.evidenceDigest}`,
			)
			.join("\n---\n");
		const digest = await hmacDigest(
			FINAL_EVIDENCE_DOMAIN,
			evidenceInput,
			this.env.CINAAUTH_ERASURE_STORAGE_SECRET,
		);
		const evidenceId = `cinaauth-erasure-v1:${digest.slice("hmac-sha256:".length)}`;
		this.ctx.storage.sql.exec(
			`UPDATE erasure_operations
			 SET status = 'completed', completed_at = ?, evidence_id = ?,
				lease_token = NULL, lease_expires_at = NULL, updated_at = ?`,
			completedAt,
			evidenceId,
			completedAt,
		);
		return {
			kind: "completed",
			result: { status: "completed", completedAt, evidenceId },
		};
	}

	async processOperation(
		operation: ErasureOperation,
		configuredTargets: ErasureTarget[],
	): Promise<CoordinatorResult> {
		if (
			!this.env.CINAAUTH_ERASURE_STORAGE_SECRET ||
			this.env.CINAAUTH_ERASURE_STORAGE_SECRET.length < 32
		) {
			return { kind: "unavailable" };
		}
		let targets: ErasureTarget[];
		try {
			targets = parseTargets(JSON.stringify(configuredTargets));
		} catch {
			return { kind: "unavailable" };
		}
		if (targets.length === 0) return { kind: "unavailable" };
		const targetIds = targets.map(({ id }) => id);
		const subjectDigest = await hmacDigest(
			SUBJECT_DIGEST_DOMAIN,
			`${operation.subject.id}\n${operation.subject.email}`,
			this.env.CINAAUTH_ERASURE_STORAGE_SECRET,
		);
		const targetSetDigestV1 = await hmacDigest(
			TARGET_SET_DOMAIN_V1,
			targetIds.join("\n"),
			this.env.CINAAUTH_ERASURE_STORAGE_SECRET,
		);
		const targetSetDigestV2 = await hmacDigest(
			TARGET_SET_DOMAIN_V2,
			targets.map(({ id, url }) => `${id}\n${url}`).join("\n---\n"),
			this.env.CINAAUTH_ERASURE_STORAGE_SECRET,
		);

		let stored = this.readOperation();
		if (!stored) {
			this.createOperation(
				operation,
				subjectDigest,
				targetSetDigestV2,
				targetIds,
			);
			stored = this.readOperation();
		}
		if (!stored || stored.operationId !== operation.operationId) {
			return {
				kind: "conflict",
				code: "OPERATION_SUBJECT_CONFLICT",
			};
		}
		if (stored.subjectDigest !== subjectDigest) {
			return {
				kind: "conflict",
				code: "OPERATION_SUBJECT_CONFLICT",
			};
		}
		const expectedTargetSetDigest =
			stored.targetSetVersion === 1 ? targetSetDigestV1 : targetSetDigestV2;
		if (stored.targetSetDigest !== expectedTargetSetDigest) {
			return { kind: "conflict", code: "TARGET_SET_CHANGED" };
		}
		if (
			stored.status === "completed" &&
			stored.completedAt &&
			stored.evidenceId
		) {
			return {
				kind: "completed",
				result: {
					status: "completed",
					completedAt: stored.completedAt,
					evidenceId: stored.evidenceId,
				},
			};
		}

		const now = Date.now();
		if (
			stored.leaseToken &&
			stored.leaseExpiresAt &&
			stored.leaseExpiresAt > now
		) {
			return {
				kind: "pending",
				retryAfterSeconds: Math.max(
					1,
					Math.ceil((stored.leaseExpiresAt - now) / 1_000),
				),
			};
		}

		const rows = this.readTargets();
		if (
			rows.length !== targetIds.length ||
			rows.some((row, index) => row.targetId !== targetIds[index])
		) {
			return { kind: "conflict", code: "TARGET_SET_CHANGED" };
		}
		if (rows.every(({ status }) => status !== "pending")) {
			const finalizationLease = crypto.randomUUID();
			this.acquireLease(finalizationLease, now + LEASE_DURATION_MS);
			return this.finalize(rows);
		}

		const leaseToken = crypto.randomUUID();
		this.acquireLease(leaseToken, now + LEASE_DURATION_MS);
		const pendingIds = new Set(
			rows
				.filter(({ status }) => status === "pending")
				.map(({ targetId }) => targetId),
		);
		const outcomes = await Promise.allSettled(
			targets
				.filter(({ id }) => pendingIds.has(id))
				.map(
					async (target): Promise<TargetOutcome> => ({
						targetId: target.id,
						result: await eraseTarget(operation, target),
					}),
				),
		);

		const currentLease = this.readOperation();
		if (currentLease?.leaseToken !== leaseToken) {
			return { kind: "pending", retryAfterSeconds: DEFAULT_RETRY_SECONDS };
		}
		try {
			for (const outcome of outcomes) {
				if (outcome.status === "fulfilled") {
					await this.persistOutcome(outcome.value);
				}
			}
		} catch {
			this.releaseLease(leaseToken);
			return { kind: "unavailable" };
		}
		if (outcomes.some(({ status }) => status === "rejected")) {
			this.releaseLease(leaseToken);
			return { kind: "unavailable" };
		}

		const updatedRows = this.readTargets();
		if (updatedRows.every(({ status }) => status !== "pending")) {
			return this.finalize(updatedRows);
		}
		this.releaseLease(leaseToken);
		return {
			kind: "pending",
			retryAfterSeconds: maxRetryAfter(updatedRows),
		};
	}
}
