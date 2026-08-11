import { describe, expect, it, vi } from "vitest";
import { getTestInstance } from "../../test-utils/test-instance";
import type {
	PrivacyAsyncExportProvider,
	PrivacyAsyncExportStatus,
	PrivacyDeletionProcessor,
	PrivacyDeletionReceipt,
} from "./index";
import { privacyCenter, sanitizePrivacyExportRecord } from "./index";

const deletionPolicy = {
	policyVersion: "2026-08-09",
	retentionExceptions: [
		{
			code: "security-audit-90d",
			category: "Security audit evidence",
			purpose: "Incident response and abuse prevention",
			maximumRetentionDays: 90,
			legalBasis: "Legitimate interests in service security",
		},
	],
};

describe("privacy-center personal data export", () => {
	it("requires an authenticated recent session", async () => {
		const { auth } = await getTestInstance({ plugins: [privacyCenter()] });
		const response = await auth.api.exportPersonalData({ asResponse: true });
		expect(response.status).toBe(401);
	});

	it("exports only the current subject as a no-store JSON attachment", async () => {
		const { auth, signInWithTestUser, testUser } = await getTestInstance({
			plugins: [privacyCenter()],
		});
		const { headers, user } = await signInWithTestUser();
		const response = await auth.api.exportPersonalData({
			headers,
			asResponse: true,
		});
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(response.headers.get("content-disposition")).toContain(
			"cinaauth-personal-data-",
		);
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");

		const payload = (await response.json()) as {
			schemaVersion: number;
			subject: { id: string };
			sections: Record<
				string,
				{ count: number; records: Array<Record<string, unknown>> }
			>;
			safety: {
				credentialSecretsExcluded: boolean;
				completeWithinDeclaredLimits: boolean;
			};
		};
		expect(payload.schemaVersion).toBe(1);
		expect(payload.subject.id).toBe(user.id);
		expect(payload.sections.user?.records[0]?.email).toBe(testUser.email);
		expect(payload.sections.account?.count).toBe(1);
		expect(payload.sections.session?.count).toBeGreaterThanOrEqual(1);
		expect(payload.safety).toMatchObject({
			credentialSecretsExcluded: true,
			completeWithinDeclaredLimits: true,
		});

		const serialized = JSON.stringify(payload);
		expect(serialized).not.toContain(testUser.password);
		expect(serialized).not.toContain('"token"');
		expect(serialized).not.toContain('"password"');
		expect(serialized).not.toContain('"accessToken"');
		expect(serialized).not.toContain('"refreshToken"');
	});

	it("never includes another user's profile or account rows", async () => {
		const { auth, client, sessionSetter, testUser } = await getTestInstance({
			plugins: [privacyCenter()],
		});
		const headers = new Headers();
		const secondEmail = "privacy-second@example.com";
		await client.signUp.email(
			{
				name: "Privacy Second",
				email: secondEmail,
				password: "Privacy-second-password-123!",
			},
			{ onSuccess: sessionSetter(headers) },
		);

		const response = await auth.api.exportPersonalData({
			headers,
			asResponse: true,
		});
		const serialized = await response.text();
		expect(response.status).toBe(200);
		expect(serialized).toContain(secondEmail);
		expect(serialized).not.toContain(testUser.email);
	});

	it("refuses to return a silently truncated export", async () => {
		const { auth, signInWithTestUser } = await getTestInstance({
			plugins: [privacyCenter({ maxRecordsPerModel: 1 })],
		});
		const { headers, user } = await signInWithTestUser();
		const context = await auth.$context;
		await context.internalAdapter.createSession(user.id, false);

		const response = await auth.api.exportPersonalData({
			headers,
			asResponse: true,
		});
		expect(response.status).toBe(413);
		expect(await response.json()).toMatchObject({
			code: "PRIVACY_EXPORT_TOO_LARGE",
		});
	});

	it("removes credential material even when a schema marks it returnable", () => {
		const sanitized = sanitizePrivacyExportRecord(
			{
				id: "record-1",
				name: "Primary",
				token: "session-secret",
				clientSecret: "oauth-secret",
				publicKey: "passkey-material",
			},
			{
				name: { type: "string", required: true },
				token: { type: "string", required: true },
				clientSecret: { type: "string", required: true },
				publicKey: { type: "string", required: true },
			},
		);
		expect(sanitized).toEqual({ id: "record-1", name: "Primary" });
	});
});

