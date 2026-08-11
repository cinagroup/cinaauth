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
const authRoutingFile = join(workerDir, "src", "auth-routing.ts");
const captchaConfigFile = join(workerDir, "src", "captcha-config.ts");
const capabilitiesFile = join(workerDir, "src", "capabilities.ts");
const entitlementsFile = join(workerDir, "src", "entitlements.ts");
const entitlementEnforcementFile = join(
	workerDir,
	"src",
	"entitlement-enforcement.ts",
);
const entitlementRuntimeFile = join(workerDir, "src", "entitlement-runtime.ts");
const entitlementLockFile = join(workerDir, "src", "entitlement-lock.ts");
const superAdminGovernanceFile = join(
	workerDir,
	"src",
	"super-admin-governance.ts",
);
const superAdminDatabaseInvariantFile = join(
	workerDir,
	"src",
	"super-admin-database-invariant.ts",
);
const providerNamespaceInvariantFile = join(
	workerDir,
	"src",
	"provider-namespace-invariant.ts",
);
const databaseInvariantsFile = join(workerDir, "src", "database-invariants.ts");
const adminPluginFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"plugins",
	"admin",
	"admin.ts",
);
const adminSuperAdminGuardFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"plugins",
	"admin",
	"super-admin.ts",
);
const auditRetentionFile = join(workerDir, "src", "audit-retention.ts");
const oauthConfigFile = join(workerDir, "src", "oauth-config.ts");
const pluginsFile = join(workerDir, "src", "plugins.ts");
const coreRedirectUriFile = join(
	repoRoot,
	"packages",
	"core",
	"src",
	"utils",
	"redirect-uri.ts",
);
const oauthRegisterFile = join(
	repoRoot,
	"packages",
	"oauth-provider",
	"src",
	"register.ts",
);
const databaseFile = join(workerDir, "src", "database.ts");
const d1MigrationFile = join(workerDir, "src", "d1-migration.ts");
const scimOwnershipMigrationFile = join(
	workerDir,
	"src",
	"scim-ownership-migration.ts",
);
const rateLimitFile = join(workerDir, "src", "rate-limit.ts");
const rateLimitStorageFile = join(workerDir, "src", "rate-limit-storage.ts");
const deliveryFile = join(workerDir, "src", "delivery.ts");
const privacyExportFile = join(workerDir, "src", "privacy-export.ts");
const privacyDeletionRuntimeFile = join(
	workerDir,
	"src",
	"privacy-deletion.ts",
);
const envFile = join(workerDir, "src", "env.d.ts");
const remotePreflightFile = join(
	workerDir,
	"scripts",
	"check-cloudflare-remote.mjs",
);
const runtimeCapabilitiesCheckFile = join(
	workerDir,
	"scripts",
	"check-runtime-capabilities.mjs",
);
const configureHyperdriveFile = join(
	workerDir,
	"scripts",
	"configure-hyperdrive.mjs",
);
const configureTurnstileFile = join(
	workerDir,
	"scripts",
	"configure-turnstile.mjs",
);
const configureDeliveryQueuesFile = join(
	workerDir,
	"scripts",
	"configure-delivery-queues.mjs",
);
const configurePrivacyExportFile = join(
	workerDir,
	"scripts",
	"configure-privacy-export.mjs",
);
const checkPlanetScaleBackupsFile = join(
	workerDir,
	"scripts",
	"check-planetscale-backups.mjs",
);
const provisionSecretsFile = join(
	workerDir,
	"scripts",
	"provision-secrets.mjs",
);
const deliveryRemotePreflightFile = join(
	repoRoot,
	"workers",
	"delivery",
	"scripts",
	"check-cloudflare-remote.mjs",
);
const deliveryAcceptanceFile = join(
	repoRoot,
	"workers",
	"delivery",
	"scripts",
	"run-provider-acceptance.mjs",
);
const productionLifecycleAcceptanceFile = join(
	workerDir,
	"scripts",
	"run-production-lifecycle-acceptance.mjs",
);
const deliveryPackageFile = join(
	repoRoot,
	"workers",
	"delivery",
	"package.json",
);
const deliveryWranglerFile = join(
	repoRoot,
	"workers",
	"delivery",
	"wrangler.json",
);
const privacyErasureDir = join(repoRoot, "workers", "privacy-erasure");
const privacyErasureIndexFile = join(privacyErasureDir, "src", "index.ts");
const privacyErasureCoordinatorFile = join(
	privacyErasureDir,
	"src",
	"coordinator.ts",
);
const privacyErasureProtocolFile = join(
	privacyErasureDir,
	"src",
	"protocol.ts",
);
const privacyErasurePackageFile = join(privacyErasureDir, "package.json");
const privacyErasureWranglerFile = join(privacyErasureDir, "wrangler.json");
const privacyErasureProvisionFile = join(
	privacyErasureDir,
	"scripts",
	"provision-secrets.mjs",
);
const privacyErasureRemoteFile = join(
	privacyErasureDir,
	"scripts",
	"check-cloudflare-remote.mjs",
);
const privacyErasureDeploymentFile = join(privacyErasureDir, "DEPLOYMENT.md");
const workflowFile = join(
	repoRoot,
	".github",
	"workflows",
	"deploy-cloudflare.yml",
);
const accountWorkflowFile = join(
	repoRoot,
	".github",
	"workflows",
	"deploy-account-portal.yml",
);
const adminWorkflowFile = join(
	repoRoot,
	".github",
	"workflows",
	"deploy-admin-console.yml",
);
const nextDemoDir = join(repoRoot, "apps", "account-portal");
const accountPackageFile = join(nextDemoDir, "package.json");
const accountWranglerFile = join(nextDemoDir, "wrangler.toml");
const accountMiddlewareFile = join(nextDemoDir, "middleware.ts");
const legacyAdminPageFile = join(nextDemoDir, "app", "admin", "page.tsx");
const adminConsoleDir = join(repoRoot, "apps", "admin-console");
const adminPackageFile = join(adminConsoleDir, "package.json");
const adminWranglerFile = join(adminConsoleDir, "wrangler.jsonc");
const adminFetcherFile = join(
	adminConsoleDir,
	"src",
	"lib",
	"cinaauth",
	"fetcher.ts",
);
const adminOidcClientFile = join(
	adminConsoleDir,
	"src",
	"lib",
	"cinaauth",
	"oidc-client.ts",
);
const adminOidcCallbackFile = join(
	adminConsoleDir,
	"src",
	"app",
	"api",
	"auth",
	"oidc",
	"callback",
	"route.ts",
);
const adminOidcLoginFile = join(
	adminConsoleDir,
	"src",
	"app",
	"api",
	"auth",
	"oidc",
	"login",
	"route.ts",
);
const adminProvisionSecretsFile = join(
	adminConsoleDir,
	"scripts",
	"provision-secrets.mjs",
);
const authWebContractFile = join(
	repoRoot,
	"packages",
	"auth-web-contract",
	"src",
	"admin.ts",
);
const adminOidcContractFile = join(
	repoRoot,
	"packages",
	"auth-web-contract",
	"src",
	"admin-oidc.ts",
);
const authEntitlementContractFile = join(
	repoRoot,
	"packages",
	"auth-web-contract",
	"src",
	"entitlements.ts",
);
const stripeSchemaFile = join(
	repoRoot,
	"packages",
	"stripe",
	"src",
	"schema.ts",
);
const authCapabilitiesFile = join(nextDemoDir, "lib", "auth-capabilities.ts");
const authApiFile = join(nextDemoDir, "lib", "auth-api.ts");
const billingConsolePolicyFile = join(nextDemoDir, "lib", "billing-console.ts");
const accountDashboardPageFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"page.tsx",
);
const subscriptionCardFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"_components",
	"subscription-card.tsx",
);
const pricingPageFile = join(nextDemoDir, "app", "pricing", "page.tsx");
const pricingComponentFile = join(nextDemoDir, "components", "pricing.tsx");
const authProxyPackageFile = join(
	repoRoot,
	"packages",
	"auth-proxy",
	"src",
	"index.ts",
);
const authClientFile = join(nextDemoDir, "lib", "auth-client.ts");
const oauthProviderButtonsFile = join(
	nextDemoDir,
	"components",
	"oauth-provider-buttons.tsx",
);
const accountOAuthBuildCheckFile = join(
	nextDemoDir,
	"scripts",
	"check-oauth-build.mjs",
);
const globalCssFile = join(nextDemoDir, "app", "globals.css");
const authProxyRouteFile = join(
	nextDemoDir,
	"app",
	"api",
	"auth",
	"[...all]",
	"route.ts",
);
const turnstileComponentFile = join(
	nextDemoDir,
	"components",
	"turnstile-challenge.tsx",
);
const privacyCenterPageFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"privacy",
	"page.tsx",
);
const privacyCenterComponentFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"privacy",
	"privacy-center.tsx",
);
const privacyCenterPolicyFile = join(nextDemoDir, "lib", "privacy-center.ts");
const securityCenterPageFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"security",
	"page.tsx",
);
const securityCenterComponentFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"security",
	"security-center.tsx",
);
const securityCenterPolicyFile = join(nextDemoDir, "lib", "security-center.ts");
const organizationConsolePageFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"organization",
	"page.tsx",
);
const organizationConsoleComponentFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"organization",
	"organization-console.tsx",
);
const advancedOrganizationComponentFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"organization",
	"advanced-organization-card.tsx",
);
const advancedOrganizationPolicyFile = join(
	nextDemoDir,
	"lib",
	"advanced-organization-console.ts",
);
const advancedOrganizationMutationFile = join(
	nextDemoDir,
	"data",
	"organization",
	"advanced-organization-mutations.ts",
);
const organizationAuditComponentFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"organization",
	"organization-audit-card.tsx",
);
const organizationAuditDataFile = join(
	nextDemoDir,
	"data",
	"organization",
	"organization-audit.ts",
);
const organizationAuditExportPolicyFile = join(
	nextDemoDir,
	"lib",
	"organization-audit-export.ts",
);
const enterpriseConnectionsComponentFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"organization",
	"enterprise-connections-card.tsx",
);
const ssoProviderManagerFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"organization",
	"sso-provider-manager.tsx",
);
const ssoProviderConsolePolicyFile = join(
	nextDemoDir,
	"lib",
	"sso-provider-console.ts",
);
const organizationConsolePolicyFile = join(
	nextDemoDir,
	"lib",
	"organization-console.ts",
);
const developerConsolePageFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"developer",
	"page.tsx",
);
const developerConsoleComponentFile = join(
	nextDemoDir,
	"app",
	"dashboard",
	"developer",
	"developer-console.tsx",
);
const developerConsolePolicyFile = join(
	nextDemoDir,
	"lib",
	"developer-console.ts",
);
const organizationRoleMutationFile = join(
	nextDemoDir,
	"data",
	"organization",
	"member-role-update-mutation.ts",
);
const organizationLeaveMutationFile = join(
	nextDemoDir,
	"data",
	"organization",
	"organization-leave-mutation.ts",
);
const enterpriseConnectionsMutationFile = join(
	nextDemoDir,
	"data",
	"organization",
	"enterprise-connection-mutations.ts",
);
const accountVitestConfigFile = join(nextDemoDir, "vitest.config.mts");
const siweWalletFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"plugins",
	"siwe",
	"wallets.ts",
);
const siweProofFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"plugins",
	"siwe",
	"verify-proof.ts",
);
const privacyCenterPluginFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"plugins",
	"privacy-center",
	"index.ts",
);
const privacyCenterDeletionFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"plugins",
	"privacy-center",
	"deletion.ts",
);
const privacyCenterAsyncExportFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"plugins",
	"privacy-center",
	"async-export.ts",
);
const sessionRouteFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"api",
	"routes",
	"session.ts",
);
const auditCaptureFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"plugins",
	"audit-log",
	"capture.ts",
);
const auditRoutesFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"plugins",
	"audit-log",
	"routes.ts",
);
const auditPluginFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"plugins",
	"audit-log",
	"index.ts",
);
const customSessionFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"plugins",
	"custom-session",
	"index.ts",
);
const customSessionCookieHeadersFile = join(
	repoRoot,
	"packages",
	"cinaauth",
	"src",
	"plugins",
	"custom-session",
	"cookie-headers.ts",
);
const protectedFormFiles = [
	join(nextDemoDir, "components", "forms", "sign-in-form.tsx"),
	join(nextDemoDir, "components", "forms", "sign-up-form.tsx"),
	join(nextDemoDir, "components", "forms", "email-otp-form.tsx"),
	join(nextDemoDir, "components", "forms", "forgot-password-form.tsx"),
];
const deploymentDocFile = join(workerDir, "DEPLOYMENT.md");
const chineseDeploymentDocFile = join(
	repoRoot,
	"docs",
	"CLOUDFLARE_DEPLOYMENT.md",
);
const functionalDesignFile = join(
	repoRoot,
	"CINAAUTH_FUNCTIONAL_DESIGN.zh-CN.md",
);
const privacyCenterDocFile = join(
	repoRoot,
	"docs",
	"content",
	"docs",
	"plugins",
	"privacy-center.mdx",
);
const oauthProductionDocFile = join(
	repoRoot,
	"docs",
	"CINAAUTH_OAUTH_PRODUCTION.md",
);
const developerConsoleDocFile = join(
	repoRoot,
	"docs",
	"CINAAUTH_DEVELOPER_CONSOLE.md",
);
const gitignoreFile = join(repoRoot, ".gitignore");

