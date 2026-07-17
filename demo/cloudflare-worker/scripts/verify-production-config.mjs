import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workerDir = dirname(scriptDir);
const repoRoot = dirname(dirname(workerDir));

const failures = [];
let passed = 0;

const rel = (file) => relative(repoRoot, file).replaceAll("\\", "/");

const read = (file) => readFileSync(file, "utf8");

const check = (condition, message) => {
	if (condition) {
		passed += 1;
		return;
	}
	failures.push(message);
};

const checkIncludes = (content, token, file, reason) => {
	check(
		content.includes(token),
		`${rel(file)} must include ${JSON.stringify(token)} (${reason})`,
	);
};

const checkIncludesAll = (content, tokens, file, reason) => {
	for (const token of tokens) {
		checkIncludes(content, token, file, reason);
	}
};

const readJson = (file) => {
	try {
		return JSON.parse(read(file));
	} catch (error) {
		failures.push(`${rel(file)} is not valid JSON: ${error.message}`);
		return {};
	}
};

const packageFile = join(workerDir, "package.json");
const wranglerFile = join(workerDir, "wrangler.json");
const devVarsExampleFile = join(workerDir, ".dev.vars.example");
const indexFile = join(workerDir, "src", "index.ts");
const authFile = join(workerDir, "src", "auth.ts");
const deliveryFile = join(workerDir, "src", "delivery.ts");
const envFile = join(workerDir, "src", "env.d.ts");
const remotePreflightFile = join(workerDir, "scripts", "check-cloudflare-remote.mjs");
const provisionSecretsFile = join(workerDir, "scripts", "provision-secrets.mjs");
const workflowFile = join(repoRoot, ".github", "workflows", "deploy-cloudflare.yml");
const deploymentDocFile = join(workerDir, "DEPLOYMENT.md");
const chineseDeploymentDocFile = join(repoRoot, "docs", "CLOUDFLARE_DEPLOYMENT.md");
const gitignoreFile = join(repoRoot, ".gitignore");

const packageJson = readJson(packageFile);
const wrangler = readJson(wranglerFile);
const indexTs = read(indexFile);
const authTs = read(authFile);
const deliveryTs = read(deliveryFile);
const envTs = read(envFile);
const remotePreflight = read(remotePreflightFile);
const provisionSecrets = read(provisionSecretsFile);
const workflow = read(workflowFile);
const deploymentDoc = read(deploymentDocFile);
const chineseDeploymentDoc = read(chineseDeploymentDocFile);
const gitignore = read(gitignoreFile);
const devVarsExample = existsSync(devVarsExampleFile)
	? read(devVarsExampleFile)
	: "";

check(
	packageJson.scripts?.["check:production"] ===
		"node ./scripts/verify-production-config.mjs",
	`${rel(packageFile)} must expose check:production`,
);
check(
	packageJson.scripts?.check?.includes("pnpm run check:production"),
	`${rel(packageFile)} check script must run check:production before deploy gates`,
);
check(
	packageJson.scripts?.test === "vitest run",
	`${rel(packageFile)} must expose a vitest test script`,
);
check(
	packageJson.scripts?.["check:cloudflare"] ===
		"node ./scripts/check-cloudflare-remote.mjs",
	`${rel(packageFile)} must expose check:cloudflare`,
);
check(
	packageJson.scripts?.["provision:secrets"] ===
		"node ./scripts/provision-secrets.mjs",
	`${rel(packageFile)} must expose provision:secrets`,
);
check(
	packageJson.scripts?.check?.includes("pnpm run test"),
	`${rel(packageFile)} check script must run Worker regression tests`,
);
check(
	packageJson.devDependencies?.vitest === "catalog:vitest",
	`${rel(packageFile)} must depend on the workspace Vitest catalog`,
);

