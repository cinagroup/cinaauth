/** Deployment-independent readiness state for a managed integration. */
export type ConfigurationOperationalState = "disabled" | "degraded" | "ready";

/** Strict parser result used by both Worker and Admin trust boundaries. */
export type ConfigurationParseResult<T> =
	| { ok: true; value: T }
	| { ok: false; message: string };

export type ConfigurationReadinessState = {
	structuralReady: boolean;
	operationalState: ConfigurationOperationalState;
	revision: number;
	updatedAt: string | null;
};

export type DeliveryChannel = "email" | "sms";

/** Vendor that can serve the email delivery channel. */
export type DeliveryEmailProvider = "resend" | "cloudflare-email";

export type DeliveryChannelStatus = {
	provider: DeliveryEmailProvider | "twilio";
	configured: boolean;
	validated: boolean;
	activeVersion: number | null;
	nextVersion: number | null;
	previousVersion: number | null;
	updatedAt: string | null;
	lastTestedAt: string | null;
};

/** Read-safe delivery status. Provider credentials and addresses are omitted. */
export type DeliveryConfigurationStatus = ConfigurationReadinessState & {
	capabilities: { email: boolean; sms: boolean };
	channels: {
		email: DeliveryChannelStatus & { provider: DeliveryEmailProvider };
		sms: DeliveryChannelStatus & { provider: "twilio" };
	};
};

export type DeliveryConfigurationStageInput = {
	expectedVersion: number;
	idempotencyKey: string;
} & (
	| {
			channel: "email";
			config:
				| { provider: "resend"; apiKey: string; from: string }
				| {
						provider: "cloudflare-email";
						apiToken: string;
						accountId: string;
						from: string;
				  };
	  }
	| {
			channel: "sms";
			config: {
				provider: "twilio";
				accountSid: string;
				authToken: string;
				fromNumber: string;
			};
	  }
);

export type DeliveryConfigurationTestInput = {
	expectedVersion: number;
	idempotencyKey: string;
} & (
	| { channel: "email"; recipient: string }
	| { channel: "sms"; recipient: string }
);

export type ErasureTargetStageInput = {
	id: string;
	url: string;
	signingSecret: string;
};

export type ErasureConfigurationStageInput = {
	expectedVersion: number;
	idempotencyKey: string;
	targets: ErasureTargetStageInput[];
};

export type ErasureConfigurationTestInput = {
	expectedVersion: number;
	idempotencyKey: string;
};

export type ErasureConfigurationSlotStatus = {
	version: number;
	targetCount: number;
	targetIds: string[];
	validated: boolean;
	createdAt: string;
	lastTestedAt: string | null;
	activatedAt: string | null;
};

/** Read-safe erasure status. Target URLs and signing secrets are omitted. */
export type ErasureConfigurationStatus = ConfigurationReadinessState & {
	capabilities: { execution: boolean; verification: boolean };
	slots: {
		active: ErasureConfigurationSlotStatus | null;
		next: ErasureConfigurationSlotStatus | null;
		previous: ErasureConfigurationSlotStatus | null;
	};
};

export type ConfigurationActivateInput = {
	expectedVersion: number;
	idempotencyKey: string;
	confirmation: "ACTIVATE";
};

export type ConfigurationRollbackInput = {
	expectedVersion: number;
	idempotencyKey: string;
	confirmation: "ROLLBACK";
};

export type DeliveryConfigurationActivateInput = ConfigurationActivateInput & {
	channel: DeliveryChannel;
};

export type DeliveryConfigurationRollbackInput = ConfigurationRollbackInput & {
	channel: DeliveryChannel;
};

export type ConfigurationOperation = "stage" | "test" | "activate" | "rollback";