const packageJson = readJson(packageFile);
const wrangler = readJson(wranglerFile);
const indexTs = read(indexFile);
const authTs = read(authFile);
const authRoutingTs = read(authRoutingFile);
const captchaConfigTs = read(captchaConfigFile);
const capabilitiesTs = read(capabilitiesFile);
const entitlementsTs = read(entitlementsFile);
const entitlementEnforcementTs = read(entitlementEnforcementFile);
const entitlementRuntimeTs = read(entitlementRuntimeFile);
const entitlementLockTs = read(entitlementLockFile);
const superAdminGovernanceTs = read(superAdminGovernanceFile);
const superAdminDatabaseInvariantTs = read(superAdminDatabaseInvariantFile);
const providerNamespaceInvariantTs = read(providerNamespaceInvariantFile);
const databaseInvariantsTs = read(databaseInvariantsFile);
const adminPluginTs = read(adminPluginFile);
const adminSuperAdminGuardTs = read(adminSuperAdminGuardFile);
const auditRetentionTs = read(auditRetentionFile);
const oauthConfigTs = read(oauthConfigFile);
const pluginsTs = read(pluginsFile);
const coreRedirectUriTs = read(coreRedirectUriFile);
const oauthRegisterTs = read(oauthRegisterFile);
const databaseTs = read(databaseFile);
const d1MigrationTs = read(d1MigrationFile);
const scimOwnershipMigrationTs = read(scimOwnershipMigrationFile);
const rateLimitTs = read(rateLimitFile);
const rateLimitStorageTs = read(rateLimitStorageFile);
const deliveryTs = read(deliveryFile);
const privacyExportTs = read(privacyExportFile);
const privacyDeletionRuntimeTs = read(privacyDeletionRuntimeFile);
const envTs = read(envFile);
const remotePreflight = read(remotePreflightFile);
const runtimeCapabilitiesCheck = read(runtimeCapabilitiesCheckFile);
const configureHyperdrive = read(configureHyperdriveFile);
const configureTurnstile = read(configureTurnstileFile);
const configureDeliveryQueues = read(configureDeliveryQueuesFile);
const configurePrivacyExport = read(configurePrivacyExportFile);
const checkPlanetScaleBackups = read(checkPlanetScaleBackupsFile);
const provisionSecrets = read(provisionSecretsFile);
const deliveryRemotePreflight = read(deliveryRemotePreflightFile);
const deliveryAcceptance = read(deliveryAcceptanceFile);
const productionLifecycleAcceptance = read(productionLifecycleAcceptanceFile);
const deliveryPackage = readJson(deliveryPackageFile);
const deliveryWrangler = readJson(deliveryWranglerFile);
const privacyErasureIndex = read(privacyErasureIndexFile);
const privacyErasureCoordinator = read(privacyErasureCoordinatorFile);
const privacyErasureProtocol = read(privacyErasureProtocolFile);
const privacyErasurePackage = readJson(privacyErasurePackageFile);
const privacyErasureWrangler = readJson(privacyErasureWranglerFile);
const privacyErasureProvision = read(privacyErasureProvisionFile);
const privacyErasureRemote = read(privacyErasureRemoteFile);
const privacyErasureDeployment = read(privacyErasureDeploymentFile);
const workflow = read(workflowFile);
const accountWorkflow = read(accountWorkflowFile);
const adminWorkflow = read(adminWorkflowFile);
const accountPackage = readJson(accountPackageFile);
const accountWrangler = read(accountWranglerFile);
const accountMiddleware = read(accountMiddlewareFile);
const legacyAdminPage = read(legacyAdminPageFile);
const adminPackage = readJson(adminPackageFile);
const adminWrangler = read(adminWranglerFile);
const adminFetcher = read(adminFetcherFile);
const adminOidcClient = read(adminOidcClientFile);
const adminOidcCallback = read(adminOidcCallbackFile);
const adminOidcLogin = read(adminOidcLoginFile);
const adminProvisionSecrets = read(adminProvisionSecretsFile);
const authWebContract = read(authWebContractFile);
const adminOidcContract = read(adminOidcContractFile);
const authEntitlementContractTs = read(authEntitlementContractFile);
const stripeSchemaTs = read(stripeSchemaFile);
const authCapabilitiesTs = read(authCapabilitiesFile);
const authApiTs = read(authApiFile);
const billingConsolePolicyTs = read(billingConsolePolicyFile);
const accountDashboardPageTs = read(accountDashboardPageFile);
const subscriptionCardTs = read(subscriptionCardFile);
const pricingPageTs = read(pricingPageFile);
const pricingComponentTs = read(pricingComponentFile);
const authProxyPackageTs = read(authProxyPackageFile);
const authClientTs = read(authClientFile);
const oauthProviderButtonsTs = read(oauthProviderButtonsFile);
const accountOAuthBuildCheck = read(accountOAuthBuildCheckFile);
const globalCss = read(globalCssFile);
const authProxyRouteTs = read(authProxyRouteFile);
const turnstileComponentTs = read(turnstileComponentFile);
const privacyCenterPageTs = read(privacyCenterPageFile);
const privacyCenterComponentTs = read(privacyCenterComponentFile);
const privacyCenterPolicyTs = read(privacyCenterPolicyFile);
const securityCenterPageTs = read(securityCenterPageFile);
const securityCenterComponentTs = read(securityCenterComponentFile);
const securityCenterPolicyTs = read(securityCenterPolicyFile);
const organizationConsolePageTs = read(organizationConsolePageFile);
const organizationConsoleComponentTs = read(organizationConsoleComponentFile);
const advancedOrganizationComponentTs = read(advancedOrganizationComponentFile);
const advancedOrganizationPolicyTs = read(advancedOrganizationPolicyFile);
const advancedOrganizationMutationTs = read(advancedOrganizationMutationFile);
const organizationAuditComponentTs = read(organizationAuditComponentFile);
const organizationAuditDataTs = read(organizationAuditDataFile);
const organizationAuditExportPolicyTs = read(organizationAuditExportPolicyFile);
const enterpriseConnectionsComponentTs = read(
	enterpriseConnectionsComponentFile,
);
const ssoProviderManagerTs = read(ssoProviderManagerFile);
const ssoProviderConsolePolicyTs = read(ssoProviderConsolePolicyFile);
const organizationConsolePolicyTs = read(organizationConsolePolicyFile);
const developerConsolePageTs = read(developerConsolePageFile);
const developerConsoleComponentTs = read(developerConsoleComponentFile);
const developerConsolePolicyTs = read(developerConsolePolicyFile);
const organizationRoleMutationTs = read(organizationRoleMutationFile);
const organizationLeaveMutationTs = read(organizationLeaveMutationFile);
const enterpriseConnectionsMutationTs = read(enterpriseConnectionsMutationFile);
const accountVitestConfigTs = read(accountVitestConfigFile);
const siweWalletTs = read(siweWalletFile);
const siweProofTs = read(siweProofFile);
const privacyCenterPluginTs = read(privacyCenterPluginFile);
const privacyCenterDeletionTs = read(privacyCenterDeletionFile);
const privacyCenterAsyncExportTs = read(privacyCenterAsyncExportFile);
const sessionRouteTs = read(sessionRouteFile);
const auditCaptureTs = read(auditCaptureFile);
const auditRoutesTs = read(auditRoutesFile);
const auditPluginTs = read(auditPluginFile);
const customSessionTs = read(customSessionFile);
const customSessionCookieHeadersTs = read(customSessionCookieHeadersFile);
const protectedForms = protectedFormFiles.map((file) => ({
	file,
	content: read(file),
}));
const deploymentDoc = read(deploymentDocFile);
const chineseDeploymentDoc = read(chineseDeploymentDocFile);
const functionalDesign = read(functionalDesignFile);
const privacyCenterDoc = read(privacyCenterDocFile);
const oauthProductionDoc = read(oauthProductionDocFile);
const developerConsoleDoc = read(developerConsoleDocFile);
const gitignore = read(gitignoreFile);
const devVarsExample = existsSync(devVarsExampleFile)
	? read(devVarsExampleFile)
	: "";

