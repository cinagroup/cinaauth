import {
	hasAdminControlPermission,
	parseConfigurationActivateInput,
	parseConfigurationOperationResult,
	parseConfigurationRollbackInput,
	parseDeliveryConfigurationActivateInput,
	parseDeliveryConfigurationRollbackInput,
	parseDeliveryConfigurationStageInput,
	parseDeliveryConfigurationStatus,
	parseDeliveryConfigurationTestInput,
	parseErasureConfigurationStageInput,
	parseErasureConfigurationStatus,
	parseErasureConfigurationTestInput,
} from "@cinaauth/auth-web-contract";
import { SECURITY_FRESH_AGE_SECONDS } from "./auth";

export type AdminConfigurationService = "delivery" | "erasure";
export type AdminConfigurationAction =
	| "status"
	| "stage"
	| "test"
	| "activate"
	| "rollback";

export const ADMIN_CONFIGURATION_RATE_LIMIT_RULE = {
	window: 5 * 60,
	max: 10,
} as const;

const ALLOWED_ADMIN_ORIGINS = new Set(["https://admin.cinaseek.ai"]);
const MAX_UPSTREAM_RESPONSE_BYTES = 64 * 1024;
const SAFE_ERROR_CODE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

type AdminConfigurationSession = {
	user: { id: string; role?: string | null };
	session: {
		createdAt: Date | string;
		impersonatedBy?: string | null;
	};
};

type RateLimitResult = {
	allowed: boolean;
	retryAfter: number | null;
};

export type AdminConfigurationAuditEvent = {
	actorId: string;
	service: AdminConfigurationService;
	action: Exclude<AdminConfigurationAction, "status">;
	phase: "requested" | "completed" | "failed";
	expectedVersion: number;
	resultVersion?: number | null;
	resultRevision?: number;
	failureCode?: string;
	failureStatus?: Exclude<AdminConfigurationStatus, 200>;
};

export type AdminConfigurationLogEvent = {
	level: "info" | "warn" | "error";
	message:
		| "cinaauth.admin_configuration.completed"
		| "cinaauth.admin_configuration.rejected"
		| "cinaauth.admin_configuration.failed";
	code?: string;
	actorId?: string;
	service?: AdminConfigurationService;
	action?: AdminConfigurationAction;
	retryAfter?: number | null;
	error?: string;
};

export type AdminConfigurationDependencies = {
	getSession: () => Promise<AdminConfigurationSession | null>;
	consumeRateLimit:
		| ((
				key: string,
				rule: { window: number; max: number },
		  ) => Promise<RateLimitResult>)
		| undefined;
	resolveSecret: (service: AdminConfigurationService) => Promise<string>;
	fetchService: (
		service: AdminConfigurationService,
		request: Request,
	) => Promise<Response>;
	writeAudit: (event: AdminConfigurationAuditEvent) => Promise<unknown>;
	logEvent: (event: AdminConfigurationLogEvent) => void;
};

type AdminConfigurationStatus = 200 | 400 | 401 | 403 | 409 | 429 | 502 | 503;

type AdminConfigurationResult = {
	status: AdminConfigurationStatus;
	retryAfter?: number | null;
	body:
		| { ok: true; data: unknown }
		| {
				ok: false;
				error: {
					code: string;
					message: string;
					status: Exclude<AdminConfigurationStatus, 200>;
				};
		  };
};

export type AdminConfigurationBodyResult =
	| { ok: true; value: unknown }
	| { ok: false };

const failure = (
	status: Exclude<AdminConfigurationStatus, 200>,
	code: string,
	message: string,
): AdminConfigurationResult => ({
	status,
	body: { ok: false, error: { code, message, status } },
});

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

const consumeConfigurationRateLimit = async (input: {
	dependencies: AdminConfigurationDependencies;
	actorId: string;
	service: AdminConfigurationService;
	action: AdminConfigurationAction;
}): Promise<AdminConfigurationResult | undefined> => {
	const { dependencies, actorId, service, action } = input;
	if (!dependencies.consumeRateLimit) {
		return failure(
			503,
			"RATE_LIMIT_UNAVAILABLE",
			"Configuration rate limiting is unavailable",
		);
	}
	let rateLimit: RateLimitResult;
	try {
		rateLimit = await dependencies.consumeRateLimit(
			getAdminConfigurationRateLimitKey(actorId, service, action),
			ADMIN_CONFIGURATION_RATE_LIMIT_RULE,
		);
	} catch (error) {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_configuration.failed",
			code: "RATE_LIMIT_UNAVAILABLE",
			actorId,
			service,
			action,
			error: errorMessage(error),
		});
		return failure(
			503,
			"RATE_LIMIT_UNAVAILABLE",
			"Configuration rate limiting is unavailable",
		);
	}
	if (!rateLimit.allowed) {
		return {
			...failure(429, "RATE_LIMITED", "Too many configuration requests"),
			retryAfter: rateLimit.retryAfter,
		};
	}
	return undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const hasNoKeys = (value: unknown) =>
	isRecord(value) && Object.keys(value).length === 0;

