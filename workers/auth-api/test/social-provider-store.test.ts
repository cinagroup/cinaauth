import { describe, expect, it, vi } from "vitest";
import { createDatabase } from "../src/database";
import type { CloudflareBindings } from "../src/env";
import type { SocialProviderRow } from "../src/social-provider-store";
import {
	invalidateSocialSignInCache,
	readSocialProviderRows,
	readSocialSignInSettings,
	resolveSocialSignInConfig,
} from "../src/social-provider-store";

vi.mock("../src/database", () => ({
	createDatabase: vi.fn(),
}));

const createDatabaseMock = vi.mocked(createDatabase);

const ACCOUNT_ORIGIN = "https://accounts.cinaseek.ai";

const baseEnv = {
	GOOGLE_CLIENT_ID: "env-google-id",
	GOOGLE_CLIENT_SECRET: "env-google-secret",
	GITHUB_CLIENT_ID: "env-github-id",
	GITHUB_CLIENT_SECRET: "env-github-secret",
} as CloudflareBindings;

const socialRow = (
	providerId: string,
	overrides: Partial<SocialProviderRow> = {},
): SocialProviderRow => ({
	providerId,
	kind: "social",
	clientId: `db-${providerId}-id`,
	clientSecret: `db-${providerId}-secret`,
	enabled: true,
	config: null,
	...overrides,
});

const genericRow = (
	providerId: string,
	overrides: Partial<SocialProviderRow> = {},
): SocialProviderRow => ({
	providerId,
	kind: "generic",
	clientId: `db-${providerId}-id`,
	clientSecret: "db-generic-secret",
	enabled: true,
	config: {
		discoveryUrl: `https://${providerId}.example/.well-known/openid-configuration`,
	},
	...overrides,
});

const envGenericConfig = (providerId: string) =>
	JSON.stringify([
		{
			providerId,
			clientId: `env-${providerId}-id`,
			clientSecret: `env-${providerId}-secret`,
			discoveryUrl: `https://${providerId}.example/.well-known/openid-configuration`,
			redirectURI: `${ACCOUNT_ORIGIN}/api/auth/oauth2/callback/${providerId}`,
		},
	]);

const mockDatabase = ({
	rows = [],
	limit = 20,
	emailOtpLoginEnabled = true,
} = {}) => ({
	query: vi.fn(async (text: string) => {
		if (text.includes("cinaauth_sign_in_settings")) {
			return { rows: [{ socialProviderLimit: limit, emailOtpLoginEnabled }] };
		}
		return { rows };
	}),
	end: vi.fn(async () => undefined),
});

const resolve = async (env: CloudflareBindings, database: unknown) => {
	invalidateSocialSignInCache();
	createDatabaseMock.mockReturnValue(database as never);
	return resolveSocialSignInConfig(env, ACCOUNT_ORIGIN);
};