checkIncludesAll(
	captchaConfigTs,
	[
		'TURNSTILE_ACTION = "cinaauth"',
		'"/sign-up/email"',
		'"/sign-in/email"',
		'"/request-password-reset"',
		'"/email-otp/send-verification-otp"',
		'"/phone-number/send-otp"',
		'"/sign-in/magic-link"',
		"CLOUDFLARE_TURNSTILE_SITE_KEY",
		"CLOUDFLARE_TURNSTILE_SECRET_KEY",
	],
	captchaConfigFile,
	"Turnstile must fail closed unless the paired keys and protected auth paths are configured",
);
checkIncludesAll(
	capabilitiesTs,
	[
		"getTurnstileConfig",
		'"cloudflare-turnstile"',
		"protectedEndpoints",
		"DeliveryProviderCapabilities",
		"version: 4",
		"emailOtp: delivery.email",
		"phoneOtp: delivery.sms",
		"isBillingRuntimeReady(env)",
		'providers.push({ id: "google", type: "social" })',
		'providers.push({ id: "github", type: "social" })',
	],
	capabilitiesFile,
	"public capability discovery must expose only the client-safe Turnstile configuration",
);
checkIncludesAll(
	authEntitlementContractTs,
	[
		"ENTITLEMENT_FEATURES",
		"ENTITLEMENT_LIMITS",
		"EntitlementSnapshot",
		'"unmetered" | "subscription"',
		'"deployment-default" | "stripe-subscription"',
	],
	authEntitlementContractFile,
	"the shared web contract must expose a versioned, provider-independent entitlement snapshot",
);
checkIncludesAll(
	entitlementsTs,
	[
		"parseEntitlementConfig",
		"getBillingRuntimeConfiguration",
		"CINAAUTH_ENTITLEMENT_CONFIG",
		"createUnmeteredEntitlementSnapshot",
		"auditRetentionDays: 90",
		"selectEntitlementSubscription",
		"loadEntitlementSnapshot",
		"ENTITLEMENT_PLAN_UNMAPPED",
		"ENTITLEMENT_SUBSCRIPTION_AMBIGUOUS",
	],
	entitlementsFile,
	"billing must require a complete policy and fail closed on ambiguous or unmapped subscription state",
);
checkIncludesAll(
	indexTs,
	[
		'app.get("/api/auth/entitlements"',
		"disableCookieCache: true",
		'SELECT "role" FROM "member"',
		'SELECT "plan", "status", "periodEnd", "cancelAtPeriodEnd", "seats"',
		"ENTITLEMENT_STORAGE_UNAVAILABLE",
		"withNoStore(c.json(loaded.snapshot))",
	],
	indexFile,
	"the entitlement endpoint must authenticate, recheck tenant membership, read webhook state locally, fail closed, and disable caching",
);
checkIncludesAll(
	entitlementEnforcementTs,
	[
		"getEntitlementRequestPolicy",
		"evaluateEntitlementAccess",
		'"POST /api/auth/api-key/create"',
		'"POST /api/auth/oauth2/create-client"',
		'"POST /api/auth/organization/create-team"',
		'"POST /api/auth/organization/add-member"',
		'"POST /api/auth/organization/create-role"',
		'"POST /api/auth/sso/register"',
		'"POST /api/auth/scim/generate-token"',
		'"GET /api/auth/audit/organization"',
		"ENTITLEMENT_FEATURE_DISABLED",
		"ENTITLEMENT_LIMIT_REACHED",
		"ENTITLEMENT_USAGE_UNAVAILABLE",
	],
	entitlementEnforcementFile,
	"commercial management paths must have one fail-closed feature and limit policy",
);
checkIncludesAll(
	entitlementRuntimeTs,
	[
		"withRuntimeOrganizationMemberCapacity",
		'FROM "member" WHERE "organizationId" = $1',
		"ENTITLEMENT_LIMIT_REACHED",
		"getEntitlementCapacityLockKey",
	],
	entitlementRuntimeFile,
	"automatic organization provisioning must hold the shared lock through authoritative capacity checks and writes",
);
checkIncludesAll(
	entitlementLockTs,
	["getEntitlementCapacityLockKey", "pg_advisory_xact_lock"],
	entitlementLockFile,
	"all finite organization member mutations must derive the same PostgreSQL advisory-lock key",
);
checkIncludesAll(
	pluginsTs,
	[
		"withOrganizationMemberProvisioning",
		"withRuntimeOrganizationMemberCapacity",
	],
	pluginsFile,
	"SSO and SCIM automatic membership provisioning must use the atomic runtime capacity wrapper",
);
checkIncludesAll(
	indexTs,
	[
		"resolveEntitlementSubject",
		"hasOrganizationMembership",
		"getEntitlementUsage",
		"cinaauth.entitlement_enforcement.failed",
		"getEntitlementRequestPolicy",
		"evaluateEntitlementAccess",
	],
	indexFile,
	"the Auth Worker must resolve authoritative subjects and enforce policy before plugin writes",
);
checkIncludesAll(
	auditRetentionTs,
	[
		"DEFAULT_AUDIT_RETENTION_DAYS = 90",
		"getAuditRetentionPolicy",
		"policy.limits.auditRetentionDays",
	],
	auditRetentionFile,
	"audit data lifecycle must derive from the same policy as commercial access",
);
checkIncludesAll(
	indexTs,
	[
		"getAuditRetentionPolicy",
		'FROM "subscription"',
		"\"subscription\".\"status\" IN (\\'active\\', \\'trialing\\')",
		"retentionMode: retention.mode",
	],
	indexFile,
	"scheduled organization audit retention must follow active subscription policy and preserve ambiguous states",
);
checkIncludesAll(
	stripeSchemaTs,
	["referenceId:", "index: true"],
	stripeSchemaFile,
	"subscription entitlement and retention lookups must have a reference index",
);
checkIncludesAll(
	pluginsTs,
	[
		"getTurnstileConfig",
		"TURNSTILE_PROTECTED_ENDPOINTS",
		"expectedAction: TURNSTILE_ACTION",
		"allowedHostnames",
	],
	pluginsFile,
	"the server captcha plugin must validate action and hostname on every protected path",
);
checkIncludesAll(
	authTs,
	[
		"revokeSessionsOnPasswordReset: true",
		"SECURITY_FRESH_AGE_SECONDS = 15 * 60",
		"freshAge: SECURITY_FRESH_AGE_SECONDS",
		"deleteUser:",
		"enabled: true",
		"disableImplicitLinking: true",
		"requireLocalEmailVerified: true",
		"allowDifferentEmails: false",
		"allowUnlinkingAll: false",
	],
	authFile,
	"production account lifecycle actions must require recent authentication and explicit identity linking",
);
checkIncludesAll(
	pluginsTs,
	[
		'defaultPrefix: "cina_sk_"',
		"requireName: true",
		"startingCharactersConfig",
		"charactersLength: 12",
	],
	pluginsFile,
	"personal API keys must use a recognizable CinaAuth prefix and retain only a display-safe identifier",
);
checkIncludesAll(
	indexTs,
	[
		"FRESH_SESSION_MUTATION_PATHS",
		'"/api/auth/api-key/create"',
		'"/api/auth/api-key/update"',
		'"/api/auth/api-key/delete"',
		'"/api/auth/organization/create"',
		'"/api/auth/organization/invite-member"',
		'"/api/auth/organization/remove-member"',
		'"/api/auth/organization/update-member-role"',
		'"/api/auth/organization/leave"',
		'"/api/auth/sso/register"',
		'"/api/auth/sso/update-provider"',
		'"/api/auth/sso/delete-provider"',
		'"/api/auth/sso/request-domain-verification"',
		'"/api/auth/sso/verify-domain"',
		'"/api/auth/scim/generate-token"',
		'"/api/auth/scim/delete-provider-connection"',
		'"/api/auth/oauth2/create-client"',
		'"/api/auth/oauth2/update-client"',
		'"/api/auth/oauth2/client/rotate-secret"',
		'"/api/auth/oauth2/delete-client"',
		'"/api/auth/oauth2/delete-consent"',
		'"/api/auth/subscription/upgrade"',
		'"/api/auth/subscription/cancel"',
		'"/api/auth/subscription/restore"',
		'"/api/auth/subscription/billing-portal"',
		"disableCookieCache: true",
		"isFreshSecuritySession",
		"requiresFreshSessionForMutation",
		'app.use("/api/auth/*"',
		'code: "SESSION_NOT_FRESH"',
	],
	indexFile,
	"API key, organization, enterprise identity, OAuth client, and consent mutations must fail closed unless an authoritative recent session is present",
);
checkIncludesAll(
	superAdminGovernanceTs,
	[
		'"/api/auth/admin/set-role"',
		'"/api/auth/admin/update-user"',
		'"/api/auth/admin/remove-user"',
		'"/api/auth/delete-user"',
		'"/api/auth/delete-user/callback"',
		'"/api/auth/delete-anonymous-user"',
		'"/api/auth/scim/v2/Users/"',
		"pg_advisory_xact_lock",
		"SUPER_ADMIN_GOVERNANCE_QUEUE_LOCK_KEY",
		"assertDatabaseInvariantReady",
		"consumeSCIMRateLimit",
		"canonicalizeGovernancePath",
		"CF-Connecting-IP",
		'code: "ADMIN_GOVERNANCE_RATE_LIMITED"',
		'code: "YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN"',
		'code: "ADMIN_GOVERNANCE_UNAVAILABLE"',
	],
	superAdminGovernanceFile,
	"all super-admin removal and account-deletion sinks must use authenticated, rate-limited, invariant-checked deployment governance",
);
checkIncludesAll(
	superAdminDatabaseInvariantTs,
	[
		"SUPER_ADMIN_DATABASE_INVARIANT_LOCK_KEY",
		"LANGUAGE plpgsql VOLATILE",
		"BEFORE INSERT OR UPDATE OR DELETE",
		"pg_advisory_xact_lock",
		"TG_RELID::regclass",
		"FOR KEY SHARE",
		"YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN",
		"ANONYMOUS_USER_CANNOT_BE_SUPER_ADMIN",
		"ANONYMOUS_SUPER_ADMIN_MUST_BE_DEMOTED_BEFORE_DELETION",
		'admin_candidate."isAnonymous" IS NOT TRUE',
		'admin_candidate."isAnonymous" IS TRUE',
		"getSuperAdminDatabaseInvariantReadiness",
	],
	superAdminDatabaseInvariantFile,
	"the final super-admin invariant must execute inside the actual PostgreSQL user mutation and reject invalid current data",
);
check(
	superAdminGovernanceTs.includes(
		'"cinaauth:super-admin-governance:queue:v1"',
	) &&
		superAdminDatabaseInvariantTs.includes(
			'"cinaauth:super-admin-governance:invariant:v1"',
		),
	"the Worker queue and mutation-transaction super-admin invariant must use distinct advisory-lock keys",
);
checkIncludesAll(
	providerNamespaceInvariantTs,
	[
		"cinaauth_provider_namespace",
		"installProviderNamespaceInvariant",
		"getProviderNamespaceInvariantReadiness",
		"Provider namespace collision",
		'"account"',
		'"ssoProvider"',
		'"scimProvider"',
		"configuredProviderIds",
	],
	providerNamespaceInvariantFile,
	"provider ids must be claimed by a persistent transaction-local PostgreSQL invariant",
);
checkIncludesAll(
	databaseInvariantsTs,
	[
		"DATABASE_INVARIANT_IDS",
		"SUPER_ADMIN_DATABASE_INVARIANT_ID",
		"PROVIDER_NAMESPACE_INVARIANT_ID",
		"installDatabaseInvariants",
		"getDatabaseInvariantReadiness",
		"BEGIN",
		"ROLLBACK",
		"Database invariant verification failed",
	],
	databaseInvariantsFile,
	"database invariants must install transactionally and verify before commit",
);
checkIncludesAll(
	indexTs,
	[
		"handleSuperAdminGovernedRequest",
		"consumeSCIMRateLimit:",
		"query: { disableCookieCache: true }",
		"handle: () => c.var.auth.handler(c.req.raw)",
		'"cinaauth.super_admin_governance.failed"',
		"installDatabaseInvariants",
		"getDatabaseInvariantReadiness",
		"getConfiguredAccountProviderIds",
		"hasDatabaseInvariantTables",
		"requiredInvariants",
		"invariants.ok",
	],
	indexFile,
	"the production catch-all, migration, and readiness paths must preserve responses while enforcing database invariants",
);
checkIncludesAll(
	adminPluginTs,
	[
		"getAuthoritativeSessionFromCtx",
		'context.path === "/delete-user"',
		'context.path === "/delete-user/callback"',
		"delete:",
		"assertSuperAdminCanBeDeleted",
	],
	adminPluginFile,
	"the Admin plugin must guard self-service endpoints before destruction and retain a database deletion backstop",
);
checkIncludesAll(
	adminSuperAdminGuardTs,
	[
		'role?.split(",").includes(expected)',
		"internalAdapter.listUsers",
		"YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN",
	],
	adminSuperAdminGuardFile,
	"all Admin deletion guards must share the exact role-membership invariant",
);
checkIncludesAll(
	securityCenterPageTs,
	[
		"Promise.all",
		"listSessions",
		"listUserAccounts",
		"listPasskeys",
		"listApiKeys",
		"listWallets",
		"fetchAuthCapabilities",
		"dataUnavailable",
	],
	securityCenterPageFile,
	"the Security Center must fetch independent authoritative controls in parallel and fail closed per section",
);
checkIncludesAll(
	securityCenterComponentTs,
	[
		"isSessionRecent",
		"formatSecurityDate",
		"authClient.revokeOtherSessions",
		"authClient.passkey.addPasskey",
		"authClient.apiKey.create",
		"authClient.apiKey.update",
		"authClient.apiKey.delete",
		"Copy your API key now",
		"full secret is shown only once",
		"authClient.unlinkAccount",
		"authClient.oauth2.link",
		'authClient.$fetch("/siwe/list-wallets"',
		'authClient.$fetch("/siwe/link-wallet"',
		'"/siwe/set-primary-wallet"',
		'authClient.$fetch("/siwe/unlink-wallet"',
		"buildSiweMessage",
		"Connect wallet",
		"Make primary",
		"Disconnect wallet",
		"PRIVACY_DELETE_ACCOUNT_PATH",
		'method: "POST"',
		'credentials: "include"',
		"deleteConfirmation === user.email",
		"PRIVACY_DELETION_READINESS_PATH",
		"parsePrivacyDeletionReadiness",
		"getPrivacyDeletionReceipt",
		"getPrivacyDeletionReceiptFilename",
		"signed deletion receipt was downloaded",
		"PRIVACY_PROCESSOR_ERASURE_PENDING",
		"PRIVACY_PROCESSOR_ERASURE_FAILED",
		"External erasure confirmation required",
		"Recent authentication required",
	],
	securityCenterComponentFile,
	"the user-facing Security Center must protect session, authenticator, identity, and deletion actions with retention preflight and signed receipt delivery",
);
checkIncludesAll(
	securityCenterPolicyTs,
	[
		'timeZone: "UTC"',
		"formatSecurityDate",
		"formatApiKeyIdentifier",
		"isApiKeyExpired",
	],
	securityCenterPolicyFile,
	"security timestamps must be deterministic across SSR and browser hydration",
);
checkIncludesAll(
	organizationConsolePageTs,
	[
		"Promise.all",
		"listOrganizations",
		"getFullOrganization",
		"listOrganizationTeams",
		"listOrganizationRoles",
		"getEntitlements",
		"listOrganizationAudit",
		"listSSOProviders",
		"listSCIMProviderConnections",
		"canViewOrganizationAudit",
		"currentSessionCreatedAt",
		"auditUnavailable",
		"dataUnavailable",
		"advancedOrganizationDataUnavailable",
		"entitlementsUnavailable",
	],
	organizationConsolePageFile,
	"the Organization Console must load authoritative list and detail data in parallel and fail closed",
);
checkIncludesAll(
	organizationConsoleComponentTs,
	[
		"getOrganizationPermissions",
		"canManageOrganizationMember",
		"canLeaveOrganization",
		"isSessionRecent",
		"useMemberRemoveMutation",
		"useInvitationCancelMutation",
		"useOrganizationLeaveMutation",
		"InviteMemberForm",
		"CreateOrganizationForm",
		"getOrganizationInvitationUrl",
		"authClient.signOut",
		"Leave organization",
		"OrganizationAuditCard",
		"EnterpriseConnectionsCard",
		"AdvancedMemberRoleEditor",
		"AdvancedOrganizationCard",
		"Plan and entitlements",
		"initialEntitlements.features",
		"initialEntitlements.limits",
		"Protected operations remain fail-closed",
		"router.refresh",
	],
	organizationConsoleComponentFile,
	"the Organization Console must enforce role-aware and recent-session-protected member and invitation controls",
);
checkIncludesAll(
	advancedOrganizationComponentTs,
	[
		"listOrganizationTeamMembers",
		"AdvancedMemberRoleEditor",
		"getMemberRoleSelectionError",
		"targetIsFinalOwner",
		"ORGANIZATION_PERMISSION_STATEMENT",
		"getDynamicRoleDraftError",
		"recentAuthentication",
		"authoritativeOrganizationData",
		"dataUnavailable",
		"50 teams and 100 organization members per team",
		"Up to 25 organization-scoped role definitions",
	],
	advancedOrganizationComponentFile,
	"advanced organization UX must remain bounded, fresh-session protected, and fail closed on missing data",
);
checkIncludesAll(
	advancedOrganizationPolicyTs,
	[
		"ORGANIZATION_PERMISSION_STATEMENT",
		"ROLE_NAME_PATTERN",
		"RESERVED_ROLE_NAMES",
		"getTeamNameError",
		"toRolePermissionPayload",
		"getMemberRoleSelectionError",
		"Transfer ownership before removing the final owner role",
	],
	advancedOrganizationPolicyFile,
	"advanced organization policy must validate names, permissions, and final-owner safety independently",
);
checkIncludesAll(
	advancedOrganizationMutationTs,
	[
		'"/organization/create-team"',
		'"/organization/update-team"',
		'"/organization/remove-team"',
		'"/organization/list-team-members"',
		'"/organization/add-team-member"',
		'"/organization/remove-team-member"',
		'"/organization/create-role"',
		'"/organization/update-role"',
		'"/organization/delete-role"',
	],
	advancedOrganizationMutationFile,
	"team and dynamic-role product actions must use the authoritative organization endpoints",
);
checkIncludesAll(
	organizationAuditComponentTs,
	[
		"useOrganizationAuditPageQuery",
		"loadOrganizationAuditExport",
		"getOrganizationAuditDateRange",
		"Export JSON",
		"Export CSV",
		"Apply filters",
		"No cached events or exports are shown",
		"10,000 events and fail rather than truncate",
	],
	organizationAuditComponentFile,
	"organization audit UX must provide authoritative filtering, pagination, and bounded JSON/CSV export",
);
checkIncludesAll(
	organizationAuditDataTs,
	[
		'"/audit/organization"',
		"ORGANIZATION_AUDIT_EXPORT_LIMIT = 10_000",
		"ORGANIZATION_AUDIT_EXPORT_PAGE_SIZE = 100",
		"Audit events changed during export",
		"ids.has(record.id)",
		"params.organizationId",
		"useOrganizationAuditPageQuery",
	],
	organizationAuditDataFile,
	"organization audit data access must remain tenant-keyed, bounded, complete, and fail closed on pagination drift",
);
checkIncludesAll(
	organizationAuditExportPolicyTs,
	[
		"cinaauth.organization-audit",
		"version: 1",
		"CSV_COLUMNS",
		"escapeCSVCell",
		"getOrganizationAuditDateRange",
		"createOrganizationAuditExportFilename",
	],
	organizationAuditExportPolicyFile,
	"organization audit exports must be versioned, CSV-safe, date-bounded, and deterministically named",
);
checkIncludesAll(
	enterpriseConnectionsComponentTs,
	[
		"recentAuthentication",
		"Fresh sign-in required for changes",
		"No cached token connection data is shown",
		"SSOProviderManager",
		"useSCIMTokenGenerateMutation",
		"useSCIMProviderRevokeMutation",
		"Copy this SCIM token now",
		"CinaSeek stores only a hash",
		"router.refresh",
	],
	enterpriseConnectionsComponentFile,
	"enterprise connection management must fail closed, require recent authentication, and protect one-time SCIM secrets",
);
checkIncludesAll(
	ssoProviderManagerTs,
	[
		"recentAuthentication",
		"authoritativeOrganizationData",
		"unavailable",
		"useOIDCSSOProviderRegisterMutation",
		"useOIDCSSOProviderUpdateMutation",
		"useSAMLSSOProviderRegisterMutation",
		"useSAMLSSOProviderUpdateMutation",
		"useSSOProviderDeleteMutation",
		"useSSODomainVerificationRequestMutation",
		"useSSODomainVerificationMutation",
		"Sensitive values are sent",
		"Stored credentials are never loaded",
		"linked SSO account records",
		"router.refresh",
	],
	ssoProviderManagerFile,
	"SSO provider management must cover OIDC and SAML lifecycle, fail closed, and never reload stored credentials",
);
checkIncludesAll(
	ssoProviderConsolePolicyTs,
	[
		"MAX_SAML_METADATA_BYTES",
		"PROVIDER_ID_PATTERN",
		"Issuer must be an HTTPS URL",
		"replacement client ID and client secret",
		"OIDC scopes must include openid",
		"All configured OIDC endpoints must use HTTPS",
		"getOIDCCallbackURL",
		"getSAMLCallbackURL",
		"getSAMLMetadataURL",
	],
	ssoProviderConsolePolicyFile,
	"SSO provider validation and callback contracts must remain deterministic and independently testable",
);
checkIncludesAll(
	organizationConsolePolicyTs,
	[
		'timeZone: "UTC"',
		"parseOrganizationRoles",
		"getOrganizationPermissions",
		"canManageOrganizationMember",
		"canAssignOrganizationRole",
		"canLeaveOrganization",
		"getOrganizationInvitationUrl",
	],
	organizationConsolePolicyFile,
	"organization policy and invitation-link behavior must be deterministic and independently testable",
);
checkIncludesAll(
	organizationRoleMutationTs,
	[
		"authClient.organization.updateMemberRole",
		"organizationKeys.detail()",
		"Member role updated successfully",
	],
	organizationRoleMutationFile,
	"member role changes must use the typed organization API and refresh authoritative detail data",
);
checkIncludesAll(
	organizationLeaveMutationTs,
	[
		"authClient.organization.leave",
		"organizationKeys.all()",
		"You left the organization",
	],
	organizationLeaveMutationFile,
	"leaving an organization must use the typed API and invalidate all organization data",
);
checkIncludesAll(
	enterpriseConnectionsMutationTs,
	[
		'"/sso/register"',
		'"/sso/update-provider"',
		'"/sso/delete-provider"',
		'"/sso/request-domain-verification"',
		'"/sso/verify-domain"',
		'"/scim/generate-token"',
		'"/scim/delete-provider-connection"',
		"registerOIDCSSOProvider",
		"updateOIDCSSOProvider",
		"registerSAMLSSOProvider",
		"updateSAMLSSOProvider",
		"deleteSSOProvider",
		"organizationKeys.all()",
		"domainVerificationToken",
		"scimToken",
	],
	enterpriseConnectionsMutationFile,
	"enterprise connection mutations must use authoritative endpoints and refresh organization data",
);
checkIncludesAll(
	accountVitestConfigTs,
	['"data/**/*.test.ts"'],
	accountVitestConfigFile,
	"account-portal data-layer contract tests must remain in Vitest discovery",
);
checkIncludesAll(
	developerConsolePageTs,
	[
		"Promise.all",
		"listOAuthClients",
		"listOAuthConsents",
		'redirect("/sign-in?callbackURL=/dashboard/developer")',
		"dataUnavailable",
	],
	developerConsolePageFile,
	"the Developer Console must load owned clients and current-user consents in parallel and fail closed",
);
checkIncludesAll(
	developerConsoleComponentTs,
	[
		"isSessionRecent",
		'credentials: "include"',
		'cache: "no-store"',
		'"/api/auth/oauth2/create-client"',
		'"/api/auth/oauth2/update-client"',
		'"/api/auth/oauth2/client/rotate-secret"',
		'"/api/auth/oauth2/delete-client"',
		'"/api/auth/oauth2/delete-consent"',
		"Copy this client secret now",
		"shown only once",
		"secretAcknowledged",
		"https://auth.cinaseek.ai/api/auth/device/code",
		"https://auth.cinaseek.ai/api/auth/device/token",
	],
	developerConsoleComponentFile,
	"the Developer Console must keep mutations same-origin, gate writes on recent authentication, and protect one-time secrets",
);
checkIncludesAll(
	developerConsolePolicyTs,
	[
		"parseDeveloperRedirectUris",
		"validateDeveloperClientName",
		"BLOCKED_NATIVE_SCHEMES",
		"LOOPBACK_HOSTS",
		"url.username",
		"url.password",
		"url.hash",
		"canRotateDeveloperSecret",
	],
	developerConsolePolicyFile,
	"OAuth client redirect, naming, and secret-rotation policy must be deterministic and independently testable",
);
checkIncludesAll(
	coreRedirectUriTs,
	[
		"DANGEROUS_URL_SCHEMES",
		"u.username",
		"u.password",
		'val.includes("#")',
		"isLoopbackHost",
	],
	coreRedirectUriFile,
	"the shared server redirect-URI schema must reject dangerous schemes, credentials, fragments, and external HTTP callbacks",
);
checkIncludesAll(
	oauthRegisterTs,
	[
		"browserRedirects",
		'client.type === "web"',
		'client.type === "user-agent-based"',
		'protocol !== "https:"',
		'protocol !== "http:"',
		"A web client redirect URI must use HTTPS",
	],
	oauthRegisterFile,
	"the OAuth server must reserve custom-scheme callbacks for native public clients rather than trusting the console",
);
checkIncludesAll(
	pluginsTs,
	[
		"canManageOrganizationBilling",
		"authorizeReference: async",
		'model: "member"',
		'field: "organizationId"',
		'field: "userId"',
	],
	pluginsFile,
	"organization subscription references must be authorized against authoritative owner or administrator membership",
);
checkIncludesAll(
	pluginsTs,
	[
		"canUseDeveloperOAuthClients",
		"clientPrivileges:",
		"user?.emailVerified === true",
		"user.isAnonymous !== true",
		"validateClient: async (clientId, ctx)",
		'model: "oauthClient"',
		"client?.public === true",
		"client.disabled !== true",
	],
	pluginsFile,
	"the Worker must authorize developer-client ownership and restrict Device Flow to registered public clients",
);
checkIncludesAll(
	developerConsoleDoc,
	[
		"https://accounts.cinaseek.ai/dashboard/developer",
		"client_secret_basic",
		"public clients and must use PKCE",
		"created within the last 15 minutes",
		"Client secrets are returned only by creation and rotation",
		"Only registered, enabled, public clients are accepted",
		"Operational acceptance",
	],
	developerConsoleDocFile,
	"the Developer Console runbook must document client profiles, server authorization, one-time secrets, and production acceptance",
);
checkIncludesAll(
	siweWalletTs,
	[
		'"/siwe/list-wallets"',
		'"/siwe/link-wallet"',
		'"/siwe/set-primary-wallet"',
		'"/siwe/unlink-wallet"',
		"freshSessionMiddleware",
		"ctx.context.session.user.id",
		"ctx.context.adapter.transaction",
		"WALLET_ALREADY_LINKED",
		"FAILED_TO_UNLINK_LAST_ACCOUNT",
	],
	siweWalletFile,
	"self-service wallets must be current-user scoped, proof-bound, transactional, and preserve a login method",
);
checkIncludesAll(
	siweProofTs,
	[
		"consumeVerificationValue",
		"parseSiweMessage",
		"nonceMatches",
		"domainMatches",
		"addressMatches",
		"chainMatches",
		"options.verifyMessage",
	],
	siweProofFile,
	"wallet login and linking must share complete single-use ERC-4361 proof verification",
);
checkIncludesAll(
	privacyCenterPluginTs,
	[
		'"/privacy/export"',
		"freshSessionMiddleware",
		"getAuthTables",
		"getPrivacySubjectSelector",
		"sanitizePrivacyExportRecord",
		"PRIVACY_EXPORT_TOO_LARGE",
		"credentialSecretsExcluded: true",
		'"cache-control": "no-store"',
		'"x-content-type-options": "nosniff"',
		"cinaauth-personal-data-",
		"writePersonalDataExport",
		"maxRecordsPerModel === null",
	],
	privacyCenterPluginFile,
	"personal exports must be subject-scoped, complete within explicit limits, secret-free, and non-cacheable",
);
checkIncludesAll(
	privacyCenterAsyncExportTs,
	[
		'"/privacy/async-export"',
		'"/privacy/async-export/status"',
		'"/privacy/async-export/download"',
		"PrivacyAsyncExportProvider",
		"freshSessionMiddleware",
		'"cache-control": "no-store"',
		"deleteSubjectExports",
	],
	privacyCenterAsyncExportFile,
	"asynchronous privacy exports must remain recent-session protected, subject-scoped, non-cacheable, and deletable",
);
checkIncludesAll(
	privacyCenterDeletionTs,
	[
		'"/privacy/deletion-readiness"',
		'"/privacy/deletion-receipt/verify"',
		"resolveBlockingHolds",
		"PRIVACY_DELETION_BLOCKED",
		"pseudonymousId",
		'algorithm: "HMAC-SHA256"',
		"constantTimeEqual",
		"PrivacyDeletionProcessor",
		"PROCESSOR_OPERATION_DOMAIN",
		"PRIVACY_PROCESSOR_ERASURE_PENDING",
		"PRIVACY_PROCESSOR_ERASURE_FAILED",
		"evidenceDigest",
		"purgeNoLaterThan",
		'ctx.setHeader("cache-control", "no-store")',
	],
	privacyCenterDeletionFile,
	"account deletion must recheck holds and return a pseudonymous, tamper-evident, non-cacheable receipt contract",
);
checkIncludesAll(
	pluginsTs,
	[
		"import { privacyCenter }",
		"privacyCenter({",
		'policyVersion: "2026-08-10"',
		'code: "cloudflare-delivery-queues-1d"',
		"maximumRetentionDays: 1",
		'code: "security-audit-90d"',
		"maximumRetentionDays: 90",
		'code: "planetscale-postgres-backups-2d"',
		"maximumRetentionDays: 2",
		"createRequiredPrivacyDeletionProcessor",
	],
	pluginsFile,
	"the production Worker must enable the Privacy Center plugin with a versioned 90-day security-audit exception",
);
checkIncludesAll(
	privacyCenterPageTs,
	["auth.api.getSession", 'redirect("/sign-in")', "isSessionRecent"],
	privacyCenterPageFile,
	"the Privacy Center page must enforce server-side authentication and pass only recent-session state",
);
checkIncludesAll(
	privacyCenterComponentTs,
	[
		"PRIVACY_EXPORT_PATH",
		'credentials: "include"',
		'cache: "no-store"',
		"URL.createObjectURL",
		"URL.revokeObjectURL",
		"PRIVACY_ASYNC_EXPORT_PATH",
		"parsePrivacyAsyncExportStatus",
		"AbortController",
		"Credential secrets stay excluded",
		'Link href="/dashboard/security#delete-account"',
	],
	privacyCenterComponentFile,
	"the Privacy Center UI must download only on interaction without persisting export contents",
);
checkIncludesAll(
	privacyCenterPolicyTs,
	[
		'"/api/auth/privacy/export"',
		'"/api/auth/privacy/deletion-readiness"',
		'"/api/auth/delete-user"',
		"getPersonalDataExportFilename",
		"getPrivacyDeletionReceipt",
		"getPrivacyDeletionReceiptFilename",
		"PRIVACY_EXPORT_CATEGORIES",
		"/^cinaauth-personal-data-/i",
		"cinaseek-personal-data-",
		"cinaseek-deletion-receipt-",
	],
	privacyCenterPolicyFile,
	"privacy download policy must constrain export and signed deletion receipt parsing and filenames",
);
checkIncludesAll(
	privacyCenterDoc,
	[
		"privacyCenter",
		"maxRecordsPerModel",
		"PRIVACY_EXPORT_TOO_LARGE",
		"Cache-Control: no-store",
		"Credential exclusion",
		"Deletion readiness",
		"Signed deletion receipt",
		"PRIVACY_DELETION_BLOCKED",
		"HMAC-SHA256",
		"Required external processors",
		"PRIVACY_PROCESSOR_ERASURE_PENDING",
		"evidenceId",
		"purgeNoLaterThan",
		"check:planetscale-backups",
	],
	privacyCenterDocFile,
	"public Privacy Center documentation must describe export safeguards, holds, retention exceptions, and signed receipts",
);
checkIncludesAll(
	sessionRouteTs,
	[
		"freshSessionMiddleware",
		"getAuthoritativeSessionFromCtx(ctx)",
		"sessionAge < 0",
	],
	sessionRouteFile,
	"fresh-session authorization must bypass stateful cookie cache and reject future timestamps",
);
checkIncludesAll(
	authApiTs,
	[
		"createAuthProxyResponse",
		"resolveAuthClientBaseURL",
		"shouldSkipOAuthProxy",
		'"/api/auth/audit/organization"',
		'"/api/auth/sso/providers"',
		'"/api/auth/scim/list-provider-connections"',
		'proxied.headers.set("x-skip-oauth-proxy", "1")',
	],
	authApiFile,
	"the account portal must expose its same-origin Auth Worker facade and keep Generic OAuth state on that origin",
);
checkIncludesAll(
	oauthConfigTs,
	[
		"parseProductionGenericOAuthConfig",
		"genericOAuthRedirectURI",
		"https://accounts.cinaseek.ai",
		"/api/auth/oauth2/callback/",
		'url.protocol === "https:"',
		"PROVIDER_ID_PATTERN",
	],
	oauthConfigFile,
	"production Generic OAuth providers must use validated HTTPS endpoints and the account-origin callback",
);
checkIncludesAll(
	oauthProductionDoc,
	[
		"https://accounts.cinaseek.ai",
		"Authorized JavaScript origin",
		"https://accounts.cinaseek.ai/api/auth/oauth2/callback/<providerId>",
		"NEXT_PUBLIC_GOOGLE_CLIENT_ID",
		"GENERIC_OAUTH_CONFIG",
		"requireIssuerValidation",
		"Wrangler stdin",
		"真实供应商成功与失败路径端到端证据",
	],
	oauthProductionDocFile,
	"the OAuth runbook must pin production origins, callbacks, secret handling, and E2E acceptance",
);
checkIncludesAll(
	oauthProviderButtonsTs,
	[
		"isOneTapClientReady",
		"authClient.oneTap",
		"NEXT_PUBLIC_GOOGLE_CLIENT_ID",
		'type: "standard"',
		'context === "signup" ? "signup_with" : "continue_with"',
	],
	oauthProviderButtonsFile,
	"the account portal must render the official Google control only after server and client capability agreement",
);
checkIncludesAll(
	accountOAuthBuildCheck,
	[
		"https://auth.cinaseek.ai/api/auth/capabilities",
		"evaluateOneTapBuild",
		"the production Auth Worker advertises One Tap but the account build has no GOOGLE_CLIENT_ID",
	],
	accountOAuthBuildCheckFile,
	"the account deployment must fail when the live server enables One Tap without a matching client build input",
);
checkIncludesAll(
	authProxyPackageTs,
	[
		"response.headers.getSetCookie()",
		"splitSetCookieHeader",
		'headers.append("set-cookie", setCookie)',
	],
	authProxyPackageFile,
	"the shared auth proxy must preserve every upstream session cookie",
);
checkIncludesAll(
	authClientTs,
	[
		"resolveAuthClientBaseURL",
		'typeof window === "undefined" ? undefined : window.location.origin',
		"apiKeyClient()",
	],
	authClientFile,
	"browser auth calls must stay same-origin so the Demo receives its session cookies",
);
checkIncludesAll(
	globalCss,
	["--space-2xl: 40px", "--space-5xl: 96px"],
	globalCssFile,
	"design-system spacing tokens must not override Tailwind max-width utilities",
);
check(
	!globalCss.includes("--spacing-2xl") && !globalCss.includes("--spacing-5xl"),
	"apps/account-portal/app/globals.css must not shadow Tailwind max-width tokens with spacing values",
);
checkIncludesAll(
	authProxyRouteTs,
	["createAuthProxyResponse", "return createAuthProxyResponse(response)"],
	authProxyRouteFile,
	"every auth proxy method must use the multi-cookie-safe response builder",
);
checkIncludesAll(
	auditCaptureTs,
	[
		'"/delete-user"',
		'"/unlink-account"',
		'"/revoke-other-sessions"',
		'"/passkey/verify-registration"',
		'"/api-key/create"',
		'"/siwe/link-wallet"',
		'"/siwe/set-primary-wallet"',
		'"/siwe/unlink-wallet"',
		'"user.account_delete"',
		'"identity.unlink"',
		'"session.revoke_others"',
		'"passkey.create"',
		'"api_key.create"',
		'"api_key.update"',
		'"api_key.delete"',
		'"siwe.bind"',
		'"siwe.set_primary"',
		'"siwe.unbind"',
		'"/organization/create"',
		'"/organization/update-member-role"',
		'"/organization/leave"',
		'"/organization/create-team"',
		'"org.create"',
		'"org.member_role_update"',
		'"org.member_leave"',
		"resolveOrganizationAuditTarget",
	],
	auditCaptureFile,
	"self-service and organization high-risk mutations must emit stable audit actions with tenant targets",
);
checkIncludesAll(
	auditRoutesTs,
	[
		'"/audit/organization"',
		'field: "organizationId"',
		'where("targetType", "eq", "organization")',
		'where("targetId", "eq", ctx.query.organizationId)',
		"organizationAllowedRoles",
		"Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)",
	],
	auditRoutesFile,
	"organization audit reads must be role-gated, tenant-filtered, and bounded",
);
checkIncludesAll(
	auditPluginTs,
	["listOrganizationAudit", "organizationAllowedRoles", '"owner"', '"admin"'],
	auditPluginFile,
	"the audit plugin must default tenant audit access to organization owners and admins",
);
checkIncludesAll(
	customSessionTs,
	["getSetCookieHeaders", "getSetCookieHeaders(session.headers)"],
	customSessionFile,
	"custom sessions must read refreshed cookies through the runtime-safe adapter",
);
checkIncludesAll(
	customSessionCookieHeadersTs,
	["headers.getSetCookie", "splitSetCookieHeader"],
	customSessionCookieHeadersFile,
	"valid session reads must work in Cloudflare runtimes without Headers.getSetCookie",
);
checkIncludesAll(
	authCapabilitiesTs,
	[
		"cloudflare-turnstile",
		"getCaptchaRequestHeaders",
		'"x-captcha-response"',
		"protectedEndpoints",
	],
	authCapabilitiesFile,
	"the Demo must validate the public captcha payload and build the verification header",
);
checkIncludesAll(
	authApiTs,
	["getCapabilities", "AUTH_WEB_ENDPOINTS.capabilities"],
	authApiFile,
	"server-rendered capability reads must use the authoritative Auth Worker binding contract",
);
checkIncludesAll(
	billingConsolePolicyTs,
	["Billing unavailable", 'action !== "checkout" || billingEnabled'],
	billingConsolePolicyFile,
	"paid checkout must fail closed while billing is unavailable",
);
checkIncludesAll(
	accountDashboardPageTs,
	[
		"getCapabilities",
		"getEntitlements",
		"getBillingUiState",
		"billingEnabled={billing.billingEnabled}",
		"entitlements={entitlements}",
	],
	accountDashboardPageFile,
	"the account dashboard must gate subscription APIs on authoritative billing and entitlement state",
);
checkIncludesAll(
	subscriptionCardTs,
	[
		"useSubscriptionListQuery(billingEnabled)",
		"Current access mode: Unmetered.",
		"Entitlement status is temporarily unavailable.",
		"No checkout or subscription request will be sent",
	],
	subscriptionCardFile,
	"the subscription card must not query or offer mutations while billing is disabled",
);
checkIncludesAll(
	pricingPageTs,
	[
		'export const dynamic = "force-dynamic"',
		"getCapabilities",
		"billingEnabled={capabilities.billing === true}",
	],
	pricingPageFile,
	"the pricing page must dynamically load live billing capability through the Auth Worker contract",
);
checkIncludesAll(
	pricingComponentTs,
	[
		"getBillingActionState",
		"disabled={!actionState.enabled}",
		'plan.action === "checkout"',
		'"bg-ink text-white shadow-l4"',
		'plan.isPopular ? "text-white" : "text-ink"',
	],
	pricingComponentFile,
	"pricing checkout must remain disabled unless live billing capability is enabled and the featured plan must remain high contrast",
);
checkIncludesAll(
	turnstileComponentTs,
	[
		"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
		"useTurnstileChallenge",
		'"expired-callback"',
		'"timeout-callback"',
		"window.turnstile?.remove",
	],
	turnstileComponentFile,
	"the Demo must manage the complete explicit Turnstile widget lifecycle",
);
for (const { file, content } of protectedForms) {
	checkIncludesAll(
		content,
		["TurnstileChallenge", "captcha.headers", "captcha.reset()"],
		file,
		"protected auth forms must submit and then discard the single-use captcha token",
	);
}