/** Mutation result that deliberately contains no submitted configuration. */
export type ConfigurationOperationResult = {
	operation: ConfigurationOperation;
	revision: number;
	version: number | null;
	validated: boolean;
	updatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (
	value: Record<string, unknown>,
	keys: readonly string[],
): boolean => {
	const actual = Object.keys(value).sort();
	const expected = [...keys].sort();
	return (
		actual.length === expected.length &&
		actual.every((key, index) => key === expected[index])
	);
};

const isVersion = (value: unknown): value is number =>
	typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const isNullableVersion = (value: unknown): value is number | null =>
	value === null || isVersion(value);

const isNullableTimestamp = (value: unknown): value is string | null => {
	if (value === null) return true;
	return (
		typeof value === "string" &&
		value.length <= 64 &&
		!Number.isNaN(Date.parse(value))
	);
};

const isIdempotencyKey = (value: unknown): value is string =>
	typeof value === "string" &&
	value.length >= 16 &&
	value.length <= 128 &&
	/^[A-Za-z0-9._:-]+$/.test(value);

const baseMutation = (
	value: Record<string, unknown>,
): ConfigurationParseResult<{
	expectedVersion: number;
	idempotencyKey: string;
}> => {
	if (!isVersion(value.expectedVersion)) {
		return {
			ok: false,
			message: "expectedVersion must be a non-negative integer",
		};
	}
	if (!isIdempotencyKey(value.idempotencyKey)) {
		return { ok: false, message: "idempotencyKey is invalid" };
	}
	return {
		ok: true,
		value: {
			expectedVersion: value.expectedVersion,
			idempotencyKey: value.idempotencyKey,
		},
	};
};

const isEmail = (value: unknown): value is string =>
	typeof value === "string" &&
	value.length >= 3 &&
	value.length <= 320 &&
	!/[\r\n]/.test(value) &&
	/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isEmailFrom = (value: unknown): value is string => {
	if (typeof value !== "string" || /[\r\n]/.test(value) || value.length > 384) {
		return false;
	}
	const match = value.match(/^(?:[^<>]{1,64}\s*<)?([^<>\s]+@[^<>\s]+)>?$/);
	return Boolean(match && isEmail(match[1]));
};

const isE164 = (value: unknown): value is string =>
	typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value);

/** Cloudflare API token bound to the Email Sending permission. */
const isCloudflareApiToken = (value: unknown): value is string =>
	typeof value === "string" && /^[A-Za-z0-9_-]{20,512}$/.test(value);

/** Cloudflare account ID owning the Email Sending resource. */
const isCloudflareAccountId = (value: unknown): value is string =>
	typeof value === "string" && /^[a-fA-F0-9]{32}$/.test(value);

/** Parse a write-only delivery staging request and reject all unknown fields. */
export const parseDeliveryConfigurationStageInput = (
	input: unknown,
): ConfigurationParseResult<DeliveryConfigurationStageInput> => {
	if (
		!isRecord(input) ||
		!hasExactKeys(input, [
			"expectedVersion",
			"idempotencyKey",
			"channel",
			"config",
		]) ||
		!isRecord(input.config)
	) {
		return { ok: false, message: "Invalid delivery configuration payload" };
	}
	const common = baseMutation(input);
	if (!common.ok) return common;

	if (input.channel === "email") {
		if (
			hasExactKeys(input.config, ["provider", "apiKey", "from"]) &&
			input.config.provider === "resend" &&
			typeof input.config.apiKey === "string" &&
			input.config.apiKey.length >= 16 &&
			input.config.apiKey.length <= 512 &&
			input.config.apiKey.startsWith("re_") &&
			isEmailFrom(input.config.from)
		) {
			return {
				ok: true,
				value: {
					...common.value,
					channel: "email",
					config: {
						provider: "resend",
						apiKey: input.config.apiKey,
						from: input.config.from,
					},
				},
			};
		}
		if (
			hasExactKeys(input.config, [
				"provider",
				"apiToken",
				"accountId",
				"from",
			]) &&
			input.config.provider === "cloudflare-email" &&
			isCloudflareApiToken(input.config.apiToken) &&
			isCloudflareAccountId(input.config.accountId) &&
			isEmailFrom(input.config.from)
		) {
			return {
				ok: true,
				value: {
					...common.value,
					channel: "email",
					config: {
						provider: "cloudflare-email",
						apiToken: input.config.apiToken,
						accountId: input.config.accountId,
						from: input.config.from,
					},
				},
			};
		}
		return { ok: false, message: "Invalid email provider configuration" };
	}

	if (
		input.channel === "sms" &&
		hasExactKeys(input.config, [
			"provider",
			"accountSid",
			"authToken",
			"fromNumber",
		]) &&
		input.config.provider === "twilio" &&
		typeof input.config.accountSid === "string" &&
		/^AC[a-fA-F0-9]{32}$/.test(input.config.accountSid) &&
		typeof input.config.authToken === "string" &&
		input.config.authToken.length >= 16 &&
		input.config.authToken.length <= 128 &&
		isE164(input.config.fromNumber)
	) {
		return {
			ok: true,
			value: {
				...common.value,
				channel: "sms",
				config: {
					provider: "twilio",
					accountSid: input.config.accountSid,
					authToken: input.config.authToken,
					fromNumber: input.config.fromNumber,
				},
			},
		};
	}

	return { ok: false, message: "Invalid Twilio configuration" };
};

