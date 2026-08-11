import type { Awaitable } from "@cinaauth/core";
import { createAuthEndpoint, createAuthMiddleware } from "@cinaauth/core/api";
import { APIError } from "@cinaauth/core/error";
import * as z from "zod";
import { freshSessionMiddleware, getSessionFromCtx } from "../../api";
import {
	constantTimeEqual,
	generateRandomString,
	makeSignature,
} from "../../crypto";
import { getEndpointResponse } from "../../utils/plugin-helper";

const RECEIPT_DOMAIN = "cinaauth.privacy.deletion-receipt.v1";
const SUBJECT_DOMAIN = "cinaauth.privacy.deletion-subject.v1";
const PROCESSOR_OPERATION_DOMAIN =
	"cinaauth.privacy.processor-erasure-operation.v1";
const PROCESSOR_EVIDENCE_DOMAIN =
	"cinaauth.privacy.processor-erasure-evidence.v1";

export type PrivacyProcessorErasureResult =
	| {
			status: "completed" | "not-applicable";
			/** ISO timestamp supplied by the processor adapter. */
			completedAt: string;
			/** Provider evidence reference. It is HMAC-digested before receipt output. */
			evidenceId: string;
	  }
	| {
			status: "pending";
			/** Suggested delay before the caller retries the deletion request. */
			retryAfterSeconds?: number;
	  };

export interface PrivacyDeletionProcessor {
	/** Stable, public-safe processor identifier included in readiness output. */
	id: string;
	/**
	 * Idempotently erase or de-identify the subject in this processor.
	 * CinaAuth supplies a stable keyed operation ID across retries.
	 */
	eraseSubject: (input: {
		operationId: string;
		subject: { id: string; email: string };
		request?: Request;
	}) => Awaitable<PrivacyProcessorErasureResult>;
}

export interface PrivacyProcessorErasureAttestation {
	id: string;
	status: "completed" | "not-applicable";
	completedAt: string;
	/** Stable keyed reference used to correlate retries without exposing PII. */
	operationId: string;
	/** HMAC digest of the processor's evidence reference. */
	evidenceDigest: string;
}

export interface PrivacyRetentionException {
	/** Stable identifier included in policy snapshots and deletion receipts. */
	code: string;
	/** Human-readable data family that may remain after account deletion. */
	category: string;
	/** Narrow purpose for retaining this data family. */
	purpose: string;
	/** Maximum retention period. Omit only when an external legal hold controls it. */
	maximumRetentionDays?: number;
	/** Public legal or contractual basis supplied by the controller. */
	legalBasis?: string;
}

export interface PrivacyRetentionReceiptSnapshot
	extends PrivacyRetentionException {
	/** Signed upper-bound timestamp derived from issuedAt and maximumRetentionDays. */
	purgeNoLaterThan?: string;
}

export interface PrivacyDeletionHold {
	/** Stable, non-secret hold code suitable for display to the subject. */
	code: string;
	/** Concise explanation of why deletion cannot currently proceed. */
	reason: string;
	/** Optional ISO timestamp for the next review. */
	reviewAfter?: string;
}

export interface PrivacyDeletionOptions {
	/** Version of the controller's deletion and retention policy. */
	policyVersion: string;
	/** Data families that may remain temporarily after active account deletion. */
	retentionExceptions?: PrivacyRetentionException[];
	/**
	 * Resolve current blocking holds immediately before deletion and when the
	 * readiness endpoint is queried. Returned details must be safe to show to
	 * the authenticated subject and must not contain privileged case data.
	 */
	resolveBlockingHolds?: (input: {
		user: { id: string; email: string };
		request?: Request;
	}) => Awaitable<PrivacyDeletionHold[]>;
	/**
	 * Optional dedicated HMAC key for deletion receipts. When omitted, the
	 * CinaAuth application secret signs receipts. Keep retired keys available
	 * wherever old receipts must remain verifiable.
	 */
	receiptSecret?: string;
	/**
	 * Required external processors that must attest erasure before local account
	 * deletion proceeds. Adapters must be idempotent for the supplied operation ID.
	 */
	processors?: PrivacyDeletionProcessor[];
}

