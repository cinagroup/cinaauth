import {
	ENTITLEMENT_FEATURES,
	ENTITLEMENT_LIMITS,
} from "@cinaauth/auth-web-contract";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { describe, expect, it } from "vitest";
import {
	getConfiguredSocialProviders,
	getProductionSocialProviders,
} from "../src/auth";
import type { CloudflareBindings } from "../src/env";
import {
	canManageOrganizationBilling,
	createAuthPlugins,
	JWT_GRACE_PERIOD_SECONDS,
	JWT_ROTATION_INTERVAL_SECONDS,
	roles,
} from "../src/plugins";

const getOrganizationSchema = (advancedOrganization: boolean) => {
	const plugin = createAuthPlugins({} as CloudflareBindings, {
		advancedOrganization,
	}).find((candidate) => candidate.id === "organization");

	expect(plugin).toBeDefined();
	return plugin?.schema;
};

const entitlementConfig = () =>
	JSON.stringify({
		version: 1,
		defaultPlan: "default",
		plans: {
			default: {
				features: Object.fromEntries(
					ENTITLEMENT_FEATURES.map((feature) => [feature, true]),
				),
				limits: Object.fromEntries(
					ENTITLEMENT_LIMITS.map((limit) => [limit, null]),
				),
			},
		},
	});

describe("organization schema mode", () => {
	it("keeps advanced organization schema dormant by default", () => {
		const schema = getOrganizationSchema(false);

		expect(schema).not.toHaveProperty("team");
		expect(schema).not.toHaveProperty("teamMember");
		expect(schema).not.toHaveProperty("organizationRole");
		expect(schema?.session?.fields).not.toHaveProperty("activeTeamId");
	});

	it("includes teams and dynamic roles only in advanced mode", () => {
		const plugin = createAuthPlugins({} as CloudflareBindings, {
			advancedOrganization: true,
		}).find((candidate) => candidate.id === "organization");
		const schema = getOrganizationSchema(true);

		expect(plugin?.options).toMatchObject({
			ac: expect.any(Object),
			dynamicAccessControl: {
				enabled: true,
				maximumRolesPerOrganization: expect.any(Function),
			},
			roles: {
				admin: expect.any(Object),
				member: expect.any(Object),
				owner: expect.any(Object),
			},
			teams: {
				enabled: true,
				maximumMembersPerTeam: expect.any(Function),
				maximumTeams: expect.any(Function),
			},
		});
		expect(schema).toHaveProperty("team");
		expect(schema).toHaveProperty("teamMember");
		expect(schema).toHaveProperty("organizationRole");
		expect(schema?.session?.fields).toHaveProperty("activeTeamId");
		expect(schema?.invitation?.fields).toHaveProperty("teamId");
	});
});

describe("authoritative Admin role permissions", () => {
	it("keeps security_admin scoped to reversible security operations", () => {
		expect(roles.security_admin.authorize({ user: ["ban"] }).success).toBe(
			true,
		);
		expect(
			roles.security_admin.authorize({ session: ["revoke"] }).success,
		).toBe(true);
		expect(roles.security_admin.authorize({ user: ["update"] }).success).toBe(
			false,
		);
		expect(roles.security_admin.authorize({ user: ["set-role"] }).success).toBe(
			false,
		);
		expect(
			roles.security_admin.authorize({ user: ["set-password"] }).success,
		).toBe(false);
	});
});

describe("OIDC signing and social provider configuration", () => {
	it("uses ES256 with bounded rotation and grace periods", () => {
		const plugin = createAuthPlugins({} as CloudflareBindings).find(
			(candidate) => candidate.id === "jwt",
		);

		expect(plugin?.options).toMatchObject({
			jwks: {
				keyPairConfig: { alg: "ES256" },
				rotationInterval: JWT_ROTATION_INTERVAL_SECONDS,
				gracePeriod: JWT_GRACE_PERIOD_SECONDS,
			},
			jwt: { issuer: "https://auth.cinaseek.ai" },
		});
	});

	it("enables Google and GitHub only from complete secret pairs", () => {
		expect(
			getConfiguredSocialProviders({
				GOOGLE_CLIENT_ID: "google-client-id",
			}),
		).toEqual({});
		expect(
			getConfiguredSocialProviders({
				GOOGLE_CLIENT_ID: "google-client-id",
				GOOGLE_CLIENT_SECRET: "google-secret",
				GITHUB_CLIENT_ID: "github-client-id",
				GITHUB_CLIENT_SECRET: "github-secret",
			}),
		).toEqual({
			google: {
				clientId: "google-client-id",
				clientSecret: "google-secret",
				redirectURI: "https://accounts.cinaseek.ai/api/auth/callback/google",
			},
			github: {
				clientId: "github-client-id",
				clientSecret: "github-secret",
				redirectURI: "https://accounts.cinaseek.ai/api/auth/callback/github",
			},
		});
	});

	it("keeps Google and GitHub ids reserved when credentials are temporarily absent", () => {
		expect(getProductionSocialProviders({})).toEqual({
			google: {
				clientId: "provider-id-reservation-only",
				clientSecret: "provider-id-reservation-only",
				enabled: false,
			},
			github: {
				clientId: "provider-id-reservation-only",
				clientSecret: "provider-id-reservation-only",
				enabled: false,
			},
		});
		expect(
			getProductionSocialProviders({
				GOOGLE_CLIENT_ID: "google-client-id",
				GOOGLE_CLIENT_SECRET: "google-secret",
			}),
		).toMatchObject({
			google: { clientId: "google-client-id", clientSecret: "google-secret" },
			github: { enabled: false },
		});
	});
});

