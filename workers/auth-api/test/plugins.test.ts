import {
	ENTITLEMENT_FEATURES,
	ENTITLEMENT_LIMITS,
} from "@cinaauth/auth-web-contract";
import { describe, expect, it } from "vitest";
import type { CloudflareBindings } from "../src/env";
import { getConfiguredSocialProviders } from "../src/auth";
import {
	canManageOrganizationBilling,
	createAuthPlugins,
	JWT_GRACE_PERIOD_SECONDS,
	JWT_ROTATION_INTERVAL_SECONDS,
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
				redirectURI:
					"https://accounts.cinaseek.ai/api/auth/callback/google",
			},
			github: {
				clientId: "github-client-id",
				clientSecret: "github-secret",
				redirectURI:
					"https://accounts.cinaseek.ai/api/auth/callback/github",
			},
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
