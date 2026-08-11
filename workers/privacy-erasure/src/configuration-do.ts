import { DurableObject } from "cloudflare:workers";
import type {
	ConfigMutationInput,
	ConfigSlotStatus,
	EncryptedPayload,
	ErasureConfigurationStatus,
	StageConfigInput,
} from "./configuration";
import {
	createConfigFailure,
	createIdempotencyDigest,
	decryptTargets,
	encryptTargets,
	testTargetReadiness,
	validateMutationInput,
	validateTargetsForHosts,
} from "./configuration";
import type { PrivacyErasureEnv } from "./env";
import type { ErasureTarget } from "./protocol";

type ConfigState = "ACTIVE" | "NEXT" | "PREVIOUS";

type ConfigRow = {
	version: number;
	state: ConfigState;
	targetIdsJson: string;
	salt: string;
	iv: string;
	ciphertext: string;
	validated: number;
	createdAt: string;
	testedAt: string | null;
	activatedAt: string | null;
};

type IdempotencyRow = {
	action: string;
	requestHash: string;
	responseJson: string;
};

const CONFIG_INSTANCE_NAME = "primary";
const MAX_IDEMPOTENCY_RECORDS = 500;

export const getErasureConfigStub = (env: PrivacyErasureEnv) =>
	env.ERASURE_CONFIG.getByName(CONFIG_INSTANCE_NAME);

/**
 * Stores versioned privacy target configuration encrypted with a Secrets Store
 * key. Only public-safe target IDs and lifecycle metadata remain plaintext.
 */
export class ErasureConfigDurableObject extends DurableObject<PrivacyErasureEnv> {
	constructor(ctx: DurableObjectState, env: PrivacyErasureEnv) {
		super(ctx, env);
		void ctx.blockConcurrencyWhile(async () => {
			this.migrate();
		});
	}

