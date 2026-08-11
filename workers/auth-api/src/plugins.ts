import { apiKey } from "@cinaauth/api-key";
import {
	ADMIN_CONSOLE_ROLES,
	ADMIN_OIDC_CLIENT_ID,
	ADMIN_OIDC_CLIENT_SECRET_PREFIX,
	ADMIN_PERMISSION_STATEMENT,
	ADMIN_ROLE_PERMISSIONS,
	OIDC_DEMO_CLIENT_ID,
	OIDC_DEMO_ORIGIN,
} from "@cinaauth/auth-web-contract";
import { electron } from "@cinaauth/electron";
import { oauthProvider } from "@cinaauth/oauth-provider";
import { passkey } from "@cinaauth/passkey";
import { scim } from "@cinaauth/scim";
import { sso } from "@cinaauth/sso";
import { stripe } from "@cinaauth/stripe";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import type { CinaAuthPlugin } from "cinaauth";
import {
	captcha,
	lastLoginMethod,
	oauthPopup,
	oneTap,
	openAPI,
} from "cinaauth/plugins";
import { createAccessControl } from "cinaauth/plugins/access";
import { admin } from "cinaauth/plugins/admin";
import { anonymous } from "cinaauth/plugins/anonymous";
import { auditLog } from "cinaauth/plugins/audit-log";
import { bearer } from "cinaauth/plugins/bearer";
import { customSession } from "cinaauth/plugins/custom-session";
import { deviceAuthorization } from "cinaauth/plugins/device-authorization";
import { emailOTP } from "cinaauth/plugins/email-otp";
import { genericOAuth } from "cinaauth/plugins/generic-oauth";
import { haveIBeenPwned } from "cinaauth/plugins/haveibeenpwned";
import { jwt } from "cinaauth/plugins/jwt";
import { magicLink } from "cinaauth/plugins/magic-link";
import { multiSession } from "cinaauth/plugins/multi-session";
import { oAuthProxy } from "cinaauth/plugins/oauth-proxy";
import { oneTimeToken } from "cinaauth/plugins/one-time-token";
import { organization } from "cinaauth/plugins/organization";
import {
	defaultAc as organizationAccessControl,
	defaultRoles as organizationRoles,
} from "cinaauth/plugins/organization/access";
import { phoneNumber } from "cinaauth/plugins/phone-number";
import { privacyCenter } from "cinaauth/plugins/privacy-center";
import { siwe } from "cinaauth/plugins/siwe";
import { twoFactor } from "cinaauth/plugins/two-factor";
import { username } from "cinaauth/plugins/username";
import Stripe from "stripe";
import { adminOidcBridge } from "./admin-oidc-bridge";
import {
	getTurnstileConfig,
	TURNSTILE_ACTION,
	TURNSTILE_PROTECTED_ENDPOINTS,
} from "./captcha-config";
import { enqueueDelivery } from "./delivery";
import type { RuntimeEntitlementSubject } from "./entitlement-runtime";
import {
	getRuntimeEntitlementLimit,
	isRuntimeEntitlementFeatureEnabled,
	withRuntimeOrganizationMemberCapacity,
} from "./entitlement-runtime";
import { getBillingRuntimeConfiguration } from "./entitlements";
import type { CloudflareBindings } from "./env";
import { parseProductionGenericOAuthConfig } from "./oauth-config";
import { createRequiredPrivacyDeletionProcessor } from "./privacy-deletion";
import {
	createR2PrivacyExportProvider,
	hasPrivacyExportRuntime,
} from "./privacy-export";

const AUTH_ORIGIN = "https://auth.cinaseek.ai";
const ACCOUNT_ORIGIN = "https://accounts.cinaseek.ai";
const LEGACY_ACCOUNT_ORIGIN = "https://demo-auth.cinagroup.com";
const ADMIN_ORIGIN = "https://admin.cinaseek.ai";
export const JWT_ROTATION_INTERVAL_SECONDS = 60 * 60 * 24 * 30;
export const JWT_GRACE_PERIOD_SECONDS = 60 * 60 * 24 * 30;

