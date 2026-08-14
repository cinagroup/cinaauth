import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readWorkflow = (name) =>
	readFileSync(new URL(name, import.meta.url), "utf8");

const rootPackage = JSON.parse(
	readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);
const central = readWorkflow("deploy-cloudflare.yml");
const account = readWorkflow("deploy-account-portal.yml");
const admin = readWorkflow("deploy-admin-console.yml");
const oidcClient = readWorkflow("deploy-oidc-client-demo.yml");

const productionWorkflows = [
	["deploy-cloudflare.yml", central],
	["deploy-account-portal.yml", account],
	["deploy-admin-console.yml", admin],
	["deploy-oidc-client-demo.yml", oidcClient],
];

const jobBlock = (source, job, nextJob) => {
	const start = source.indexOf(`  ${job}:`);
	assert.notEqual(start, -1, `missing ${job} job`);
	const end = nextJob ? source.indexOf(`  ${nextJob}:`, start + 1) : -1;
	return source.slice(start, end === -1 ? undefined : end);
};

const pnpmSetupBlocks = (source) => {
	const lines = source.split("\n");
	const blocks = [];
	for (let index = 0; index < lines.length; index += 1) {
		if (!lines[index].includes("uses: pnpm/action-setup@")) continue;
		const indentation = lines[index].match(/^\s*/)?.[0].length ?? 0;
		let end = index + 1;
		while (end < lines.length) {
			const line = lines[end];
			if (line.trim().length > 0) {
				const nextIndentation = line.match(/^\s*/)?.[0].length ?? 0;
				if (nextIndentation < indentation) break;
			}
			end += 1;
		}
		blocks.push(lines.slice(index, end).join("\n"));
	}
	return blocks;
};

test("production workflows use the root packageManager pnpm version", () => {
	assert.match(rootPackage.packageManager, /^pnpm@\d+\.\d+\.\d+(?:[-+].+)?$/);
	for (const [name, source] of productionWorkflows) {
		const setupBlocks = pnpmSetupBlocks(source);
		assert.ok(setupBlocks.length > 0, `${name} must install pnpm`);
		for (const block of setupBlocks) {
			assert.doesNotMatch(
				block,
				/^\s+version:/m,
				`${name} must let package.json packageManager select the pnpm version`,
			);
		}
	}
});

