import type {
	ConfigMutationInput,
	ErasureConfigurationStatus,
	StageConfigInput,
} from "./configuration";
import { createConfigFailure } from "./configuration";
import { getErasureConfigStub } from "./configuration-do";
import type { PrivacyErasureEnv } from "./env";
import type { ErasureTarget } from "./protocol";
import { readBoundedBody, verifyBodySignature } from "./protocol";
import { resolveErasureWebhookSecret } from "./secrets-store-readiness";

export type ManagementAction =
	| "status"
	| "stage"
	| "test"
	| "activate"
	| "rollback";

const MAX_MANAGEMENT_BODY_BYTES = 65_536;
const MANAGEMENT_SIGNATURE_ALLOWED_SKEW_SECONDS = 300;
const MANAGEMENT_NONCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
const UNIX_TIMESTAMP_PATTERN = /^(0|[1-9][0-9]{0,12})$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: string[]) =>
	Object.keys(value).sort().join("\n") === [...keys].sort().join("\n");

const readSignedBody = async (request: Request, env: PrivacyErasureEnv) => {
	if (!request.headers.get("content-type")?.startsWith("application/json")) {
		throw createConfigFailure(
			"UNSUPPORTED_CONTENT_TYPE",
			415,
			"Content-Type must be application/json",
		);
	}
	const body = await readBoundedBody(request, MAX_MANAGEMENT_BODY_BYTES);
	const nonce = request.headers.get("x-cinaauth-nonce");
	const timestamp = request.headers.get("x-cinaauth-timestamp");
	if (
		!nonce ||
		!MANAGEMENT_NONCE_PATTERN.test(nonce) ||
		!timestamp ||
		!UNIX_TIMESTAMP_PATTERN.test(timestamp)
	) {
		throw createConfigFailure(
			"INVALID_SIGNATURE",
			401,
			"Invalid request signature",
		);
	}
	const timestampSeconds = Number(timestamp);
	const nowSeconds = Math.floor(Date.now() / 1000);
	if (
		!Number.isSafeInteger(timestampSeconds) ||
		Math.abs(nowSeconds - timestampSeconds) >
			MANAGEMENT_SIGNATURE_ALLOWED_SKEW_SECONDS
	) {
		throw createConfigFailure(
			"STALE_SIGNATURE",
			401,
			"Request signature timestamp is stale",
		);
	}
	const { value: webhookSecret } = await resolveErasureWebhookSecret(env);
	if (
		!(await verifyBodySignature(
			`${timestamp}.${nonce}.${body}`,
			request.headers.get("x-cinaauth-signature"),
			webhookSecret,
		))
	) {
		throw createConfigFailure(
			"INVALID_SIGNATURE",
			401,
			"Invalid request signature",
		);
	}
	try {
		return { nonce, value: JSON.parse(body) as unknown };
	} catch {
		throw createConfigFailure(
			"INVALID_CONFIG_REQUEST",
			400,
			"Invalid configuration request",
		);
	}
};

const readMutation = (
	value: Record<string, unknown>,
	action: Exclude<ManagementAction, "status" | "stage">,
	nonce: string,
): ConfigMutationInput => {
	const confirmation =
		action === "activate"
			? "ACTIVATE"
			: action === "rollback"
				? "ROLLBACK"
				: undefined;
	if (
		!hasExactKeys(value, [
			"schemaVersion",
			"action",
			"expectedVersion",
			"idempotencyKey",
			...(confirmation ? ["confirmation"] : []),
		]) ||
		value.schemaVersion !== 1 ||
		value.action !== action ||
		typeof value.expectedVersion !== "number" ||
		typeof value.idempotencyKey !== "string" ||
		value.idempotencyKey !== nonce ||
		(confirmation !== undefined && value.confirmation !== confirmation)
	) {
		throw createConfigFailure(
			"INVALID_CONFIG_REQUEST",
			400,
			"Invalid configuration request",
		);
	}
	return {
		expectedVersion: value.expectedVersion,
		idempotencyKey: value.idempotencyKey,
	};
};

