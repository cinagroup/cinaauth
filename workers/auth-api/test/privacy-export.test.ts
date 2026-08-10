import { describe, expect, it, vi } from "vitest";
import {
	createR2PrivacyExportProvider,
	handlePrivacyExportBatch,
	type PrivacyExportMessage,
} from "../src/privacy-export";

const encoder = new TextEncoder();

const createMemoryBucket = () => {
	type Entry = {
		bytes: Uint8Array;
		customMetadata?: Record<string, string>;
		ssecKey?: string;
	};
	const entries = new Map<string, Entry>();
	const putCalls: Array<{ key: string; options?: R2PutOptions }> = [];
	const keyFingerprint = (key: ArrayBuffer | string | undefined) => {
		if (typeof key === "string") return key;
		return key ? [...new Uint8Array(key)].join(",") : undefined;
	};
	const objectFor = (key: string, entry: Entry) =>
		({
			key,
			version: "1",
			size: entry.bytes.byteLength,
			etag: "privacy-etag",
			httpEtag: '"privacy-etag"',
			checksums: { toJSON: () => ({}) },
			uploaded: new Date(),
			customMetadata: entry.customMetadata,
			storageClass: "Standard",
			body: new Blob([entry.bytes]).stream(),
			bodyUsed: false,
			arrayBuffer: async () => entry.bytes.buffer.slice(0),
			bytes: async () => entry.bytes,
			text: async () => new TextDecoder().decode(entry.bytes),
			json: async <T>() =>
				JSON.parse(new TextDecoder().decode(entry.bytes)) as T,
			blob: async () => new Blob([entry.bytes]),
			writeHttpMetadata: () => undefined,
		}) as unknown as R2ObjectBody;

	const bucket = {
		put: async (
			key: string,
			value:
				| ReadableStream
				| ArrayBuffer
				| ArrayBufferView
				| string
				| null
				| Blob,
			options?: R2PutOptions,
		) => {
			putCalls.push({ key, options });
			const bytes = value
				? new Uint8Array(
						await new Response(value as BodyInit).arrayBuffer(),
					)
				: new Uint8Array();
			const entry: Entry = {
				bytes,
				customMetadata: options?.customMetadata,
				ssecKey: keyFingerprint(options?.ssecKey),
			};
			entries.set(key, entry);
			return objectFor(key, entry);
		},
		get: async (key: string, options?: R2GetOptions) => {
			const entry = entries.get(key);
			if (!entry || entry.ssecKey !== keyFingerprint(options?.ssecKey)) {
				return null;
			}
			return objectFor(key, entry);
		},
		delete: async (keys: string | string[]) => {
			for (const key of typeof keys === "string" ? [keys] : keys) {
				entries.delete(key);
			}
		},
		list: async (options?: R2ListOptions) => ({
			objects: [...entries.entries()]
				.filter(([key]) => key.startsWith(options?.prefix ?? ""))
				.map(([key, entry]) => objectFor(key, entry)),
			delimitedPrefixes: [],
			truncated: false as const,
		}),
	} as unknown as R2Bucket;

	return { bucket, entries, putCalls };
};