test("production writes have only the governed central and Account Phase One entrypoints", () => {
	const trigger = central.slice(
		central.indexOf("on:"),
		central.indexOf("permissions:"),
	);
	assert.match(trigger, /workflow_dispatch:/);
	assert.doesNotMatch(trigger, /\n  push:/);
	assert.doesNotMatch(trigger, /\n  workflow_call:/);

	const accountTrigger = account.slice(
		account.indexOf("on:"),
		account.indexOf("permissions:"),
	);
	assert.match(accountTrigger, /workflow_call:/);
	assert.match(accountTrigger, /workflow_dispatch:/);
	assert.doesNotMatch(accountTrigger, /\n  push:/);

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

test("the central caller explicitly selects reusable Account mode without exposing a manual bypass", () => {
	const trigger = account.slice(
		account.indexOf("on:"),
		account.indexOf("permissions:"),
	);
	const workflowCallStart = trigger.indexOf("  workflow_call:");
	const workflowDispatchStart = trigger.indexOf("  workflow_dispatch:");
	assert.notEqual(workflowCallStart, -1);
	assert.notEqual(workflowDispatchStart, -1);
	const workflowCall = trigger.slice(workflowCallStart, workflowDispatchStart);
	const workflowDispatch = trigger.slice(workflowDispatchStart);
	assert.match(workflowCall, /deployment_mode:/);
	assert.match(workflowCall, /required: true/);
	assert.match(workflowCall, /type: string/);
	assert.doesNotMatch(workflowDispatch, /deployment_mode:/);

	const caller = jobBlock(
		central,
		"deploy-account-portal",
		"deploy-admin-console",
	);
	assert.match(caller, /with:\s+deployment_mode: central/);
	assert.match(caller, /secrets: inherit/);

	const deploy = jobBlock(account, "deploy");
	assert.match(deploy, /Validate reusable Account deployment mode/);
	assert.match(deploy, /if: inputs\.deployment_mode == ''/);
	assert.match(deploy, /if: inputs\.deployment_mode == 'central'/);
	assert.doesNotMatch(deploy, /if: github\.event_name/);
});

test("manual Account Phase One deploy is main-only, attested, and keeps SIWE disabled", () => {
	const deploy = jobBlock(account, "deploy");
	assert.match(account, /DEPLOY CINAAUTH ACCOUNT PORTAL PHASE ONE/);
	assert.match(deploy, /if: inputs\.deployment_mode == ''/);
	assert.match(deploy, /GITHUB_REF.*refs\/heads\/main/);
	assert.match(
		deploy,
		/CINAAUTH_PLANNED_WORKER_CONFIG: \.\.\/\.\.\/workers\/auth-api\/wrangler\.json/,
	);
	assert.match(deploy, /CINAAUTH_SIWE_ENABLED/);
	assert.match(deploy, /!== "false"/);
	assert.match(deploy, /REOWN_PROJECT_ID/);
	assert.match(deploy, /Configure wallet UI rollout from tracked Auth config/);
	assert.match(deploy, /NEXT_PUBLIC_SIWE_WALLET_UI_ENABLED/);
	assert.match(deploy, /Verify deployed Account wallet readiness parity/);
	assert.match(deploy, /cinaauth-siwe-v2/);
	assert.match(deploy, /reown-appkit-v1/);
	assert.match(
		deploy,
		/readiness\.reownProjectId !== expectedProjectId/,
	);
	assert.match(
		deploy,
		/readiness\.walletUiEnabled !== expectedWalletUiEnabled/,
	);
	assert.match(deploy, /Verify public Auth availability for Phase One/);
	assert.match(deploy, /if: inputs\.deployment_mode == 'central'/);
	assert.doesNotMatch(deploy, /if: github\.event_name/);
	assert.match(deploy, /environment: production/);
});

test("every Account deployment verifies the deployed wallet marker against the tracked release", () => {
	const start = account.indexOf(
		"      - name: Verify deployed Account wallet readiness parity",
	);
	assert.notEqual(start, -1, "missing deployed Account wallet readiness check");
	const end = account.indexOf("      - name: Smoke test account portal", start);
	assert.notEqual(end, -1, "wallet readiness check must precede Account smoke");
	const parity = account.slice(start, end);

	assert.doesNotMatch(parity, /^\s+if:/m);
	assert.match(
		parity,
		/REOWN_PROJECT_ID: \$\{\{ secrets\.REOWN_PROJECT_ID \}\}/,
	);
	assert.match(parity, /NEXT_PUBLIC_SIWE_WALLET_UI_ENABLED/);
	assert.match(parity, /cache-control:.*no-store/i);
	assert.match(parity, /readiness\.schemaVersion !== 1/);
	assert.match(parity, /readiness\.ready !== expectedReady/);
	assert.match(parity, /readiness\.siweProtocol !== "cinaauth-siwe-v2"/);
	assert.match(parity, /readiness\.walletUi !== "reown-appkit-v1"/);
	assert.match(parity, /readiness\.walletUiEnabled !== expectedWalletUiEnabled/);
	assert.match(parity, /readiness\.reownProjectId !== expectedProjectId/);
	assert.doesNotMatch(parity, /console\.log\([^)]*REOWN_PROJECT_ID/);
});

test("Account Portal deployment jobs build workspace packages before typecheck", () => {
	const deploymentJobs = [
		["manual and reusable Account deployment", jobBlock(account, "deploy")],
		[
			"central Account preflight",
			jobBlock(central, "preflight-account-portal", "deploy-delivery"),
		],
	];

	for (const [name, source] of deploymentJobs) {
		const install = source.indexOf("- name: Install dependencies");
		const build = source.indexOf("- name: Build workspace packages");
		const typecheck = source.indexOf("- name: Typecheck account portal");

		assert.ok(install >= 0, `${name} must install dependencies`);
		assert.ok(build > install, `${name} must build after install`);
		assert.ok(
			typecheck > build,
			`${name} must typecheck after the workspace build`,
		);
		assert.match(
			source.slice(build, typecheck),
			/run: pnpm --dir \.\.\/\.\. build/,
		);
	}
});

test("Account Portal smoke verifies the legacy custom domain across Cloudflare boundaries", () => {
	const deploy = jobBlock(account, "deploy");
	const smokeStart = deploy.indexOf("- name: Smoke test account portal");
	assert.ok(smokeStart >= 0, "missing Account Portal smoke step");
	const smoke = deploy.slice(smokeStart);

	assert.match(smoke, /workers\/domains\?hostname=demo-auth\.cinagroup\.com/);
	assert.match(smoke, /domains\.length !== 1/);
	assert.match(smoke, /domain\.service !== "cinaauth-demo"/);
	assert.match(smoke, /domain\.zone_name !== "cinagroup\.com"/);
	assert.match(smoke, /domain\.cert_id/);
	assert.match(
		smoke,
		/domain\.environment !== undefined && domain\.environment !== "production"/,
	);
	assert.match(
		smoke,
		/legacy_status="\$\(curl[\s\S]*--write-out '%\{http_code\}'/,
	);
	assert.match(smoke, /legacy_status" = "308"/);
	assert.match(
		smoke,
		/legacy_location" = "https:\/\/accounts\.cinaseek\.ai\/sign-in\?callbackURL=%2Fdashboard"/,
	);
	assert.match(smoke, /cf-mitigated:\[\[:space:\]\]\*challenge/);
	assert.match(smoke, /\^cf-ray:/);
	assert.match(smoke, /Cloudflare mitigation response/);
	assert.match(smoke, /Unexpected legacy Account domain response/);
	assert.match(deploy, /middleware\.test\.ts/);
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

	const gate = jobBlock(
		central,
		"authorize-production",
		"preflight-account-portal",
	);
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
		assert.match(
			block,
			/needs: \[authorize-production, preflight-account-portal\]/,
		);
		assert.match(block, /environment: production/);
	}
	assert.match(
		jobBlock(central, "deploy-worker", "deploy-account-portal"),
		/environment: production/,
	);
});

test("planned SIWE and the Accounts bundle are verified before Worker deployment", () => {
	const preflight = jobBlock(
		central,
		"preflight-account-portal",
		"deploy-delivery",
	);
	assert.match(preflight, /needs: authorize-production/);
	assert.match(preflight, /environment: production/);
	assert.match(
		preflight,
		/CINAAUTH_PLANNED_WORKER_CONFIG: \.\.\/\.\.\/workers\/auth-api\/wrangler\.json/,
	);
	assert.match(
		preflight,
		/REOWN_PROJECT_ID: \$\{\{ secrets\.REOWN_PROJECT_ID \}\}/,
	);
	assert.match(
		preflight,
		/NEXT_PUBLIC_REOWN_PROJECT_ID: \$\{\{ secrets\.REOWN_PROJECT_ID \}\}/,
	);
	assert.doesNotMatch(preflight, /vars\.REOWN_PROJECT_ID/);
	assert.match(
		account,
		/REOWN_PROJECT_ID: \$\{\{ secrets\.REOWN_PROJECT_ID \}\}/,
	);
	assert.match(
		account,
		/NEXT_PUBLIC_REOWN_PROJECT_ID: \$\{\{ secrets\.REOWN_PROJECT_ID \}\}/,
	);
	assert.doesNotMatch(account, /vars\.REOWN_PROJECT_ID/);
	assert.match(preflight, /pnpm run check:oauth-build/);
	assert.match(preflight, /pnpm run build:cf/);
	assert.match(
		preflight,
		/Configure wallet UI rollout from tracked Auth config/,
	);
	assert.match(preflight, /NEXT_PUBLIC_SIWE_WALLET_UI_ENABLED/);
	assert.match(
		preflight,
		/CINAAUTH_ACCOUNT_BUILD_READINESS_URL: https:\/\/accounts\.cinaseek\.ai\/api\/build-readiness/,
	);
	for (const contract of [
		"lib/reown-wallet-gate.test.ts",
		"lib/reown-wallet-cookie.test.ts",
		"lib/siwe-wallet-protocol.test.ts",
		"lib/reown-wallet-source-contract.test.ts",
		"lib/account-build-readiness.test.ts",
	]) {
		assert.match(preflight, new RegExp(contract.replaceAll(".", "\\.")));
		assert.match(account, new RegExp(contract.replaceAll(".", "\\.")));
	}
	assert.doesNotMatch(
		preflight,
		/cloudflare\/wrangler-action|command: deploy|pnpm run deploy/,
	);
	assert.equal(
		(account.match(/command: deploy/g) ?? []).length,
		1,
		"the reusable Account Portal workflow must deploy exactly once",
	);

	for (const [job, nextJob] of [
		["deploy-delivery", "deploy-privacy-erasure"],
		["deploy-privacy-erasure", "deploy-worker"],
	]) {
		assert.match(
			jobBlock(central, job, nextJob),
			/needs: \[authorize-production, preflight-account-portal\]/,
		);
	}
	assert.match(
		jobBlock(central, "deploy-worker", "deploy-account-portal"),
		/needs: \[deploy-delivery, deploy-privacy-erasure, preflight-account-portal\]/,
	);
});

test("application workflows remain reusable production-environment units", () => {
	for (const source of [account, admin]) {
		const trigger = source.slice(
			source.indexOf("on:"),
			source.indexOf("permissions:"),
		);
		assert.match(trigger, /workflow_call:/);
		assert.doesNotMatch(trigger, /\n  push:/);
		assert.match(jobBlock(source, "deploy"), /environment: production/);
	}
	const adminTrigger = admin.slice(
		admin.indexOf("on:"),
		admin.indexOf("permissions:"),
	);
	assert.doesNotMatch(adminTrigger, /workflow_dispatch:/);
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