/** Parse an explicit provider connectivity-test destination. */
export const parseDeliveryConfigurationTestInput = (
	input: unknown,
): ConfigurationParseResult<DeliveryConfigurationTestInput> => {
	if (
		!isRecord(input) ||
		!hasExactKeys(input, [
			"expectedVersion",
			"idempotencyKey",
			"channel",
			"recipient",
		])
	) {
		return { ok: false, message: "Invalid delivery test payload" };
	}
	const common = baseMutation(input);
	if (!common.ok) return common;
	if (input.channel === "email" && isEmail(input.recipient)) {
		return {
			ok: true,
			value: { ...common.value, channel: "email", recipient: input.recipient },
		};
	}
	if (input.channel === "sms" && isE164(input.recipient)) {
		return {
			ok: true,
			value: { ...common.value, channel: "sms", recipient: input.recipient },
		};
	}
	return { ok: false, message: "Test recipient is invalid" };
};

const parseHttpsUrl = (value: unknown): string | null => {
	if (typeof value !== "string" || value.length > 2048) return null;
	try {
		const url = new URL(value);
		if (
			url.protocol !== "https:" ||
			url.username ||
			url.password ||
			url.hash ||
			url.hostname === "localhost" ||
			url.hostname.endsWith(".local") ||
			/^\[.*\]$/.test(url.hostname) ||
			/^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname)
		) {
			return null;
		}
		return url.href;
	} catch {
		return null;
	}
};

/** Parse a write-only erasure-target manifest and reject ambiguous targets. */
export const parseErasureConfigurationStageInput = (
	input: unknown,
): ConfigurationParseResult<ErasureConfigurationStageInput> => {
	if (
		!isRecord(input) ||
		!hasExactKeys(input, ["expectedVersion", "idempotencyKey", "targets"]) ||
		!Array.isArray(input.targets) ||
		input.targets.length < 1 ||
		input.targets.length > 32
	) {
		return { ok: false, message: "Invalid erasure configuration payload" };
	}
	const common = baseMutation(input);
	if (!common.ok) return common;
	const targets: ErasureTargetStageInput[] = [];
	const ids = new Set<string>();
	const urls = new Set<string>();
	for (const candidate of input.targets) {
		if (
			!isRecord(candidate) ||
			!hasExactKeys(candidate, ["id", "url", "signingSecret"]) ||
			typeof candidate.id !== "string" ||
			!/[a-z0-9]/.test(candidate.id) ||
			!/^[-a-z0-9_]{2,64}$/.test(candidate.id) ||
			typeof candidate.signingSecret !== "string" ||
			candidate.signingSecret.length < 32 ||
			candidate.signingSecret.length > 1024
		) {
			return { ok: false, message: "Invalid erasure target" };
		}
		const url = parseHttpsUrl(candidate.url);
		if (!url || ids.has(candidate.id) || urls.has(url)) {
			return {
				ok: false,
				message: "Erasure targets must be unique HTTPS URLs",
			};
		}
		ids.add(candidate.id);
		urls.add(url);
		targets.push({
			id: candidate.id,
			url,
			signingSecret: candidate.signingSecret,
		});
	}
	return { ok: true, value: { ...common.value, targets } };
};

export const parseErasureConfigurationTestInput = (
	input: unknown,
): ConfigurationParseResult<ErasureConfigurationTestInput> => {
	if (
		!isRecord(input) ||
		!hasExactKeys(input, ["expectedVersion", "idempotencyKey"])
	) {
		return { ok: false, message: "Invalid erasure test payload" };
	}
	const common = baseMutation(input);
	return common;
};

const parseConfirmation = <T extends "ACTIVATE" | "ROLLBACK">(
	input: unknown,
	confirmation: T,
): ConfigurationParseResult<{
	expectedVersion: number;
	idempotencyKey: string;
	confirmation: T;
}> => {
	if (
		!isRecord(input) ||
		!hasExactKeys(input, [
			"expectedVersion",
			"idempotencyKey",
			"confirmation",
		]) ||
		input.confirmation !== confirmation
	) {
		return { ok: false, message: `Type ${confirmation} to confirm` };
	}
	const common = baseMutation(input);
	return common.ok
		? { ok: true, value: { ...common.value, confirmation } }
		: common;
};

