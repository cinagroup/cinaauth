export const PRIVACY_EXPORT_PATH = "/api/auth/privacy/export";
export const PRIVACY_ASYNC_EXPORT_PATH = "/api/auth/privacy/async-export";
export const PRIVACY_ASYNC_EXPORT_STATUS_PATH =
	"/api/auth/privacy/async-export/status";
export const PRIVACY_ASYNC_EXPORT_DOWNLOAD_PATH =
	"/api/auth/privacy/async-export/download";
export const PRIVACY_DELETION_READINESS_PATH =
	"/api/auth/privacy/deletion-readiness";
export const PRIVACY_DELETE_ACCOUNT_PATH = "/api/auth/delete-user";

export type PrivacyRetentionException = {
	code: string;
	category: string;
	purpose: string;
	maximumRetentionDays?: number;
	legalBasis?: string;
};

export type PrivacyRetentionReceiptSnapshot = PrivacyRetentionException & {
	purgeNoLaterThan?: string;
};

export type PrivacyDeletionHold = {
	code: string;
	reason: string;
	reviewAfter?: string;
};

export type PrivacyDeletionReadiness = {
	canDelete: boolean;
	policyVersion: string;
	retentionExceptions: PrivacyRetentionException[];
	blockingHolds: PrivacyDeletionHold[];
	requiredProcessors: Array<{ id: string }>;
};

export type PrivacyProcessorErasureAttestation = {
	id: string;
	status: "completed" | "not-applicable";
	completedAt: string;
	operationId: string;
	evidenceDigest: string;
};

export type PrivacyAsyncExportState =
	| "queued"
	| "processing"
	| "retrying"
	| "ready"
	| "failed"
	| "expired";

export type PrivacyAsyncExportStatus = {
	jobId: string;
	status: PrivacyAsyncExportState;
	createdAt: string;
	expiresAt: string;
	readyAt?: string;
	size?: number;
	failureCode?: string;
};

export type PrivacyDeletionReceipt = {
	schemaVersion: 1;
	receiptId: string;
	issuedAt: string;
	status: "completed";
	subject: { pseudonymousId: string };
	deletion: {
		scope: "cinaauth-authentication-account";
		policyVersion: string;
		retentionExceptions: PrivacyRetentionReceiptSnapshot[];
		processors?: PrivacyProcessorErasureAttestation[];
	};
	proof: {
		algorithm: "HMAC-SHA256";
		signature: string;
	};
};

export const PRIVACY_EXPORT_CATEGORIES = [
	"Profile and account metadata",
	"Sessions and sign-in identities",
	"Authenticators, wallets, and API key metadata",
	"Organization memberships and invitations",
	"OAuth authorizations and security audit events",
] as const;

export const getPersonalDataExportFilename = (
	contentDisposition: string | null,
	now = new Date(),
) => {
	const candidate = contentDisposition
		?.match(/filename="?([^";]+)"?/i)?.[1]
		?.trim();
	if (candidate && /^[a-zA-Z0-9._-]{1,128}$/.test(candidate)) {
		return candidate;
	}
	return `cinaauth-personal-data-${now.toISOString().slice(0, 10)}.json`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const PRIVACY_ASYNC_EXPORT_STATES = new Set<PrivacyAsyncExportState>([
	"queued",
	"processing",
	"retrying",
	"ready",
	"failed",
	"expired",
]);

export const parsePrivacyAsyncExportStatus = (
	value: unknown,
): PrivacyAsyncExportStatus | null => {
	if (
		!isRecord(value) ||
		typeof value.jobId !== "string" ||
		!/^[A-Za-z0-9_-]{16,128}$/.test(value.jobId) ||
		typeof value.status !== "string" ||
		!PRIVACY_ASYNC_EXPORT_STATES.has(
			value.status as PrivacyAsyncExportState,
		) ||
		typeof value.createdAt !== "string" ||
		Number.isNaN(Date.parse(value.createdAt)) ||
		typeof value.expiresAt !== "string" ||
		Number.isNaN(Date.parse(value.expiresAt)) ||
		(value.readyAt !== undefined &&
			(typeof value.readyAt !== "string" ||
				Number.isNaN(Date.parse(value.readyAt)))) ||
		(value.size !== undefined &&
			(typeof value.size !== "number" ||
				!Number.isFinite(value.size) ||
				value.size < 0)) ||
		(value.failureCode !== undefined && typeof value.failureCode !== "string")
	) {
		return null;
	}
	return value as PrivacyAsyncExportStatus;
};

