import type { CinaAuthOptions } from "cinaauth";
import {
	type PersonalDataExportSummary,
	type PrivacyAsyncExportProvider,
	type PrivacyAsyncExportRequest,
	type PrivacyAsyncExportState,
	type PrivacyAsyncExportStatus,
	type PrivacyExportAdapter,
	writePersonalDataExport,
} from "cinaauth/plugins/privacy-center";

export const PRIVACY_EXPORT_QUEUE_NAME = "cinaauth-privacy-export";
const PRIVACY_EXPORT_PREFIX = "privacy-exports/v1";
const MANIFEST_SUFFIX = ".manifest.json";
const DATA_SUFFIX = ".data.json";
const MAX_PROCESSING_ATTEMPTS = 5;
const textEncoder = new TextEncoder();

export type PrivacyExportMessage = {
	kind: "privacy-export";
	jobId: string;
	userId: string;
};

export type PrivacyExportRuntimeEnv = {
	CINAAUTH_PRIVACY_EXPORT_KEY?: string;
	CINAAUTH_PRIVACY_EXPORT_QUEUE?: Queue<PrivacyExportMessage>;
	CINAAUTH_PRIVACY_EXPORTS?: R2Bucket;
};

type PrivacyExportManifest = PrivacyAsyncExportStatus & {
	schemaVersion: 1;
	attempts: number;
	summary?: PersonalDataExportSummary;
};

type PrivacyExportContext = {
	adapter: PrivacyExportAdapter;
	options: CinaAuthOptions;
	internalAdapter: {
		findUserById: (
			id: string,
		) => Promise<{ id: string; email: string } | null>;
	};
};

type PrivacyExportContextFactory = () => Promise<PrivacyExportContext>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isQueue = (value: unknown): value is Queue<PrivacyExportMessage> =>
	isRecord(value) && typeof value.send === "function";

const isBucket = (value: unknown): value is R2Bucket =>
	isRecord(value) &&
	typeof value.put === "function" &&
	typeof value.get === "function" &&
	typeof value.delete === "function" &&
	typeof value.list === "function";

const runtime = (env: PrivacyExportRuntimeEnv) => {
	if (!isQueue(env.CINAAUTH_PRIVACY_EXPORT_QUEUE)) {
		throw new Error("CINAAUTH_PRIVACY_EXPORT_QUEUE binding is required");
	}
	if (!isBucket(env.CINAAUTH_PRIVACY_EXPORTS)) {
		throw new Error("CINAAUTH_PRIVACY_EXPORTS R2 binding is required");
	}
	if (
		typeof env.CINAAUTH_PRIVACY_EXPORT_KEY !== "string" ||
		env.CINAAUTH_PRIVACY_EXPORT_KEY.length < 32
	) {
		throw new Error(
			"CINAAUTH_PRIVACY_EXPORT_KEY must contain at least 32 characters",
		);
	}
	return {
		bucket: env.CINAAUTH_PRIVACY_EXPORTS,
		queue: env.CINAAUTH_PRIVACY_EXPORT_QUEUE,
		secret: env.CINAAUTH_PRIVACY_EXPORT_KEY,
	};
};

export const hasPrivacyExportRuntime = (env: PrivacyExportRuntimeEnv) => {
	try {
		runtime(env);
		return true;
	} catch (error) {
		return false;
	}
};

