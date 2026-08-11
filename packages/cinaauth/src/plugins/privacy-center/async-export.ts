import type { Awaitable } from "@cinaauth/core";
import { createAuthEndpoint, createAuthMiddleware } from "@cinaauth/core/api";
import * as z from "zod";
import { freshSessionMiddleware, getSessionFromCtx } from "../../api";
import { generateRandomString } from "../../crypto";

const DEFAULT_EXPIRES_IN_SECONDS = 24 * 60 * 60;
const MIN_EXPIRES_IN_SECONDS = 5 * 60;
const MAX_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;
const deletionPaths = new Set(["/delete-user", "/delete-user/callback"]);

const jobIdSchema = z
	.string()
	.min(16)
	.max(128)
	.regex(/^[A-Za-z0-9_-]+$/);

const querySchema = z.object({ jobId: jobIdSchema });
const cancelSchema = z.object({ jobId: jobIdSchema });

export type PrivacyAsyncExportState =
	| "queued"
	| "processing"
	| "retrying"
	| "ready"
	| "failed"
	| "expired";

export interface PrivacyAsyncExportStatus {
	/** Opaque, subject-scoped job identifier. */
	jobId: string;
	/** Current lifecycle state. */
	status: PrivacyAsyncExportState;
	/** ISO timestamp for the original request. */
	createdAt: string;
	/** ISO timestamp after which the artifact cannot be downloaded. */
	expiresAt: string;
	/** ISO timestamp for successful artifact publication. */
	readyAt?: string;
	/** Encrypted object size in bytes when ready. */
	size?: number;
	/** Stable, non-sensitive failure category suitable for display. */
	failureCode?: string;
}

export interface PrivacyAsyncExportRequest {
	jobId: string;
	subject: {
		id: string;
		email: string;
	};
	createdAt: string;
	expiresAt: string;
}

export interface PrivacyAsyncExportDownload {
	body: BodyInit;
	size: number;
	etag?: string;
}

export interface PrivacyAsyncExportProvider {
	/** Persist an encrypted job manifest and enqueue generation work. */
	create: (
		request: PrivacyAsyncExportRequest,
	) => Awaitable<PrivacyAsyncExportStatus>;
	/** Resolve a job only within the supplied authenticated subject. */
	getStatus: (input: {
		jobId: string;
		subjectId: string;
	}) => Awaitable<PrivacyAsyncExportStatus | null>;
	/** Open a ready encrypted artifact for a subject-scoped download. */
	getDownload: (input: {
		jobId: string;
		subjectId: string;
	}) => Awaitable<PrivacyAsyncExportDownload | null>;
	/** Delete one manifest and artifact. This operation must be idempotent. */
	deleteJob: (input: { jobId: string; subjectId: string }) => Awaitable<void>;
	/** Delete every manifest and artifact for the subject before account deletion. */
	deleteSubjectExports: (input: { subjectId: string }) => Awaitable<void>;
}

export interface PrivacyAsyncExportOptions {
	provider: PrivacyAsyncExportProvider;
	/** Artifact lifetime before mandatory deletion. @default 86400 */
	expiresInSeconds?: number;
}

const resolveExpiresInSeconds = (value: number | undefined) => {
	const resolved = value ?? DEFAULT_EXPIRES_IN_SECONDS;
	if (
		!Number.isInteger(resolved) ||
		resolved < MIN_EXPIRES_IN_SECONDS ||
		resolved > MAX_EXPIRES_IN_SECONDS
	) {
		throw new Error(
			`asyncExport.expiresInSeconds must be an integer between ${MIN_EXPIRES_IN_SECONDS} and ${MAX_EXPIRES_IN_SECONDS}`,
		);
	}
	return resolved;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			"cache-control": "no-store",
			"content-security-policy": "default-src 'none'",
			"content-type": "application/json; charset=utf-8",
			pragma: "no-cache",
			"x-content-type-options": "nosniff",
		},
	});

const errorResponse = (status: number, code: string, message: string) =>
	jsonResponse({ code, message }, status);

const isExpired = (status: PrivacyAsyncExportStatus) =>
	status.status === "expired" || Date.parse(status.expiresAt) <= Date.now();

const subjectFromContext = (ctx: {
	context: { session: { user: { id: string; email: string } } };
}) => ({
	id: ctx.context.session.user.id,
	email: ctx.context.session.user.email,
});

const findStatus = async (
	provider: PrivacyAsyncExportProvider,
	input: { jobId: string; subjectId: string },
) => {
	const status = await provider.getStatus(input);
	if (!status || status.jobId !== input.jobId) return null;
	return status;
};