check(
	packageJson.scripts?.["check:production"] ===
		"node ./scripts/verify-production-config.mjs",
	`${rel(packageFile)} must expose check:production`,
);
check(
	packageJson.scripts?.["build:dependencies"] ===
		'pnpm --filter "@cinaauth/auth-api-worker^..." run build',
	`${rel(packageFile)} must rebuild every runtime workspace dependency before Worker bundling`,
);
check(
	packageJson.scripts?.build?.startsWith(
		"pnpm run build:dependencies && wrangler deploy --dry-run",
	) === true,
	`${rel(packageFile)} build must prevent stale workspace dist artifacts from entering the Worker bundle`,
);
check(
	packageJson.scripts?.deploy ===
		"pnpm run build:dependencies && wrangler deploy",
	`${rel(packageFile)} deploy must rebuild workspace dependencies before publishing`,
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
	packageJson.scripts?.["check:planetscale-backups"] ===
		"node ./scripts/check-planetscale-backups.mjs",
	`${rel(packageFile)} must expose check:planetscale-backups`,
);
check(
	packageJson.scripts?.["configure:delivery-queues"] ===
		"node ./scripts/configure-delivery-queues.mjs",
	`${rel(packageFile)} must expose configure:delivery-queues`,
);
check(
	packageJson.scripts?.check?.includes("pnpm run test:delivery-queues"),
	`${rel(packageFile)} check script must run the delivery Queue safety tests`,
);
check(
	packageJson.scripts?.check?.includes("pnpm run test:runtime-capabilities"),
	`${rel(packageFile)} check script must run live optional-capability safety tests`,
);
check(
	packageJson.scripts?.check?.includes("pnpm run test:backup-audit"),
	`${rel(packageFile)} check script must run the PlanetScale backup audit tests`,
);
check(
	packageJson.scripts?.["acceptance:production-lifecycle"] ===
		"node ./scripts/run-production-lifecycle-acceptance.mjs",
	`${rel(packageFile)} must expose the opt-in production lifecycle acceptance script`,
);
check(
	packageJson.scripts?.["test:production-lifecycle-acceptance"] ===
		"node --test ./scripts/run-production-lifecycle-acceptance.test.mjs",
	`${rel(packageFile)} must expose production lifecycle acceptance safety tests`,
);
check(
	packageJson.scripts?.check?.includes(
		"pnpm run test:production-lifecycle-acceptance",
	),
	`${rel(packageFile)} check script must run production lifecycle acceptance safety tests`,
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
check(
	typeof packageJson.dependencies?.pg === "string",
	`${rel(packageFile)} must depend directly on pg for Hyperdrive PostgreSQL`,
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
check(
	wrangler.upload_source_maps === true,
	"wrangler.json must upload source maps",
);
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

const hyperdrive = wrangler.hyperdrive?.find(
	(binding) => binding.binding === "HYPERDRIVE",
);
check(Boolean(hyperdrive), "wrangler.json must bind Hyperdrive as HYPERDRIVE");
check(
	typeof hyperdrive?.id === "string" &&
		/^[0-9a-f]{32}$/i.test(hyperdrive.id) &&
		hyperdrive.id !== "00000000000000000000000000000000",
	"HYPERDRIVE binding must contain a concrete non-placeholder config ID",
);
const deliveryService = wrangler.services?.find(
	(binding) => binding.binding === "CINAAUTH_DELIVERY_SERVICE",
);
check(
	deliveryService?.service === "cinaauth-delivery",
	"wrangler.json must bind CINAAUTH_DELIVERY_SERVICE to cinaauth-delivery",
);
const rateLimiter = wrangler.durable_objects?.bindings?.find(
	(binding) => binding.name === "RATE_LIMITER",
);

const legacyD1 = wrangler.d1_databases?.find(
	(binding) => binding.binding === "LEGACY_D1",
);
check(
	legacyD1?.database_name === "cinaauth-db" &&
		legacyD1?.database_id === "b5063da6-673d-41e3-93c7-e63b089aaf28",
	"wrangler.json must retain cinaauth-db as the LEGACY_D1 rollback source",
);
check(
	rateLimiter?.class_name === "RateLimitDurableObject",
	"wrangler.json must bind RATE_LIMITER to RateLimitDurableObject",
);
check(
	wrangler.exports?.RateLimitDurableObject?.type === "durable-object" &&
		wrangler.exports?.RateLimitDurableObject?.storage === "sqlite",
	"RateLimitDurableObject must be declared with SQLite storage",
);

check(
	wrangler.vars?.CINAAUTH_URL === "https://auth.cinaseek.ai",
	"CINAAUTH_URL must point at https://auth.cinaseek.ai",
);
check(
	wrangler.vars?.CINAAUTH_CUTOVER_STATE === "live",
	"Tracked production config must use live cutover state; first cutover deploy overrides it to maintenance",
);
const forbiddenVars = [
	"CINAAUTH_SECRET",
	"CINAAUTH_MIGRATION_TOKEN",
	"CINAAUTH_DELIVERY_WEBHOOK_URL",
	"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
	"CINAAUTH_PRIVACY_EXPORT_KEY",
	"CINAAUTH_ERASURE_WEBHOOK_URL",
	"CINAAUTH_ERASURE_WEBHOOK_SECRET",
	"OAUTH_PAIRWISE_SECRET",
	"CLOUDFLARE_TURNSTILE_SECRET_KEY",
	"STRIPE_SECRET_KEY",
	"STRIPE_WEBHOOK_SECRET",
	"CINAAUTH_ENTITLEMENT_CONFIG",
	"CINAUTH_ADMIN_SERVICE_KEY",
	"CINAAUTH_D1_MIGRATION_TOKEN",
].filter((name) => Object.hasOwn(wrangler.vars ?? {}, name));
check(
	forbiddenVars.length === 0,
	`Secret-like values must not be stored in wrangler.json vars: ${forbiddenVars.join(", ")}`,
);

const producer = wrangler.queues?.producers?.find(
	(item) => item.binding === "CINAAUTH_DELIVERY_QUEUE",
);
check(
	Boolean(producer),
	"wrangler.json must bind CINAAUTH_DELIVERY_QUEUE producer",
);
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

const privacyProducer = wrangler.queues?.producers?.find(
	(item) => item.binding === "CINAAUTH_PRIVACY_EXPORT_QUEUE",
);
check(
	privacyProducer?.queue === "cinaauth-privacy-export",
	"CINAAUTH_PRIVACY_EXPORT_QUEUE must produce to cinaauth-privacy-export",
);
const privacyConsumer = wrangler.queues?.consumers?.find(
	(item) => item.queue === "cinaauth-privacy-export",
);
check(
	privacyConsumer?.dead_letter_queue === "cinaauth-privacy-export-dlq",
	"privacy export consumer must use cinaauth-privacy-export-dlq",
);
check(
	privacyConsumer?.max_batch_size > 0 && privacyConsumer.max_batch_size <= 2,
	"privacy export queue must keep batches at two jobs or fewer",
);
const privacyBucket = wrangler.r2_buckets?.find(
	(item) => item.binding === "CINAAUTH_PRIVACY_EXPORTS",
);
check(
	privacyBucket?.bucket_name === "cinaauth-privacy-exports",
	"wrangler.json must bind the private CinaAuth privacy export R2 bucket",
);

const route = wrangler.routes?.find(
	(item) => item.pattern === "auth.cinaseek.ai" && item.custom_domain === true,
);
check(
	Boolean(route),
	"wrangler.json must expose auth.cinaseek.ai as a Custom Domain",
);

checkIncludesAll(
	indexTs,
	[
		"missing_cinaauth_secret",
		"weak_cinaauth_secret",
		"missing_hyperdrive_binding",
		"missing_legacy_d1_binding",
		"missing_version_metadata",
		"missing_cinaauth_migration_token",
		"weak_cinaauth_migration_token",
		"missing_delivery_queue",
		"missing_delivery_service",
		"missing_delivery_webhook_url",
		"invalid_delivery_webhook_url",
		"missing_delivery_webhook_secret",
		"weak_delivery_webhook_secret",
		"invalid_cinaauth_cutover_state",
		"invalid_cinaauth_url",
	],
	indexFile,
	"runtime readiness must cover required production inputs",
);
checkIncludesAll(
	indexTs,
	[
		"withNoStore(",
		"await handleSuperAdminGovernedRequest({",
		"handle: () => c.var.auth.handler(c.req.raw)",
	],
	indexFile,
	"every catch-all auth response must pass through super-admin governance and disable intermediary caching",
);
check(
	(indexTs.match(/c\.var\.auth\.handler\(c\.req\.raw\)/g) ?? []).length === 1,
	`${rel(indexFile)} must delegate the raw catch-all request to auth.handler only through the governed handler callback`,
);
checkIncludesAll(
	indexTs,
	[
		'app.get("/api/ready"',
		'app.get("/api/migrate"',
		'app.post("/api/migrate"',
		'app.post("/api/migrate/scim-provider-ownership"',
		'app.get("/api/migrate/d1"',
		'app.post("/api/migrate/d1"',
		"getCutoverState",
		"Cache-Control",
		"no-store",
		"secureEqual",
		"REQUIRED_DATABASE_TABLES",
		'"durable-object"',
		"getVersionMetadata",
		"version: getVersionMetadata",
		"export const getRuntimeConfigIssues",
		"export const isAuthorizedMigrationRequest",
		"export const getMigrationFeatureSelection",
		'feature === "organization-advanced"',
		"invalid_migration_feature",
	],
	indexFile,
	"protected operations and no-store responses must stay wired",
);
checkIncludesAll(
	scimOwnershipMigrationTs,
	[
		"BEGIN ISOLATION LEVEL SERIALIZABLE",
		"SET LOCAL statement_timeout",
		"provider_has_accounts",
		"provider_already_owned",
		"provider_id_collision",
		"owner_not_authorized",
		"RESERVED_ACCOUNT_PROVIDER_IDS",
		'"credential"',
		'"email-otp"',
		'FROM "ssoProvider"',
		"reservedProviderIds",
		'\"organizationId\" IS NULL',
		'\"userId\" IS NULL',
		'INSERT INTO \"auditLog\"',
		"createSCIMOwnershipToken",
		"storedToken",
	],
	scimOwnershipMigrationFile,
	"legacy SCIM ownership claims must stay namespace-safe, explicit, zero-account, non-rebinding, token-rotating, and audited",
);
checkIncludesAll(
	indexTs,
	[
		"getProductionSocialProviders",
		"getConfiguredAccountProviderIds",
		"parseProductionGenericOAuthConfig",
		"reservedProviderIds",
		'case "provider_id_collision"',
		'if (result.status !== "provider_id_collision")',
	],
	indexFile,
	"the SCIM ownership migration route must reject configured account-provider collisions before mutation or audit",
);
check(
	!indexTs.includes("CINAUTH_ADMIN_SERVICE_KEY"),
	"Migration/readiness authorization must not fall back to CINAUTH_ADMIN_SERVICE_KEY",
);

checkIncludesAll(
	pluginsTs,
	[
		"advancedOrganization?: boolean",
		"organizationAccessControl",
		"organizationRoles",
		"maximumRolesPerOrganization: (organizationId) =>",
		"maximumMembersPerTeam: ({ organizationId }) =>",
		"maximumTeams: ({ organizationId }) =>",
		'keyPairConfig: { alg: "ES256" }',
		"JWT_ROTATION_INTERVAL_SECONDS",
		"JWT_GRACE_PERIOD_SECONDS",
	],
	pluginsFile,
	"advanced organization schema must remain an explicit plugin mode",
);

checkIncludesAll(
	authTs,
	[
		"createDurableObjectRateLimitStorage",
		"LOGIN_RATE_LIMIT_RULES",
		"createDatabase(env)",
		"createAuthPlugins(env, { advancedOrganization: true })",
		"waitUntil(",
		"runWithExecutionCtx",
		"cf-connecting-ip",
		"getConfiguredSocialProviders(env)",
	],
	authFile,
	"auth runtime must keep rate limits shared and background work safe",
);

checkIncludesAll(
	authRoutingTs,
	[
		'"/.well-known/openid-configuration"',
		'"/.well-known/oauth-authorization-server"',
		"/api/auth${OPENID_CONFIGURATION_PATH}",
		"createCanonicalDiscoveryRequest",
	],
	authRoutingFile,
	"issuer-root discovery and API compatibility aliases must reach the Auth handler",
);
checkIncludesAll(
	indexTs,
	[
		"isAuthHandlerRequestPath(pathname)",
		"AUTH_DISCOVERY_PATHS",
		"createCanonicalDiscoveryRequest(c.req.raw)",
	],
	indexFile,
	"the Worker must expose OIDC discovery outside the /api/auth catch-all",
);

checkIncludesAll(
	authClientTs,
	["dynamicAccessControl: { enabled: true }", "teams: { enabled: true }"],
	authClientFile,
	"account client must expose the same advanced organization contract as Auth",
);

checkIncludesAll(
	databaseTs,
	["new Pool", "env.HYPERDRIVE.connectionString", "max: 5"],
	databaseFile,
	"PostgreSQL must connect through the Hyperdrive binding",
);
checkIncludesAll(
	d1MigrationTs,
	[
		"LEGACY_D1_TABLES",
		"BEGIN",
		"ROLLBACK",
		"ON CONFLICT",
		"information_schema.columns",
		"sourceRows",
		"targetRows",
		"cinaauth_cutover_history",
	],
	d1MigrationFile,
	"D1 cutover must be schema-checked, transactional, idempotent, and count-verified",
);
checkIncludesAll(
	rateLimitTs,
	[
		"extends DurableObject<CloudflareBindings>",
		"rate_limit_buckets",
		"async consume(",
		"CREATE INDEX",
	],
	rateLimitFile,
	"Durable Object rate limiting must be atomic and bounded",
);
checkIncludesAll(
	rateLimitStorageTs,
	[
		'"/sign-in/*": { window: 60, max: 5 }',
		"crypto.subtle.digest",
		"getByName",
		"consume:",
	],
	rateLimitStorageFile,
	"CinaAuth login endpoints must use deterministically sharded DO storage",
);

checkIncludesAll(
	deliveryTs,
	[
		"export const deliverToWebhook",
		"export const enqueueDelivery",
		"export const getDeliveryProviderCapabilities",
		"export const getRequiredDeliveryProvider",
		"export const handleDeliveryBatch",
		"CINAAUTH_DELIVERY_SERVICE.fetch",
		'"cinaauth.delivery.provider_not_ready"',
		"AbortSignal.timeout(3_000)",
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
	indexTs,
	[
		"getRequiredDeliveryProvider(pathname)",
		'code: "DELIVERY_PROVIDER_UNAVAILABLE"',
		"delivery[requiredDeliveryProvider]",
	],
	indexFile,
	"delivery-producing Auth endpoints must fail closed before entering the auth handler",
);

checkIncludesAll(
	privacyExportTs,
	[
		"createR2PrivacyExportProvider",
		"writePersonalDataExport",
		"TransformStream<Uint8Array",
		"ssecKey:",
		"customerKey",
		"handlePrivacyExportBatch",
		"sweepExpiredPrivacyExports",
		"message.ack()",
		"message.retry(",
		"cinaseek-personal-data-",
	],
	privacyExportFile,
	"privacy export generation must stream through Queue into per-object SSE-C encrypted R2 objects with retry and retention handling",
);

checkIncludesAll(
	privacyDeletionRuntimeTs,
	[
		"createWebhookPrivacyDeletionProcessor",
		"createRequiredPrivacyDeletionProcessor",
		"hasPrivacyDeletionProcessorRuntime",
		'protocol === "https:"',
		"crypto.subtle.sign",
		"`v1=${await signBody(body, secret)}`",
		'"X-CinaAuth-Operation-Id"',
		'"X-CinaAuth-Signature"',
		'status: "pending"',
		"retryAfterSeconds",
		"invalid erasure evidence",
	],
	privacyDeletionRuntimeFile,
	"external processor erasure calls must be HTTPS, HMAC-signed, idempotent, retryable, and fail closed on invalid evidence",
);

checkIncludesAll(
	pluginsTs,
	[
		"createRequiredPrivacyDeletionProcessor",
		"processors: [createRequiredPrivacyDeletionProcessor(env)]",
	],
	pluginsFile,
	"production account deletion must retain a fail-closed processor even when its runtime is incomplete",
);

check(
	privacyErasurePackage.name === "@cinaauth/privacy-erasure-worker" &&
		privacyErasurePackage.scripts?.["provision:secrets"] ===
			"node ./scripts/provision-secrets.mjs" &&
		privacyErasurePackage.scripts?.["check:cloudflare"] ===
			"node ./scripts/check-cloudflare-remote.mjs",
	"Privacy Erasure Worker must expose independent validation, provisioning, and deployment scripts",
);
check(
	privacyErasureWrangler.name === "cinaauth-privacy-erasure" &&
		privacyErasureWrangler.routes?.some(
			(route) =>
				route.pattern === "cinaauth-erasure.cinagroup.com" &&
				route.custom_domain === true,
		) &&
		privacyErasureWrangler.durable_objects?.bindings?.some(
			(binding) =>
				binding.name === "ERASURE_COORDINATOR" &&
				binding.class_name === "ErasureCoordinator",
		) &&
		privacyErasureWrangler.migrations?.some(
			(migration) =>
				migration.tag === "v1" &&
				migration.new_sqlite_classes?.includes("ErasureCoordinator"),
		),
	"Privacy Erasure Worker must use its Custom Domain and a migrated SQLite Durable Object",
);
checkIncludesAll(
	privacyErasureIndex,
	[
		'const ERASE_PATH = "/cinaauth/privacy/erase"',
		"readAuthenticatedOperation",
		"ERASURE_COORDINATOR.getByName",
		'"Cache-Control": "no-store"',
		'"ERASURE_RUNTIME_NOT_READY"',
		'"ERASURE_TARGET_UNAVAILABLE"',
	],
	privacyErasureIndexFile,
	"erasure ingress must remain authenticated, non-cacheable, per-operation coordinated, and fail closed",
);
checkIncludesAll(
	privacyErasureCoordinator,
	[
		"extends DurableObject<PrivacyErasureEnv>",
		"erasure_operations",
		"erasure_targets",
		"subject_digest",
		"evidence_digest",
		"lease_token",
		"Promise.allSettled",
		'status !== "pending"',
	],
	privacyErasureCoordinatorFile,
	"erasure coordination must persist non-PII evidence and skip completed targets under a lease",
);
checkIncludesAll(
	privacyErasureProtocol,
	[
		"MAX_BODY_BYTES",
		"verifyBodySignature",
		"timingSafeEqual",
		'url.protocol !== "https:"',
		"AbortSignal.timeout",
		"targets_empty",
	],
	privacyErasureProtocolFile,
	"erasure protocol parsing must bound bodies, verify HMACs, require HTTPS targets, and reject empty target sets",
);
checkIncludesAll(
	privacyErasureProvision,
	[
		"CINAAUTH_ERASURE_STORAGE_SECRET",
		"CINAAUTH_ERASURE_TARGETS",
		"--allow-empty-targets",
		'fileURLToPath(import.meta.resolve("wrangler"))',
		"process.execPath",
		"input: `${process.env[name]}\\n`",
		'stdio: ["pipe", "inherit", "inherit"]',
	],
	privacyErasureProvisionFile,
	"erasure secrets must be validated and provisioned through stdin with an explicit bootstrap escape hatch",
);
checkIncludesAll(
	privacyErasureRemote,
	[
		"/workers/scripts/${config.name}/settings",
		'item.name === "ERASURE_COORDINATOR"',
		"/workers/durable_objects/namespaces/${binding.namespace_id}",
		"durableNamespace.use_sqlite !== true",
		"/workers/scripts/${config.name}/deployments",
		'version.resources?.script_runtime?.migration_tag !== "v1"',
		"body.runtimeConfig?.ok !== false",
		"must not expose target URLs or secret fields",
	],
	privacyErasureRemoteFile,
	"remote erasure acceptance must verify the SQLite DO, fail-closed bootstrap, and redacted readiness",
);
checkIncludesAll(
	privacyErasureDeployment,
	[
		"Raw user IDs, email addresses",
		"CINAAUTH_ERASURE_STORAGE_SECRET",
		"CINAAUTH_ERASURE_TARGETS=[]",
		"X-CinaAuth-Target-Id",
		"policyVersion",
	],
	privacyErasureDeploymentFile,
	"erasure deployment docs must define persistence, bootstrap, target, and policy-version contracts",
);

checkIncludesAll(
	configureDeliveryQueues,
	[
		"cinaauth-delivery",
		"cinaauth-delivery-dlq",
		"--message-retention-period-secs",
		"DELIVERY_QUEUE_RETENTION_SECONDS",
		"backlog_count",
		"Refusing to reduce Queue",
	],
	configureDeliveryQueuesFile,
	"delivery resources must be provisioned repeatably with bounded Queue and DLQ retention",
);

checkIncludesAll(
	configurePrivacyExport,
	[
		"cinaauth-privacy-exports",
		"cinaauth-privacy-export-dlq",
		"--message-retention-period-secs",
		"86400",
		"--expire-days",
		"privacy-exports/",
	],
	configurePrivacyExportFile,
	"privacy export resources must be provisioned repeatably with bounded Queue and R2 retention",
);

checkIncludesAll(
	checkPlanetScaleBackups,
	[
		"PLANETSCALE_SERVICE_TOKEN_ID",
		"PLANETSCALE_SERVICE_TOKEN",
		"read_backups",
		"backup-policies",
		'query: { all: true, state: "success" }',
		"protected from deletion",
		"purgeNoLaterThan",
		"deleted_at",
		"physical-media sanitization certificate",
	],
	checkPlanetScaleBackupsFile,
	"PlanetScale backup evidence must be read-only, receipt-aware, and explicit about its assurance boundary",
);

checkIncludesAll(
	envTs,
	[
		"extends Cloudflare.Env",
		"CINAAUTH_SECRET: string",
		"CINAAUTH_DELIVERY_QUEUE: Queue<DeliveryMessage>",
		"VERSION_METADATA: WorkerVersionMetadata",
		"CINAAUTH_MIGRATION_TOKEN?: string",
		"CINAAUTH_D1_MIGRATION_TOKEN?: string",
		"CINAAUTH_CUTOVER_STATE?",
		"LEGACY_D1: D1Database",
		"CINAAUTH_DELIVERY_WEBHOOK_URL?: string",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET?: string",
		"CINAAUTH_PRIVACY_EXPORT_QUEUE: Queue<PrivacyExportMessage>",
		"CINAAUTH_PRIVACY_EXPORTS: R2Bucket",
		"CINAAUTH_PRIVACY_EXPORT_KEY?: string",
		"CINAAUTH_ERASURE_WEBHOOK_URL?: string",
		"CINAAUTH_ERASURE_WEBHOOK_SECRET?: string",
		"CINAAUTH_ENTITLEMENT_CONFIG?: string",
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
		"workers/delivery",
		"deploy-privacy-erasure",
		"Deploy Privacy Erasure Worker",
		"workers/privacy-erasure",
		"needs: [deploy-delivery, deploy-privacy-erasure]",
		"CLOUDFLARE_API_TOKEN",
		"CLOUDFLARE_ACCOUNT_ID",
		"CINAAUTH_HYPERDRIVE_ID",
		"pnpm run configure:hyperdrive",
		"pnpm run configure:delivery-queues",
		"pnpm run configure:privacy-export",
		"CINAAUTH_SECRET",
		'test "${#CINAAUTH_SECRET}" -ge 32',
		"CINAAUTH_MIGRATION_TOKEN",
		'test "${#CINAAUTH_MIGRATION_TOKEN}" -ge 32',
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		'test "${#CINAAUTH_DELIVERY_WEBHOOK_SECRET}" -ge 32',
		"CINAAUTH_PRIVACY_EXPORT_KEY",
		'test "${#CINAAUTH_PRIVACY_EXPORT_KEY}" -ge 32',
		"CINAAUTH_ERASURE_WEBHOOK_URL",
		"CINAAUTH_ERASURE_WEBHOOK_SECRET",
		"CINAADMIN_OIDC_CLIENT_SECRET",
		"CINAADMIN_OIDC_BRIDGE_SECRET",
		"CINAAUTH_ERASURE_STORAGE_SECRET",
		"CINAAUTH_ERASURE_TARGETS",
		"CINAAUTH_ENTITLEMENT_CONFIG",
		"https://cinaauth-erasure.cinagroup.com/cinaauth/privacy/erase",
		"https://cinaauth-erasure.cinagroup.com/ready",
		"https://cinaauth-delivery.cinagroup.com/cinaauth/delivery",
		"https://cinaauth-delivery.cinagroup.com/ready",
		'-H "Authorization: Bearer $CINAAUTH_DELIVERY_WEBHOOK_SECRET"',
		"RESEND_API_KEY",
		"RESEND_EMAIL_FROM",
		"TWILIO_ACCOUNT_SID",
		"TWILIO_AUTH_TOKEN",
		"TWILIO_FROM_NUMBER",
		"https://auth.cinaseek.ai/api/migrate",
		"-X POST https://auth.cinaseek.ai/api/migrate",
		"https://auth.cinaseek.ai/api/ready",
	],
	workflowFile,
	"backend CI must gate delivery, Auth Worker migrations, and readiness",
);
checkIncludesAll(
	accountWorkflow,
	[
		"apps/account-portal",
		"accounts.cinaseek.ai",
		"NEXT_PUBLIC_CINAAUTH_API_URL: https://accounts.cinaseek.ai",
		"NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}",
		"pnpm run test:oauth-build",
		"pnpm run check:oauth-build",
		"CINAAUTH_DEMO_SECRET",
		'test "${#CINAAUTH_ACCOUNT_SECRET}" -ge 32',
		"CINAAUTH_MIGRATION_TOKEN",
		'test "${#CINAAUTH_MIGRATION_TOKEN}" -ge 32',
		"Wait for governed Auth readiness",
		"super-admin-governance-v1",
		"provider-namespace-registry-v1",
		"ready.database?.invariants?.ok",
		"pnpm run typecheck",
		"pnpm run build:cf",
		"cloudflare/wrangler-action@v3",
		"pnpm exec wrangler secret put CINAAUTH_SECRET",
		"demo-auth.cinagroup.com",
	],
	accountWorkflowFile,
	"account portal CI must deploy independently with redirect smoke coverage",
);
check(
	accountPackage.name === "@cinaauth/account-portal" &&
		adminPackage.name === "@cinaauth/admin-console",
	"frontend workspace package names must reflect the account/admin deployment split",
);
checkIncludesAll(
	accountWrangler,
	[
		'pattern = "accounts.cinaseek.ai"',
		'pattern = "demo-auth.cinagroup.com"',
		'binding = "AUTH_WORKER"',
		'service = "cinaauth-api"',
		'NEXT_PUBLIC_CINAAUTH_API_URL = "https://accounts.cinaseek.ai"',
	],
	accountWranglerFile,
	"account portal must keep Service Binding and the legacy redirect host",
);
checkIncludesAll(
	accountMiddleware,
	[
		"demo-auth.cinagroup.com",
		"accounts.cinaseek.ai",
		"NextResponse.redirect(accountURL, 308)",
		'"callbackURL"',
		"request.nextUrl.pathname",
		"request.nextUrl.search",
	],
	accountMiddlewareFile,
	"legacy traffic must permanently redirect and protected account routes must preserve a same-origin post-login callback",
);
checkIncludesAll(
	legacyAdminPage,
	["permanentRedirect", "https://admin.cinaseek.ai"],
	legacyAdminPageFile,
	"the account portal must not retain a second admin console",
);
checkIncludesAll(
	adminWrangler,
	[
		'"pattern": "admin.cinaseek.ai"',
		'"binding": "AUTH_WORKER"',
		'"service": "cinaauth-api"',
		'"CINAUTH_AUTH_URL": "https://accounts.cinaseek.ai"',
	],
	adminWranglerFile,
	"admin console must call the authoritative Auth Worker through Service Binding",
);
checkIncludesAll(
	adminFetcher,
	["getCloudflareContext", "AUTH_WORKER", "fetchAuthRequest"],
	adminFetcherFile,
	"admin server reads and mutations must resolve the Service Binding",
);
checkIncludesAll(
	adminOidcContract,
	[
		'ADMIN_OIDC_CLIENT_ID = "cinaseek-admin-console"',
		"ADMIN_OIDC_REDIRECT_URI",
		"ADMIN_OIDC_RESOURCE",
	],
	adminOidcContractFile,
	"Admin OIDC identifiers and exact redirect URI must be shared",
);
checkIncludesAll(
	adminOidcClient,
	[
		"ClientSecretBasic",
		"calculatePKCECodeChallenge",
		"validateApplicationLevelSignature",
		"processUserInfoResponse",
		"resource: ADMIN_OIDC_RESOURCE",
	],
	adminOidcClientFile,
	"Admin must implement confidential Authorization Code, PKCE, and OIDC validation",
);
checkIncludesAll(
	adminOidcLogin,
	[
		"generateRandomState",
		"generateRandomNonce",
		"generateRandomCodeVerifier",
		"httpOnly: true",
		'sameSite: "lax"',
	],
	adminOidcLoginFile,
	"Admin OIDC start route must bind PKCE and nonce to an HttpOnly transaction",
);
checkIncludesAll(
	adminOidcCallback,
	[
		"/api/auth/admin-oidc/session",
		"CINAADMIN_OIDC_BRIDGE_SECRET",
		"toHostOnlyCookie",
		"admin_forbidden",
	],
	adminOidcCallbackFile,
	"Admin callback must bridge tokens server-side and enforce administrator role",
);
checkIncludesAll(
	adminProvisionSecrets,
	[
		"CINAADMIN_OIDC_CLIENT_SECRET",
		"CINAADMIN_OIDC_BRIDGE_SECRET",
		"CINAADMIN_OIDC_TRANSACTION_SECRET",
		"spawnSync",
		"input: value",
	],
	adminProvisionSecretsFile,
	"Admin OIDC secrets must be provisioned through stdin",
);
checkIncludesAll(
	authWebContract,
	[
		"ADMIN_CONSOLE_ROLES",
		"ADMIN_PERMISSION_STATEMENT",
		"ADMIN_ROLE_PERMISSIONS",
	],
	authWebContractFile,
	"role names and permissions must remain a shared cross-deployment contract",
);
checkIncludesAll(
	adminWorkflow,
	[
		"apps/admin-console",
		"admin.cinaseek.ai",
		"pnpm run cf-typegen",
		"pnpm run typecheck",
		"pnpm run test",
		"pnpm run build:cf",
		"cloudflare/wrangler-action@v3",
		"CINAADMIN_OIDC_CLIENT_SECRET",
		"CINAADMIN_OIDC_BRIDGE_SECRET",
		"CINAADMIN_OIDC_TRANSACTION_SECRET",
		"CINAAUTH_MIGRATION_TOKEN",
		"Wait for governed Auth readiness",
		"super-admin-governance-v1",
		"provider-namespace-registry-v1",
		"ready.database?.invariants?.ok",
		"pnpm run provision:secrets",
	],
	adminWorkflowFile,
	"admin console CI must deploy independently",
);
check(
	accountWorkflow.indexOf("Wait for governed Auth readiness") <
		accountWorkflow.indexOf("Inject account portal secret") &&
		accountWorkflow.indexOf("Wait for governed Auth readiness") <
			accountWorkflow.indexOf("Deploy account portal"),
	`${rel(accountWorkflowFile)} must verify governed Auth readiness before any frontend write`,
);
check(
	adminWorkflow.indexOf("Wait for governed Auth readiness") <
		adminWorkflow.indexOf("Provision Admin OIDC secrets") &&
		adminWorkflow.indexOf("Provision Admin OIDC secrets") <
			adminWorkflow.indexOf("Deploy admin console"),
	`${rel(adminWorkflowFile)} must verify Auth readiness and provision secrets before deploy`,
);
check(
	!workflow.includes("https://auth.cinagroup.com") &&
		!workflow.includes("wrangler d1 time-travel"),
	`${rel(workflowFile)} must not retain the retired auth domain or D1 recovery commands`,
);

checkIncludesAll(
	remotePreflight,
	[
		"fileURLToPath(import.meta.url)",
		'join(workerDir, "wrangler.json")',
		"MAX_ATTEMPTS",
		"describeFetchError",
		"CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS",
		"CLOUDFLARE_TURNSTILE_SITE_KEY",
		"CLOUDFLARE_TURNSTILE_SECRET_KEY",
		"DEFAULT_TURNSTILE_WIDGET_NAME",
		"checkTurnstileResource",
		"Turnstile Sites Write",
		"GOOGLE_CLIENT_ID",
		"GOOGLE_CLIENT_SECRET",
		"GITHUB_CLIENT_ID",
		"GITHUB_CLIENT_SECRET",
		"GENERIC_OAUTH_CONFIG",
		"STRIPE_SECRET_KEY",
		"STRIPE_WEBHOOK_SECRET",
		"STRIPE_DEFAULT_PRICE_ID",
		"CINAAUTH_ENTITLEMENT_CONFIG",
		"CLOUDFLARE_API_TOKEN",
		"CF_API_TOKEN",
		"CLOUDFLARE_ACCOUNT_ID",
		"/hyperdrive/configs",
		"caching?.disabled",
		"/d1/database/",
		"/r2/buckets",
		"checkPrivacyExportBucket",
		"/queues",
		"MAX_QUEUE_RETENTION_SECONDS",
		"message_retention_period",
		"/workers/scripts/",
		"checkServiceBindings",
		'CINAAUTH_DELIVERY_SERVICE" && item.type === "service"',
		"/workers/domains",
		"/api/ready",
		"Cache-Control: no-store",
		"CINAAUTH_SECRET",
		"CINAAUTH_MIGRATION_TOKEN",
		"CINAAUTH_DELIVERY_WEBHOOK_URL",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		"CINAAUTH_PRIVACY_EXPORT_KEY",
		"CINAAUTH_ERASURE_WEBHOOK_URL",
		"CINAAUTH_ERASURE_WEBHOOK_SECRET",
		"CINAADMIN_OIDC_CLIENT_SECRET",
		"CINAADMIN_OIDC_BRIDGE_SECRET",
		"migrationToken",
		"authorizedReadiness",
		"evaluateRuntimeCapabilities",
		"evaluateDeliveryCapabilityParity",
		"DELIVERY_READY_URL",
		'new URL("/api/auth/capabilities", origin)',
		"body.database?.ok",
		'body.cutover?.state !== "live"',
	],
	remotePreflightFile,
	"Cloudflare remote preflight must verify deploy prerequisites without printing secret values",
);
checkIncludesAll(
	runtimeCapabilitiesCheck,
	[
		"GOOGLE_CLIENT_ID is configured but the live capabilities endpoint does not enable One Tap",
		"Google social credentials are configured but the live capability is disabled",
		"GitHub social credentials are configured but the live capability is disabled",
		"GENERIC_OAUTH_CONFIG is configured but the live capabilities endpoint exposes no valid providers",
		"Turnstile secrets are configured but the live captcha capability is disabled",
		"Stripe billing inputs are configured but the live billing capability is disabled",
		"Live Email OTP capability does not match Delivery Worker readiness",
		"Live magic-link capability does not match Delivery Worker readiness",
		"Live phone OTP capability does not match Delivery Worker readiness",
	],
	runtimeCapabilitiesCheckFile,
	"remote preflight must fail when configured optional secrets are rejected by the live runtime",
);

checkIncludesAll(
	deliveryRemotePreflight,
	[
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		"custom_domain",
		"/workers/domains",
		"Detailed delivery readiness was not checked",
		"body.providers?.email",
		"body.providers?.sms",
		"body.replay?.kv",
	],
	deliveryRemotePreflightFile,
	"Delivery remote acceptance must validate both providers and the replay store when authorized",
);
check(
	deliveryPackage.scripts?.["acceptance:providers"] ===
		"node ./scripts/run-provider-acceptance.mjs",
	`${rel(deliveryPackageFile)} must expose the opt-in provider acceptance script`,
);
check(
	deliveryWrangler.routes?.some(
		(route) =>
			route.pattern === "cinaauth-delivery.cinagroup.com" &&
			route.custom_domain === true,
	),
	`${rel(deliveryWranglerFile)} must bind the delivery hostname as a Custom Domain`,
);
checkIncludesAll(
	deliveryAcceptance,
	[
		'process.argv.includes("--send")',
		"CINAAUTH_ACCEPTANCE_EMAIL",
		"CINAAUTH_ACCEPTANCE_PHONE",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		'kind: "email-otp"',
		'kind: "magic-link"',
		'kind: "password-reset"',
		'kind: "phone-otp"',
		'kind: "phone-reset-otp"',
		"X-CinaAuth-Delivery-Signature",
		"replay-kv: duplicate suppressed",
	],
	deliveryAcceptanceFile,
	"provider acceptance must be explicit, signed, cover every delivery type, and verify replay protection",
);
check(
	!deliveryAcceptance.includes("console.log(email)") &&
		!deliveryAcceptance.includes("console.log(phoneNumber)") &&
		!deliveryAcceptance.includes("console.log(secret)"),
	`${rel(deliveryAcceptanceFile)} must not print acceptance targets or secret values`,
);

checkIncludesAll(
	productionLifecycleAcceptance,
	[
		'argv.includes("--run")',
		"CINAAUTH_ACCEPTANCE_ADMIN_COOKIE",
		"@acceptance.invalid",
		'path: "/api/auth/admin/create-user"',
		'path: "/api/auth/admin/impersonate-user"',
		'path: "/api/auth/admin/remove-user"',
		'path: "/api/auth/get-session"',
		"finally",
		"AggregateError",
		"session-revocation-validated",
		"cleaned: true",
	],
	productionLifecycleAcceptanceFile,
	"production lifecycle acceptance must be explicit, synthetic, session-backed, and fail closed on cleanup",
);
check(
	!productionLifecycleAcceptance.includes("log(adminCookie)") &&
		!productionLifecycleAcceptance.includes("log(impersonatedCookie)") &&
		!productionLifecycleAcceptance.includes("log(email)") &&
		!productionLifecycleAcceptance.includes("log(userId)"),
	`${rel(productionLifecycleAcceptanceFile)} must not print cookies or synthetic identity values`,
);

checkIncludesAll(
	configureHyperdrive,
	[
		"CINAAUTH_HYPERDRIVE_ID",
		"00000000000000000000000000000000",
		"writeFileSync",
		"Configured the HYPERDRIVE binding ID",
	],
	configureHyperdriveFile,
	"Hyperdrive configuration must require a concrete ID without database credentials",
);

check(
	packageJson.scripts?.["configure:turnstile"] ===
		"node ./scripts/configure-turnstile.mjs",
	`${rel(packageFile)} must expose the idempotent Turnstile configuration script`,
);
checkIncludesAll(
	configureTurnstile,
	[
		"CinaAuth Production",
		"auth.cinaseek.ai",
		"accounts.cinaseek.ai",
		"demo-auth.cinagroup.com",
		"admin.cinaseek.ai",
		'widget.mode !== "managed"',
		'widget.clearance_level !== "no_clearance"',
		"CLOUDFLARE_API_TOKEN",
		"CLOUDFLARE_ACCOUNT_ID",
		"CLOUDFLARE_TURNSTILE_SECRET_KEY",
		"CLOUDFLARE_TURNSTILE_SITE_KEY",
		"spawnSync",
		'stdio: ["pipe", "inherit", "inherit"]',
		"secretValuesPrinted: false",
	],
	configureTurnstileFile,
	"Turnstile automation must be idempotent, domain-bound, and provision secrets through stdin",
);
check(
	!configureTurnstile.includes("console.log(widget.secret)") &&
		!configureTurnstile.includes("process.argv.push"),
	`${rel(configureTurnstileFile)} must not print or pass Turnstile secrets in arguments`,
);

checkIncludesAll(
	provisionSecrets,
	[
		"CINAAUTH_DELIVERY_WEBHOOK_URL",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		"CINAAUTH_PRIVACY_EXPORT_KEY",
		"CINAAUTH_ERASURE_WEBHOOK_URL",
		"CINAAUTH_ERASURE_WEBHOOK_SECRET",
		"CINAADMIN_OIDC_CLIENT_SECRET",
		"CINAADMIN_OIDC_BRIDGE_SECRET",
		"--allow-erasure-not-ready",
		"CINAAUTH_SKIP_DELIVERY_READY_CHECK",
		"CLOUDFLARE_TURNSTILE_SITE_KEY",
		"CLOUDFLARE_TURNSTILE_SECRET_KEY",
		"CINAAUTH_ENTITLEMENT_CONFIG",
		"must be configured together",
		"Authorization",
		"wrangler",
		"secret",
		"put",
		"stdio",
		"pipe",
		"Delivery Worker readiness must pass",
		"Privacy Erasure Worker readiness must pass",
	],
	provisionSecretsFile,
	"secret provisioning must write through stdin and require delivery readiness before auth deploy",
);
check(
	!provisionSecrets.includes("process.argv.push") &&
		!provisionSecrets.includes("echo "),
	`${rel(provisionSecretsFile)} must not pass secret values through command-line arguments`,
);
check(
	workflow.includes("CLOUDFLARE_TURNSTILE_SITE_KEY") &&
		workflow.includes("CLOUDFLARE_TURNSTILE_SECRET_KEY") &&
		accountWorkflow.includes("pnpm exec wrangler secret put CINAAUTH_SECRET") &&
		!workflow.includes("npx wrangler"),
	`${rel(workflowFile)} must provision paired Turnstile inputs and use the repository pnpm toolchain`,
);

checkIncludesAll(
	deploymentDoc,
	[
		"configure:delivery-queues",
		"24-hour retention",
		"CINAAUTH_SECRET",
		"CINAAUTH_MIGRATION_TOKEN",
		"CINAAUTH_DELIVERY_WEBHOOK_URL",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		"CINAAUTH_ERASURE_WEBHOOK_URL",
		"CINAAUTH_ERASURE_WEBHOOK_SECRET",
		"CINAADMIN_OIDC_CLIENT_SECRET",
		"CINAADMIN_OIDC_BRIDGE_SECRET",
		"pnpm --dir workers/auth-api run check:production",
		"pnpm --dir workers/auth-api run check:cloudflare",
		"CINAAUTH_HYPERDRIVE_ID",
		"configure:hyperdrive",
		"configure:turnstile",
		"Turnstile Sites Write",
		"pnpm --dir workers/auth-api run provision:secrets",
		"auth.cinaseek.ai",
		"env.HYPERDRIVE.connectionString",
		"RateLimitDurableObject",
		"CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS=1",
		"CLOUDFLARE_TURNSTILE_SITE_KEY",
		"CLOUDFLARE_TURNSTILE_SECRET_KEY",
		"/api/migrate",
		"/api/migrate/d1",
		"/api/migrate/scim-provider-ownership",
		"requiredInvariants",
		"database.invariants",
		"delete-anonymous-user",
		"60 attempts per",
		"multi-row",
		"already_migrated",
		"plaintext `scimToken` is returned",
		"configured social or Generic",
		"before an ownership update, token rotation, or migration audit",
		"maintenance",
		"cinaauth_cutover_history",
		"/api/ready",
		"D1 Time Travel protects only the retained rollback source",
		"VERSION_METADATA",
		"X-CinaAuth-Delivery-Signature",
	],
	deploymentDocFile,
	"Worker deployment doc must cover production setup and verification",
);

checkIncludesAll(
	chineseDeploymentDoc,
	[
		"auth.cinaseek.ai",
		"CINAAUTH_HYPERDRIVE_ID",
		"Hyperdrive",
		"PostgreSQL",
		"RATE_LIMITER",
		"CINAAUTH_MIGRATION_TOKEN",
		"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
		"/api/migrate",
		"/api/migrate/d1",
		"CINAAUTH_D1_MIGRATION_TOKEN",
		"CINAAUTH_CUTOVER_STATE",
		"LEGACY_D1",
		"/api/ready",
		"pnpm --dir workers/auth-api run check:production",
		"CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS=1",
		"VERSION_METADATA",
		"X-CinaAuth-Delivery-Signature",
		"accounts.cinaseek.ai/api/auth/get-session",
	],
	chineseDeploymentDocFile,
	"Cloudflare deployment guide must document the same production gates",
);
checkIncludesAll(
	functionalDesign,
	[
		"个人 API Key 的生产约束",
		"`cina_sk_` 品牌前缀",
		"完整密钥只在创建响应和一次性确认弹窗中出现",
		"绕过 Cookie 缓存的权威数据库会话",
		"登录时间不超过 15 分钟",
		"`POST /siwe/link-wallet`",
		"`GET /siwe/list-wallets`",
		"`POST /siwe/set-primary-wallet`",
		"`POST /siwe/unlink-wallet`",
		"现有 `/siwe/verify` 是登录端点",
		"`/dashboard/privacy`",
		"机器可读 JSON 导出",
		"不静默截断",
		"`privacy.export` 审计 action",
	],
	functionalDesignFile,
	"the functional design must document the production API key, wallet, and privacy security contracts",
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
