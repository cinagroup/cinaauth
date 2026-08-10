import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBackupEvidence } from "./check-planetscale-backups.mjs";

const includedPolicy = {
	id: "policy-production",
	target: "production",
	retention_value: 2,
	retention_unit: "day",
	frequency_value: 12,
	frequency_unit: "hour",
	required: true,
};

const activeBackup = {
	id: "backup-before-deletion",
	started_at: "2026-08-09T00:00:00.000Z",
	expires_at: "2026-08-11T00:00:00.000Z",
	deleted_at: null,
	protected: false,
	backup_policy: includedPolicy,
};

test("accepts the included 12-hour, two-day policy and unprotected backups", () => {
	const result = evaluateBackupEvidence({
		backups: [activeBackup],
		policies: [includedPolicy],
		maximumRetentionDays: 2,
		now: new Date("2026-08-10T00:00:00.000Z"),
	});
	assert.equal(result.status, "verified");
	assert.deepEqual(result.failures, []);
	assert.equal(result.summary.protectedBackups, 0);
});

test("fails closed for protected or over-retained production backups", () => {
	const result = evaluateBackupEvidence({
		backups: [{ ...activeBackup, protected: true }],
		policies: [
			includedPolicy,
			{
				...includedPolicy,
				id: "custom-seven-day",
				retention_value: 7,
				required: false,
			},
		],
		maximumRetentionDays: 2,
		now: new Date("2026-08-10T00:00:00.000Z"),
	});
	assert.equal(result.status, "failed");
	assert.match(result.failures.join("\n"), /protected/);
	assert.match(result.failures.join("\n"), /retention/);
});

test("confirms control-plane deletion after the signed receipt deadline", () => {
	const receipt = {
		issuedAt: "2026-08-09T12:00:00.000Z",
		deletion: {
			retentionExceptions: [
				{
					code: "planetscale-postgres-backups-2d",
					maximumRetentionDays: 2,
					purgeNoLaterThan: "2026-08-11T12:00:00.000Z",
				},
			],
		},
	};
	const result = evaluateBackupEvidence({
		backups: [
			{
				...activeBackup,
				deleted_at: "2026-08-11T00:03:00.000Z",
			},
			{
				...activeBackup,
				id: "backup-after-deletion",
				started_at: "2026-08-09T13:00:00.000Z",
			},
		],
		policies: [includedPolicy],
		maximumRetentionDays: 2,
		now: new Date("2026-08-11T12:01:00.000Z"),
		receipt,
	});
	assert.equal(result.status, "verified");
	assert.equal(result.receiptEvidence?.eligibleBackups, 1);
	assert.equal(result.receiptEvidence?.deletedBackups, 1);
});

test("does not claim deletion before the signed deadline", () => {
	const result = evaluateBackupEvidence({
		backups: [activeBackup],
		policies: [includedPolicy],
		maximumRetentionDays: 2,
		now: new Date("2026-08-10T00:00:00.000Z"),
		receipt: {
			issuedAt: "2026-08-09T12:00:00.000Z",
			deletion: {
				retentionExceptions: [
					{
						code: "planetscale-postgres-backups-2d",
						maximumRetentionDays: 2,
						purgeNoLaterThan: "2026-08-11T12:00:00.000Z",
					},
				],
			},
		},
	});
	assert.equal(result.status, "pending");
	assert.deepEqual(result.failures, []);
});
