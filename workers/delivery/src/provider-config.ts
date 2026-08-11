import { DurableObject } from "cloudflare:workers";
import type { DeliveryWorkerEnv } from "./env";

export type DeliveryProviderKind = "email" | "sms";

export type EmailProviderConfig = {
	apiKey: string;
	from: string;
};

export type SmsProviderConfig = {
	accountSid: string;
	authToken: string;
	from: string;
};

export type DeliveryProviderConfigValue =
	| { provider: "email"; config: EmailProviderConfig }
	| { provider: "sms"; config: SmsProviderConfig };

export type ProviderChannelStatus = {
	activeVersion: number | null;
	nextVersion: number | null;
	previousVersion: number | null;
	validated: boolean;
	updatedAt: string | null;
	lastTestedAt: string | null;
};

export type ProviderRepositoryStatus = {
	revision: number;
	updatedAt: string | null;
	channels: Record<DeliveryProviderKind, ProviderChannelStatus>;
};

export type ProviderMutationValue = {
	operation: "stage" | "test" | "activate" | "rollback";
	revision: number;
	version: number | null;
	validated: boolean;
	updatedAt: string;
};

export type ProviderConfigFailureCode =
	| "idempotency_conflict"
	| "operation_in_progress"
	| "revision_conflict"
	| "next_version_changed"
	| "next_not_tested"
	| "previous_version_missing"
	| "invalid_provider_config";

export type ProviderConfigResult<T> =
	| { ok: true; value: T }
	| {
			ok: false;
			code: ProviderConfigFailureCode;
			currentVersion: number;
	  };

export type StageProviderConfigInput =
	| {
			provider: "email";
			config: EmailProviderConfig;
			expectedVersion: number;
			idempotencyKey: string;
	  }
	| {
			provider: "sms";
			config: SmsProviderConfig;
			expectedVersion: number;
			idempotencyKey: string;
	  };

export type TestProviderConfigInput = {
	provider: DeliveryProviderKind;
	target: string;
	expectedVersion: number;
	idempotencyKey: string;
};

export type ActivateProviderConfigInput = {
	provider: DeliveryProviderKind;
	expectedVersion: number;
	idempotencyKey: string;
};

export type RollbackProviderConfigInput = {
	provider: DeliveryProviderKind;
	expectedVersion: number;
	idempotencyKey: string;
};

type ConfigVersionRow = {
	version: number;
	provider: DeliveryProviderKind;
	ciphertext: string;
	iv: string;
	salt: string;
	testedAt: string | null;
};

type ConfigSlotRow = {
	provider: DeliveryProviderKind;
	activeVersion: number | null;
	nextVersion: number | null;
	previousVersion: number | null;
	nextTestedAt: string | null;
	updatedAt: string | null;
	lastTestedAt: string | null;
};

type MetaRow = {
	revision: number;
	updatedAt: string | null;
};

type IdempotencyRow = {
	action: string;
	requestDigest: string;
	status: "pending" | "completed";
	responseJson: string | null;
	provider: DeliveryProviderKind;
	configVersion: number | null;
	expectedRevision: number;
	operationToken: string | null;
};

type EncryptedConfig = {
	ciphertext: string;
	iv: string;
	salt: string;
};

export type PreparedProviderTest =
	| {
			kind: "ready";
			provider: DeliveryProviderKind;
			version: number;
			config: EmailProviderConfig | SmsProviderConfig;
			operationToken: string;
	  }
	| {
			kind: "completed";
			result: ProviderMutationValue;
	  };

export type ActiveProviderConfig =
	| { configured: false }
	| {
			configured: true;
			provider: DeliveryProviderKind;
			version: number;
			config: EmailProviderConfig | SmsProviderConfig;
	  };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const CONFIG_DOMAIN = "cinaauth.delivery.provider-config.v1";