describe("social provider runtime resolution", () => {
	it("falls back to environment credentials without database rows", async () => {
		const config = await resolve(baseEnv, mockDatabase());
		expect(config.socialProviders.google).toEqual({
			clientId: "env-google-id",
			clientSecret: "env-google-secret",
			disableImplicitSignUp: false,
			disableSignUp: false,
			redirectURI: `${ACCOUNT_ORIGIN}/api/auth/callback/google`,
		});
		expect(config.socialProviders.github).toMatchObject({
			clientId: "env-github-id",
		});
		expect(config.capabilitiesProviders).toEqual([
			{ id: "google", type: "social" },
			{ id: "github", type: "social" },
		]);
	});

	it("overlays database social rows over environment credentials", async () => {
		const config = await resolve(
			baseEnv,
			mockDatabase({ rows: [socialRow("google"), socialRow("discord")] }),
		);
		expect(config.socialProviders.google).toMatchObject({
			clientId: "db-google-id",
		});
		expect(config.socialProviders.discord).toMatchObject({
			clientId: "db-discord-id",
			disableImplicitSignUp: false,
			disableSignUp: false,
			redirectURI: `${ACCOUNT_ORIGIN}/api/auth/callback/discord`,
		});
		expect(config.capabilitiesProviders).toEqual([
			{ id: "google", type: "social" },
			{ id: "github", type: "social" },
			{ id: "discord", type: "social" },
		]);
	});

	it("keeps disabled and partial database rows off the login page", async () => {
		const config = await resolve(
			baseEnv,
			mockDatabase({
				rows: [
					socialRow("google", { enabled: false }),
					socialRow("github", { clientId: "" }),
				],
			}),
		);
		expect(config.socialProviders.google).toMatchObject({
			clientId: "provider-id-reservation-only",
			enabled: false,
		});
		expect(config.capabilitiesProviders).toEqual([]);
	});

	it("rejects unknown social catalog ids without breaking other providers", async () => {
		const config = await resolve(
			baseEnv,
			mockDatabase({
				rows: [
					socialRow("not-a-catalog-provider" as never),
					socialRow("apple"),
				],
			}),
		);
		expect(config.capabilitiesProviders).toEqual([
			{ id: "google", type: "social" },
			{ id: "github", type: "social" },
			{ id: "apple", type: "social" },
		]);
	});

	it("merges database generic providers with environment providers by id", async () => {
		const env = {
			...baseEnv,
			GENERIC_OAUTH_CONFIG: envGenericConfig("enterprise-idp"),
		} as CloudflareBindings;
		const config = await resolve(
			env,
			mockDatabase({
				rows: [genericRow("enterprise-idp"), genericRow("partner-idp")],
			}),
		);
		expect(config.genericProviders).toHaveLength(2);
		const merged = config.genericProviders.find(
			(provider) => provider.providerId === "enterprise-idp",
		);
		expect(merged).toMatchObject({ clientId: "db-enterprise-idp-id" });
		expect(config.capabilitiesProviders).toEqual([
			{ id: "google", type: "social" },
			{ id: "github", type: "social" },
			{ id: "enterprise-idp", type: "generic-oauth" },
			{ id: "partner-idp", type: "generic-oauth" },
		]);
	});

	it("skips invalid database generic rows but keeps valid ones", async () => {
		const config = await resolve(
			baseEnv,
			mockDatabase({
				rows: [
					genericRow("broken-idp", {
						config: { discoveryUrl: "http://insecure" },
					}),
					genericRow("valid-idp"),
				],
			}),
		);
		expect(config.capabilitiesProviders).toEqual([
			{ id: "google", type: "social" },
			{ id: "github", type: "social" },
			{ id: "valid-idp", type: "generic-oauth" },
		]);
	});

	it("truncates the advertised login providers to the admin limit", async () => {
		const rows = [
			socialRow("apple"),
			socialRow("discord"),
			socialRow("twitter"),
		];
		const limited = await resolve(baseEnv, mockDatabase({ rows, limit: 2 }));
		expect(limited.capabilitiesProviders).toEqual([
			{ id: "google", type: "social" },
			{ id: "github", type: "social" },
		]);

		const disabled = await resolve(baseEnv, mockDatabase({ rows, limit: 0 }));
		expect(disabled.capabilitiesProviders).toEqual([]);
		expect(disabled.socialProviders.google).toMatchObject({
			clientId: "env-google-id",
		});
	});

	it("exposes the email OTP login toggle from settings", async () => {
		const enabled = await resolve(baseEnv, mockDatabase());
		expect(enabled.emailOtpLoginEnabled).toBe(true);
		const disabled = await resolve(
			baseEnv,
			mockDatabase({ emailOtpLoginEnabled: false }),
		);
		expect(disabled.emailOtpLoginEnabled).toBe(false);
	});

	it("falls back to environment-only sign-in when the store is unreachable", async () => {
		invalidateSocialSignInCache();
		createDatabaseMock.mockImplementation(() => {
			throw new Error("HYPERDRIVE binding is unavailable");
		});
		const config = await resolveSocialSignInConfig(baseEnv, ACCOUNT_ORIGIN);
		expect(config.databaseReady).toBe(false);
		expect(config.socialProviders.google).toMatchObject({
			clientId: "env-google-id",
		});
		expect(config.socialProviderLimit).toBe(20);
		expect(config.emailOtpLoginEnabled).toBe(true);
	});

	it("reads rows and settings through the shared database pool", async () => {
		const queries: string[] = [];
		const database = {
			query: async (text: string) => {
				queries.push(text);
				if (text.includes("cinaauth_sign_in_settings")) {
					return {
						rows: [{ socialProviderLimit: 3, emailOtpLoginEnabled: false }],
					};
				}
				return {
					rows: [
						{
							providerId: "google",
							kind: "social",
							clientId: "id",
							clientSecret: "secret",
							enabled: true,
							config: null,
						},
					],
				};
			},
			end: async () => undefined,
		} as unknown as Parameters<typeof readSocialProviderRows>[0];
		await expect(readSocialProviderRows(database)).resolves.toEqual([
			{
				providerId: "google",
				kind: "social",
				clientId: "id",
				clientSecret: "secret",
				enabled: true,
				config: null,
			},
		]);
		await expect(readSocialSignInSettings(database)).resolves.toEqual({
			socialProviderLimit: 3,
			emailOtpLoginEnabled: false,
		});
		expect(queries[0]).toContain("cinaauth_social_provider");
	});
});