describe("organization member entitlement chokepoints", () => {
	it("wraps both SSO and SCIM automatic membership provisioning", () => {
		const plugins = createAuthPlugins({} as CloudflareBindings);
		const ssoPlugin = plugins.find((candidate) => candidate.id === "sso");
		const scimPlugin = plugins.find((candidate) => candidate.id === "scim");

		expect(ssoPlugin?.options).toMatchObject({
			organizationProvisioning: {
				withOrganizationMemberProvisioning: expect.any(Function),
			},
		});
		expect(scimPlugin?.options).toMatchObject({
			withOrganizationMemberProvisioning: expect.any(Function),
		});
	});
});

describe("SIWE production gate", () => {
	const enabledSiweEnv = {
		CINAAUTH_SIWE_ENABLED: "true",
		CINAAUTH_SIWE_ALLOWED_CHAIN_IDS: "1,11155111",
		CINAAUTH_SIWE_RP_DOMAIN: "accounts.cinaseek.ai",
		CINAAUTH_SIWE_RP_URI: "https://accounts.cinaseek.ai",
		CINAAUTH_SIWE_ALLOW_LEGACY: "false",
		CINAAUTH_SIWE_AUTO_SIGNUP: "false",
	} as CloudflareBindings;

	it("does not register SIWE without a complete enabled configuration", () => {
		expect(
			createAuthPlugins({} as CloudflareBindings).find(
				(candidate) => candidate.id === "siwe",
			),
		).toBeUndefined();
	});

	it("passes the strict RP, chain, and account-creation policy to SIWE v2", () => {
		const plugin = createAuthPlugins(enabledSiweEnv).find(
			(candidate) => candidate.id === "siwe",
		);

		expect(plugin?.options).toMatchObject({
			domain: "accounts.cinaseek.ai",
			uri: "https://accounts.cinaseek.ai",
			enabled: true,
			allowedChainIds: [1, 11155111],
			legacyNonce: false,
			allowUserCreation: false,
		});
	});

	it("verifies a real EIP-191 personal signature for the recovered EOA", async () => {
		const plugin = createAuthPlugins(enabledSiweEnv).find(
			(candidate) => candidate.id === "siwe",
		);
		if (!plugin || !("verifyMessage" in plugin.options)) {
			throw new Error("Expected the enabled SIWE verifier");
		}
		const message = "CinaSeek SIWE production verifier: 登录验证 🔐";
		const messageBytes = utf8ToBytes(message);
		const prefix = utf8ToBytes(
			`\x19Ethereum Signed Message:\n${messageBytes.length}`,
		);
		const payload = new Uint8Array(prefix.length + messageBytes.length);
		payload.set(prefix);
		payload.set(messageBytes, prefix.length);
		const privateKey = new Uint8Array(32);
		privateKey[31] = 1;
		const signature = secp256k1.sign(keccak_256(payload), privateKey);
		const signatureBytes = new Uint8Array(65);
		signatureBytes.set(signature.toCompactRawBytes());
		signatureBytes[64] = signature.recovery + 27;
		const publicKey = secp256k1.getPublicKey(privateKey, false);
		const address = `0x${bytesToHex(keccak_256(publicKey.slice(1)).slice(-20))}`;

		await expect(
			plugin.options.verifyMessage({
				message,
				signature: `0x${bytesToHex(signatureBytes)}`,
				address,
				chainId: 1,
			}),
		).resolves.toBe(true);
	});
});

describe("Stripe organization billing policy", () => {
	it("allows only organization owners and administrators", () => {
		expect(canManageOrganizationBilling("owner")).toBe(true);
		expect(canManageOrganizationBilling("admin,member")).toBe(true);
		expect(canManageOrganizationBilling("member")).toBe(false);
		expect(canManageOrganizationBilling("billing-manager")).toBe(false);
	});

	it("registers an authoritative organization reference callback", () => {
		const stripePlugin = createAuthPlugins({
			STRIPE_SECRET_KEY: "stripe-secret",
			STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret",
			STRIPE_DEFAULT_PRICE_ID: "price_production",
			CINAAUTH_ENTITLEMENT_CONFIG: entitlementConfig(),
		} as CloudflareBindings).find((candidate) => candidate.id === "stripe");

		expect(stripePlugin).toBeDefined();
		expect(stripePlugin?.options).toMatchObject({
			organization: { enabled: true },
			subscription: {
				enabled: true,
				authorizeReference: expect.any(Function),
				plans: [
					expect.objectContaining({
						name: "default",
						limits: expect.any(Object),
					}),
				],
			},
		});
	});
});
