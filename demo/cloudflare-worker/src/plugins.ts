import { apiKey } from "@cinaauth/api-key";
import { electron } from "@cinaauth/electron";
import { oauthProvider } from "@cinaauth/oauth-provider";
import { passkey } from "@cinaauth/passkey";
import { scim } from "@cinaauth/scim";
import { sso } from "@cinaauth/sso";
import { stripe } from "@cinaauth/stripe";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import Stripe from "stripe";
import type { CinaAuthPlugin } from "cinaauth";
import { createAccessControl } from "cinaauth/plugins/access";
import { admin } from "cinaauth/plugins/admin";
import { anonymous } from "cinaauth/plugins/anonymous";
import { auditLog } from "cinaauth/plugins/audit-log";
import { bearer } from "cinaauth/plugins/bearer";
import { customSession } from "cinaauth/plugins/custom-session";
import { deviceAuthorization } from "cinaauth/plugins/device-authorization";
import { emailOTP } from "cinaauth/plugins/email-otp";
import {
	genericOAuth,
	type GenericOAuthConfig,
} from "cinaauth/plugins/generic-oauth";
import { haveIBeenPwned } from "cinaauth/plugins/haveibeenpwned";
import { jwt } from "cinaauth/plugins/jwt";
import { magicLink } from "cinaauth/plugins/magic-link";
import { multiSession } from "cinaauth/plugins/multi-session";
import { oAuthProxy } from "cinaauth/plugins/oauth-proxy";
import { oneTimeToken } from "cinaauth/plugins/one-time-token";
import { organization } from "cinaauth/plugins/organization";
import { phoneNumber } from "cinaauth/plugins/phone-number";
import { siwe } from "cinaauth/plugins/siwe";
import { twoFactor } from "cinaauth/plugins/two-factor";
import { username } from "cinaauth/plugins/username";
import {
	captcha,
	lastLoginMethod,
	oauthPopup,
	oneTap,
	openAPI,
} from "cinaauth/plugins";
import { enqueueDelivery } from "./delivery";
import type { CloudflareBindings } from "./env";

const AUTH_ORIGIN = "https://auth.cinagroup.com";
const DEMO_ORIGIN = "https://demo-auth.cinagroup.com";
const ADMIN_ORIGIN = "https://admin.cinagroup.com";

// Exact origins allowed to hold a session and make credentialed cross-origin
// calls. Deliberately NOT a "https://*.cinagroup.com" wildcard: a wildcard
// trusts every current and future subdomain — Pages preview deployments, vendor
// CNAMEs, and takeover-prone dangling subdomains — with full session access.
// Add real app subdomains here explicitly as they come online.
export const TRUSTED_ORIGINS = [AUTH_ORIGIN, DEMO_ORIGIN, ADMIN_ORIGIN];

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
export const ac = createAccessControl({
	user: [
		"create",
		"list",
		"set-role",
		"ban",
		"impersonate",
		// Restricts impersonation: without this, admin plugin's impersonate
		// endpoint refuses to target other admins. Only super_admin gets it;
		// security_admin cannot impersonate admins.
		"impersonate-admins",
		"delete",
		"set-password",
		"set-email",
		"get",
		"update",
	],
	session: ["list", "revoke", "delete"],
	// The admin plugin's stats endpoints gate on permissions: { stats: ["read"] }.
	stats: ["read"],
});

export const roles = {
	super_admin: ac.newRole({
		user: [
			"create",
			"list",
			"set-role",
			"ban",
			"impersonate",
			"impersonate-admins",
			"delete",
			"set-password",
			"set-email",
			"get",
			"update",
		],
		session: ["list", "revoke", "delete"],
		stats: ["read"],
	}),
	security_admin: ac.newRole({
		// read + ban/unban + sessions + stats; NO create/delete/role/password/impersonate.
		user: ["list", "ban", "get", "update"],
		session: ["list", "revoke", "delete"],
		stats: ["read"],
	}),
	user: ac.newRole({ user: [], session: [] }),
};