export const createPrivacyAsyncExportFeatures = (
	options: PrivacyAsyncExportOptions,
) => {
	const expiresInSeconds = resolveExpiresInSeconds(options.expiresInSeconds);
	const requestAsyncPersonalDataExport = createAuthEndpoint(
		"/privacy/async-export",
		{
			method: "POST",
			use: [freshSessionMiddleware],
			metadata: {
				openapi: {
					operationId: "requestAsyncPersonalDataExport",
					description:
						"Queue an encrypted, short-lived personal data export for the authenticated subject",
					responses: {
						"202": { description: "Export job accepted" },
					},
				},
			},
		},
		async (ctx) => {
			const createdAt = new Date();
			const request: PrivacyAsyncExportRequest = {
				jobId: generateRandomString(32, "a-z", "A-Z", "0-9"),
				subject: subjectFromContext(ctx),
				createdAt: createdAt.toISOString(),
				expiresAt: new Date(
					createdAt.getTime() + expiresInSeconds * 1_000,
				).toISOString(),
			};
			const status = await options.provider.create(request);
			return jsonResponse(
				{
					...status,
					statusEndpoint: "/privacy/async-export/status",
					downloadEndpoint: "/privacy/async-export/download",
				},
				202,
			);
		},
	);

	const getAsyncPersonalDataExport = createAuthEndpoint(
		"/privacy/async-export/status",
		{
			method: "GET",
			query: querySchema,
			use: [freshSessionMiddleware],
			metadata: {
				openapi: {
					operationId: "getAsyncPersonalDataExport",
					description: "Get a subject-scoped asynchronous export status",
					responses: {
						"200": { description: "Export job status" },
						"404": { description: "Export job not found" },
					},
				},
			},
		},
		async (ctx) => {
			const status = await findStatus(options.provider, {
				jobId: ctx.query.jobId,
				subjectId: ctx.context.session.user.id,
			});
			if (!status) {
				return errorResponse(
					404,
					"PRIVACY_EXPORT_NOT_FOUND",
					"Export not found",
				);
			}
			if (isExpired(status)) {
				return jsonResponse({ ...status, status: "expired" }, 410);
			}
			return jsonResponse({ ...status });
		},
	);

	const downloadAsyncPersonalDataExport = createAuthEndpoint(
		"/privacy/async-export/download",
		{
			method: "GET",
			query: querySchema,
			use: [freshSessionMiddleware],
			metadata: {
				openapi: {
					operationId: "downloadAsyncPersonalDataExport",
					description:
						"Stream a ready subject-scoped export without intermediary caching",
					responses: {
						"200": { description: "Personal data export attachment" },
						"409": { description: "Export is not ready" },
						"410": { description: "Export expired" },
					},
				},
			},
		},
		async (ctx) => {
			const input = {
				jobId: ctx.query.jobId,
				subjectId: ctx.context.session.user.id,
			};
			const status = await findStatus(options.provider, input);
			if (!status) {
				return errorResponse(
					404,
					"PRIVACY_EXPORT_NOT_FOUND",
					"Export not found",
				);
			}
			if (isExpired(status)) {
				return errorResponse(410, "PRIVACY_EXPORT_EXPIRED", "Export expired");
			}
			if (status.status !== "ready") {
				return errorResponse(
					409,
					"PRIVACY_EXPORT_NOT_READY",
					"Export is not ready",
				);
			}
			const download = await options.provider.getDownload(input);
			if (!download) {
				return errorResponse(
					404,
					"PRIVACY_EXPORT_OBJECT_MISSING",
					"Export object not found",
				);
			}
			const headers = new Headers({
				"cache-control": "no-store",
				"content-disposition": `attachment; filename="cinaauth-personal-data-${status.createdAt.slice(0, 10)}.json"`,
				"content-length": download.size.toString(),
				"content-security-policy": "default-src 'none'",
				"content-type": "application/json; charset=utf-8",
				pragma: "no-cache",
				"x-content-type-options": "nosniff",
			});
			if (download.etag && !/[\r\n]/.test(download.etag)) {
				headers.set("etag", download.etag);
			}
			return new Response(download.body, { headers });
		},
	);

	const cancelAsyncPersonalDataExport = createAuthEndpoint(
		"/privacy/async-export",
		{
			method: "DELETE",
			body: cancelSchema,
			use: [freshSessionMiddleware],
			metadata: {
				openapi: {
					operationId: "cancelAsyncPersonalDataExport",
					description:
						"Idempotently delete an asynchronous export manifest and artifact",
					responses: {
						"200": { description: "Export deleted" },
					},
				},
			},
		},
		async (ctx) => {
			await options.provider.deleteJob({
				jobId: ctx.body.jobId,
				subjectId: ctx.context.session.user.id,
			});
			return jsonResponse({ success: true });
		},
	);

	return {
		endpoints: {
			requestAsyncPersonalDataExport,
			getAsyncPersonalDataExport,
			downloadAsyncPersonalDataExport,
			cancelAsyncPersonalDataExport,
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
						await options.provider.deleteSubjectExports({
							subjectId: session.user.id,
						});
					}),
				},
			],
		},
	};
};