const isRetentionException = (
	value: unknown,
): value is PrivacyRetentionException =>
	isRecord(value) &&
	typeof value.code === "string" &&
	typeof value.category === "string" &&
	typeof value.purpose === "string" &&
	(value.maximumRetentionDays === undefined ||
		typeof value.maximumRetentionDays === "number") &&
	(value.legalBasis === undefined || typeof value.legalBasis === "string");

const isRetentionReceiptSnapshot = (
	value: unknown,
): value is PrivacyRetentionReceiptSnapshot => {
	if (!isRetentionException(value)) return false;
	const purgeNoLaterThan = (value as Record<string, unknown>)
		.purgeNoLaterThan;
	return (
		purgeNoLaterThan === undefined ||
		(typeof purgeNoLaterThan === "string" &&
			!Number.isNaN(Date.parse(purgeNoLaterThan)))
	);
};

const isDeletionHold = (value: unknown): value is PrivacyDeletionHold =>
	isRecord(value) &&
	typeof value.code === "string" &&
	typeof value.reason === "string" &&
	(value.reviewAfter === undefined || typeof value.reviewAfter === "string");

const isProcessorSummary = (value: unknown): value is { id: string } =>
	isRecord(value) &&
	typeof value.id === "string" &&
	/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(value.id);

const isProcessorAttestation = (
	value: unknown,
): value is PrivacyProcessorErasureAttestation =>
	isRecord(value) &&
	typeof value.id === "string" &&
	/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(value.id) &&
	(value.status === "completed" || value.status === "not-applicable") &&
	typeof value.completedAt === "string" &&
	!Number.isNaN(Date.parse(value.completedAt)) &&
	typeof value.operationId === "string" &&
	value.operationId.length >= 32 &&
	typeof value.evidenceDigest === "string" &&
	value.evidenceDigest.length >= 32;

export const parsePrivacyDeletionReadiness = (
	value: unknown,
): PrivacyDeletionReadiness | null => {
	if (
		!isRecord(value) ||
		typeof value.canDelete !== "boolean" ||
		typeof value.policyVersion !== "string" ||
		!Array.isArray(value.retentionExceptions) ||
		!value.retentionExceptions.every(isRetentionException) ||
		!Array.isArray(value.blockingHolds) ||
		!value.blockingHolds.every(isDeletionHold) ||
		(value.requiredProcessors !== undefined &&
			(!Array.isArray(value.requiredProcessors) ||
				!value.requiredProcessors.every(isProcessorSummary)))
	) {
		return null;
	}
	return {
		canDelete: value.canDelete,
		policyVersion: value.policyVersion,
		retentionExceptions: value.retentionExceptions,
		blockingHolds: value.blockingHolds,
		requiredProcessors: value.requiredProcessors ?? [],
	};
};

export const getPrivacyDeletionReceipt = (
	value: unknown,
): PrivacyDeletionReceipt | null => {
	if (!isRecord(value) || !isRecord(value.deletionReceipt)) return null;
	const receipt = value.deletionReceipt;
	if (
		receipt.schemaVersion !== 1 ||
		receipt.status !== "completed" ||
		typeof receipt.receiptId !== "string" ||
		typeof receipt.issuedAt !== "string" ||
		!isRecord(receipt.subject) ||
		typeof receipt.subject.pseudonymousId !== "string" ||
		!isRecord(receipt.deletion) ||
		receipt.deletion.scope !== "cinaauth-authentication-account" ||
		typeof receipt.deletion.policyVersion !== "string" ||
		!Array.isArray(receipt.deletion.retentionExceptions) ||
		!receipt.deletion.retentionExceptions.every(isRetentionReceiptSnapshot) ||
		(receipt.deletion.processors !== undefined &&
			(!Array.isArray(receipt.deletion.processors) ||
				!receipt.deletion.processors.every(isProcessorAttestation))) ||
		!isRecord(receipt.proof) ||
		receipt.proof.algorithm !== "HMAC-SHA256" ||
		typeof receipt.proof.signature !== "string"
	) {
		return null;
	}
	return receipt as PrivacyDeletionReceipt;
};

export const getPrivacyDeletionReceiptFilename = (
	receipt: Pick<PrivacyDeletionReceipt, "receiptId">,
) => {
	const safeId = /^[a-zA-Z0-9_-]{16,128}$/.test(receipt.receiptId)
		? receipt.receiptId
		: "receipt";
	return `cinaauth-deletion-receipt-${safeId}.json`;
};