// Exact origins allowed to hold a session and make credentialed cross-origin
// calls. Deliberately NOT a wildcard: a wildcard
// trusts every current and future subdomain — Pages preview deployments, vendor
// CNAMEs, and takeover-prone dangling subdomains — with full session access.
// Add real app subdomains here explicitly as they come online.
export const TRUSTED_ORIGINS = [
	AUTH_ORIGIN,
	ACCOUNT_ORIGIN,
	LEGACY_ACCOUNT_ORIGIN,
	ADMIN_ORIGIN,
	OIDC_DEMO_ORIGIN,
];

// Hostnames derived from TRUSTED_ORIGINS, for the CORS origin check in index.ts.
export const TRUSTED_ORIGIN_HOSTS = new Set(
	TRUSTED_ORIGINS.map((origin) => new URL(origin).hostname),
);

/**
 * Access-control statements for the admin plugin.
 *
 * Roles mirror cinaadmin's two-tier model (spec section 3.1):
 *   - super_admin:     full CRUD across every module
 *   - security_admin:  read + ban/unban + session revoke + audit read;
 *                      NO create/delete/set-role/set-password/impersonate
 */
const ac = createAccessControl({
	user: [...ADMIN_PERMISSION_STATEMENT.user],
	session: [...ADMIN_PERMISSION_STATEMENT.session],
	stats: [...ADMIN_PERMISSION_STATEMENT.stats],
	passkey: [...ADMIN_PERMISSION_STATEMENT.passkey],
});

export const roles = {
	super_admin: ac.newRole({
		user: [...ADMIN_ROLE_PERMISSIONS.super_admin.user],
		session: [...ADMIN_ROLE_PERMISSIONS.super_admin.session],
		stats: [...ADMIN_ROLE_PERMISSIONS.super_admin.stats],
		passkey: [...ADMIN_ROLE_PERMISSIONS.super_admin.passkey],
	}),
	security_admin: ac.newRole({
		// read + ban/unban + sessions + stats; NO create/delete/role/password/impersonate.
		user: [...ADMIN_ROLE_PERMISSIONS.security_admin.user],
		session: [...ADMIN_ROLE_PERMISSIONS.security_admin.session],
		stats: [...ADMIN_ROLE_PERMISSIONS.security_admin.stats],
		passkey: [...ADMIN_ROLE_PERMISSIONS.security_admin.passkey],
	}),
	user: ac.newRole({
		user: [...ADMIN_ROLE_PERMISSIONS.user.user],
		session: [...ADMIN_ROLE_PERMISSIONS.user.session],
		stats: [...ADMIN_ROLE_PERMISSIONS.user.stats],
		passkey: [...ADMIN_ROLE_PERMISSIONS.user.passkey],
	}),
};

const tempEmailForPhone = (phoneNumber: string) => {
	const normalized = phoneNumber.replace(/[^a-zA-Z0-9]/g, "").slice(-24);
	return `phone-${normalized || "unknown"}@auth.cinaseek.ai`;
};

const ethereumPersonalMessageHash = (message: string) => {
	const messageBytes = utf8ToBytes(message);
	const prefix = utf8ToBytes(
		`\x19Ethereum Signed Message:\n${messageBytes.length}`,
	);
	const bytes = new Uint8Array(prefix.length + messageBytes.length);
	bytes.set(prefix);
	bytes.set(messageBytes, prefix.length);
	return keccak_256(bytes);
};

const recoverPersonalSignAddress = (
	message: string,
	signature: string,
): string | null => {
	const normalizedSignature = signature.startsWith("0x")
		? signature.slice(2)
		: signature;
	if (!/^[0-9a-fA-F]{130}$/.test(normalizedSignature)) {
		return null;
	}

	const signatureBytes = hexToBytes(normalizedSignature);
	const recoveryByte = signatureBytes[64]!;
	const recovery = recoveryByte >= 27 ? recoveryByte - 27 : recoveryByte;
	if (recovery !== 0 && recovery !== 1) {
		return null;
	}

	const compactSignature = signatureBytes.slice(0, 64);
	const publicKey = secp256k1.Signature.fromCompact(compactSignature)
		.addRecoveryBit(recovery)
		.recoverPublicKey(ethereumPersonalMessageHash(message))
		.toRawBytes(false);
	const addressBytes = keccak_256(publicKey.slice(1)).slice(-20);
	return `0x${bytesToHex(addressBytes)}`;
};