const readTarget = (value: unknown): ErasureTarget => {
	if (
		!isRecord(value) ||
		!hasExactKeys(value, ["id", "url", "secret"]) ||
		typeof value.id !== "string" ||
		typeof value.url !== "string" ||
		typeof value.secret !== "string"
	) {
		throw createConfigFailure(
			"INVALID_CONFIG_REQUEST",
			400,
			"Invalid structured erasure target",
		);
	}
	return { id: value.id, url: value.url, secret: value.secret };
};

const readStage = (
	value: Record<string, unknown>,
	nonce: string,
): StageConfigInput => {
	if (
		!hasExactKeys(value, [
			"schemaVersion",
			"action",
			"expectedVersion",
			"idempotencyKey",
			"targets",
		]) ||
		value.schemaVersion !== 1 ||
		value.action !== "stage" ||
		typeof value.expectedVersion !== "number" ||
		typeof value.idempotencyKey !== "string" ||
		value.idempotencyKey !== nonce ||
		!Array.isArray(value.targets)
	) {
		throw createConfigFailure(
			"INVALID_CONFIG_REQUEST",
			400,
			"Invalid configuration request",
		);
	}
	return {
		expectedVersion: value.expectedVersion,
		idempotencyKey: value.idempotencyKey,
		targets: value.targets.map(readTarget),
	};
};

const projectMutationResult = (
	action: Exclude<ManagementAction, "status">,
	status: ErasureConfigurationStatus,
) => {
	const slot =
		action === "stage" || action === "test" ? status.next : status.active;
	const updatedAt =
		action === "stage"
			? slot?.createdAt
			: action === "test"
				? slot?.testedAt
				: slot?.activatedAt;
	if (!slot || !updatedAt || Number.isNaN(Date.parse(updatedAt))) {
		throw createConfigFailure(
			"CONFIG_STATE_INVALID",
			503,
			"Privacy configuration state is invalid",
		);
	}
	return {
		operation: action,
		revision: status.revision,
		version: slot.version,
		validated: slot.validated,
		updatedAt,
	};
};

export const handleConfigurationAction = async (
	action: ManagementAction,
	request: Request,
	env: PrivacyErasureEnv,
) => {
	const { nonce, value: parsed } = await readSignedBody(request, env);
	if (!isRecord(parsed)) {
		throw createConfigFailure(
			"INVALID_CONFIG_REQUEST",
			400,
			"Invalid configuration request",
		);
	}
	const config = getErasureConfigStub(env);
	if (action === "status") {
		if (
			!hasExactKeys(parsed, ["schemaVersion", "action"]) ||
			parsed.schemaVersion !== 1 ||
			parsed.action !== "status"
		) {
			throw createConfigFailure(
				"INVALID_CONFIG_REQUEST",
				400,
				"Invalid configuration request",
			);
		}
		const status = await config.status();
		let structuralReady = true;
		let operationalReady = status.active?.validated === true;
		try {
			await config.checkEncryptionKey();
		} catch {
			structuralReady = false;
			operationalReady = false;
		}
		if (structuralReady && status.active) {
			try {
				const activeTargets = await config.activeTargets();
				operationalReady = Boolean(activeTargets?.length);
			} catch {
				operationalReady = false;
			}
		}
		return { ...status, structuralReady, operationalReady };
	}
	if (action === "stage") {
		return projectMutationResult(
			"stage",
			await config.stage(readStage(parsed, nonce)),
		);
	}
	const input = readMutation(parsed, action, nonce);
	if (action === "test") {
		return projectMutationResult("test", await config.test(input));
	}
	if (action === "activate") {
		return projectMutationResult("activate", await config.activate(input));
	}
	return projectMutationResult("rollback", await config.rollback(input));
};