export const parseConfigurationActivateInput = (
	input: unknown,
): ConfigurationParseResult<ConfigurationActivateInput> =>
	parseConfirmation(input, "ACTIVATE");

export const parseConfigurationRollbackInput = (
	input: unknown,
): ConfigurationParseResult<ConfigurationRollbackInput> =>
	parseConfirmation(input, "ROLLBACK");

const parseDeliveryConfirmation = <T extends "ACTIVATE" | "ROLLBACK">(
	input: unknown,
	confirmation: T,
): ConfigurationParseResult<{
	expectedVersion: number;
	idempotencyKey: string;
	channel: DeliveryChannel;
	confirmation: T;
}> => {
	if (
		!isRecord(input) ||
		!hasExactKeys(input, [
			"expectedVersion",
			"idempotencyKey",
			"channel",
			"confirmation",
		]) ||
		(input.channel !== "email" && input.channel !== "sms") ||
		input.confirmation !== confirmation
	) {
		return { ok: false, message: `Type ${confirmation} to confirm` };
	}
	const common = baseMutation(input);
	return common.ok
		? {
				ok: true,
				value: { ...common.value, channel: input.channel, confirmation },
			}
		: common;
};

export const parseDeliveryConfigurationActivateInput = (
	input: unknown,
): ConfigurationParseResult<DeliveryConfigurationActivateInput> =>
	parseDeliveryConfirmation(input, "ACTIVATE");

export const parseDeliveryConfigurationRollbackInput = (
	input: unknown,
): ConfigurationParseResult<DeliveryConfigurationRollbackInput> =>
	parseDeliveryConfirmation(input, "ROLLBACK");

/** Validate a mutation acknowledgement without accepting reflected inputs. */
export const parseConfigurationOperationResult = (
	input: unknown,
): ConfigurationParseResult<ConfigurationOperationResult> => {
	if (
		!isRecord(input) ||
		!hasExactKeys(input, [
			"operation",
			"revision",
			"version",
			"validated",
			"updatedAt",
		]) ||
		(input.operation !== "stage" &&
			input.operation !== "test" &&
			input.operation !== "activate" &&
			input.operation !== "rollback") ||
		!isVersion(input.revision) ||
		!isNullableVersion(input.version) ||
		typeof input.validated !== "boolean" ||
		typeof input.updatedAt !== "string" ||
		!isNullableTimestamp(input.updatedAt)
	) {
		return { ok: false, message: "Invalid configuration operation result" };
	}
	return {
		ok: true,
		value: {
			operation: input.operation,
			revision: input.revision,
			version: input.version,
			validated: input.validated,
			updatedAt: input.updatedAt,
		},
	};
};

const parseReadinessState = (
	input: Record<string, unknown>,
): ConfigurationReadinessState | null => {
	if (
		typeof input.structuralReady !== "boolean" ||
		(input.operationalState !== "disabled" &&
			input.operationalState !== "degraded" &&
			input.operationalState !== "ready") ||
		!isVersion(input.revision) ||
		!isNullableTimestamp(input.updatedAt)
	) {
		return null;
	}
	return {
		structuralReady: input.structuralReady,
		operationalState: input.operationalState,
		revision: input.revision,
		updatedAt: input.updatedAt,
	};
};

const parseChannelStatus = <T extends DeliveryEmailProvider | "twilio">(
	input: unknown,
	allowedProviders: readonly T[],
): (DeliveryChannelStatus & { provider: T }) | null => {
	if (
		!isRecord(input) ||
		!hasExactKeys(input, [
			"provider",
			"configured",
			"validated",
			"activeVersion",
			"nextVersion",
			"previousVersion",
			"updatedAt",
			"lastTestedAt",
		]) ||
		typeof input.provider !== "string" ||
		!allowedProviders.includes(input.provider as T) ||
		typeof input.configured !== "boolean" ||
		typeof input.validated !== "boolean" ||
		!isNullableVersion(input.activeVersion) ||
		!isNullableVersion(input.nextVersion) ||
		!isNullableVersion(input.previousVersion) ||
		!isNullableTimestamp(input.updatedAt) ||
		!isNullableTimestamp(input.lastTestedAt)
	) {
		return null;
	}
	return {
		provider: input.provider as T,
		configured: input.configured,
		validated: input.validated,
		activeVersion: input.activeVersion,
		nextVersion: input.nextVersion,
		previousVersion: input.previousVersion,
		updatedAt: input.updatedAt,
		lastTestedAt: input.lastTestedAt,
	};
};