check(wrangler.name === "cinaauth-api", "Worker name must be cinaauth-api");
check(wrangler.main === "src/index.ts", "Worker main must be src/index.ts");
check(
	typeof wrangler.compatibility_date === "string" &&
		/^\d{4}-\d{2}-\d{2}$/.test(wrangler.compatibility_date),
	"wrangler.json must set an explicit compatibility_date",
);
check(
	Array.isArray(wrangler.compatibility_flags) &&
		wrangler.compatibility_flags.includes("nodejs_compat"),
	"wrangler.json must enable nodejs_compat",
);
check(wrangler.upload_source_maps === true, "wrangler.json must upload source maps");
check(
	wrangler.observability?.enabled === true &&
		typeof wrangler.observability?.head_sampling_rate === "number" &&
		wrangler.observability.head_sampling_rate > 0 &&
		wrangler.observability.head_sampling_rate <= 1,
	"wrangler.json must enable observability with a valid head_sampling_rate",
);
check(
	wrangler.version_metadata?.binding === "VERSION_METADATA",
	"wrangler.json must bind Worker version metadata as VERSION_METADATA",
);

const d1 = wrangler.d1_databases?.find((binding) => binding.binding === "DB");
check(Boolean(d1), "wrangler.json must bind D1 as DB");
check(d1?.database_name === "cinaauth-db", "DB binding must target cinaauth-db");
check(
	typeof d1?.database_id === "string" &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			d1.database_id,
		),
	"DB binding must contain a concrete D1 database_id",
);

check(
	wrangler.vars?.CINAAUTH_URL === "https://auth.cinagroup.com",
	"CINAAUTH_URL must point at https://auth.cinagroup.com",
);
const forbiddenVars = [
	"CINAAUTH_SECRET",
	"CINAAUTH_MIGRATION_TOKEN",
	"CINAAUTH_DELIVERY_WEBHOOK_URL",
	"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
	"OAUTH_PAIRWISE_SECRET",
	"CLOUDFLARE_TURNSTILE_SECRET_KEY",
	"STRIPE_SECRET_KEY",
	"STRIPE_WEBHOOK_SECRET",
	"CINAUTH_ADMIN_SERVICE_KEY",
].filter((name) => Object.hasOwn(wrangler.vars ?? {}, name));
check(
	forbiddenVars.length === 0,
	`Secret-like values must not be stored in wrangler.json vars: ${forbiddenVars.join(", ")}`,
);

const producer = wrangler.queues?.producers?.find(
	(item) => item.binding === "CINAAUTH_DELIVERY_QUEUE",
);
check(Boolean(producer), "wrangler.json must bind CINAAUTH_DELIVERY_QUEUE producer");
check(
	producer?.queue === "cinaauth-delivery",
	"CINAAUTH_DELIVERY_QUEUE must produce to cinaauth-delivery",
);
const consumer = wrangler.queues?.consumers?.find(
	(item) => item.queue === "cinaauth-delivery",
);
check(Boolean(consumer), "wrangler.json must consume cinaauth-delivery");
check(
	consumer?.dead_letter_queue === "cinaauth-delivery-dlq",
	"cinaauth-delivery consumer must use cinaauth-delivery-dlq",
);
check(
	consumer?.max_concurrency > 0 && consumer.max_concurrency <= 5,
	"Queue consumer max_concurrency must be capped at 5 or lower",
);
check(
	consumer?.max_batch_size > 0 && consumer.max_batch_size <= 10,
	"Queue consumer max_batch_size must be capped at 10 or lower",
);
check(
	consumer?.max_retries >= 3,
	"Queue consumer should retry transient downstream failures",
);

const route = wrangler.routes?.find(
	(item) =>
		item.pattern === "auth.cinagroup.com/*" &&
		item.zone_name === "cinagroup.com",
);
check(Boolean(route), "wrangler.json must route auth.cinagroup.com/*");

checkIncludesAll(
	indexTs,
	[
		"missing_cinaauth_secret",
		"weak_cinaauth_secret",
		"missing_d1_binding",
		"missing_version_metadata",
		"missing_cinaauth_migration_token",
		"weak_cinaauth_migration_token",
		"missing_delivery_queue",
		"missing_delivery_webhook_url",
		"invalid_delivery_webhook_url",
		"missing_delivery_webhook_secret",
		"weak_delivery_webhook_secret",
		"invalid_cinaauth_url",
	],
	indexFile,
	"runtime readiness must cover required production inputs",
);
checkIncludesAll(
	indexTs,
	[
		'app.get("/api/ready"',
		'app.get("/api/migrate"',
		'app.post("/api/migrate"',
		"Cache-Control",
		"no-store",
		"secureEqual",
		"REQUIRED_DATABASE_TABLES",
		'"rateLimit"',
		"getVersionMetadata",
		"version: getVersionMetadata",
		"export const getRuntimeConfigIssues",
		"export const isAuthorizedMigrationRequest",
	],
	indexFile,
	"protected operations and no-store responses must stay wired",
);
check(
	!indexTs.includes("CINAUTH_ADMIN_SERVICE_KEY"),
	"Migration/readiness authorization must not fall back to CINAUTH_ADMIN_SERVICE_KEY",
);