export type PrivacyDeletionReceiptPayload = {
	schemaVersion: 1;
	receiptId: string;
	issuedAt: string;
	status: "completed";
	subject: {
		/** Keyed pseudonymous identifier; never the raw user ID or email. */
		pseudonymousId: string;
	};
	deletion: {
		scope: "cinaauth-authentication-account";
		policyVersion: string;
		retentionExceptions: PrivacyRetentionReceiptSnapshot[];
		/** Optional only so receipts issued before processor support still verify. */
		processors?: PrivacyProcessorErasureAttestation[];
	};
};

export type PrivacyDeletionReceipt = PrivacyDeletionReceiptPayload & {
	proof: {
		algorithm: "HMAC-SHA256";
		signature: string;
	};
};

type ResolvedPrivacyDeletionOptions = Omit<
	PrivacyDeletionOptions,
	"processors" | "retentionExceptions"
> & {
	processors: PrivacyDeletionProcessor[];
	retentionExceptions: PrivacyRetentionException[];
};

type PrivacyDeletionHookContext = {
	privacyDeletionSubject?: {
		id: string;
	};
	privacyProcessorAttestations?: PrivacyProcessorErasureAttestation[];
};

const retentionExceptionSchema = z.object({
	code: z.string().min(1).max(128),
	category: z.string().min(1).max(256),
	purpose: z.string().min(1).max(1_000),
	maximumRetentionDays: z.number().int().positive().max(100_000).optional(),
	legalBasis: z.string().min(1).max(512).optional(),
});

const retentionReceiptSnapshotSchema = retentionExceptionSchema.extend({
	purgeNoLaterThan: z.string().min(1).max(64).optional(),
});

const processorAttestationSchema = z.object({
	id: z.string().min(1).max(64),
	status: z.enum(["completed", "not-applicable"]),
	completedAt: z.string().min(1).max(64),
	operationId: z.string().min(43).max(64),
	evidenceDigest: z.string().min(43).max(64),
});

const deletionReceiptPayloadSchema = z.object({
	schemaVersion: z.literal(1),
	receiptId: z.string().min(16).max(128),
	issuedAt: z.string().min(1).max(64),
	status: z.literal("completed"),
	subject: z.object({
		pseudonymousId: z.string().min(32).max(256),
	}),
	deletion: z.object({
		scope: z.literal("cinaauth-authentication-account"),
		policyVersion: z.string().min(1).max(128),
		retentionExceptions: z.array(retentionReceiptSnapshotSchema).max(100),
		processors: z.array(processorAttestationSchema).max(100).optional(),
	}),
});

const deletionReceiptSchema = deletionReceiptPayloadSchema.extend({
	proof: z.object({
		algorithm: z.literal("HMAC-SHA256"),
		signature: z.string().min(32).max(256),
	}),
});

const canonicalize = (value: unknown): string => {
	if (
		value === null ||
		typeof value === "boolean" ||
		typeof value === "number"
	) {
		return JSON.stringify(value);
	}
	if (typeof value === "string") return JSON.stringify(value);
	if (Array.isArray(value)) {
		return `[${value.map((item) => canonicalize(item)).join(",")}]`;
	}
	if (typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, item]) => item !== undefined)
			.sort(([left], [right]) => left.localeCompare(right));
		return `{${entries
			.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
			.join(",")}}`;
	}
	throw new Error("Deletion receipt contains a non-JSON value");
};

const receiptSigningInput = (payload: PrivacyDeletionReceiptPayload) =>
	`${RECEIPT_DOMAIN}\n${canonicalize(payload)}`;