const hmacSha256 = async (secret: string, input: string) => {
	const key = await crypto.subtle.importKey(
		"raw",
		textEncoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return crypto.subtle.sign("HMAC", key, textEncoder.encode(input));
};

const hex = (buffer: ArrayBuffer) =>
	[...new Uint8Array(buffer)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");

const subjectPrefix = async (secret: string, subjectId: string) =>
	`${PRIVACY_EXPORT_PREFIX}/${hex(
		await hmacSha256(secret, `cinaauth.privacy.export.subject.v1\n${subjectId}`),
	)}`;

const objectKeys = async (
	secret: string,
	subjectId: string,
	jobId: string,
) => {
	const prefix = await subjectPrefix(secret, subjectId);
	return {
		prefix,
		manifest: `${prefix}/${jobId}${MANIFEST_SUFFIX}`,
		data: `${prefix}/${jobId}${DATA_SUFFIX}`,
	};
};

const customerKey = (secret: string, objectKey: string) =>
	hmacSha256(secret, `cinaauth.privacy.export.ssec.v1\n${objectKey}`);

const isState = (value: unknown): value is PrivacyAsyncExportState =>
	[
		"queued",
		"processing",
		"retrying",
		"ready",
		"failed",
		"expired",
	].includes(typeof value === "string" ? value : "");

const parseManifest = (value: unknown): PrivacyExportManifest | null => {
	if (
		!isRecord(value) ||
		value.schemaVersion !== 1 ||
		typeof value.jobId !== "string" ||
		!isState(value.status) ||
		typeof value.createdAt !== "string" ||
		typeof value.expiresAt !== "string" ||
		typeof value.attempts !== "number"
	) {
		return null;
	}
	return value as unknown as PrivacyExportManifest;
};

const toStatus = (manifest: PrivacyExportManifest): PrivacyAsyncExportStatus => ({
	jobId: manifest.jobId,
	status: manifest.status,
	createdAt: manifest.createdAt,
	expiresAt: manifest.expiresAt,
	...(manifest.readyAt ? { readyAt: manifest.readyAt } : {}),
	...(typeof manifest.size === "number" ? { size: manifest.size } : {}),
	...(manifest.failureCode ? { failureCode: manifest.failureCode } : {}),
});

const putManifest = async (
	bucket: R2Bucket,
	secret: string,
	key: string,
	manifest: PrivacyExportManifest,
) =>
	bucket.put(key, JSON.stringify(manifest), {
		ssecKey: await customerKey(secret, key),
		httpMetadata: {
			contentType: "application/json; charset=utf-8",
			cacheControl: "no-store",
		},
		customMetadata: {
			kind: "privacy-export-manifest",
			expiresAt: manifest.expiresAt,
		},
	});

const getManifest = async (bucket: R2Bucket, secret: string, key: string) => {
	const object = await bucket.get(key, {
		ssecKey: await customerKey(secret, key),
	});
	if (!object) return null;
	try {
		return parseManifest(await object.json<unknown>());
	} catch {
		return null;
	}
};

const deleteKeys = (bucket: R2Bucket, keys: { manifest: string; data: string }) =>
	bucket.delete([keys.manifest, keys.data]);

const isExpired = (manifest: PrivacyExportManifest, now = Date.now()) =>
	Date.parse(manifest.expiresAt) <= now;

const listAll = async (bucket: R2Bucket, prefix: string) => {
	const objects: R2Object[] = [];
	let cursor: string | undefined;
	do {
		const page = await bucket.list({
			prefix,
			limit: 1_000,
			...(cursor ? { cursor } : {}),
			include: ["customMetadata"],
		});
		objects.push(...page.objects);
		cursor = page.truncated ? page.cursor : undefined;
	} while (cursor);
	return objects;
};

const findReusableManifest = async (
	bucket: R2Bucket,
	secret: string,
	prefix: string,
) => {
	const manifests = (await listAll(bucket, `${prefix}/`)).filter((object) =>
		object.key.endsWith(MANIFEST_SUFFIX),
	);
	for (const object of manifests) {
		const manifest = await getManifest(bucket, secret, object.key);
		if (
			manifest &&
			!isExpired(manifest) &&
			manifest.status !== "failed" &&
			manifest.status !== "expired"
		) {
			return manifest;
		}
	}
	return null;
};

export const createR2PrivacyExportProvider = (
	env: PrivacyExportRuntimeEnv,
): PrivacyAsyncExportProvider => {
	const { bucket, queue, secret } = runtime(env);
	return {
		create: async (request: PrivacyAsyncExportRequest) => {
			const keys = await objectKeys(secret, request.subject.id, request.jobId);
			const reusable = await findReusableManifest(bucket, secret, keys.prefix);
			if (reusable) return toStatus(reusable);

			const manifest: PrivacyExportManifest = {
				schemaVersion: 1,
				jobId: request.jobId,
				status: "queued",
				createdAt: request.createdAt,
				expiresAt: request.expiresAt,
				attempts: 0,
			};
			await putManifest(bucket, secret, keys.manifest, manifest);
			try {
				await queue.send({
					kind: "privacy-export",
					jobId: request.jobId,
					userId: request.subject.id,
				});
			} catch (error) {
				await deleteKeys(bucket, keys);
				throw error;
			}
			return toStatus(manifest);
		},
		getStatus: async ({ jobId, subjectId }) => {
			const keys = await objectKeys(secret, subjectId, jobId);
			const manifest = await getManifest(bucket, secret, keys.manifest);
			if (!manifest || manifest.jobId !== jobId) return null;
			if (isExpired(manifest)) {
				await deleteKeys(bucket, keys);
				return toStatus({ ...manifest, status: "expired" });
			}
			return toStatus(manifest);
		},
		getDownload: async ({ jobId, subjectId }) => {
			const keys = await objectKeys(secret, subjectId, jobId);
			const object = await bucket.get(keys.data, {
				ssecKey: await customerKey(secret, keys.data),
			});
			if (!object) return null;
			return {
				body: object.body,
				size: object.size,
				etag: object.httpEtag,
			};
		},
		deleteJob: async ({ jobId, subjectId }) => {
			await deleteKeys(bucket, await objectKeys(secret, subjectId, jobId));
		},
		deleteSubjectExports: async ({ subjectId }) => {
			const prefix = await subjectPrefix(secret, subjectId);
			const keys = (await listAll(bucket, `${prefix}/`)).map(
				(object) => object.key,
			);
			if (keys.length > 0) await bucket.delete(keys);
		},
	};
};

const processPrivacyExportMessage = async (
	message: Message<PrivacyExportMessage>,
	env: PrivacyExportRuntimeEnv,
	getContext: PrivacyExportContextFactory,
) => {
	const { bucket, secret } = runtime(env);
	if (message.body.kind !== "privacy-export") {
		message.ack();
		return;
	}
	const keys = await objectKeys(
		secret,
		message.body.userId,
		message.body.jobId,
	);
	const manifest = await getManifest(bucket, secret, keys.manifest);
	if (!manifest || manifest.jobId !== message.body.jobId) {
		message.ack();
		return;
	}
	if (isExpired(manifest)) {
		await deleteKeys(bucket, keys);
		message.ack();
		return;
	}
	if (manifest.status === "ready") {
		message.ack();
		return;
	}

	const attempts = Math.max(manifest.attempts + 1, message.attempts);
	await putManifest(bucket, secret, keys.manifest, {
		...manifest,
		status: "processing",
		attempts,
		failureCode: undefined,
	});

	try {
		const context = await getContext();
		const user = await context.internalAdapter.findUserById(message.body.userId);
		if (!user) {
			await deleteKeys(bucket, keys);
			message.ack();
			return;
		}

		const stream = new TransformStream<Uint8Array, Uint8Array>();
		const writer = stream.writable.getWriter();
		const upload = bucket.put(keys.data, stream.readable, {
			ssecKey: await customerKey(secret, keys.data),
			httpMetadata: {
				contentType: "application/json; charset=utf-8",
				cacheControl: "no-store",
				contentDisposition: `attachment; filename="cinaauth-personal-data-${manifest.createdAt.slice(0, 10)}.json"`,
			},
			customMetadata: {
				kind: "privacy-export-data",
				expiresAt: manifest.expiresAt,
			},
		});
		const generate = (async () => {
			try {
				const summary = await writePersonalDataExport({
					adapter: context.adapter,
					authOptions: context.options,
					subject: user,
					maxRecordsPerModel: null,
					write: (chunk) => writer.write(textEncoder.encode(chunk)),
				});
				await writer.close();
				return summary;
			} catch (error) {
				await writer.abort(error);
				throw error;
			}
		})();
		const [object, summary] = await Promise.all([upload, generate]);
		const readyAt = new Date().toISOString();
		await putManifest(bucket, secret, keys.manifest, {
			...manifest,
			status: "ready",
			attempts,
			readyAt,
			size: object.size,
			summary,
			failureCode: undefined,
		});
		console.info(
			JSON.stringify({
				level: "info",
				message: "cinaauth.privacy_export.ready",
				jobId: manifest.jobId,
				totalRecords: summary.totalRecords,
				modelCount: summary.modelCount,
				size: object.size,
			}),
		);
		message.ack();
	} catch (error) {
		const terminal = attempts >= MAX_PROCESSING_ATTEMPTS;
		await putManifest(bucket, secret, keys.manifest, {
			...manifest,
			status: terminal ? "failed" : "retrying",
			attempts,
			failureCode: "GENERATION_FAILED",
		});
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaauth.privacy_export.failed",
				jobId: manifest.jobId,
				attempts,
				terminal,
				error: error instanceof Error ? error.message : "Unknown error",
			}),
		);
		message.retry({ delaySeconds: Math.min(300, attempts * 15) });
	}
};

export const handlePrivacyExportBatch = async (
	batch: MessageBatch<PrivacyExportMessage>,
	env: PrivacyExportRuntimeEnv,
	getContext: PrivacyExportContextFactory,
) => {
	await Promise.all(
		batch.messages.map((message) =>
			processPrivacyExportMessage(message, env, getContext),
		),
	);
};

export const sweepExpiredPrivacyExports = async (
	env: PrivacyExportRuntimeEnv,
	now = Date.now(),
) => {
	const { bucket } = runtime(env);
	const expiredKeys = (await listAll(bucket, `${PRIVACY_EXPORT_PREFIX}/`))
		.filter((object) => {
			const expiresAt = object.customMetadata?.expiresAt;
			return typeof expiresAt === "string" && Date.parse(expiresAt) <= now;
		})
		.map((object) => object.key);
	if (expiredKeys.length > 0) await bucket.delete(expiredKeys);
	return expiredKeys.length;
};