describe("privacy-center asynchronous personal data export", () => {
	const createProvider = (status: PrivacyAsyncExportStatus) => {
		const provider = {
			create: vi.fn(async () => status),
			getStatus: vi.fn(async () => status),
			getDownload: vi.fn(async () => ({
				body: new TextEncoder().encode('{"schemaVersion":1}'),
				size: 19,
				etag: '"privacy-etag"',
			})),
			deleteJob: vi.fn(async () => undefined),
			deleteSubjectExports: vi.fn(async () => undefined),
		} satisfies PrivacyAsyncExportProvider;
		return provider;
	};

	it("creates, reports, downloads, and cancels a subject-scoped export", async () => {
		const now = Date.now();
		const createdAt = new Date(now - 60_000).toISOString();
		const readyAt = new Date(now - 30_000).toISOString();
		const expiresAt = new Date(now + 86_400_000).toISOString();
		const provider = createProvider({
			jobId: "privacy-job-1234567890",
			status: "queued",
			createdAt,
			expiresAt,
		});
		const { auth, signInWithTestUser } = await getTestInstance({
			plugins: [
				privacyCenter({
					asyncExport: { provider, expiresInSeconds: 86_400 },
				}),
			],
		});
		const { headers, user } = await signInWithTestUser();

		const created = await auth.api.requestAsyncPersonalDataExport!({
			headers,
			asResponse: true,
		});
		expect(created.status).toBe(202);
		expect(created.headers.get("cache-control")).toBe("no-store");
		expect(await created.json()).toMatchObject({
			jobId: "privacy-job-1234567890",
			status: "queued",
		});
		expect(provider.create).toHaveBeenCalledWith(
			expect.objectContaining({
				subject: expect.objectContaining({ id: user.id }),
			}),
		);

		provider.getStatus.mockResolvedValue({
			jobId: "privacy-job-1234567890",
			status: "ready",
			createdAt,
			expiresAt,
			readyAt,
			size: 19,
		});
		const status = await auth.api.getAsyncPersonalDataExport!({
			query: { jobId: "privacy-job-1234567890" },
			headers,
			asResponse: true,
		});
		expect(status.status).toBe(200);
		expect(status.headers.get("cache-control")).toBe("no-store");
		expect(await status.json()).toMatchObject({ status: "ready", size: 19 });

		const download = await auth.api.downloadAsyncPersonalDataExport!({
			query: { jobId: "privacy-job-1234567890" },
			headers,
			asResponse: true,
		});
		expect(download.status).toBe(200);
		expect(download.headers.get("content-disposition")).toContain(
			"cinaauth-personal-data-",
		);
		expect(download.headers.get("cache-control")).toBe("no-store");
		expect(download.headers.get("etag")).toBe('"privacy-etag"');
		expect(await download.text()).toBe('{"schemaVersion":1}');

		const cancelled = await auth.api.cancelAsyncPersonalDataExport!({
			body: { jobId: "privacy-job-1234567890" },
			headers,
			asResponse: true,
		});
		expect(cancelled.status).toBe(200);
		expect(provider.deleteJob).toHaveBeenCalledWith({
			jobId: "privacy-job-1234567890",
			subjectId: user.id,
		});
	});

	it("does not expose an object until the export is ready", async () => {
		const provider = createProvider({
			jobId: "privacy-job-not-ready",
			status: "processing",
			createdAt: new Date().toISOString(),
			expiresAt: new Date(Date.now() + 60_000).toISOString(),
		});
		const { auth, signInWithTestUser } = await getTestInstance({
			plugins: [privacyCenter({ asyncExport: { provider } })],
		});
		const { headers } = await signInWithTestUser();
		const response = await auth.api.downloadAsyncPersonalDataExport!({
			query: { jobId: "privacy-job-not-ready" },
			headers,
			asResponse: true,
		});
		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({
			code: "PRIVACY_EXPORT_NOT_READY",
		});
		expect(provider.getDownload).not.toHaveBeenCalled();
	});

	it("blocks account deletion when subject export artifacts cannot be removed", async () => {
		const provider = createProvider({
			jobId: "privacy-job-delete-cleanup",
			status: "ready",
			createdAt: new Date().toISOString(),
			expiresAt: new Date(Date.now() + 60_000).toISOString(),
		});
		provider.deleteSubjectExports.mockRejectedValue(
			new Error("export storage unavailable"),
		);
		const { auth, signInWithTestUser, testUser } = await getTestInstance({
			user: { deleteUser: { enabled: true } },
			plugins: [
				privacyCenter({
					asyncExport: { provider },
					deletion: deletionPolicy,
				}),
			],
		});
		const { headers, user } = await signInWithTestUser();
		await expect(
			auth.api.deleteUser({
				body: { password: testUser.password },
				headers,
			}),
		).rejects.toThrow("export storage unavailable");
		expect(provider.deleteSubjectExports).toHaveBeenCalledWith({
			subjectId: user.id,
		});
		const context = await auth.$context;
		expect(await context.internalAdapter.findUserById(user.id)).not.toBeNull();
	});
});

