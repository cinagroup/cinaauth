import type { Awaitable, CinaAuthOptions, CinaAuthPlugin } from "@cinaauth/core";
import { createAuthEndpoint } from "@cinaauth/core/api";
import type { DBFieldAttribute } from "@cinaauth/core/db";
import { getAuthTables } from "@cinaauth/core/db";
import { APIError } from "@cinaauth/core/error";
import { freshSessionMiddleware } from "../../api";
import {
	createPrivacyDeletionFeatures,
	type PrivacyDeletionOptions,
} from "./deletion";
import {
	createPrivacyAsyncExportFeatures,
	type PrivacyAsyncExportOptions,
} from "./async-export";

export type {
	PrivacyAsyncExportDownload,
	PrivacyAsyncExportOptions,
	PrivacyAsyncExportProvider,
	PrivacyAsyncExportRequest,
	PrivacyAsyncExportState,
	PrivacyAsyncExportStatus,
} from "./async-export";

export type {
	PrivacyDeletionHold,
	PrivacyDeletionOptions,
	PrivacyDeletionProcessor,
	PrivacyDeletionReceipt,
	PrivacyDeletionReceiptPayload,
	PrivacyProcessorErasureAttestation,
	PrivacyProcessorErasureResult,
	PrivacyRetentionException,
	PrivacyRetentionReceiptSnapshot,
} from "./deletion";
export { verifyDeletionReceipt } from "./deletion";

const DEFAULT_MAX_RECORDS_PER_MODEL = 5_000;
const MAX_ALLOWED_RECORDS_PER_MODEL = 10_000;
const EXPORT_BATCH_SIZE = 250;

const OMITTED_SENSITIVE_FIELDS = new Set([
	"accessToken",
	"backupCodes",
	"clientSecret",
	"credentialID",
	"deviceCode",
	"idToken",
	"key",
	"password",
	"privateKey",
	"publicKey",
	"refreshToken",
	"secret",
	"token",
	"userCode",
	"value",
]);

const OMITTED_MODELS = new Set([
	"jwks",
	"rateLimit",
	"twoFactor",
	"verification",
]);

const REFERENCE_ID_MODELS = new Set(["apikey", "subscription"]);

type ExportRecord = Record<string, unknown>;

type Subject = {
	id: string;
	email: string;
};

export interface PrivacyExportAdapter {
	count: (input: {
		model: string;
		where: ReturnType<typeof toWhere>;
	}) => Promise<number>;
	findMany: <T>(input: {
		model: string;
		where: ReturnType<typeof toWhere>;
		limit: number;
		offset: number;
		sortBy: { field: string; direction: "asc" };
	}) => Promise<T[]>;
}

export interface WritePersonalDataExportOptions {
	adapter: PrivacyExportAdapter;
	authOptions: CinaAuthOptions;
	subject: Subject;
	/** Null streams every matching record. */
	maxRecordsPerModel: number | null;
	write: (chunk: string) => Awaitable<void>;
}

export interface PersonalDataExportSummary {
	exportedAt: string;
	modelCount: number;
	totalRecords: number;
}

type SubjectSelector = {
	field: string;
	value: string;
	mode?: "insensitive";
};

export interface PrivacyCenterOptions {
	/**
	 * Maximum records exported from any one model. Oversized exports fail
	 * explicitly instead of returning a silently truncated file.
	 * @default 5000
	 */
	maxRecordsPerModel?: number;
	/**
	 * Optional deletion readiness, blocking-hold, and signed receipt support.
	 * No receipt endpoint or deletion hooks are registered when omitted.
	 */
	deletion?: PrivacyDeletionOptions;
	/**
	 * Optional provider-backed, encrypted asynchronous export lifecycle.
	 * The provider owns queueing and storage while this plugin enforces recent
	 * authentication, subject scoping, no-store responses, and deletion cleanup.
	 */
	asyncExport?: PrivacyAsyncExportOptions;
}

const resolveMaxRecords = (value: number | undefined) => {
	const resolved = value ?? DEFAULT_MAX_RECORDS_PER_MODEL;
	if (
		!Number.isInteger(resolved) ||
		resolved < 1 ||
		resolved > MAX_ALLOWED_RECORDS_PER_MODEL
	) {
		throw new Error(
			`maxRecordsPerModel must be an integer between 1 and ${MAX_ALLOWED_RECORDS_PER_MODEL}`,
		);
	}
	return resolved;
};

