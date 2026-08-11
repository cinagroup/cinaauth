import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readWorkflow = (name) =>
	readFileSync(new URL(name, import.meta.url), "utf8");

const central = readWorkflow("deploy-cloudflare.yml");
const account = readWorkflow("deploy-account-portal.yml");
const admin = readWorkflow("deploy-admin-console.yml");

const jobBlock = (source, job, nextJob) => {
	const start = source.indexOf(`  ${job}:`);
	assert.notEqual(start, -1, `missing ${job} job`);
	const end = nextJob ? source.indexOf(`  ${nextJob}:`, start + 1) : -1;
	return source.slice(start, end === -1 ? undefined : end);
};

test("central workflow is the only manually dispatched production entrypoint", () => {
	const trigger = central.slice(
		central.indexOf("on:"),
		central.indexOf("permissions:"),
	);
	assert.match(trigger, /workflow_dispatch:/);
	assert.doesNotMatch(trigger, /\n  push:/);
	assert.doesNotMatch(trigger, /\n  workflow_call:/);

	for (const [job, workflow] of [
		["deploy-account-portal", "deploy-account-portal.yml"],
		["deploy-admin-console", "deploy-admin-console.yml"],
	]) {
		const block = jobBlock(central, job);
		assert.match(block, /needs: deploy-worker/);
		assert.match(
			block,
			new RegExp(`uses: \\.\\/.github/workflows/${workflow}`),
		);
		assert.match(block, /secrets: inherit/);
	}
});

test("production attestation and live backup audit gate every Cloudflare write", () => {
	for (const input of [
		"restore_rehearsal_completed",
		"restore_rehearsal_reference",
		"backup_reference",
		"operator_attestation",
	]) {
		assert.match(central, new RegExp(`${input}:`));
	}
	assert.match(central, /type: boolean/);
	assert.match(central, /DEPLOY CINAAUTH PRODUCTION/);

	const gate = jobBlock(central, "authorize-production", "deploy-delivery");
	assert.match(gate, /environment: production/);
	assert.match(gate, /PLANETSCALE_SERVICE_TOKEN_ID/);
	assert.match(gate, /PLANETSCALE_SERVICE_TOKEN/);
	assert.match(gate, /GITHUB_REF.*refs\/heads\/main/);
	assert.match(gate, /tr -d '\[:space:\]'/);
	assert.match(
		gate,
		/pnpm .*--dir workers\/auth-api run check:planetscale-backups/,
	);
	assert.match(gate, /report\.activeBackups/);
	assert.match(gate, /inputs\.backup_reference/);
	assert.doesNotMatch(gate, /cloudflare\/wrangler-action|command: deploy/);

	for (const [job, nextJob] of [
		["deploy-delivery", "deploy-privacy-erasure"],
		["deploy-privacy-erasure", "deploy-worker"],
	]) {
		const block = jobBlock(central, job, nextJob);
		assert.match(block, /needs: authorize-production/);
		assert.match(block, /environment: production/);
	}
	assert.match(
		jobBlock(central, "deploy-worker", "deploy-account-portal"),
		/environment: production/,
	);
});

test("application workflows are reusable production-environment units only", () => {
	for (const source of [account, admin]) {
		const trigger = source.slice(
			source.indexOf("on:"),
			source.indexOf("permissions:"),
		);
		assert.match(trigger, /workflow_call:/);
		assert.doesNotMatch(trigger, /workflow_dispatch:/);
		assert.doesNotMatch(trigger, /\n  push:/);
		assert.match(jobBlock(source, "deploy"), /environment: production/);
	}
});

test("backend bootstrap never requires or writes deferred and V1 shared secrets", () => {
	for (const forbidden of [
		"RESEND_API_KEY",
		"RESEND_EMAIL_FROM",
		"TWILIO_ACCOUNT_SID",
		"TWILIO_AUTH_TOKEN",
		"TWILIO_FROM_NUMBER",
		"CINAAUTH_ERASURE_TARGETS",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		"CINAAUTH_ERASURE_WEBHOOK_SECRET",
		"CINAADMIN_OIDC_CLIENT_SECRET",
		"CINAADMIN_OIDC_BRIDGE_SECRET",
		"CINAADMIN_OIDC_TRANSACTION_SECRET",
	]) {
		assert.doesNotMatch(central, new RegExp(forbidden));
	}

	const delivery = jobBlock(
		central,
		"deploy-delivery",
		"deploy-privacy-erasure",
	);
	assert.match(delivery, /pnpm run build/);
	assert.match(delivery, /pnpm run check:cloudflare/);
	assert.doesNotMatch(delivery, /provision:secrets/);

	const privacy = jobBlock(central, "deploy-privacy-erasure", "deploy-worker");
	assert.match(privacy, /CINAAUTH_ERASURE_STORAGE_SECRET/);
	assert.match(privacy, /pnpm run provision:secrets/);
	assert.match(privacy, /check:cloudflare -- --allow-not-ready/);

	const auth = jobBlock(central, "deploy-worker", "deploy-account-portal");
	assert.match(auth, /Provision Auth Worker core and optional secrets/);
	assert.match(auth, /run: pnpm run provision:secrets/);
	assert.doesNotMatch(
		auth,
		/node - <<|wrangler secret bulk|Object\.fromEntries/,
	);
	for (const name of [
		"CINAAUTH_SECRET",
		"CINAAUTH_MIGRATION_TOKEN",
		"CINAAUTH_DELIVERY_WEBHOOK_URL",
		"CINAAUTH_PRIVACY_EXPORT_KEY",
		"OAUTH_PAIRWISE_SECRET",
		"CINAAUTH_ENTITLEMENT_CONFIG",
	]) {
		assert.match(auth, new RegExp(name));
	}
	assert.doesNotMatch(
		auth,
		/^\s+CINAAUTH_ERASURE_WEBHOOK_URL:/m,
		"the provisioner owns the canonical erasure endpoint; CI must not supply an override",
	);
	assert.ok(
		auth.indexOf("run: pnpm run provision:secrets") <
			auth.indexOf("Build Worker dry run"),
		"Auth bulk provisioning must precede the deploy build",
	);

	for (const block of [delivery, privacy]) {
		assert.ok(
			block.indexOf("pnpm run build") < block.indexOf("command: deploy"),
			"dry-run build must precede deployment",
		);
		assert.ok(
			block.indexOf("command: deploy") < block.indexOf("check:cloudflare"),
			"remote binding checks must follow deployment",
		);
	}
});

test("frontends rely on Auth readiness and configured bindings", () => {
	assert.doesNotMatch(account, /CINAAUTH_DEMO_SECRET|wrangler secret put/);
	assert.match(account, /Wait for governed Auth readiness/);

	assert.doesNotMatch(
		admin,
		/CINAADMIN_OIDC_(?:CLIENT|BRIDGE|TRANSACTION)_SECRET|provision:secrets/,
	);
	assert.match(admin, /Validate production binding contract/);
	assert.match(admin, /Wait for governed Auth readiness/);
});