const hasExactKeys = (
	value: Record<string, unknown>,
	keys: readonly string[],
) => {
	const actual = Object.keys(value).sort();
	const expected = [...keys].sort();
	return (
		actual.length === expected.length &&
		actual.every((key, index) => key === expected[index])
	);
};

const isFreshSession = (createdAt: Date | string, now = Date.now()) => {
	const createdAtMs = new Date(createdAt).getTime();
	const age = now - createdAtMs;
	return (
		Number.isFinite(createdAtMs) &&
		age >= 0 &&
		age < SECURITY_FRESH_AGE_SECONDS * 1000
	);
};

const getPermission = (
	service: AdminConfigurationService,
	action: AdminConfigurationAction,
) => {
	if (service === "delivery") {
		return action === "status"
			? ("integration.delivery.read" as const)
			: ("integration.delivery.manage" as const);
	}
	return action === "status"
		? ("privacy.erasure.read" as const)
		: ("privacy.erasure.manage" as const);
};

const parseInput = (
	service: AdminConfigurationService,
	action: AdminConfigurationAction,
	input: unknown,
) => {
	if (action === "status") {
		return hasNoKeys(input)
			? ({ ok: true, value: {} } as const)
			: ({ ok: false, message: "Status body must be empty" } as const);
	}
	if (service === "delivery") {
		if (action === "activate") {
			return parseDeliveryConfigurationActivateInput(input);
		}
		if (action === "rollback") {
			return parseDeliveryConfigurationRollbackInput(input);
		}
		return action === "stage"
			? parseDeliveryConfigurationStageInput(input)
			: parseDeliveryConfigurationTestInput(input);
	}
	if (action === "activate") return parseConfigurationActivateInput(input);
	if (action === "rollback") return parseConfigurationRollbackInput(input);
	return action === "stage"
		? parseErasureConfigurationStageInput(input)
		: parseErasureConfigurationTestInput(input);
};

const toInternalValue = (
	service: AdminConfigurationService,
	action: AdminConfigurationAction,
	value: unknown,
) => {
	if (action === "status") {
		return service === "erasure" ? { schemaVersion: 1, action } : {};
	}
	if (service === "delivery") {
		return value;
	}
	if (service === "erasure") {
		const input = value as Record<string, unknown>;
		if (action === "stage") {
			return {
				schemaVersion: 1,
				action,
				expectedVersion: input.expectedVersion,
				idempotencyKey: input.idempotencyKey,
				targets: (input.targets as Record<string, unknown>[]).map((target) => ({
					id: target.id,
					url: target.url,
					secret: target.signingSecret,
				})),
			};
		}
		return {
			schemaVersion: 1,
			action,
			expectedVersion: input.expectedVersion,
			idempotencyKey: input.idempotencyKey,
			...(action === "activate" || action === "rollback"
				? { confirmation: input.confirmation }
				: {}),
		};
	}
	return value;
};

const toInternalBody = (
	service: AdminConfigurationService,
	action: AdminConfigurationAction,
	value: unknown,
) => JSON.stringify(toInternalValue(service, action, value));

const textEncoder = new TextEncoder();