export const getPrivacySubjectSelector = (
	model: string,
	fields: Record<string, DBFieldAttribute>,
	subject: Subject,
): SubjectSelector | null => {
	if (OMITTED_MODELS.has(model)) return null;
	if (model === "user") return { field: "id", value: subject.id };
	if (model === "auditLog") return { field: "actorId", value: subject.id };
	if (model === "invitation") {
		return { field: "email", value: subject.email, mode: "insensitive" };
	}
	if (fields.userId) return { field: "userId", value: subject.id };
	if (REFERENCE_ID_MODELS.has(model) && fields.referenceId) {
		return { field: "referenceId", value: subject.id };
	}
	return null;
};

export const sanitizePrivacyExportRecord = (
	record: ExportRecord,
	fields: Record<string, DBFieldAttribute>,
) => {
	const output: ExportRecord = {};
	if (typeof record.id === "string") output.id = record.id;
	for (const [field, attributes] of Object.entries(fields)) {
		if (
			attributes.returned === false ||
			OMITTED_SENSITIVE_FIELDS.has(field) ||
			!(field in record)
		) {
			continue;
		}
		output[field] = record[field];
	}
	return output;
};

const toWhere = (selector: SubjectSelector) => [
	{
		field: selector.field,
		operator: "eq" as const,
		value: selector.value,
		...(selector.mode ? { mode: selector.mode } : {}),
	},
];

const exportModel = async ({
	adapter,
	model,
	fields,
	selector,
	maxRecords,
}: {
	adapter: {
		count: (input: {
			model: string;
			where: ReturnType<typeof toWhere>;
		}) => Promise<number>;
		findMany: <T>(input: {
			model: string;
			where: ReturnType<typeof toWhere>;
			limit: number;
			offset: number;
			sortBy: { field: string; direction: "asc" };
		}) => Promise<T[]>;
	};
	model: string;
	fields: Record<string, DBFieldAttribute>;
	selector: SubjectSelector;
	maxRecords: number;
}) => {
	const where = toWhere(selector);
	const count = await adapter.count({ model, where });
	if (count > maxRecords) {
		throw APIError.fromStatus("PAYLOAD_TOO_LARGE", {
			message: `Personal data export for ${model} exceeds the synchronous export limit`,
			code: "PRIVACY_EXPORT_TOO_LARGE",
			status: 413,
		});
	}
	const records: ExportRecord[] = [];
	for (let offset = 0; offset < count; offset += EXPORT_BATCH_SIZE) {
		const batch = await adapter.findMany<ExportRecord>({
			model,
			where,
			limit: Math.min(EXPORT_BATCH_SIZE, count - offset),
			offset,
			sortBy: { field: "id", direction: "asc" },
		});
		records.push(
			...batch.map((record) => sanitizePrivacyExportRecord(record, fields)),
		);
	}
	return { count, records };
};

/**
 * Streams a complete subject-scoped export as JSON chunks. This is intended
 * for queue consumers and object stores so large exports never need to be
 * buffered in Worker memory. Credential material is filtered identically to
 * the synchronous endpoint.
 */
export const writePersonalDataExport = async ({
	adapter,
	authOptions,
	subject,
	maxRecordsPerModel,
	write,
}: WritePersonalDataExportOptions): Promise<PersonalDataExportSummary> => {
	const tables = getAuthTables(authOptions);
	const selected: Array<{
		model: string;
		fields: Record<string, DBFieldAttribute>;
		selector: SubjectSelector;
		count: number;
	}> = [];

	for (const [model, table] of Object.entries(tables)) {
		const selector = getPrivacySubjectSelector(model, table.fields, subject);
		if (!selector) continue;
		const count = await adapter.count({
			model,
			where: toWhere(selector),
		});
		if (maxRecordsPerModel !== null && count > maxRecordsPerModel) {
			throw APIError.fromStatus("PAYLOAD_TOO_LARGE", {
				message: `Personal data export for ${model} exceeds the declared export limit`,
				code: "PRIVACY_EXPORT_TOO_LARGE",
				status: 413,
			});
		}
		selected.push({ model, fields: table.fields, selector, count });
	}

	const exportedAt = new Date().toISOString();
	await write(
		`{"schemaVersion":1,"exportedAt":${JSON.stringify(exportedAt)},"subject":{"id":${JSON.stringify(subject.id)}},"sections":{`,
	);
	let totalRecords = 0;
	for (const [modelIndex, section] of selected.entries()) {
		if (modelIndex > 0) await write(",");
		await write(
			`${JSON.stringify(section.model)}:{"count":${section.count},"records":[`,
		);
		let recordIndex = 0;
		for (
			let offset = 0;
			offset < section.count;
			offset += EXPORT_BATCH_SIZE
		) {
			const batch = await adapter.findMany<ExportRecord>({
				model: section.model,
				where: toWhere(section.selector),
				limit: Math.min(EXPORT_BATCH_SIZE, section.count - offset),
				offset,
				sortBy: { field: "id", direction: "asc" },
			});
			for (const record of batch) {
				if (recordIndex > 0) await write(",");
				await write(
					JSON.stringify(sanitizePrivacyExportRecord(record, section.fields)),
				);
				recordIndex += 1;
			}
		}
		totalRecords += recordIndex;
		await write("]}");
	}
	await write(
		`},"safety":{"credentialSecretsExcluded":true,"completeWithinDeclaredLimits":true,"maxRecordsPerModel":${maxRecordsPerModel === null ? "null" : maxRecordsPerModel},"delivery":"streamed"}}`,
	);
	return {
		exportedAt,
		modelCount: selected.length,
		totalRecords,
	};
};