	private migrate() {
		this.ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS _config_schema_migrations (
				id INTEGER PRIMARY KEY,
				applied_at TEXT NOT NULL
			);
		`);
		const version = this.ctx.storage.sql
			.exec<{ version: number }>(
				"SELECT COALESCE(MAX(id), 0) AS version FROM _config_schema_migrations",
			)
			.one().version;
		if (version < 1) {
			this.ctx.storage.sql.exec(`
				CREATE TABLE IF NOT EXISTS config_meta (
					singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
					revision INTEGER NOT NULL CHECK (revision >= 0)
				);
				INSERT OR IGNORE INTO config_meta (singleton, revision) VALUES (1, 0);
				CREATE TABLE IF NOT EXISTS config_versions (
					version INTEGER PRIMARY KEY,
					state TEXT NOT NULL CHECK (state IN ('ACTIVE', 'NEXT', 'PREVIOUS')),
					target_ids_json TEXT NOT NULL,
					salt TEXT NOT NULL,
					iv TEXT NOT NULL,
					ciphertext TEXT NOT NULL,
					validated INTEGER NOT NULL CHECK (validated IN (0, 1)),
					created_at TEXT NOT NULL,
					tested_at TEXT,
					activated_at TEXT
				);
				CREATE INDEX IF NOT EXISTS config_versions_state
					ON config_versions (state);
				CREATE TABLE IF NOT EXISTS config_idempotency (
					idempotency_key TEXT PRIMARY KEY,
					action TEXT NOT NULL,
					request_hash TEXT NOT NULL,
					response_json TEXT NOT NULL,
					created_at TEXT NOT NULL
				);
				CREATE INDEX IF NOT EXISTS config_idempotency_created
					ON config_idempotency (created_at);
				INSERT INTO _config_schema_migrations (id, applied_at)
				VALUES (1, datetime('now'));
			`);
		}
		if (version < 2) {
			// Legacy rows used unkeyed hashes over secret-bearing stage payloads.
			this.ctx.storage.sql.exec(`
				DELETE FROM config_idempotency;
				INSERT INTO _config_schema_migrations (id, applied_at)
				VALUES (2, datetime('now'));
			`);
		}
	}

	private transaction<T>(callback: () => T) {
		this.ctx.storage.sql.exec("BEGIN IMMEDIATE");
		try {
			const result = callback();
			this.ctx.storage.sql.exec("COMMIT");
			return result;
		} catch (error) {
			this.ctx.storage.sql.exec("ROLLBACK");
			throw error;
		}
	}

	private revision() {
		return this.ctx.storage.sql
			.exec<{ revision: number }>(
				"SELECT revision FROM config_meta WHERE singleton = 1",
			)
			.one().revision;
	}

	private requireRevision(expectedVersion: number) {
		const revision = this.revision();
		if (revision !== expectedVersion) {
			throw createConfigFailure(
				"CONFIG_VERSION_CONFLICT",
				409,
				"Configuration changed; refresh status before retrying",
			);
		}
		return revision;
	}

	private bumpRevision(revision: number) {
		this.ctx.storage.sql.exec(
			"UPDATE config_meta SET revision = ? WHERE singleton = 1 AND revision = ?",
			revision + 1,
			revision,
		);
		return revision + 1;
	}

	private rows(state?: ConfigState) {
		const query = `SELECT version, state,
			target_ids_json AS targetIdsJson,
			salt, iv, ciphertext, validated,
			created_at AS createdAt,
			tested_at AS testedAt,
			activated_at AS activatedAt
		 FROM config_versions
		 ${state ? "WHERE state = ?" : ""}
		 ORDER BY version DESC`;
		return state
			? this.ctx.storage.sql.exec<ConfigRow>(query, state).toArray()
			: this.ctx.storage.sql.exec<ConfigRow>(query).toArray();
	}

	private row(state: ConfigState) {
		const rows = this.rows(state);
		if (rows.length > 1) {
			throw createConfigFailure(
				"CONFIG_STATE_INVALID",
				503,
				"Privacy configuration state is invalid",
			);
		}
		return rows[0];
	}

	private slot(row: ConfigRow | undefined): ConfigSlotStatus | null {
		if (!row) return null;
		let targetIds: string[];
		try {
			const parsed = JSON.parse(row.targetIdsJson) as unknown;
			if (
				!Array.isArray(parsed) ||
				parsed.some((value) => typeof value !== "string")
			) {
				throw new Error();
			}
			targetIds = [...parsed].sort();
		} catch {
			throw createConfigFailure(
				"CONFIG_STATE_INVALID",
				503,
				"Privacy configuration state is invalid",
			);
		}
		return {
			version: row.version,
			targetIds,
			targetCount: targetIds.length,
			configured: true,
			validated: row.validated === 1,
			createdAt: row.createdAt,
			testedAt: row.testedAt,
			activatedAt: row.activatedAt,
		};
	}

	private readStatus(): ErasureConfigurationStatus {
		const active = this.slot(this.row("ACTIVE"));
		const next = this.slot(this.row("NEXT"));
		const previous = this.slot(this.row("PREVIOUS"));
		return {
			revision: this.revision(),
			structuralReady: true,
			operationalReady: active?.validated === true,
			source: active ? "dynamic" : "none",
			active,
			next,
			previous,
		};
	}

	private idempotentResponse(
		idempotencyKey: string,
		action: string,
		requestHash: string,
	) {
		const row = this.ctx.storage.sql
			.exec<IdempotencyRow>(
				`SELECT action,
					request_hash AS requestHash,
					response_json AS responseJson
				 FROM config_idempotency
				 WHERE idempotency_key = ?`,
				idempotencyKey,
			)
			.toArray()[0];
		if (!row) return undefined;
		if (row.action !== action || row.requestHash !== requestHash) {
			throw createConfigFailure(
				"IDEMPOTENCY_KEY_CONFLICT",
				409,
				"Idempotency key was already used for another request",
			);
		}
		try {
			return JSON.parse(row.responseJson) as ErasureConfigurationStatus;
		} catch {
			throw createConfigFailure(
				"CONFIG_STATE_INVALID",
				503,
				"Privacy configuration state is invalid",
			);
		}
	}

	private saveIdempotentResponse(
		idempotencyKey: string,
		action: string,
		requestHash: string,
		response: ErasureConfigurationStatus,
	) {
		this.ctx.storage.sql.exec(
			`INSERT INTO config_idempotency (
				idempotency_key, action, request_hash, response_json, created_at
			 ) VALUES (?, ?, ?, ?, ?)`,
			idempotencyKey,
			action,
			requestHash,
			JSON.stringify(response),
			new Date().toISOString(),
		);
		this.ctx.storage.sql.exec(
			`DELETE FROM config_idempotency
			 WHERE idempotency_key IN (
				SELECT idempotency_key FROM config_idempotency
				ORDER BY created_at DESC
				LIMIT -1 OFFSET ?
			 )`,
			MAX_IDEMPOTENCY_RECORDS,
		);
	}

	private async encryptionKey() {
		try {
			const key = await this.env.CINAAUTH_ERASURE_CONFIG_KEK_STORE.get();
			if (key.length < 32 || key.length > 1_024) throw new Error();
			return key;
		} catch {
			throw createConfigFailure(
				"CONFIG_KEY_UNAVAILABLE",
				503,
				"Privacy configuration encryption key is unavailable",
			);
		}
	}

	private encryptedPayload(row: ConfigRow): EncryptedPayload {
		return { salt: row.salt, iv: row.iv, ciphertext: row.ciphertext };
	}

	async status() {
		return this.readStatus();
	}

	async checkEncryptionKey() {
		await this.encryptionKey();
		return { ok: true as const };
	}

	async activeTargets(): Promise<ErasureTarget[] | null> {
		const active = this.row("ACTIVE");
		if (!active || active.validated !== 1) return null;
		const targets = await decryptTargets(
			this.encryptedPayload(active),
			active.version,
			await this.encryptionKey(),
		);
		return validateTargetsForHosts(
			targets,
			this.env.CINAAUTH_ERASURE_ALLOWED_HOSTS,
		);
	}

	async stage(input: StageConfigInput) {
		validateMutationInput(input);
		const targets = validateTargetsForHosts(
			input.targets,
			this.env.CINAAUTH_ERASURE_ALLOWED_HOSTS,
		);
		const kek = await this.encryptionKey();
		const requestHash = await createIdempotencyDigest(
			kek,
			"stage",
			JSON.stringify({
				action: "stage",
				expectedVersion: input.expectedVersion,
				targets,
			}),
		);
		const replay = this.idempotentResponse(
			input.idempotencyKey,
			"stage",
			requestHash,
		);
		if (replay) return replay;
		this.requireRevision(input.expectedVersion);
		const nextVersion =
			(this.ctx.storage.sql
				.exec<{ version: number }>(
					"SELECT COALESCE(MAX(version), 0) AS version FROM config_versions",
				)
				.one().version ?? 0) + 1;
		const encrypted = await encryptTargets(targets, nextVersion, kek);
		return this.transaction(() => {
			const repeated = this.idempotentResponse(
				input.idempotencyKey,
				"stage",
				requestHash,
			);
			if (repeated) return repeated;
			const revision = this.requireRevision(input.expectedVersion);
			this.ctx.storage.sql.exec(
				"DELETE FROM config_versions WHERE state = 'NEXT'",
			);
			this.ctx.storage.sql.exec(
				`INSERT INTO config_versions (
					version, state, target_ids_json, salt, iv, ciphertext,
					validated, created_at
				 ) VALUES (?, 'NEXT', ?, ?, ?, ?, 0, ?)`,
				nextVersion,
				JSON.stringify(targets.map(({ id }) => id)),
				encrypted.salt,
				encrypted.iv,
				encrypted.ciphertext,
				new Date().toISOString(),
			);
			this.bumpRevision(revision);
			const response = this.readStatus();
			this.saveIdempotentResponse(
				input.idempotencyKey,
				"stage",
				requestHash,
				response,
			);
			return response;
		});
	}

	async test(input: ConfigMutationInput) {
		validateMutationInput(input);
		const kek = await this.encryptionKey();
		const requestHash = await createIdempotencyDigest(
			kek,
			"test",
			JSON.stringify({
				action: "test",
				expectedVersion: input.expectedVersion,
			}),
		);
		const replay = this.idempotentResponse(
			input.idempotencyKey,
			"test",
			requestHash,
		);
		if (replay) return replay;
		this.requireRevision(input.expectedVersion);
		const next = this.row("NEXT");
		if (!next) {
			throw createConfigFailure(
				"NEXT_CONFIG_MISSING",
				409,
				"No staged privacy configuration exists",
			);
		}
		const targets = validateTargetsForHosts(
			await decryptTargets(this.encryptedPayload(next), next.version, kek),
			this.env.CINAAUTH_ERASURE_ALLOWED_HOSTS,
		);
		await Promise.all(targets.map((target) => testTargetReadiness(target)));
		return this.transaction(() => {
			const repeated = this.idempotentResponse(
				input.idempotencyKey,
				"test",
				requestHash,
			);
			if (repeated) return repeated;
			const revision = this.requireRevision(input.expectedVersion);
			const currentNext = this.row("NEXT");
			if (!currentNext || currentNext.version !== next.version) {
				throw createConfigFailure(
					"CONFIG_VERSION_CONFLICT",
					409,
					"Staged privacy configuration changed during validation",
				);
			}
			this.ctx.storage.sql.exec(
				`UPDATE config_versions
				 SET validated = 1, tested_at = ?
				 WHERE version = ? AND state = 'NEXT'`,
				new Date().toISOString(),
				next.version,
			);
			this.bumpRevision(revision);
			const response = this.readStatus();
			this.saveIdempotentResponse(
				input.idempotencyKey,
				"test",
				requestHash,
				response,
			);
			return response;
		});
	}

	async activate(input: ConfigMutationInput) {
		return this.transition("activate", input, () => {
			const next = this.row("NEXT");
			if (!next) {
				throw createConfigFailure(
					"NEXT_CONFIG_MISSING",
					409,
					"No staged privacy configuration exists",
				);
			}
			if (next.validated !== 1) {
				throw createConfigFailure(
					"NEXT_CONFIG_NOT_VALIDATED",
					409,
					"Staged privacy configuration must pass validation before activation",
				);
			}
			this.ctx.storage.sql.exec(
				"DELETE FROM config_versions WHERE state = 'PREVIOUS'",
			);
			this.ctx.storage.sql.exec(
				"UPDATE config_versions SET state = 'PREVIOUS' WHERE state = 'ACTIVE'",
			);
			this.ctx.storage.sql.exec(
				`UPDATE config_versions
				 SET state = 'ACTIVE', activated_at = ?
				 WHERE version = ? AND state = 'NEXT'`,
				new Date().toISOString(),
				next.version,
			);
		});
	}

	async rollback(input: ConfigMutationInput) {
		return this.transition("rollback", input, () => {
			if (this.row("NEXT")) {
				throw createConfigFailure(
					"NEXT_CONFIG_EXISTS",
					409,
					"Activate or replace the staged configuration before rollback",
				);
			}
			const active = this.row("ACTIVE");
			const previous = this.row("PREVIOUS");
			if (!active || !previous || previous.validated !== 1) {
				throw createConfigFailure(
					"PREVIOUS_CONFIG_MISSING",
					409,
					"No validated previous privacy configuration exists",
				);
			}
			this.ctx.storage.sql.exec(
				"UPDATE config_versions SET state = 'NEXT' WHERE version = ?",
				active.version,
			);
			this.ctx.storage.sql.exec(
				`UPDATE config_versions
				 SET state = 'ACTIVE', activated_at = ?
				 WHERE version = ?`,
				new Date().toISOString(),
				previous.version,
			);
			this.ctx.storage.sql.exec(
				"UPDATE config_versions SET state = 'PREVIOUS' WHERE version = ?",
				active.version,
			);
		});
	}

	private async transition(
		action: "activate" | "rollback",
		input: ConfigMutationInput,
		change: () => void,
	) {
		validateMutationInput(input);
		const requestHash = await createIdempotencyDigest(
			await this.encryptionKey(),
			action,
			JSON.stringify({ action, expectedVersion: input.expectedVersion }),
		);
		const replay = this.idempotentResponse(
			input.idempotencyKey,
			action,
			requestHash,
		);
		if (replay) return replay;
		return this.transaction(() => {
			const repeated = this.idempotentResponse(
				input.idempotencyKey,
				action,
				requestHash,
			);
			if (repeated) return repeated;
			const revision = this.requireRevision(input.expectedVersion);
			change();
			this.bumpRevision(revision);
			const response = this.readStatus();
			this.saveIdempotentResponse(
				input.idempotencyKey,
				action,
				requestHash,
				response,
			);
			return response;
		});
	}
}