const bytesToBase64 = (bytes: Uint8Array) => {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array<ArrayBuffer> => {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
};

const randomBytes = (length: number): Uint8Array<ArrayBuffer> => {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return bytes;
};

const configDomain = (provider: DeliveryProviderKind, version: number) =>
	textEncoder.encode(`${CONFIG_DOMAIN}\n${provider}\n${version}`);

const deriveEncryptionKey = async (
	kek: string,
	provider: DeliveryProviderKind,
	version: number,
	salt: Uint8Array<ArrayBuffer>,
) => {
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		textEncoder.encode(kek),
		"HKDF",
		false,
		["deriveKey"],
	);
	return crypto.subtle.deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt,
			info: configDomain(provider, version),
		},
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
};

const encryptConfig = async (
	value: DeliveryProviderConfigValue,
	version: number,
	kek: string,
): Promise<EncryptedConfig> => {
	const salt = randomBytes(32);
	const iv = randomBytes(12);
	const key = await deriveEncryptionKey(kek, value.provider, version, salt);
	const ciphertext = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv,
			additionalData: configDomain(value.provider, version),
			tagLength: 128,
		},
		key,
		textEncoder.encode(JSON.stringify(value.config)),
	);
	return {
		ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
		iv: bytesToBase64(iv),
		salt: bytesToBase64(salt),
	};
};

const isEmailConfig = (value: unknown): value is EmailProviderConfig => {
	const candidate = value as Partial<EmailProviderConfig> | null;
	return (
		typeof candidate?.apiKey === "string" &&
		candidate.apiKey.startsWith("re_") &&
		candidate.apiKey.length >= 16 &&
		candidate.apiKey.length <= 512 &&
		typeof candidate.from === "string" &&
		candidate.from.length > 0 &&
		candidate.from.length <= 384 &&
		!/\r|\n/.test(candidate.from)
	);
};

const isSmsConfig = (value: unknown): value is SmsProviderConfig => {
	const candidate = value as Partial<SmsProviderConfig> | null;
	return (
		typeof candidate?.accountSid === "string" &&
		/^AC[0-9a-f]{32}$/i.test(candidate.accountSid) &&
		typeof candidate.authToken === "string" &&
		candidate.authToken.length >= 16 &&
		candidate.authToken.length <= 128 &&
		typeof candidate.from === "string" &&
		/^\+[1-9]\d{7,14}$/.test(candidate.from)
	);
};

const isProviderConfig = (
	provider: DeliveryProviderKind,
	value: unknown,
): value is EmailProviderConfig | SmsProviderConfig =>
	provider === "email" ? isEmailConfig(value) : isSmsConfig(value);

const decryptConfig = async (
	row: ConfigVersionRow,
	kek: string,
): Promise<EmailProviderConfig | SmsProviderConfig> => {
	const iv = base64ToBytes(row.iv);
	const salt = base64ToBytes(row.salt);
	const key = await deriveEncryptionKey(kek, row.provider, row.version, salt);
	const plaintext = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv,
			additionalData: configDomain(row.provider, row.version),
			tagLength: 128,
		},
		key,
		base64ToBytes(row.ciphertext),
	);
	const value: unknown = JSON.parse(textDecoder.decode(plaintext));
	if (!isProviderConfig(row.provider, value)) {
		throw new Error("Stored provider configuration is invalid");
	}
	return value;
};