const configuredPairwiseSecret = (env: CloudflareBindings) => {
	const secret = env.OAUTH_PAIRWISE_SECRET || env.CINAAUTH_SECRET;
	return secret && secret.length >= 32 ? secret : undefined;
};

const stripePlans = (env: CloudflareBindings) => {
	const billing = getBillingRuntimeConfiguration(env);
	if (!billing) return [];
	const policy = billing.entitlements.plans[billing.stripePlanName];
	if (!policy) return [];
	return [
		{
			name: billing.stripePlanName,
			priceId: billing.priceId,
			limits: policy.limits,
		},
	];
};

const ORGANIZATION_BILLING_ROLES = new Set(["owner", "admin"]);

const getOwnedRuntimeSubject = (owner: {
	organizationId?: string;
	referenceId?: string;
	userId?: string | null;
}): RuntimeEntitlementSubject | undefined => {
	const organizationId = owner.organizationId || owner.referenceId;
	if (organizationId) return { type: "organization", id: organizationId };
	return owner.userId ? { type: "user", id: owner.userId } : undefined;
};

/** Returns true only for organization roles allowed to manage billing. */
export const canManageOrganizationBilling = (role: string | null | undefined) =>
	typeof role === "string" &&
	role
		.split(",")
		.map((candidate) => candidate.trim())
		.some((candidate) => ORGANIZATION_BILLING_ROLES.has(candidate));

export const canUseDeveloperOAuthClients = ({
	session,
	user,
}: {
	session: { id?: string } | undefined;
	user:
		| {
				emailVerified?: boolean;
				isAnonymous?: boolean | null;
		  }
		| undefined;
}) =>
	Boolean(session && user?.emailVerified === true && user.isAnonymous !== true);

const createElectronPlugin = (options: Parameters<typeof electron>[0]) =>
	electron(options) as CinaAuthPlugin;