const createExportEndpoint = (options: PrivacyCenterOptions) => {
	const maxRecords = resolveMaxRecords(options.maxRecordsPerModel);
	return createAuthEndpoint(
		"/privacy/export",
		{
			method: "GET",
			use: [freshSessionMiddleware],
			metadata: {
				openapi: {
					operationId: "exportPersonalData",
					description:
						"Export the authenticated user's personal authentication data as machine-readable JSON without credential secrets",
					responses: {
						"200": { description: "Personal data export attachment" },
						"413": { description: "Export exceeds the synchronous limit" },
					},
				},
			},
		},
		async (ctx) => {
			const subject = {
				id: ctx.context.session.user.id,
				email: ctx.context.session.user.email,
			};
			const tables = getAuthTables(ctx.context.options);
			const sections: Record<
				string,
				{ count: number; records: ExportRecord[] }
			> = {};

			for (const [model, table] of Object.entries(tables)) {
				const selector = getPrivacySubjectSelector(
					model,
					table.fields,
					subject,
				);
				if (!selector) continue;
				sections[model] = await exportModel({
					adapter: ctx.context.adapter,
					model,
					fields: table.fields,
					selector,
					maxRecords,
				});
			}

			const exportedAt = new Date();
			const payload = {
				schemaVersion: 1,
				exportedAt: exportedAt.toISOString(),
				subject: { id: subject.id },
				sections,
				safety: {
					credentialSecretsExcluded: true,
					completeWithinDeclaredLimits: true,
					maxRecordsPerModel: maxRecords,
				},
			};
			return new Response(JSON.stringify(payload, null, 2), {
				headers: {
					"cache-control": "no-store",
					"content-disposition": `attachment; filename="cinaauth-personal-data-${exportedAt.toISOString().slice(0, 10)}.json"`,
					"content-security-policy": "default-src 'none'",
					"content-type": "application/json; charset=utf-8",
					pragma: "no-cache",
					"x-content-type-options": "nosniff",
				},
			});
		},
	);
};

/**
 * Adds a self-service, machine-readable personal data export endpoint.
 * Credential material and single-use verification data are always excluded.
 */
export const privacyCenter = (options: PrivacyCenterOptions = {}) =>
	(() => {
		const deletion = options.deletion
			? createPrivacyDeletionFeatures(options.deletion)
			: null;
		const asyncExport = options.asyncExport
			? createPrivacyAsyncExportFeatures(options.asyncExport)
			: null;
		const beforeHooks = [
			...(deletion?.hooks.before ?? []),
			...(asyncExport?.hooks.before ?? []),
		];
		const afterHooks = [...(deletion?.hooks.after ?? [])];
		return {
			id: "privacy-center",
			endpoints: {
				exportPersonalData: createExportEndpoint(options),
				...(asyncExport?.endpoints ?? {}),
				...(deletion?.endpoints ?? {}),
			},
			...(beforeHooks.length > 0 || afterHooks.length > 0
				? {
						hooks: {
							before: beforeHooks,
							after: afterHooks,
						},
					}
				: {}),
		} satisfies CinaAuthPlugin;
	})();

export type PrivacyCenterPlugin = ReturnType<typeof privacyCenter>;