describe("privacy export R2 provider", () => {
	it("encrypts subject-scoped manifests and queues only opaque job work", async () => {
		const storage = createMemoryBucket();
		const send = vi.fn(async (_message: PrivacyExportMessage) => undefined);
		const provider = createR2PrivacyExportProvider({
			CINAAUTH_PRIVACY_EXPORT_KEY: "privacy-export-key-".repeat(3),
			CINAAUTH_PRIVACY_EXPORT_QUEUE: {
				send,
			} as unknown as Queue<PrivacyExportMessage>,
			CINAAUTH_PRIVACY_EXPORTS: storage.bucket,
		});
		const request = {
			jobId: "privacy-job-1234567890",
			subject: {
				id: "user-raw-identifier",
				email: "subject@example.com",
			},
			createdAt: "2099-08-09T00:00:00.000Z",
			expiresAt: "2099-08-10T00:00:00.000Z",
		};

		await expect(provider.create(request)).resolves.toMatchObject({
			jobId: request.jobId,
			status: "queued",
		});
		expect(send).toHaveBeenCalledWith({
			kind: "privacy-export",
			jobId: request.jobId,
			userId: request.subject.id,
		});
		expect(storage.putCalls).toHaveLength(1);
		const stored = storage.putCalls[0]!;
		expect(stored.key).not.toContain(request.subject.id);
		expect(stored.key).not.toContain(request.subject.email);
		expect(stored.options?.ssecKey).toBeInstanceOf(ArrayBuffer);
		expect((stored.options?.ssecKey as ArrayBuffer).byteLength).toBe(32);
		expect(JSON.stringify([...storage.entries.keys()])).not.toContain(
			request.subject.id,
		);

		await expect(
			provider.getStatus({
				jobId: request.jobId,
				subjectId: request.subject.id,
			}),
		).resolves.toMatchObject({ status: "queued" });
		await expect(
			provider.getStatus({
				jobId: request.jobId,
				subjectId: "another-user",
			}),
		).resolves.toBeNull();
	});

	it("refuses a weak customer encryption key", () => {
		const storage = createMemoryBucket();
		expect(() =>
			createR2PrivacyExportProvider({
				CINAAUTH_PRIVACY_EXPORT_KEY: "short",
				CINAAUTH_PRIVACY_EXPORT_QUEUE: {
					send: vi.fn(),
				} as unknown as Queue<PrivacyExportMessage>,
				CINAAUTH_PRIVACY_EXPORTS: storage.bucket,
			}),
		).toThrow("CINAAUTH_PRIVACY_EXPORT_KEY");
	});

	it("streams a complete sanitized export and publishes it atomically", async () => {
		const storage = createMemoryBucket();
		let queued: PrivacyExportMessage | undefined;
		const env = {
			CINAAUTH_PRIVACY_EXPORT_KEY: "privacy-export-key-".repeat(3),
			CINAAUTH_PRIVACY_EXPORT_QUEUE: {
				send: async (message: PrivacyExportMessage) => {
					queued = message;
				},
			} as unknown as Queue<PrivacyExportMessage>,
			CINAAUTH_PRIVACY_EXPORTS: storage.bucket,
		};
		const provider = createR2PrivacyExportProvider(env);
		const request = {
			jobId: "privacy-job-stream-1234",
			subject: {
				id: "subject-stream-id",
				email: "stream@example.com",
			},
			createdAt: "2099-08-09T00:00:00.000Z",
			expiresAt: "2099-08-10T00:00:00.000Z",
		};
		await provider.create(request);
		expect(queued).toBeDefined();

		const ack = vi.fn();
		const retry = vi.fn();
		await handlePrivacyExportBatch(
			{
				queue: "cinaauth-privacy-export",
				messages: [
					{
						id: "queue-message-1",
						timestamp: new Date(),
						attempts: 1,
						body: queued!,
						ack,
						retry,
					},
				],
			} as unknown as MessageBatch<PrivacyExportMessage>,
			env,
			async () => ({
				options: {},
				adapter: {
					count: async ({ model }: { model: string }) =>
						model === "user" ? 1 : 0,
					findMany: async <T>({ model }: { model: string }) =>
						(model === "user"
							? [
								{
									id: request.subject.id,
									email: request.subject.email,
									name: "Stream Subject",
									password: "must-not-export",
									token: "must-not-export",
								},
							]
							: []) as T[],
				},
				internalAdapter: {
					findUserById: async () => request.subject,
				},
			}),
		);

		expect(ack).toHaveBeenCalledOnce();
		expect(retry).not.toHaveBeenCalled();
		await expect(
			provider.getStatus({
				jobId: request.jobId,
				subjectId: request.subject.id,
			}),
		).resolves.toMatchObject({ status: "ready", size: expect.any(Number) });
		const download = await provider.getDownload({
			jobId: request.jobId,
			subjectId: request.subject.id,
		});
		expect(download).not.toBeNull();
		const serialized = await new Response(download!.body).text();
		expect(serialized).toContain(request.subject.email);
		expect(serialized).not.toContain("must-not-export");
		expect(JSON.parse(serialized)).toMatchObject({
			schemaVersion: 1,
			safety: {
				credentialSecretsExcluded: true,
				delivery: "streamed",
			},
		});
		const dataPut = storage.putCalls.find((call) =>
			call.key.endsWith(".data.json"),
		);
		expect(dataPut?.options?.ssecKey).toBeInstanceOf(ArrayBuffer);
	});
});