export const createAuthPlugins = (
	env: CloudflareBindings,
	options: {
		advancedOrganization?: boolean;
	} = {},
): CinaAuthPlugin[] => {
	const baseURL = env.CINAAUTH_URL || AUTH_ORIGIN;
	const pairwiseSecret = configuredPairwiseSecret(env);
	const genericOAuthConfig = parseProductionGenericOAuthConfig(
		env.GENERIC_OAUTH_CONFIG,
	);
	const plans = stripePlans(env);
	const turnstile = getTurnstileConfig(env);

	const plugins: CinaAuthPlugin[] = [
		jwt({
			jwks: {
				keyPairConfig: { alg: "ES256" },
				rotationInterval: JWT_ROTATION_INTERVAL_SECONDS,
				gracePeriod: JWT_GRACE_PERIOD_SECONDS,
			},
			jwt: {
				issuer: baseURL,
			},
		}),
		bearer(),
		adminOidcBridge(env),
		anonymous({
			emailDomainName: "auth.cinaseek.ai",
		}),
		username(),
		lastLoginMethod({
			storeInDatabase: true,
		}),
		multiSession(),
		customSession(async ({ user, session }) => ({
			user,
			session,
			activeOrganizationId:
				(session as Record<string, unknown>).activeOrganizationId ?? null,
		})),
		twoFactor({
			// Wire the 2FA "OTP" method to the delivery queue; without a sendOTP
			// callback /two-factor/send-otp returns 400 OTP_NOT_CONFIGURED and only
			// TOTP/backup codes work. Reuses the existing email-otp delivery kind.
			otpOptions: {
				sendOTP: async ({ user, otp }) => {
					await enqueueDelivery(env, {
						kind: "email-otp",
						payload: { email: user.email, otp, type: "two-factor" },
					});
				},
			},
		}),
		organization(
			options.advancedOrganization
				? {
						ac: organizationAccessControl,
						roles: organizationRoles,
						membershipLimit: (_user, organization) =>
							getRuntimeEntitlementLimit(
								env,
								{ type: "organization", id: organization.id },
								"organizationMembers",
							),
						dynamicAccessControl: {
							enabled: true,
							maximumRolesPerOrganization: (organizationId) =>
								getRuntimeEntitlementLimit(
									env,
									{ type: "organization", id: organizationId },
									"dynamicRoles",
								),
						},
						teams: {
							enabled: true,
							maximumMembersPerTeam: ({ organizationId }) =>
								getRuntimeEntitlementLimit(
									env,
									{ type: "organization", id: organizationId },
									"teamMembers",
								),
							maximumTeams: ({ organizationId }) =>
								getRuntimeEntitlementLimit(
									env,
									{ type: "organization", id: organizationId },
									"teams",
								),
						},
					}
				: undefined,
		),
		apiKey({
			// API keys are scoped to individual users, not organizations.
			references: "user",
			// New keys are visibly owned by CinaAuth while the secret remains
			// irrecoverable after the one-time creation response.
			defaultPrefix: "cina_sk_",
			requireName: true,
			startingCharactersConfig: {
				shouldStore: true,
				charactersLength: 12,
			},
			authorizeReference: ({ referenceId }) =>
				isRuntimeEntitlementFeatureEnabled(
					env,
					{ type: "user", id: referenceId },
					"apiKeys",
				),
		}),
		passkey({
			rpID: "cinaseek.ai",
			rpName: "CinaSeek",
			origin: [baseURL],
		}),
		emailOTP({
			storeOTP: "hashed",
			// Backfill the core email-verification flow: without this,
			// /send-verification-email returns 400 VERIFICATION_EMAIL_NOT_ENABLED
			// because no emailVerification.sendVerificationEmail is configured.
			overrideDefaultEmailVerification: true,
			sendVerificationOTP: async ({ email, otp, type }) => {
				await enqueueDelivery(env, {
					kind: "email-otp",
					payload: { email, otp, type },
				});
			},
		}),
		magicLink({
			storeToken: "hashed",
			sendMagicLink: async ({ email, url }) => {
				await enqueueDelivery(env, {
					kind: "magic-link",
					payload: { email, url },
				});
			},
		}),
		phoneNumber({
			sendOTP: async ({ phoneNumber, code }) => {
				await enqueueDelivery(env, {
					kind: "phone-otp",
					payload: { phoneNumber, code },
				});
			},
			sendPasswordResetOTP: async ({ phoneNumber, code }) => {
				await enqueueDelivery(env, {
					kind: "phone-reset-otp",
					payload: {
						phoneNumber,
						code,
					},
				});
			},
			signUpOnVerification: {
				getTempEmail: tempEmailForPhone,
				getTempName: (phoneNumber) => phoneNumber,
			},
		}),
		privacyCenter({
			...(hasPrivacyExportRuntime(env)
				? {
						asyncExport: {
							provider: createR2PrivacyExportProvider(env),
							expiresInSeconds: 24 * 60 * 60,
						},
					}
				: {}),
			deletion: {
				policyVersion: "2026-08-10",
				processors: [createRequiredPrivacyDeletionProcessor(env)],
				retentionExceptions: [
					{
						code: "cloudflare-delivery-queues-1d",
						category: "Queued authentication delivery messages",
						purpose:
							"Retry pending email and SMS authentication deliveries and retain failed deliveries for bounded operational review",
						maximumRetentionDays: 1,
						legalBasis:
							"Legitimate interests in reliable authentication delivery and abuse investigation",
					},
					{
						code: "planetscale-postgres-backups-2d",
						category: "Encrypted PostgreSQL backups and WAL",
						purpose:
							"Point-in-time disaster recovery after active account data has been deleted",
						maximumRetentionDays: 2,
						legalBasis:
							"Legitimate interests in service availability and disaster recovery",
					},
					{
						code: "security-audit-90d",
						category: "Security audit evidence",
						purpose:
							"Fraud prevention, incident response, and protection of the authentication service",
						maximumRetentionDays: 90,
						legalBasis: "Legitimate interests in platform and account security",
					},
				],
			},
		}),
		deviceAuthorization({
			verificationUri: `${ACCOUNT_ORIGIN}/device`,
			validateClient: async (clientId, ctx) => {
				const client = await ctx.context.adapter.findOne<{
					clientId: string;
					disabled?: boolean;
					public?: boolean;
					referenceId?: string;
					userId?: string | null;
				}>({
					model: "oauthClient",
					where: [{ field: "clientId", value: clientId }],
				});
				const subject = client ? getOwnedRuntimeSubject(client) : undefined;
				return Boolean(
					client?.public === true &&
						client.disabled !== true &&
						subject &&
						(await isRuntimeEntitlementFeatureEnabled(
							env,
							subject,
							"oauthClients",
						)),
				);
			},
		}),
		oauthProvider({
			// The plugin serves the well-known discovery routes; silence the
			// advisory reminders so they don't log on every isolate init.
			silenceWarnings: {
				oauthAuthServerConfig: true,
				openidConfig: true,
			},
			loginPage: `${ACCOUNT_ORIGIN}/sign-in`,
			consentPage: `${ACCOUNT_ORIGIN}/oauth/consent`,
			signup: {
				page: `${ACCOUNT_ORIGIN}/sign-up`,
			},
			selectAccount: {
				page: `${ACCOUNT_ORIGIN}/account/select`,
				shouldRedirect: () => false,
			},
			scopes: ["openid", "profile", "email", "offline_access"],
			advertisedMetadata: {
				claims_supported: [
					"sub",
					"iss",
					"aud",
					"exp",
					"iat",
					"sid",
					"scope",
					"azp",
					"email",
					"email_verified",
					"name",
					"picture",
					"family_name",
					"given_name",
					"auth_time",
					"acr",
				],
			},
			validAudiences: [baseURL, ADMIN_ORIGIN, `${ACCOUNT_ORIGIN}/api/mcp`],
			allowDynamicClientRegistration: true,
			allowUnauthenticatedClientRegistration: false,
			cachedTrustedClients: new Set([
				OIDC_DEMO_CLIENT_ID,
				ADMIN_OIDC_CLIENT_ID,
			]),
			clientRegistrationDefaultScopes: [
				"openid",
				"profile",
				"email",
				"offline_access",
			],
			clientPrivileges: ({ session, user }) =>
				canUseDeveloperOAuthClients({ session, user }),
			authorizeClient: ({ client }) => {
				if (client.clientId === ADMIN_OIDC_CLIENT_ID) {
					return (
						client.public === false &&
						client.disabled !== true &&
						client.tokenEndpointAuthMethod === "client_secret_basic" &&
						client.requirePKCE === true
					);
				}
				if (client.clientId === OIDC_DEMO_CLIENT_ID) {
					return (
						client.public === true &&
						client.disabled !== true &&
						client.tokenEndpointAuthMethod === "none" &&
						client.requirePKCE === true
					);
				}
				const subject = getOwnedRuntimeSubject(client);
				return subject
					? isRuntimeEntitlementFeatureEnabled(env, subject, "oauthClients")
					: false;
			},
			pairwiseSecret,
			prefix: {
				opaqueAccessToken: "cina_at_",
				refreshToken: "cina_rt_",
				clientSecret: ADMIN_OIDC_CLIENT_SECRET_PREFIX,
			},
			rateLimit: {
				token: { window: 60, max: 20 },
				authorize: { window: 60, max: 30 },
				introspect: { window: 60, max: 100 },
				revoke: { window: 60, max: 30 },
				register: { window: 60, max: 5 },
				userinfo: { window: 60, max: 60 },
			},
		}),
		sso({
			domainVerification: {
				enabled: true,
			},
			organizationProvisioning: {
				defaultRole: "member",
				withOrganizationMemberProvisioning: (
					{ organizationId, userId },
					provision,
				) =>
					withRuntimeOrganizationMemberCapacity(
						env,
						organizationId,
						userId,
						provision,
					),
			},
			authorizeProvider: ({ provider }) => {
				const subject = getOwnedRuntimeSubject(provider);
				return subject
					? isRuntimeEntitlementFeatureEnabled(env, subject, "sso")
					: false;
			},
		}),
		scim({
			providerOwnership: {
				enabled: true,
			},
			requiredRole: ["owner", "admin"],
			storeSCIMToken: "hashed",
			canGenerateToken: ({ member }) => member !== null,
			authorizeProvider: ({ provider }) => {
				const subject = getOwnedRuntimeSubject(provider);
				return subject
					? isRuntimeEntitlementFeatureEnabled(env, subject, "scim")
					: false;
			},
			withOrganizationMemberProvisioning: (
				{ organizationId, userId },
				provision,
			) =>
				withRuntimeOrganizationMemberCapacity(
					env,
					organizationId,
					userId,
					provision,
				),
		}),
		createElectronPlugin({
			clientID: "electron",
			cookiePrefix: "cinaauth",
		}),
		oauthPopup(),
		oAuthProxy({
			productionURL: baseURL,
		}),
		oneTimeToken(),
		openAPI({
			title: "CinaSeek Identity",
			description: "CinaSeek identity and access management API",
		}),
		haveIBeenPwned(),
		siwe({
			domain: "auth.cinaseek.ai",
			emailDomainName: "auth.cinaseek.ai",
			getNonce: async () => crypto.randomUUID().replace(/-/g, ""),
			verifyMessage: async ({ message, signature, address }) => {
				try {
					const recoveredAddress = recoverPersonalSignAddress(
						message,
						signature,
					);
					return recoveredAddress?.toLowerCase() === address.toLowerCase();
				} catch {
					return false;
				}
			},
		}),
		admin({
			// Roles recognized by the admin console's whitelist
			// (CINAADMIN_ALLOWED_ROLES = super_admin,security_admin).
			defaultRole: "user",
			adminRoles: [...ADMIN_CONSOLE_ROLES],
			ac,
			roles,
		}),
		auditLog({
			// Defaults to ["admin"] if omitted, which would exclude our console roles.
			allowedRoles: ["super_admin", "security_admin"],
			// Service token for the admin console (cinaadmin) to call POST /audit/log.
			writeTokens: env.CINAUTH_ADMIN_SERVICE_KEY
				? [env.CINAUTH_ADMIN_SERVICE_KEY]
				: [],
		}),
	];

	if (turnstile.enabled && turnstile.secretKey) {
		plugins.push(
			captcha({
				provider: "cloudflare-turnstile",
				secretKey: turnstile.secretKey,
				endpoints: [...TURNSTILE_PROTECTED_ENDPOINTS],
				expectedAction: TURNSTILE_ACTION,
				allowedHostnames: [
					"auth.cinaseek.ai",
					"accounts.cinaseek.ai",
					"demo-auth.cinagroup.com",
					"admin.cinaseek.ai",
				],
			}),
		);
	}

	if (env.GOOGLE_CLIENT_ID) {
		plugins.push(
			oneTap({
				clientId: env.GOOGLE_CLIENT_ID,
			}),
		);
	}

	if (genericOAuthConfig.length > 0) {
		plugins.push(
			genericOAuth({
				config: genericOAuthConfig,
			}),
		);
	}

	if (env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET) {
		plugins.push(
			stripe({
				stripeClient: new Stripe(env.STRIPE_SECRET_KEY),
				stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
				createCustomerOnSignUp: false,
				organization: {
					enabled: true,
				},
				subscription:
					plans.length > 0
						? {
								enabled: true,
								plans,
								authorizeReference: async ({ user, referenceId }, ctx) => {
									const member = await ctx.context.adapter.findOne<{
										role: string;
									}>({
										model: "member",
										where: [
											{ field: "organizationId", value: referenceId },
											{ field: "userId", value: user.id },
										],
									});
									return canManageOrganizationBilling(member?.role);
								},
							}
						: {
								enabled: false,
							},
			}),
		);
	}

	return plugins;
};