const resolveOptions = (
	options: PrivacyDeletionOptions,
): ResolvedPrivacyDeletionOptions => {
	const policyVersion = options.policyVersion.trim();
	if (!policyVersion || policyVersion.length > 128) {
		throw new Error(
			"deletion.policyVersion must be between 1 and 128 characters",
		);
	}
	if (options.receiptSecret && options.receiptSecret.length < 32) {
		throw new Error("deletion.receiptSecret must be at least 32 characters");
	}
	const retentionExceptions = (options.retentionExceptions ?? []).map(
		(exception) => retentionExceptionSchema.parse(exception),
	);
	const codes = new Set<string>();
	for (const exception of retentionExceptions) {
		if (codes.has(exception.code)) {
			throw new Error(
				`deletion.retentionExceptions contains duplicate code ${exception.code}`,
			);
		}
		codes.add(exception.code);
	}
	const processors = options.processors ?? [];
	const processorIds = new Set<string>();
	for (const processor of processors) {
		if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(processor.id)) {
			throw new Error(
				"deletion processor ids must use 1-64 lowercase letters, digits, dots, underscores, or hyphens",
			);
		}
		if (processorIds.has(processor.id)) {
			throw new Error(
				`deletion.processors contains duplicate id ${processor.id}`,
			);
		}
		processorIds.add(processor.id);
	}
	return {
		...options,
		policyVersion,
		processors,
		retentionExceptions,
	};
};

const receiptSecret = (
	options: ResolvedPrivacyDeletionOptions,
	applicationSecret: string,
) => options.receiptSecret ?? applicationSecret;

const resolveHolds = async (
	options: ResolvedPrivacyDeletionOptions,
	input: {
		user: { id: string; email: string };
		request?: Request;
	},
) => (await options.resolveBlockingHolds?.(input)) ?? [];

const createDeletionReceipt = async ({
	options,
	processorAttestations,
	secret,
	userId,
}: {
	options: ResolvedPrivacyDeletionOptions;
	processorAttestations: PrivacyProcessorErasureAttestation[];
	secret: string;
	userId: string;
}): Promise<PrivacyDeletionReceipt> => {
	const issuedAt = new Date().toISOString();
	const issuedAtMilliseconds = Date.parse(issuedAt);
	const retentionExceptions = options.retentionExceptions.map((exception) => ({
		...exception,
		...(exception.maximumRetentionDays
			? {
					purgeNoLaterThan: new Date(
						issuedAtMilliseconds +
							exception.maximumRetentionDays * 24 * 60 * 60 * 1_000,
					).toISOString(),
				}
			: {}),
	}));
	const payload: PrivacyDeletionReceiptPayload = {
		schemaVersion: 1,
		receiptId: generateRandomString(32, "a-z", "A-Z", "0-9"),
		issuedAt,
		status: "completed",
		subject: {
			pseudonymousId: await makeSignature(
				`${SUBJECT_DOMAIN}\n${userId}`,
				secret,
			),
		},
		deletion: {
			scope: "cinaauth-authentication-account",
			policyVersion: options.policyVersion,
			retentionExceptions,
			processors: processorAttestations,
		},
	};
	return {
		...payload,
		proof: {
			algorithm: "HMAC-SHA256",
			signature: await makeSignature(receiptSigningInput(payload), secret),
		},
	};
};

const toReceiptPayload = (
	receipt: PrivacyDeletionReceipt,
): PrivacyDeletionReceiptPayload => ({
	schemaVersion: receipt.schemaVersion,
	receiptId: receipt.receiptId,
	issuedAt: receipt.issuedAt,
	status: receipt.status,
	subject: receipt.subject,
	deletion: {
		...receipt.deletion,
		...(receipt.deletion.processors
			? { processors: receipt.deletion.processors }
			: {}),
	},
});