/** Validate that an authoritative delivery status contains only read-safe keys. */
export const parseDeliveryConfigurationStatus = (
	input: unknown,
): ConfigurationParseResult<DeliveryConfigurationStatus> => {
	if (
		!isRecord(input) ||
		!hasExactKeys(input, [
			"structuralReady",
			"operationalState",
			"revision",
			"updatedAt",
			"capabilities",
			"channels",
		]) ||
		!isRecord(input.capabilities) ||
		!hasExactKeys(input.capabilities, ["email", "sms"]) ||
		typeof input.capabilities.email !== "boolean" ||
		typeof input.capabilities.sms !== "boolean" ||
		!isRecord(input.channels) ||
		!hasExactKeys(input.channels, ["email", "sms"])
	) {
		return { ok: false, message: "Invalid delivery status" };
	}
	const readiness = parseReadinessState(input);
	const email = parseChannelStatus(input.channels.email, [
		"resend",
		"cloudflare-email",
	]);
	const sms = parseChannelStatus(input.channels.sms, ["twilio"]);
	if (!readiness || !email || !sms) {
		return { ok: false, message: "Invalid delivery status" };
	}
	return {
		ok: true,
		value: {
			...readiness,
			capabilities: {
				email: input.capabilities.email,
				sms: input.capabilities.sms,
			},
			channels: {
				email,
				sms,
			},
		},
	};
};

/** Validate that an authoritative erasure status contains only read-safe keys. */
export const parseErasureConfigurationStatus = (
	input: unknown,
): ConfigurationParseResult<ErasureConfigurationStatus> => {
	if (
		!isRecord(input) ||
		!hasExactKeys(input, [
			"structuralReady",
			"operationalState",
			"revision",
			"updatedAt",
			"capabilities",
			"slots",
		]) ||
		!isRecord(input.capabilities) ||
		!hasExactKeys(input.capabilities, ["execution", "verification"]) ||
		typeof input.capabilities.execution !== "boolean" ||
		typeof input.capabilities.verification !== "boolean" ||
		!isRecord(input.slots) ||
		!hasExactKeys(input.slots, ["active", "next", "previous"])
	) {
		return { ok: false, message: "Invalid erasure status" };
	}
	const readiness = parseReadinessState(input);
	const active = parseErasureSlotStatus(input.slots.active);
	const next = parseErasureSlotStatus(input.slots.next);
	const previous = parseErasureSlotStatus(input.slots.previous);
	if (
		!readiness ||
		active === undefined ||
		next === undefined ||
		previous === undefined
	) {
		return { ok: false, message: "Invalid erasure status" };
	}
	return {
		ok: true,
		value: {
			...readiness,
			capabilities: {
				execution: input.capabilities.execution,
				verification: input.capabilities.verification,
			},
			slots: { active, next, previous },
		},
	};
};

const parseErasureSlotStatus = (
	input: unknown,
): ErasureConfigurationSlotStatus | null | undefined => {
	if (input === null) return null;
	if (
		!isRecord(input) ||
		!hasExactKeys(input, [
			"version",
			"targetCount",
			"targetIds",
			"validated",
			"createdAt",
			"lastTestedAt",
			"activatedAt",
		]) ||
		!isVersion(input.version) ||
		!isVersion(input.targetCount) ||
		!Array.isArray(input.targetIds) ||
		input.targetIds.length !== input.targetCount ||
		!input.targetIds.every(
			(id): id is string =>
				typeof id === "string" && /^[-a-z0-9_]{2,64}$/.test(id),
		) ||
		new Set(input.targetIds).size !== input.targetIds.length ||
		typeof input.validated !== "boolean" ||
		typeof input.createdAt !== "string" ||
		!isNullableTimestamp(input.createdAt) ||
		!isNullableTimestamp(input.lastTestedAt) ||
		!isNullableTimestamp(input.activatedAt)
	) {
		return undefined;
	}
	return {
		version: input.version,
		targetCount: input.targetCount,
		targetIds: input.targetIds,
		validated: input.validated,
		createdAt: input.createdAt,
		lastTestedAt: input.lastTestedAt,
		activatedAt: input.activatedAt,
	};
};