const tempEmailForPhone = (phoneNumber: string) => {
	const normalized = phoneNumber.replace(/[^a-zA-Z0-9]/g, "").slice(-24);
	return `phone-${normalized || "unknown"}@auth.cinagroup.com`;
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

const parseGenericOAuthConfig = (
	raw: string | undefined,
): GenericOAuthConfig[] => {
	if (!raw) return [];
	try {
		const value = JSON.parse(raw);
		if (!Array.isArray(value)) {
			console.warn(
				"GENERIC_OAUTH_CONFIG must be a JSON array; generic OAuth disabled.",
			);
			return [];
		}
		return value as GenericOAuthConfig[];
	} catch (error) {
		console.error(
			"Failed to parse GENERIC_OAUTH_CONFIG; generic OAuth disabled.",
			error,
		);
		return [];
	}
};

const stripePlans = (env: CloudflareBindings) => {
	const priceId = env.STRIPE_DEFAULT_PRICE_ID;
	if (!priceId) return [];
	return [
		{
			name: env.STRIPE_DEFAULT_PLAN_NAME || "default",
			priceId,
		},
	];
};

const createElectronPlugin = (options: Parameters<typeof electron>[0]) =>
	electron(options) as CinaAuthPlugin;

export const createAuthPlugins = (env: CloudflareBindings): CinaAuthPlugin[] => {
	const baseURL = env.CINAAUTH_URL || AUTH_ORIGIN;
	const pairwiseSecret = configuredPairwiseSecret(env);
	const genericOAuthConfig = parseGenericOAuthConfig(env.GENERIC_OAUTH_CONFIG);
	const plans = stripePlans(env);

	const plugins: CinaAuthPlugin[] = [
		jwt({
			jwt: {
				issuer: baseURL,
			},
		}),
		bearer(),
		anonymous({
			emailDomainName: "auth.cinagroup.com",
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
		organization(),
		apiKey({
			// API keys are scoped to individual users, not organizations.
			references: "user",
		}),
		passkey({
			rpID: "cinagroup.com",
			rpName: "CinaAuth",
			origin: [baseURL, DEMO_ORIGIN],
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
		deviceAuthorization({
			verificationUri: `${DEMO_ORIGIN}/device`,
		}),
		oauthProvider({
			// The plugin serves the well-known discovery routes; silence the
			// advisory reminders so they don't log on every isolate init.
			silenceWarnings: {
				oauthAuthServerConfig: true,
				openidConfig: true,
			},
			loginPage: `${DEMO_ORIGIN}/sign-in`,
			consentPage: `${DEMO_ORIGIN}/oauth/consent`,
			signup: {
				page: `${DEMO_ORIGIN}/sign-up`,
			},
			selectAccount: {
				page: `${DEMO_ORIGIN}/account/select`,
				shouldRedirect: () => false,
			},
			scopes: ["openid", "profile", "email", "offline_access"],
			validAudiences: [baseURL, `${DEMO_ORIGIN}/api/mcp`],
			allowDynamicClientRegistration: true,
			allowUnauthenticatedClientRegistration: false,
			clientRegistrationDefaultScopes: [
				"openid",
				"profile",
				"email",
				"offline_access",
			],
			pairwiseSecret,
			prefix: {
				opaqueAccessToken: "cina_at_",
				refreshToken: "cina_rt_",
				clientSecret: "cina_cs_",
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
			},
		}),
		scim({
			providerOwnership: {
				enabled: true,
			},
			requiredRole: ["owner", "admin"],
			storeSCIMToken: "hashed",
			canGenerateToken: ({ member }) => member !== null,
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
		openAPI(),
		haveIBeenPwned(),
		siwe({
			domain: "auth.cinagroup.com",
			emailDomainName: "auth.cinagroup.com",
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
			adminRoles: ["super_admin", "security_admin"],
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

	if (env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
		plugins.push(
			captcha({
				provider: "cloudflare-turnstile",
				secretKey: env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
				allowedHostnames: [
					"auth.cinagroup.com",
					"demo-auth.cinagroup.com",
					"admin.cinagroup.com",
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
							}
						: {
								enabled: false,
							},
			}),
		);
	}

	return plugins;
};