const parseProcessorResult = (
	processorId: string,
	value: PrivacyProcessorErasureResult,
) => {
	if (value.status === "pending") {
		if (
			value.retryAfterSeconds !== undefined &&
			(!Number.isInteger(value.retryAfterSeconds) ||
				value.retryAfterSeconds < 1 ||
				value.retryAfterSeconds > 86_400)
		) {
			throw new Error(
				`Processor ${processorId} returned an invalid retry delay`,
			);
		}
		return value;
	}
	const completedAt = Date.parse(value.completedAt);
	if (
		(value.status !== "completed" && value.status !== "not-applicable") ||
		!value.evidenceId?.trim() ||
		value.evidenceId.length > 512 ||
		!value.completedAt ||
		value.completedAt.length > 64 ||
		Number.isNaN(completedAt) ||
		completedAt > Date.now() + 5 * 60 * 1_000
	) {
		throw new Error(
			`Processor ${processorId} returned invalid erasure evidence`,
		);
	}
	return {
		...value,
		completedAt: new Date(completedAt).toISOString(),
	};
};

const eraseProcessorData = async ({
	options,
	request,
	secret,
	user,
}: {
	options: ResolvedPrivacyDeletionOptions;
	request?: Request;
	secret: string;
	user: { id: string; email: string };
}): Promise<PrivacyProcessorErasureAttestation[]> => {
	const attestations: PrivacyProcessorErasureAttestation[] = [];
	for (const processor of options.processors) {
		const operationId = await makeSignature(
			`${PROCESSOR_OPERATION_DOMAIN}\n${options.policyVersion}\n${processor.id}\n${user.id}`,
			secret,
		);
		let result: PrivacyProcessorErasureResult;
		try {
			result = parseProcessorResult(
				processor.id,
				await processor.eraseSubject({
					operationId,
					subject: user,
					request,
				}),
			);
		} catch {
			throw APIError.fromStatus("INTERNAL_SERVER_ERROR", {
				code: "PRIVACY_PROCESSOR_ERASURE_FAILED",
				message:
					"Account deletion is paused because a required processor could not confirm erasure",
			});
		}
		if (result.status === "pending") {
			throw APIError.fromStatus("CONFLICT", {
				code: "PRIVACY_PROCESSOR_ERASURE_PENDING",
				message:
					"Account deletion is waiting for a required processor to complete erasure",
				...(result.retryAfterSeconds
					? { retryAfterSeconds: result.retryAfterSeconds }
					: {}),
			});
		}
		const completedAt = result.completedAt;
		attestations.push({
			id: processor.id,
			status: result.status,
			completedAt,
			operationId,
			evidenceDigest: await makeSignature(
				`${PROCESSOR_EVIDENCE_DOMAIN}\n${processor.id}\n${result.status}\n${completedAt}\n${result.evidenceId}`,
				secret,
			),
		});
	}
	return attestations;
};

export const verifyDeletionReceipt = async (
	receipt: PrivacyDeletionReceipt,
	secret: string,
) => {
	const expected = await makeSignature(
		receiptSigningInput(toReceiptPayload(receipt)),
		secret,
	);
	return constantTimeEqual(expected, receipt.proof.signature);
};

const createDeletionReadinessEndpoint = (
	options: ResolvedPrivacyDeletionOptions,
) =>
	createAuthEndpoint(
		"/privacy/deletion-readiness",
		{
			method: "GET",
			use: [freshSessionMiddleware],
			metadata: {
				openapi: {
					operationId: "getPrivacyDeletionReadiness",
					description:
						"Return current deletion holds and the retention policy snapshot for the authenticated subject",
					responses: {
						"200": { description: "Deletion readiness and policy snapshot" },
					},
				},
			},
		},
		async (ctx) => {
			const holds = await resolveHolds(options, {
				user: {
					id: ctx.context.session.user.id,
					email: ctx.context.session.user.email,
				},
				request: ctx.request,
			});
			ctx.setHeader("cache-control", "no-store");
			ctx.setHeader("pragma", "no-cache");
			return ctx.json({
				canDelete: holds.length === 0,
				policyVersion: options.policyVersion,
				retentionExceptions: options.retentionExceptions,
				blockingHolds: holds,
				requiredProcessors: options.processors.map(({ id }) => ({ id })),
				receipt: {
					format: "signed-json",
					verificationEndpoint: "/privacy/deletion-receipt/verify",
				},
			});
		},
	);