const toHex = (bytes: ArrayBuffer) =>
	[...new Uint8Array(bytes)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");

const toBase64 = (bytes: ArrayBuffer) => {
	let binary = "";
	for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
	return btoa(binary);
};

const sign = async (
	body: string,
	secret: string,
	encoding: "hex" | "base64",
) => {
	const key = await crypto.subtle.importKey(
		"raw",
		textEncoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		textEncoder.encode(body),
	);
	return encoding === "hex" ? toHex(signature) : toBase64(signature);
};

/** Create a fixed-destination, authenticated Service Binding request. */
export const createSignedConfigurationRequest = async (input: {
	service: AdminConfigurationService;
	action: AdminConfigurationAction;
	body: string;
	idempotencyKey: string;
	secret: string;
	now?: number;
}) => {
	const timestamp = Math.floor((input.now ?? Date.now()) / 1000).toString();
	if (input.service === "delivery") {
		const signature = await sign(
			`${timestamp}.${input.idempotencyKey}.${input.body}`,
			input.secret,
			"hex",
		);
		return new Request(
			`https://cinaauth-delivery.internal/cinaauth/delivery/config/${input.action}`,
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${input.secret}`,
					"Content-Type": "application/json",
					"X-CinaAuth-Delivery-Id": input.idempotencyKey,
					"X-CinaAuth-Delivery-Timestamp": timestamp,
					"X-CinaAuth-Delivery-Signature": `v1=${signature}`,
				},
				body: input.body,
				signal: AbortSignal.timeout(15_000),
			},
		);
	}

	const signature = await sign(
		`${timestamp}.${input.idempotencyKey}.${input.body}`,
		input.secret,
		"base64",
	);
	return new Request(
		`https://cinaauth-erasure.internal/internal/config/erasure/${input.action}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				"X-CinaAuth-Nonce": input.idempotencyKey,
				"X-CinaAuth-Signature": `v1=${signature}`,
				"X-CinaAuth-Timestamp": timestamp,
			},
			body: input.body,
			signal: AbortSignal.timeout(15_000),
		},
	);
};

export const getAdminConfigurationRateLimitKey = (
	actorId: string,
	service: AdminConfigurationService,
	action: AdminConfigurationAction,
) => `admin-configuration|${encodeURIComponent(actorId)}|${service}|${action}`;

const readBoundedJson = async (response: Response): Promise<unknown> => {
	const declaredLength = Number(response.headers.get("content-length"));
	if (
		Number.isFinite(declaredLength) &&
		declaredLength > MAX_UPSTREAM_RESPONSE_BYTES
	) {
		throw new Error("Configuration response is too large");
	}
	const raw = await response.text();
	if (raw.length > MAX_UPSTREAM_RESPONSE_BYTES) {
		throw new Error("Configuration response is too large");
	}
	return JSON.parse(raw) as unknown;
};

const safeUpstreamFailure = (
	response: Response,
	value: unknown,
): AdminConfigurationResult => {
	const acceptedStatus = [400, 401, 403, 409, 429, 503].includes(
		response.status,
	)
		? (response.status as 400 | 401 | 403 | 409 | 429 | 503)
		: 502;
	const code =
		isRecord(value) &&
		typeof value.code === "string" &&
		SAFE_ERROR_CODE.test(value.code)
			? value.code.toUpperCase()
			: "CONFIGURATION_UPSTREAM_REJECTED";
	const message =
		isRecord(value) &&
		typeof value.message === "string" &&
		value.message.length >= 1 &&
		value.message.length <= 256 &&
		!/\r|\n/.test(value.message)
			? value.message
			: "The configuration service rejected the request";
	const result = failure(acceptedStatus, code, message);
	if (acceptedStatus === 429) {
		const retryAfter = Number(response.headers.get("retry-after"));
		return {
			...result,
			retryAfter:
				Number.isInteger(retryAfter) && retryAfter >= 1 && retryAfter <= 86_400
					? retryAfter
					: null,
		};
	}
	return result;
};

const projectDeliveryStatus = (input: unknown): unknown => {
	if (!isRecord(input)) return input;
	const expected = [
		"structuralReady",
		"operationalState",
		"revision",
		"validated",
		"updatedAt",
		"capabilities",
		"channels",
	] as const;
	if (!hasExactKeys(input, expected)) return input;
	return {
		structuralReady: input.structuralReady,
		operationalState: input.operationalState,
		revision: input.revision,
		updatedAt: input.updatedAt,
		capabilities: input.capabilities,
		channels: input.channels,
	};
};

const projectErasureSlot = (input: unknown): unknown => {
	if (input === null) return null;
	if (
		!isRecord(input) ||
		!hasExactKeys(input, [
			"version",
			"targetIds",
			"targetCount",
			"configured",
			"validated",
			"createdAt",
			"testedAt",
			"activatedAt",
		]) ||
		input.configured !== true
	) {
		return undefined;
	}
	return {
		version: input.version,
		targetIds: input.targetIds,
		targetCount: input.targetCount,
		validated: input.validated,
		createdAt: input.createdAt,
		lastTestedAt: input.testedAt,
		activatedAt: input.activatedAt,
	};
};

const latestTimestamp = (slots: unknown[]) => {
	const timestamps: string[] = [];
	for (const slot of slots) {
		if (!isRecord(slot)) continue;
		for (const key of ["createdAt", "lastTestedAt", "activatedAt"] as const) {
			const value = slot[key];
			if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
				timestamps.push(new Date(value).toISOString());
			}
		}
	}
	return timestamps.sort().at(-1) ?? null;
};