const idempotencyDigest = async (
	kek: string,
	action: string,
	payload: string,
) => {
	const key = await crypto.subtle.importKey(
		"raw",
		textEncoder.encode(kek),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const digest = await crypto.subtle.sign(
		"HMAC",
		key,
		textEncoder.encode(`${CONFIG_DOMAIN}.idempotency\n${action}\n${payload}`),
	);
	return bytesToBase64(new Uint8Array(digest));
};

const failure = (
	code: ProviderConfigFailureCode,
	currentVersion: number,
): ProviderConfigResult<never> => ({ ok: false, code, currentVersion });

/**
 * Strongly consistent, encrypted configuration repository for both delivery
 * channels. The public management API never receives values returned by the
 * internal getActive/prepareTest RPC methods.
 */
export class DeliveryProviderConfig extends DurableObject<DeliveryWorkerEnv> {
	constructor(ctx: DurableObjectState, env: DeliveryWorkerEnv) {
		super(ctx, env);
		void ctx.blockConcurrencyWhile(async () => {
			this.migrate();
		});
	}

	private migrate() {
		this.ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS delivery_config_meta (
				singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
				revision INTEGER NOT NULL,
				updated_at TEXT
			)
		`);
		this.ctx.storage.sql.exec(`
			INSERT OR IGNORE INTO delivery_config_meta (singleton, revision)
			VALUES (1, 0)
		`);
		this.ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS delivery_provider_versions (
				version INTEGER PRIMARY KEY,
				provider TEXT NOT NULL CHECK (provider IN ('email', 'sms')),
				ciphertext TEXT NOT NULL,
				iv TEXT NOT NULL,
				salt TEXT NOT NULL,
				created_at TEXT NOT NULL,
				tested_at TEXT
			)
		`);
		this.ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS delivery_provider_slots (
				provider TEXT PRIMARY KEY CHECK (provider IN ('email', 'sms')),
				active_version INTEGER,
				next_version INTEGER,
				previous_version INTEGER,
				updated_at TEXT
			)
		`);
		this.ctx.storage.sql.exec(`
			INSERT OR IGNORE INTO delivery_provider_slots (provider)
			VALUES ('email'), ('sms')
		`);
		this.ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS delivery_config_idempotency (
				idempotency_key TEXT PRIMARY KEY,
				action TEXT NOT NULL,
				request_digest TEXT NOT NULL,
				status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
				response_json TEXT,
				provider TEXT NOT NULL CHECK (provider IN ('email', 'sms')),
				config_version INTEGER,
				expected_revision INTEGER NOT NULL,
				operation_token TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)
		`);
	}

	private async getKek() {
		const binding = this.env.CINAAUTH_DELIVERY_CONFIG_KEK_STORE;
		if (!binding || typeof binding.get !== "function") {
			throw new Error("Delivery configuration KEK binding is unavailable");
		}
		let value: string;
		try {
			value = await binding.get();
		} catch {
			throw new Error("Delivery configuration KEK is unavailable");
		}
		if (value.length < 32) {
			throw new Error("Delivery configuration KEK is invalid");
		}
		return value;
	}

	private readMeta() {
		return this.ctx.storage.sql
			.exec<MetaRow>(
				`SELECT revision, updated_at AS updatedAt
				 FROM delivery_config_meta WHERE singleton = 1`,
			)
			.one();
	}

	private readSlot(provider: DeliveryProviderKind) {
		return this.ctx.storage.sql
			.exec<ConfigSlotRow>(
				`SELECT slots.provider,
					slots.active_version AS activeVersion,
					slots.next_version AS nextVersion,
					slots.previous_version AS previousVersion,
					next_config.tested_at AS nextTestedAt,
					slots.updated_at AS updatedAt,
					(SELECT MAX(tested_at) FROM delivery_provider_versions
					 WHERE provider = slots.provider) AS lastTestedAt
				 FROM delivery_provider_slots AS slots
				 LEFT JOIN delivery_provider_versions AS next_config
					ON next_config.version = slots.next_version
				 WHERE slots.provider = ?`,
				provider,
			)
			.one();
	}

	private readVersion(version: number) {
		return this.ctx.storage.sql
			.exec<ConfigVersionRow>(
				`SELECT version, provider, ciphertext, iv, salt,
					tested_at AS testedAt
				 FROM delivery_provider_versions WHERE version = ?`,
				version,
			)
			.toArray()[0];
	}

	private readIdempotency(idempotencyKey: string) {
		return this.ctx.storage.sql
			.exec<IdempotencyRow>(
				`SELECT action, request_digest AS requestDigest, status,
					response_json AS responseJson, provider,
					config_version AS configVersion,
					expected_revision AS expectedRevision,
					operation_token AS operationToken
				 FROM delivery_config_idempotency WHERE idempotency_key = ?`,
				idempotencyKey,
			)
			.toArray()[0];
	}

	private channelStatus(row: ConfigSlotRow): ProviderChannelStatus {
		return {
			activeVersion: row.activeVersion,
			nextVersion: row.nextVersion,
			previousVersion: row.previousVersion,
			validated: row.nextVersion
				? row.nextTestedAt !== null
				: row.activeVersion !== null,
			updatedAt: row.updatedAt,
			lastTestedAt: row.lastTestedAt,
		};
	}

	private readStatus(): ProviderRepositoryStatus {
		const meta = this.readMeta();
		return {
			revision: meta.revision,
			updatedAt: meta.updatedAt,
			channels: {
				email: this.channelStatus(this.readSlot("email")),
				sms: this.channelStatus(this.readSlot("sms")),
			},
		};
	}

	private mutationValue(
		operation: ProviderMutationValue["operation"],
		provider: DeliveryProviderKind,
		version: number | null,
	): ProviderMutationValue {
		const status = this.readStatus();
		const channel = status.channels[provider];
		const updatedAt = channel.updatedAt ?? status.updatedAt;
		if (!updatedAt) {
			throw new Error("Delivery configuration update timestamp is unavailable");
		}
		return {
			operation,
			version,
			revision: status.revision,
			validated: channel.validated,
			updatedAt,
		};
	}

	private existingResult(
		row: IdempotencyRow | undefined,
		action: string,
		digest: string,
	): ProviderConfigResult<ProviderMutationValue> | undefined {
		if (!row) return undefined;
		const currentVersion = this.readMeta().revision;
		if (row.action !== action || row.requestDigest !== digest) {
			return failure("idempotency_conflict", currentVersion);
		}
		if (row.status === "pending" || !row.responseJson) {
			return failure("operation_in_progress", currentVersion);
		}
		return {
			ok: true,
			value: JSON.parse(row.responseJson) as ProviderMutationValue,
		};
	}

	private persistCompletedIdempotency(
		idempotencyKey: string,
		action: string,
		digest: string,
		provider: DeliveryProviderKind,
		expectedRevision: number,
		version: number | null,
		value: ProviderMutationValue,
		now: string,
	) {
		this.ctx.storage.sql.exec(
			`INSERT INTO delivery_config_idempotency (
				idempotency_key, action, request_digest, status, response_json,
				provider, config_version, expected_revision, created_at, updated_at
			 ) VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)`,
			idempotencyKey,
			action,
			digest,
			JSON.stringify(value),
			provider,
			version,
			expectedRevision,
			now,
			now,
		);
	}

	private incrementRevision(now: string) {
		this.ctx.storage.sql.exec(
			`UPDATE delivery_config_meta
			 SET revision = revision + 1, updated_at = ?
			 WHERE singleton = 1`,
			now,
		);
	}

	private deleteUnreferencedVersions() {
		this.ctx.storage.sql.exec(`
			DELETE FROM delivery_provider_versions
			WHERE version NOT IN (
				SELECT active_version FROM delivery_provider_slots
				WHERE active_version IS NOT NULL
				UNION
				SELECT next_version FROM delivery_provider_slots
				WHERE next_version IS NOT NULL
				UNION
				SELECT previous_version FROM delivery_provider_slots
				WHERE previous_version IS NOT NULL
			)
		`);
	}

	private pruneIdempotency() {
		this.ctx.storage.sql.exec(
			`
			DELETE FROM delivery_config_idempotency
			WHERE created_at < ?
		`,
			new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000).toISOString(),
		);
		this.ctx.storage.sql.exec(`
			DELETE FROM delivery_config_idempotency
			WHERE idempotency_key IN (
				SELECT idempotency_key FROM delivery_config_idempotency
				ORDER BY created_at DESC LIMIT -1 OFFSET 1000
			)
		`);
	}

	async status(): Promise<ProviderRepositoryStatus> {
		return this.readStatus();
	}

	/** Verify that the envelope-encryption KEK is currently readable and strong. */
	async checkEncryptionKey(): Promise<void> {
		await this.getKek();
	}

	async stage(
		input: StageProviderConfigInput,
	): Promise<ProviderConfigResult<ProviderMutationValue>> {
		if (!isProviderConfig(input.provider, input.config)) {
			return failure("invalid_provider_config", this.readMeta().revision);
		}
		const kek = await this.getKek();
		const action = `stage:${input.provider}`;
		const digest = await idempotencyDigest(
			kek,
			action,
			JSON.stringify({
				provider: input.provider,
				config: input.config,
				expectedVersion: input.expectedVersion,
				idempotencyKey: input.idempotencyKey,
			}),
		);
		const existing = this.existingResult(
			this.readIdempotency(input.idempotencyKey),
			action,
			digest,
		);
		if (existing) return existing;
		if (this.readMeta().revision !== input.expectedVersion) {
			return failure("revision_conflict", this.readMeta().revision);
		}

		const version = input.expectedVersion + 1;
		const encrypted = await encryptConfig(
			{
				provider: input.provider,
				config: input.config,
			} as DeliveryProviderConfigValue,
			version,
			kek,
		);
		return this.ctx.storage.transactionSync(() => {
			const repeated = this.existingResult(
				this.readIdempotency(input.idempotencyKey),
				action,
				digest,
			);
			if (repeated) return repeated;
			const current = this.readMeta().revision;
			if (current !== input.expectedVersion) {
				return failure("revision_conflict", current);
			}
			const now = new Date().toISOString();
			this.ctx.storage.sql.exec(
				`INSERT INTO delivery_provider_versions (
					version, provider, ciphertext, iv, salt, created_at
				 ) VALUES (?, ?, ?, ?, ?, ?)`,
				version,
				input.provider,
				encrypted.ciphertext,
				encrypted.iv,
				encrypted.salt,
				now,
			);
			this.ctx.storage.sql.exec(
				`UPDATE delivery_provider_slots
				 SET next_version = ?, updated_at = ? WHERE provider = ?`,
				version,
				now,
				input.provider,
			);
			this.incrementRevision(now);
			this.deleteUnreferencedVersions();
			const value = this.mutationValue("stage", input.provider, version);
			this.persistCompletedIdempotency(
				input.idempotencyKey,
				action,
				digest,
				input.provider,
				input.expectedVersion,
				version,
				value,
				now,
			);
			this.pruneIdempotency();
			return { ok: true, value };
		});
	}

	async prepareTest(
		input: TestProviderConfigInput,
	): Promise<ProviderConfigResult<PreparedProviderTest>> {
		const kek = await this.getKek();
		const action = `test:${input.provider}`;
		const digest = await idempotencyDigest(kek, action, JSON.stringify(input));
		const row = this.readIdempotency(input.idempotencyKey);
		if (row) {
			const existing = this.existingResult(row, action, digest);
			if (!existing) {
				return failure("idempotency_conflict", this.readMeta().revision);
			}
			if (!existing.ok) return existing;
			return {
				ok: true,
				value: { kind: "completed", result: existing.value },
			};
		}
		const current = this.readMeta().revision;
		if (current !== input.expectedVersion) {
			return failure("revision_conflict", current);
		}
		const slot = this.readSlot(input.provider);
		if (slot.nextVersion === null) {
			return failure("next_version_changed", current);
		}
		const version = slot.nextVersion;
		const versionRow = this.readVersion(version);
		if (!versionRow || versionRow.provider !== input.provider) {
			return failure("next_version_changed", current);
		}
		const config = await decryptConfig(versionRow, kek);
		const operationToken = crypto.randomUUID();
		return this.ctx.storage.transactionSync(() => {
			const repeated = this.readIdempotency(input.idempotencyKey);
			if (repeated) {
				const existing = this.existingResult(repeated, action, digest);
				if (!existing) {
					return failure("idempotency_conflict", this.readMeta().revision);
				}
				if (!existing.ok) return existing;
				return {
					ok: true as const,
					value: { kind: "completed" as const, result: existing.value },
				};
			}
			const latestRevision = this.readMeta().revision;
			if (latestRevision !== input.expectedVersion) {
				return failure("revision_conflict", latestRevision);
			}
			if (this.readSlot(input.provider).nextVersion !== version) {
				return failure("next_version_changed", latestRevision);
			}
			const now = new Date().toISOString();
			this.ctx.storage.sql.exec(
				`INSERT INTO delivery_config_idempotency (
					idempotency_key, action, request_digest, status, provider,
					config_version, expected_revision, operation_token,
					created_at, updated_at
				 ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
				input.idempotencyKey,
				action,
				digest,
				input.provider,
				version,
				input.expectedVersion,
				operationToken,
				now,
				now,
			);
			return {
				ok: true as const,
				value: {
					kind: "ready" as const,
					provider: input.provider,
					version,
					config,
					operationToken,
				},
			};
		});
	}

	async completeTest(input: {
		provider: DeliveryProviderKind;
		version: number;
		idempotencyKey: string;
		operationToken: string;
	}): Promise<ProviderConfigResult<ProviderMutationValue>> {
		return this.ctx.storage.transactionSync(() => {
			const row = this.readIdempotency(input.idempotencyKey);
			const current = this.readMeta().revision;
			if (!row || row.action !== `test:${input.provider}`) {
				return failure("idempotency_conflict", current);
			}
			if (row.status === "completed" && row.responseJson) {
				return {
					ok: true,
					value: JSON.parse(row.responseJson) as ProviderMutationValue,
				};
			}
			if (
				row.provider !== input.provider ||
				row.configVersion !== input.version ||
				row.operationToken !== input.operationToken
			) {
				return failure("idempotency_conflict", current);
			}
			if (current !== row.expectedRevision) {
				this.ctx.storage.sql.exec(
					"DELETE FROM delivery_config_idempotency WHERE idempotency_key = ?",
					input.idempotencyKey,
				);
				return failure("revision_conflict", current);
			}
			if (this.readSlot(input.provider).nextVersion !== input.version) {
				this.ctx.storage.sql.exec(
					"DELETE FROM delivery_config_idempotency WHERE idempotency_key = ?",
					input.idempotencyKey,
				);
				return failure("next_version_changed", current);
			}
			const now = new Date().toISOString();
			this.ctx.storage.sql.exec(
				`UPDATE delivery_provider_versions SET tested_at = ?
				 WHERE version = ? AND provider = ?`,
				now,
				input.version,
				input.provider,
			);
			this.ctx.storage.sql.exec(
				`UPDATE delivery_provider_slots SET updated_at = ? WHERE provider = ?`,
				now,
				input.provider,
			);
			this.incrementRevision(now);
			const value = this.mutationValue("test", input.provider, input.version);
			this.ctx.storage.sql.exec(
				`UPDATE delivery_config_idempotency
				 SET status = 'completed', response_json = ?, operation_token = NULL,
					updated_at = ?
				 WHERE idempotency_key = ?`,
				JSON.stringify(value),
				now,
				input.idempotencyKey,
			);
			this.pruneIdempotency();
			return { ok: true, value };
		});
	}

	async abortTest(input: {
		idempotencyKey: string;
		operationToken: string;
	}): Promise<void> {
		this.ctx.storage.sql.exec(
			`DELETE FROM delivery_config_idempotency
			 WHERE idempotency_key = ? AND status = 'pending'
				AND operation_token = ?`,
			input.idempotencyKey,
			input.operationToken,
		);
	}

	async activate(
		input: ActivateProviderConfigInput,
	): Promise<ProviderConfigResult<ProviderMutationValue>> {
		const kek = await this.getKek();
		const action = `activate:${input.provider}`;
		const digest = await idempotencyDigest(kek, action, JSON.stringify(input));
		return this.ctx.storage.transactionSync(() => {
			const existing = this.existingResult(
				this.readIdempotency(input.idempotencyKey),
				action,
				digest,
			);
			if (existing) return existing;
			const current = this.readMeta().revision;
			if (current !== input.expectedVersion) {
				return failure("revision_conflict", current);
			}
			const slot = this.readSlot(input.provider);
			if (slot.nextVersion === null) {
				return failure("next_version_changed", current);
			}
			const nextVersion = slot.nextVersion;
			const version = this.readVersion(nextVersion);
			if (!version?.testedAt) {
				return failure("next_not_tested", current);
			}
			const now = new Date().toISOString();
			this.ctx.storage.sql.exec(
				`UPDATE delivery_provider_slots
				 SET previous_version = active_version,
					active_version = next_version,
					next_version = NULL,
					updated_at = ?
				 WHERE provider = ?`,
				now,
				input.provider,
			);
			this.incrementRevision(now);
			this.deleteUnreferencedVersions();
			const value = this.mutationValue("activate", input.provider, nextVersion);
			this.persistCompletedIdempotency(
				input.idempotencyKey,
				action,
				digest,
				input.provider,
				input.expectedVersion,
				nextVersion,
				value,
				now,
			);
			this.pruneIdempotency();
			return { ok: true, value };
		});
	}

	async rollback(
		input: RollbackProviderConfigInput,
	): Promise<ProviderConfigResult<ProviderMutationValue>> {
		const kek = await this.getKek();
		const action = `rollback:${input.provider}`;
		const digest = await idempotencyDigest(kek, action, JSON.stringify(input));
		return this.ctx.storage.transactionSync(() => {
			const existing = this.existingResult(
				this.readIdempotency(input.idempotencyKey),
				action,
				digest,
			);
			if (existing) return existing;
			const current = this.readMeta().revision;
			if (current !== input.expectedVersion) {
				return failure("revision_conflict", current);
			}
			const slot = this.readSlot(input.provider);
			if (!slot.previousVersion) {
				return failure("previous_version_missing", current);
			}
			const restoredVersion = slot.previousVersion;
			const now = new Date().toISOString();
			this.ctx.storage.sql.exec(
				`UPDATE delivery_provider_slots
				 SET active_version = previous_version,
					previous_version = active_version,
					updated_at = ?
				 WHERE provider = ?`,
				now,
				input.provider,
			);
			this.incrementRevision(now);
			const value = this.mutationValue(
				"rollback",
				input.provider,
				restoredVersion,
			);
			this.persistCompletedIdempotency(
				input.idempotencyKey,
				action,
				digest,
				input.provider,
				input.expectedVersion,
				restoredVersion,
				value,
				now,
			);
			this.pruneIdempotency();
			return { ok: true, value };
		});
	}

	async getActive(
		provider: DeliveryProviderKind,
	): Promise<ActiveProviderConfig> {
		const activeVersion = this.readSlot(provider).activeVersion;
		if (!activeVersion) return { configured: false };
		const row = this.readVersion(activeVersion);
		if (!row || row.provider !== provider || !row.testedAt) {
			throw new Error("Active delivery provider configuration is invalid");
		}
		const config = await decryptConfig(row, await this.getKek());
		return { configured: true, provider, version: activeVersion, config };
	}
}