const createVerifyDeletionReceiptEndpoint = (
	options: ResolvedPrivacyDeletionOptions,
) =>
	createAuthEndpoint(
		"/privacy/deletion-receipt/verify",
		{
			method: "POST",
			body: z.object({ receipt: deletionReceiptSchema }),
			metadata: {
				openapi: {
					operationId: "verifyPrivacyDeletionReceipt",
					description:
						"Verify the HMAC proof on a CinaAuth account deletion receipt",
					responses: {
						"200": { description: "Deletion receipt verification result" },
					},
				},
			},
		},
		async (ctx) => {
			ctx.setHeader("cache-control", "no-store");
			ctx.setHeader("pragma", "no-cache");
			return ctx.json({
				valid: await verifyDeletionReceipt(
					ctx.body.receipt,
					receiptSecret(options, ctx.context.secret),
				),
				receiptId: ctx.body.receipt.receiptId,
				status: ctx.body.receipt.status,
			});
		},
	);

export const createPrivacyDeletionFeatures = (
	options: PrivacyDeletionOptions,
) => {
	const resolved = resolveOptions(options);
	const deletionPaths = new Set(["/delete-user", "/delete-user/callback"]);
	return {
		endpoints: {
			getPrivacyDeletionReadiness: createDeletionReadinessEndpoint(resolved),
			verifyPrivacyDeletionReceipt:
				createVerifyDeletionReceiptEndpoint(resolved),
		},
		hooks: {
			before: [
				{
					matcher(context: { path?: string }) {
						return Boolean(context.path && deletionPaths.has(context.path));
					},
					handler: createAuthMiddleware(async (ctx) => {
						const session = await getSessionFromCtx(ctx, {
							disableCookieCache: true,
						});
						if (!session) return;
						const holds = await resolveHolds(resolved, {
							user: {
								id: session.user.id,
								email: session.user.email,
							},
							request: ctx.request,
						});
						if (holds.length > 0) {
							throw APIError.fromStatus("CONFLICT", {
								code: "PRIVACY_DELETION_BLOCKED",
								message: "Account deletion is blocked by a retention hold",
							});
						}
						const privacyProcessorAttestations = await eraseProcessorData({
							options: resolved,
							request: ctx.request,
							secret: receiptSecret(resolved, ctx.context.secret),
							user: {
								id: session.user.id,
								email: session.user.email,
							},
						});
						return {
							context: {
								context: {
									privacyDeletionSubject: { id: session.user.id },
									privacyProcessorAttestations,
								},
							},
						};
					}),
				},
			],
			after: [
				{
					matcher(context: { path?: string }) {
						return Boolean(context.path && deletionPaths.has(context.path));
					},
					handler: createAuthMiddleware(async (ctx) => {
						const response = await getEndpointResponse<{
							success: boolean;
							message: string;
						}>(ctx);
						if (!response?.success || response.message !== "User deleted") {
							return;
						}
						const subject = (
							ctx.context as typeof ctx.context & PrivacyDeletionHookContext
						).privacyDeletionSubject;
						if (!subject) return;
						const deletionReceipt = await createDeletionReceipt({
							options: resolved,
							processorAttestations:
								(ctx.context as typeof ctx.context & PrivacyDeletionHookContext)
									.privacyProcessorAttestations ?? [],
							secret: receiptSecret(resolved, ctx.context.secret),
							userId: subject.id,
						});
						return ctx.json({ ...response, deletionReceipt });
					}),
				},
			],
		},
	};
};