const projectErasureStatus = (input: unknown): unknown => {
	if (
		!isRecord(input) ||
		!hasExactKeys(input, [
			"revision",
			"structuralReady",
			"operationalReady",
			"source",
			"active",
			"next",
			"previous",
		]) ||
		(input.source !== "dynamic" &&
			input.source !== "legacy" &&
			input.source !== "none")
	) {
		return input;
	}
	const active = projectErasureSlot(input.active);
	const next = projectErasureSlot(input.next);
	const previous = projectErasureSlot(input.previous);
	if (active === undefined || next === undefined || previous === undefined) {
		return input;
	}
	const operationalState =
		input.operationalReady === true
			? "ready"
			: active || next || previous || input.source === "legacy"
				? "degraded"
				: "disabled";
	return {
		structuralReady: input.structuralReady,
		operationalState,
		revision: input.revision,
		updatedAt: latestTimestamp([active, next, previous]),
		capabilities: {
			execution: input.operationalReady === true,
			verification: input.structuralReady === true && next !== null,
		},
		slots: { active, next, previous },
	};
};

const projectConfigurationResponse = (
	service: AdminConfigurationService,
	action: AdminConfigurationAction,
	input: unknown,
) => {
	if (action !== "status") return input;
	return service === "delivery"
		? projectDeliveryStatus(input)
		: projectErasureStatus(input);
};

/**
 * Authorize, validate, rate-limit, audit, and forward one fixed configuration
 * operation without ever logging or returning write-only configuration.
 */