checkIncludesAll(
	authTs,
	[
		'storage: "database"',
		"waitUntil(",
		"runWithExecutionCtx",
		"crossSubDomainCookies",
		"cf-connecting-ip",
	],
	authFile,
	"auth runtime must keep rate limits shared and background work safe",
);

checkIncludesAll(
	deliveryTs,
	[
		"export const deliverToWebhook",
		"export const enqueueDelivery",
		"export const handleDeliveryBatch",
		"X-CinaAuth-Delivery-Id",
		"X-CinaAuth-Delivery-Timestamp",
		"X-CinaAuth-Delivery-Signature",
		"crypto.subtle.sign",
		"message.ack()",
		"message.retry(",
	],
	deliveryFile,
	"delivery queue must sign webhook payloads and handle per-message failures",
);

checkIncludesAll(
	envTs,
	[
		"extends Cloudflare.Env",
		"CINAAUTH_SECRET: string",
		"CINAAUTH_DELIVERY_QUEUE: Queue<DeliveryMessage>",
		"VERSION_METADATA: WorkerVersionMetadata",
		"CINAAUTH_MIGRATION_TOKEN?: string",
		"CINAAUTH_DELIVERY_WEBHOOK_URL?: string",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET?: string",
	],
	envFile,
	"binding types must stay aligned with Worker runtime inputs",
);

checkIncludesAll(
	workflow,
	[
		"pnpm run check",
		"pnpm run check:cloudflare",
		"pnpm run provision:secrets",
		"pnpm run build",
		"cloudflare/wrangler-action@v3",
		"deploy-delivery",
		"Deploy Delivery Worker",
		"demo/delivery-worker",
		"needs: deploy-delivery",
		"CLOUDFLARE_API_TOKEN",
		"CLOUDFLARE_ACCOUNT_ID",
		"CINAAUTH_SECRET",
		'test "${#CINAAUTH_SECRET}" -ge 32',
		"CINAAUTH_MIGRATION_TOKEN",
		'test "${#CINAAUTH_MIGRATION_TOKEN}" -ge 32',
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		'test "${#CINAAUTH_DELIVERY_WEBHOOK_SECRET}" -ge 32',
		"https://cinaauth-delivery.cinagroup.com/cinaauth/delivery",
		"https://cinaauth-delivery.cinagroup.com/ready",
		'-H "Authorization: Bearer $CINAAUTH_DELIVERY_WEBHOOK_SECRET"',
		"RESEND_API_KEY",
		"RESEND_EMAIL_FROM",
		"TWILIO_ACCOUNT_SID",
		"TWILIO_AUTH_TOKEN",
		"TWILIO_FROM_NUMBER",
		"https://auth.cinagroup.com/api/migrate",
		"wrangler d1 time-travel info cinaauth-db",
		"-X POST https://auth.cinagroup.com/api/migrate",
		"https://auth.cinagroup.com/api/ready",
		"needs: deploy-worker",
		"CINAAUTH_URL: https://auth.cinagroup.com",
		"NEXT_PUBLIC_CINAAUTH_API_URL: https://demo-auth.cinagroup.com",
		"CINAAUTH_DEMO_SECRET",
		'test "${#CINAAUTH_DEMO_SECRET}" -ge 32',
	],
	workflowFile,
	"CI must gate deploys, migrations, readiness, and demo smoke tests",
);

