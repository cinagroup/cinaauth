import { describe, expect, it } from "vitest";
import {
	getPersonalDataExportFilename,
	getPrivacyDeletionReceipt,
	getPrivacyDeletionReceiptFilename,
	PRIVACY_ASYNC_EXPORT_DOWNLOAD_PATH,
	PRIVACY_ASYNC_EXPORT_PATH,
	PRIVACY_ASYNC_EXPORT_STATUS_PATH,
	PRIVACY_DELETE_ACCOUNT_PATH,
	PRIVACY_EXPORT_CATEGORIES,
	parsePrivacyAsyncExportStatus,
	parsePrivacyDeletionReadiness,
} from "./privacy-center";

describe("privacy center", () => {
	it("accepts the constrained CinaSeek attachment filename", () => {
		expect(
			getPersonalDataExportFilename(
				'attachment; filename="cinaseek-personal-data-2026-08-09.json"',
			),
		).toBe("cinaseek-personal-data-2026-08-09.json");
	});

	it("maps the constrained legacy attachment filename to CinaSeek", () => {
		expect(
			getPersonalDataExportFilename(
				'attachment; filename="cinaauth-personal-data-2026-08-09.json"',
			),
		).toBe("cinaseek-personal-data-2026-08-09.json");
	});

	it("replaces unsafe attachment names with a deterministic fallback", () => {
		expect(
			getPersonalDataExportFilename(
				'attachment; filename="../../account.json"',
				new Date("2026-08-09T12:00:00.000Z"),
			),
		).toBe("cinaseek-personal-data-2026-08-09.json");
	});

	it("describes the data families covered by the export", () => {
		expect(PRIVACY_EXPORT_CATEGORIES).toContain(
			"OAuth authorizations and security audit events",
		);
		expect(PRIVACY_DELETE_ACCOUNT_PATH).toBe("/api/auth/delete-user");
	});

	it("parses deletion readiness and retention exceptions", () => {
		expect(
			parsePrivacyDeletionReadiness({
				canDelete: true,
				policyVersion: "2026-08-09",
				blockingHolds: [],
				requiredProcessors: [{ id: "controller-erasure-orchestrator" }],
				retentionExceptions: [
					{
						code: "security-audit-90d",
						category: "Security audit evidence",
						purpose: "Incident response",
						maximumRetentionDays: 90,
					},
				],
			}),
		).toMatchObject({
			canDelete: true,
			policyVersion: "2026-08-09",
			requiredProcessors: [{ id: "controller-erasure-orchestrator" }],
		});
		expect(parsePrivacyDeletionReadiness({ canDelete: true })).toBeNull();
	});

	it("parses only valid asynchronous export status payloads", () => {
		expect(
			parsePrivacyAsyncExportStatus({
				jobId: "privacy-job-1234567890",
				status: "ready",
				createdAt: "2026-08-09T00:00:00.000Z",
				expiresAt: "2026-08-10T00:00:00.000Z",
				readyAt: "2026-08-09T00:01:00.000Z",
				size: 1024,
			}),
		).toMatchObject({ status: "ready", size: 1024 });
		expect(
			parsePrivacyAsyncExportStatus({
				jobId: "short",
				status: "ready",
				expiresAt: "invalid",
			}),
		).toBeNull();
		expect(PRIVACY_ASYNC_EXPORT_PATH).toBe("/api/auth/privacy/async-export");
		expect(PRIVACY_ASYNC_EXPORT_STATUS_PATH).toContain("/status");
		expect(PRIVACY_ASYNC_EXPORT_DOWNLOAD_PATH).toContain("/download");
	});

	it("extracts only structurally valid signed deletion receipts", () => {
		const receipt = {
			schemaVersion: 1,
			receiptId: "abcdefghijklmnopqrstuvwxyz123456",
			issuedAt: "2026-08-09T12:00:00.000Z",
			status: "completed",
			subject: { pseudonymousId: "pseudonymous-subject" },
			deletion: {
				scope: "cinaauth-authentication-account",
				policyVersion: "2026-08-09",
				retentionExceptions: [
					{
						code: "planetscale-postgres-backups-2d",
						category: "Encrypted database backups and WAL",
						purpose: "Point-in-time disaster recovery",
						maximumRetentionDays: 2,
						purgeNoLaterThan: "2026-08-11T12:00:00.000Z",
					},
				],
				processors: [
					{
						id: "controller-erasure-orchestrator",
						status: "completed",
						completedAt: "2026-08-09T12:00:00.000Z",
						operationId: "o".repeat(44),
						evidenceDigest: "e".repeat(44),
					},
				],
			},
			proof: { algorithm: "HMAC-SHA256", signature: "signed-proof" },
		};
		expect(getPrivacyDeletionReceipt({ deletionReceipt: receipt })).toEqual(
			receipt,
		);
		expect(
			getPrivacyDeletionReceipt({
				deletionReceipt: { ...receipt, status: "requested" },
			}),
		).toBeNull();
		expect(
			getPrivacyDeletionReceipt({
				deletionReceipt: {
					...receipt,
					deletion: {
						...receipt.deletion,
						retentionExceptions: receipt.deletion.retentionExceptions.map(
							(exception) => ({
								...exception,
								purgeNoLaterThan: "not-a-timestamp",
							}),
						),
					},
				},
			}),
		).toBeNull();
	});

	it("uses a constrained deletion receipt filename", () => {
		expect(
			getPrivacyDeletionReceiptFilename({
				receiptId: "abcdefghijklmnopqrstuvwxyz123456",
			}),
		).toBe("cinaseek-deletion-receipt-abcdefghijklmnopqrstuvwxyz123456.json");
		expect(getPrivacyDeletionReceiptFilename({ receiptId: "../unsafe" })).toBe(
			"cinaseek-deletion-receipt-receipt.json",
		);
	});
});