describe("privacy-center account deletion evidence", () => {
	const createProcessor = (
		eraseSubject: PrivacyDeletionProcessor["eraseSubject"],
	): PrivacyDeletionProcessor => ({
		id: "customer-support",
		eraseSubject,
	});

	it("requires a recent session for deletion readiness", async () => {
		const { auth } = await getTestInstance({
			plugins: [privacyCenter({ deletion: deletionPolicy })],
		});
		const response = await auth.api.getPrivacyDeletionReadiness!({
			asResponse: true,
		});
		expect(response.status).toBe(401);
	});

	it("returns the current retention policy without caching", async () => {
		const processor = createProcessor(async () => ({
			status: "not-applicable",
			completedAt: new Date().toISOString(),
			evidenceId: "support-profile-not-found",
		}));
		const { auth, signInWithTestUser } = await getTestInstance({
			plugins: [
				privacyCenter({
					deletion: { ...deletionPolicy, processors: [processor] },
				}),
			],
		});
		const { headers } = await signInWithTestUser();
		const response = await auth.api.getPrivacyDeletionReadiness!({
			headers,
			asResponse: true,
		});
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(await response.json()).toMatchObject({
			canDelete: true,
			policyVersion: "2026-08-09",
			requiredProcessors: [{ id: "customer-support" }],
			blockingHolds: [],
			retentionExceptions: [
				{
					code: "security-audit-90d",
					maximumRetentionDays: 90,
				},
			],
		});
	});

	it("keeps the local account while a required processor is pending", async () => {
		const eraseSubject = vi.fn<PrivacyDeletionProcessor["eraseSubject"]>(
			async () => ({ status: "pending", retryAfterSeconds: 30 }),
		);
		const { auth, signInWithTestUser, testUser } = await getTestInstance({
			user: { deleteUser: { enabled: true } },
			plugins: [
				privacyCenter({
					deletion: {
						...deletionPolicy,
						processors: [createProcessor(eraseSubject)],
					},
				}),
			],
		});
		const { headers, user } = await signInWithTestUser();

		for (let attempt = 0; attempt < 2; attempt++) {
			await expect(
				auth.api.deleteUser({
					body: { password: testUser.password },
					headers,
					asResponse: true,
				}),
			).rejects.toMatchObject({
				statusCode: 409,
				body: {
					code: "PRIVACY_PROCESSOR_ERASURE_PENDING",
					retryAfterSeconds: 30,
				},
			});
		}

		expect(eraseSubject).toHaveBeenCalledTimes(2);
		const firstInput = eraseSubject.mock.calls[0]?.[0];
		const secondInput = eraseSubject.mock.calls[1]?.[0];
		expect(firstInput?.operationId).toBe(secondInput?.operationId);
		expect(firstInput?.operationId).not.toContain(user.id);
		expect(firstInput?.subject).toEqual({ id: user.id, email: testUser.email });
		const context = await auth.$context;
		expect(await context.internalAdapter.findUserById(user.id)).not.toBeNull();
	});

	it("keeps the local account when a required processor fails", async () => {
		const { auth, signInWithTestUser, testUser } = await getTestInstance({
			user: { deleteUser: { enabled: true } },
			plugins: [
				privacyCenter({
					deletion: {
						...deletionPolicy,
						processors: [
							createProcessor(async () => {
								throw new Error("processor unavailable");
							}),
						],
					},
				}),
			],
		});
		const { headers, user } = await signInWithTestUser();

		await expect(
			auth.api.deleteUser({
				body: { password: testUser.password },
				headers,
				asResponse: true,
			}),
		).rejects.toMatchObject({
			body: { code: "PRIVACY_PROCESSOR_ERASURE_FAILED" },
		});
		const context = await auth.$context;
		expect(await context.internalAdapter.findUserById(user.id)).not.toBeNull();
	});

	it("rejects malformed or future-dated processor evidence", async () => {
		const { auth, signInWithTestUser, testUser } = await getTestInstance({
			user: { deleteUser: { enabled: true } },
			plugins: [
				privacyCenter({
					deletion: {
						...deletionPolicy,
						processors: [
							createProcessor(async () => ({
								status: "completed",
								completedAt: "2999-01-01T00:00:00.000Z",
								evidenceId: "   ",
							})),
						],
					},
				}),
			],
		});
		const { headers, user } = await signInWithTestUser();

		await expect(
			auth.api.deleteUser({
				body: { password: testUser.password },
				headers,
				asResponse: true,
			}),
		).rejects.toMatchObject({
			body: { code: "PRIVACY_PROCESSOR_ERASURE_FAILED" },
		});
		const context = await auth.$context;
		expect(await context.internalAdapter.findUserById(user.id)).not.toBeNull();
	});

	it("signs processor erasure attestations without exposing provider evidence", async () => {
		const processorEvidence = "vendor-ticket-user-123456";
		const { auth, signInWithTestUser, testUser } = await getTestInstance({
			user: { deleteUser: { enabled: true } },
			plugins: [
				privacyCenter({
					deletion: {
						...deletionPolicy,
						processors: [
							createProcessor(async () => ({
								status: "completed",
								completedAt: "2026-08-09T12:00:00.000Z",
								evidenceId: processorEvidence,
							})),
						],
					},
				}),
			],
		});
		const { headers, user } = await signInWithTestUser();
		const response = await auth.api.deleteUser({
			body: { password: testUser.password },
			headers,
			asResponse: true,
		});
		const payload = (await response.json()) as {
			deletionReceipt: PrivacyDeletionReceipt;
		};
		const attestation = payload.deletionReceipt.deletion.processors?.[0];
		expect(attestation).toMatchObject({
			id: "customer-support",
			status: "completed",
			completedAt: "2026-08-09T12:00:00.000Z",
		});
		expect(attestation?.operationId).toHaveLength(44);
		expect(attestation?.evidenceDigest).toHaveLength(44);
		const serialized = JSON.stringify(payload.deletionReceipt);
		expect(serialized).not.toContain(processorEvidence);
		expect(serialized).not.toContain(user.id);
		expect(serialized).not.toContain(testUser.email);
		expect(
			await auth.api.verifyPrivacyDeletionReceipt!({
				body: { receipt: payload.deletionReceipt },
			}),
		).toMatchObject({ valid: true });

		const tampered: PrivacyDeletionReceipt = {
			...payload.deletionReceipt,
			deletion: {
				...payload.deletionReceipt.deletion,
				processors:
					payload.deletionReceipt.deletion.processors?.map((processor) => ({
						...processor,
						status: "not-applicable",
					})) ?? [],
			},
		};
		expect(
			await auth.api.verifyPrivacyDeletionReceipt!({
				body: { receipt: tampered },
			}),
		).toMatchObject({ valid: false });
	});

	it("rechecks blocking holds immediately before destructive work", async () => {
		const { auth, signInWithTestUser, testUser } = await getTestInstance({
			user: { deleteUser: { enabled: true } },
			plugins: [
				privacyCenter({
					deletion: {
						...deletionPolicy,
						resolveBlockingHolds: () => [
							{
								code: "legal-hold",
								reason: "A current legal preservation duty blocks deletion",
							},
						],
					},
				}),
			],
		});
		const { headers, user } = await signInWithTestUser();
		await expect(
			auth.api.deleteUser({
				body: { password: testUser.password },
				headers,
				asResponse: true,
			}),
		).rejects.toMatchObject({
			statusCode: 409,
			body: { code: "PRIVACY_DELETION_BLOCKED" },
		});
		const context = await auth.$context;
		expect(await context.internalAdapter.findUserById(user.id)).not.toBeNull();
	});

	it("returns a signed receipt only after successful account deletion", async () => {
		const { auth, signInWithTestUser, testUser } = await getTestInstance({
			user: { deleteUser: { enabled: true } },
			plugins: [privacyCenter({ deletion: deletionPolicy })],
		});
		const { headers, user } = await signInWithTestUser();
		const response = await auth.api.deleteUser({
			body: { password: testUser.password },
			headers,
			asResponse: true,
		});
		expect(response.status).toBe(200);
		const payload = (await response.json()) as {
			success: boolean;
			deletionReceipt: PrivacyDeletionReceipt;
		};
		expect(payload.success).toBe(true);
		expect(payload.deletionReceipt).toMatchObject({
			schemaVersion: 1,
			status: "completed",
			deletion: {
				scope: "cinaauth-authentication-account",
				policyVersion: "2026-08-09",
			},
			proof: { algorithm: "HMAC-SHA256" },
		});
		const retentionSnapshot =
			payload.deletionReceipt.deletion.retentionExceptions[0];
		expect(retentionSnapshot?.purgeNoLaterThan).toBe(
			new Date(
				Date.parse(payload.deletionReceipt.issuedAt) +
					90 * 24 * 60 * 60 * 1_000,
			).toISOString(),
		);
		const serialized = JSON.stringify(payload.deletionReceipt);
		expect(serialized).not.toContain(user.id);
		expect(serialized).not.toContain(testUser.email);

		const verification = await auth.api.verifyPrivacyDeletionReceipt!({
			body: { receipt: payload.deletionReceipt },
		});
		expect(verification).toMatchObject({
			valid: true,
			receiptId: payload.deletionReceipt.receiptId,
			status: "completed",
		});

		const tampered: PrivacyDeletionReceipt = {
			...payload.deletionReceipt,
			deletion: {
				...payload.deletionReceipt.deletion,
				policyVersion: "tampered-policy",
			},
		};
		expect(
			await auth.api.verifyPrivacyDeletionReceipt!({
				body: { receipt: tampered },
			}),
		).toMatchObject({ valid: false });

		const context = await auth.$context;
		expect(await context.internalAdapter.findUserById(user.id)).toBeNull();
	});

	it("rejects weak dedicated receipt keys during configuration", () => {
		expect(() =>
			privacyCenter({
				deletion: {
					policyVersion: "2026-08-09",
					receiptSecret: "short",
				},
			}),
		).toThrow("deletion.receiptSecret must be at least 32 characters");
	});

	it("rejects duplicate processor identifiers during configuration", () => {
		const processor = createProcessor(async () => ({
			status: "not-applicable",
			completedAt: new Date().toISOString(),
			evidenceId: "not-found",
		}));
		expect(() =>
			privacyCenter({
				deletion: {
					...deletionPolicy,
					processors: [processor, processor],
				},
			}),
		).toThrow("deletion.processors contains duplicate id customer-support");
	});

	it("rejects retention periods that cannot produce a finite purge deadline", () => {
		expect(() =>
			privacyCenter({
				deletion: {
					policyVersion: "2026-08-09",
					retentionExceptions: [
						{
							code: "unbounded-number",
							category: "Invalid evidence",
							purpose: "Exercise retention validation",
							maximumRetentionDays: 100_001,
						},
					],
				},
			}),
		).toThrow();
	});
});