checkIncludesAll(
	remotePreflight,
	[
		"fileURLToPath(import.meta.url)",
		'join(workerDir, "wrangler.json")',
		"MAX_ATTEMPTS",
		"describeFetchError",
		"CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS",
		"CLOUDFLARE_TURNSTILE_SECRET_KEY",
		"GOOGLE_CLIENT_ID",
		"GENERIC_OAUTH_CONFIG",
		"STRIPE_SECRET_KEY",
		"STRIPE_WEBHOOK_SECRET",
		"CLOUDFLARE_API_TOKEN",
		"CF_API_TOKEN",
		"CLOUDFLARE_ACCOUNT_ID",
		"/d1/database",
		"/queues",
		"/workers/scripts/",
		"/zones?name=",
		"/workers/routes",
		"/api/ready",
		"Cache-Control: no-store",
		"CINAAUTH_SECRET",
		"CINAAUTH_MIGRATION_TOKEN",
		"CINAAUTH_DELIVERY_WEBHOOK_URL",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
	],
	remotePreflightFile,
	"Cloudflare remote preflight must verify deploy prerequisites without printing secret values",
);

checkIncludesAll(
	provisionSecrets,
	[
		"CINAAUTH_DELIVERY_WEBHOOK_URL",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		"CINAAUTH_SKIP_DELIVERY_READY_CHECK",
		"Authorization",
		"wrangler",
		"secret",
		"put",
		"stdio",
		"pipe",
		"Delivery Worker readiness must pass",
	],
	provisionSecretsFile,
	"secret provisioning must write through stdin and require delivery readiness before auth deploy",
);
check(
	!provisionSecrets.includes("process.argv.push") &&
		!provisionSecrets.includes("echo "),
	`${rel(provisionSecretsFile)} must not pass secret values through command-line arguments`,
);

checkIncludesAll(
	deploymentDoc,
	[
		"wrangler queues create cinaauth-delivery",
		"wrangler queues create cinaauth-delivery-dlq",
		"CINAAUTH_SECRET",
		"CINAAUTH_MIGRATION_TOKEN",
		"CINAAUTH_DELIVERY_WEBHOOK_URL",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		"pnpm --dir demo/cloudflare-worker run check:production",
		"pnpm --dir demo/cloudflare-worker run check:cloudflare",
		"pnpm --dir demo/cloudflare-worker run provision:secrets",
		"zone",
		"route",
		"CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS=1",
		"/api/migrate",
		"/api/ready",
		"wrangler d1 time-travel info cinaauth-db",
		"VERSION_METADATA",
		"X-CinaAuth-Delivery-Signature",
	],
	deploymentDocFile,
	"Worker deployment doc must cover production setup and verification",
);

checkIncludesAll(
	chineseDeploymentDoc,
	[
		"CINAAUTH_MIGRATION_TOKEN",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		"/api/migrate",
		"/api/ready",
		"pnpm --dir demo/cloudflare-worker run check:production",
		"zone/route",
		"CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS=1",
		"wrangler d1 time-travel info cinaauth-db",
		"VERSION_METADATA",
		"X-CinaAuth-Delivery-Signature",
		"demo-auth.cinagroup.com/api/auth/get-session",
	],
	chineseDeploymentDocFile,
	"Cloudflare deployment guide must document the same production gates",
);

checkIncludesAll(
	gitignore,
	[".dev.vars", ".dev.vars.*", "!.dev.vars.example", "cinaauth-db-*.sql"],
	gitignoreFile,
	"local Wrangler secrets must be ignored while the example stays tracked",
);
check(existsSync(devVarsExampleFile), ".dev.vars.example must exist");
checkIncludesAll(
	devVarsExample,
	[
		"CINAAUTH_SECRET=",
		"CINAAUTH_MIGRATION_TOKEN=",
		"CINAAUTH_DELIVERY_WEBHOOK_URL=",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET=",
	],
	devVarsExampleFile,
	"local development must document required runtime secrets",
);
check(
	!/cfut_[A-Za-z0-9_-]+/.test(devVarsExample),
	".dev.vars.example must not contain Cloudflare API tokens",
);

if (failures.length > 0) {
	console.error("Production config verification failed:");
	for (const failure of failures) {
		console.error(`- ${failure}`);
	}
	process.exit(1);
}

console.log(`Production config verification passed (${passed} checks).`);
