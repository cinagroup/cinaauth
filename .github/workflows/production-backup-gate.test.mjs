// cspell:ignore fxjiij acpki zvqry
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const workflow = readFileSync(
	new URL("deploy-cloudflare.yml", import.meta.url),
	"utf8",
);
const auditStep = workflow.slice(
	workflow.indexOf("      - name: Audit PlanetScale production backups"),
	workflow.indexOf(
		"      - name: Verify preserved Cloudflare Worker secret inventory",
	),
);
const program = auditStep.match(
	/node -e '\n([\s\S]*?)\n          ' "\$report_file"/,
)?.[1];
assert.ok(program, "the actual release backup gate must be executable");
const failure = "Backup c863fxjiij6b expiry exceeds the 2-day retention limit";
const report = () => ({
	scope: { organization: "cinaseek", database: "cinaauth", branch: "main" },
	status: "failed",
	failures: [failure],
	reportDigest: "a".repeat(64),
	activeBackups: [
		{
			id: "c863fxjiij6b",
			startedAt: "2026-11-26T08:40:03.907Z",
			expiresAt: "2026-11-30T00:53:52.044Z",
			protected: false,
			deletedAt: null,
		},
		{
			id: "acpki8zvqry8",
			startedAt: "2026-11-26T17:52:43.242Z",
			expiresAt: "2026-11-28T17:52:42.553Z",
			protected: false,
			deletedAt: null,
		},
	],
});

const runGate = ({
	data = report(),
	optIn = "true",
	now = "2026-11-27T02:00:00Z",
	version = "1.7.28",
	backup = "acpki8zvqry8",
} = {}) => {
	const directory = mkdtempSync(join(tmpdir(), "cinaauth-backup-gate-"));
	try {
		mkdirSync(join(directory, "packages/cinaauth"), { recursive: true });
		writeFileSync(
			join(directory, "packages/cinaauth/package.json"),
			JSON.stringify({ version }),
		);
		writeFileSync(join(directory, "report.json"), JSON.stringify(data));
		return spawnSync(
			process.execPath,
			[
				"-e",
				"Date.now = () => " + Date.parse(now) + ";\n" + program,
				join(directory, "report.json"),
			],
			{
				cwd: directory,
				encoding: "utf8",
				timeout: 5000,
				env: {
					...process.env,
					BACKUP_REFERENCE: backup,
					ALLOW_RESTORE_BACKUP_RETENTION_DEVIATION: optIn,
				},
			},
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
};

/** @see https://planetscale.com/docs/postgres/backups */
test("the explicit 1.7.28 release exception authorizes only the known source expiry without claiming a verified audit", () => {
	const result = runGate();
	assert.equal(result.status, 0, result.stderr);
	const decision = JSON.parse(result.stdout);
	assert.equal(decision.backupAuditStatus, "failed");
	assert.equal(decision.retentionExceptionApplied, true);
	assert.equal(decision.backupReference, "acpki8zvqry8");
	assert.match(result.stderr, /warning.*c863fxjiij6b/);
});

test("retention failures remain blocking without explicit opt-in", () => {
	assert.notEqual(runGate({ optIn: "false" }).status, 0);
});

for (const [name, mutate] of [
	[
		"an additional audit failure",
		(data) => data.failures.push("Backup policy exceeds retention"),
	],
	[
		"another source backup",
		(data) => {
			data.activeBackups[0].id = "different-backup";
		},
	],
	[
		"a further source expiry extension",
		(data) => {
			data.activeBackups[0].expiresAt = "2026-12-01T00:00:00Z";
		},
	],
	[
		"a protected source backup",
		(data) => {
			data.activeBackups[0].protected = true;
		},
	],
	[
		"another production target",
		(data) => {
			data.scope.organization = "other";
		},
	],
	[
		"an expired rollback backup",
		(data) => {
			data.activeBackups[1].expiresAt = "2026-11-27T01:00:00Z";
		},
	],
	[
		"a deleted rollback backup",
		(data) => {
			data.activeBackups[1].deletedAt = "2026-11-27T01:00:00Z";
		},
	],
	[
		"a protected rollback backup",
		(data) => {
			data.activeBackups[1].protected = true;
		},
	],
	[
		"a missing failure list",
		(data) => {
			data.failures = undefined;
		},
	],
]) {
	test("the exception rejects " + name, () => {
		const data = report();
		mutate(data);
		assert.notEqual(runGate({ data }).status, 0);
	});
}

test("the exception expires and does not carry into another framework release", () => {
	assert.notEqual(runGate({ now: "2026-11-27T12:00:00Z" }).status, 0);
	assert.notEqual(runGate({ version: "1.7.29" }).status, 0);
});

test("the held source backup cannot serve as the rollback backup", () => {
	assert.notEqual(runGate({ backup: "c863fxjiij6b" }).status, 0);
});

test("a verified audit follows the normal release path without an exception", () => {
	const data = report();
	data.status = "verified";
	data.failures = [];
	data.activeBackups.shift();
	const result = runGate({ data, optIn: "false" });
	assert.equal(result.status, 0, result.stderr);
	const decision = JSON.parse(result.stdout);
	assert.equal(decision.backupAuditStatus, "verified");
	assert.equal(decision.retentionExceptionApplied, false);
});