export const handleAdminConfiguration = async (input: {
	dependencies: AdminConfigurationDependencies;
	service: AdminConfigurationService;
	action: AdminConfigurationAction;
	origin: string | null;
	readBody: () => Promise<AdminConfigurationBodyResult>;
}): Promise<AdminConfigurationResult> => {
	const { dependencies, service, action } = input;
	const session = await dependencies.getSession();
	if (!session) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_configuration.rejected",
			code: "UNAUTHORIZED",
			service,
			action,
		});
		return failure(401, "UNAUTHORIZED", "Authentication required");
	}
	const actorId = session.user.id;
	if (session.session.impersonatedBy) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_configuration.rejected",
			code: "IMPERSONATION_NOT_ALLOWED",
			actorId,
			service,
			action,
		});
		return failure(
			403,
			"IMPERSONATION_NOT_ALLOWED",
			"Configuration access is unavailable while impersonating",
		);
	}
	if (
		!hasAdminControlPermission(
			session.user.role,
			getPermission(service, action),
		)
	) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_configuration.rejected",
			code: "FORBIDDEN",
			actorId,
			service,
			action,
		});
		return failure(403, "FORBIDDEN", "Permission denied");
	}
	if (input.origin && !ALLOWED_ADMIN_ORIGINS.has(input.origin)) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_configuration.rejected",
			code: "ORIGIN_NOT_ALLOWED",
			actorId,
			service,
			action,
		});
		return failure(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed");
	}
	if (action !== "status" && !isFreshSession(session.session.createdAt)) {
		return failure(403, "SESSION_NOT_FRESH", "Recent authentication required");
	}
	const mutation = action !== "status";
	if (!mutation) {
		const rateLimitFailure = await consumeConfigurationRateLimit({
			dependencies,
			actorId,
			service,
			action,
		});
		if (rateLimitFailure) return rateLimitFailure;
	}

	const bodyResult = await input.readBody();
	if (!bodyResult.ok) {
		return failure(400, "INVALID_JSON", "Request body must be valid JSON");
	}
	const parsed = parseInput(service, action, bodyResult.value);
	if (!parsed.ok) {
		return failure(400, "INVALID_CONFIGURATION_REQUEST", parsed.message);
	}

	const expectedVersion = mutation
		? (parsed.value as { expectedVersion: number }).expectedVersion
		: 0;
	const idempotencyKey = mutation
		? (parsed.value as { idempotencyKey: string }).idempotencyKey
		: crypto.randomUUID();

	if (mutation) {
		const rateLimitFailure = await consumeConfigurationRateLimit({
			dependencies,
			actorId,
			service,
			action,
		});
		if (rateLimitFailure) return rateLimitFailure;

		try {
			await dependencies.writeAudit({
				actorId,
				service,
				action,
				phase: "requested",
				expectedVersion,
			});
		} catch (error) {
			dependencies.logEvent({
				level: "error",
				message: "cinaauth.admin_configuration.failed",
				code: "AUDIT_WRITE_FAILED",
				actorId,
				service,
				action,
				error: errorMessage(error),
			});
			return failure(
				503,
				"AUDIT_UNAVAILABLE",
				"Configuration auditing is unavailable",
			);
		}
	}
	const finishWithFailureAudit = async (
		result: AdminConfigurationResult,
	): Promise<AdminConfigurationResult> => {
		if (!mutation || result.body.ok || result.status === 200) return result;
		try {
			await dependencies.writeAudit({
				actorId,
				service,
				action,
				phase: "failed",
				expectedVersion,
				failureCode: result.body.error.code,
				failureStatus: result.status,
			});
		} catch (error) {
			// Preserve the original downstream result. Retrying a committed operation
			// solely because the terminal audit write failed could repeat side effects.
			dependencies.logEvent({
				level: "error",
				message: "cinaauth.admin_configuration.failed",
				code: "AUDIT_TERMINAL_WRITE_FAILED",
				actorId,
				service,
				action,
				error: errorMessage(error),
			});
		}
		return result;
	};

	let secret: string;
	try {
		secret = await dependencies.resolveSecret(service);
		if (secret.length < 32) throw new Error("Configuration secret is weak");
	} catch (error) {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_configuration.failed",
			code: "CONFIGURATION_SECRET_UNAVAILABLE",
			actorId,
			service,
			action,
			error: errorMessage(error),
		});
		return finishWithFailureAudit(
			failure(
				503,
				"CONFIGURATION_SERVICE_UNAVAILABLE",
				"The configuration service is unavailable",
			),
		);
	}

	const internalBody = toInternalBody(service, action, parsed.value);
	let response: Response;
	try {
		const request = await createSignedConfigurationRequest({
			service,
			action,
			body: internalBody,
			idempotencyKey,
			secret,
		});
		response = await dependencies.fetchService(service, request);
	} catch (error) {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_configuration.failed",
			code: "CONFIGURATION_SERVICE_UNAVAILABLE",
			actorId,
			service,
			action,
			error: errorMessage(error),
		});
		return finishWithFailureAudit(
			failure(
				503,
				"CONFIGURATION_SERVICE_UNAVAILABLE",
				"The configuration service is unavailable",
			),
		);
	}

	let responseBody: unknown;
	try {
		responseBody = await readBoundedJson(response);
	} catch (error) {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_configuration.failed",
			code: "CONFIGURATION_RESPONSE_INVALID",
			actorId,
			service,
			action,
			error: errorMessage(error),
		});
		return finishWithFailureAudit(
			failure(
				502,
				"CONFIGURATION_RESPONSE_INVALID",
				"The configuration service returned an invalid response",
			),
		);
	}
	if (!response.ok) {
		return finishWithFailureAudit(safeUpstreamFailure(response, responseBody));
	}

	const projectedResponse = projectConfigurationResponse(
		service,
		action,
		responseBody,
	);
	const safeResponse =
		action === "status"
			? service === "delivery"
				? parseDeliveryConfigurationStatus(projectedResponse)
				: parseErasureConfigurationStatus(projectedResponse)
			: parseConfigurationOperationResult(projectedResponse);
	if (
		!safeResponse.ok ||
		(mutation &&
			(!("operation" in safeResponse.value) ||
				safeResponse.value.operation !== action))
	) {
		return finishWithFailureAudit(
			failure(
				502,
				"CONFIGURATION_RESPONSE_INVALID",
				"The configuration service returned an invalid response",
			),
		);
	}

	if (mutation) {
		const operation = safeResponse.value as {
			revision: number;
			version: number | null;
		};
		try {
			await dependencies.writeAudit({
				actorId,
				service,
				action,
				phase: "completed",
				expectedVersion,
				resultVersion: operation.version,
				resultRevision: operation.revision,
			});
		} catch (error) {
			// The mutation has already completed. Preserve success to avoid a retry
			// that could repeat an external provider test, and emit a structured alert.
			dependencies.logEvent({
				level: "error",
				message: "cinaauth.admin_configuration.failed",
				code: "AUDIT_COMPLETION_WRITE_FAILED",
				actorId,
				service,
				action,
				error: errorMessage(error),
			});
		}
	}
	dependencies.logEvent({
		level: "info",
		message: "cinaauth.admin_configuration.completed",
		actorId,
		service,
		action,
	});
	return { status: 200, body: { ok: true, data: safeResponse.value } };
};
