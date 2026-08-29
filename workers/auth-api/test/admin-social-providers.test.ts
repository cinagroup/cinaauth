import { describe, expect, it, vi } from "vitest";
import type { AdminSocialProvidersDependencies } from "../src/admin-social-providers";
import {
	handleAdminDeleteSocialProvider,
	handleAdminGetAuthenticationSettings,
	handleAdminGetSocialProviders,
	handleAdminUpdateAuthenticationSettings,
	handleAdminUpdateSignInSettings,
	handleAdminUpsertSocialProvider,
} from "../src/admin-social-providers";
import type { CinaAuthDatabase } from "../src/database";
import type { CloudflareBindings } from "../src/env";

const ADMIN_ORIGIN = "https://admin.cinaseek.ai";

const env = {
	CINAAUTH_ACCOUNT_ORIGIN: "https://accounts.cinaseek.ai",
} as CloudflareBindings;

const makeDatabase = () => {
	const query = vi.fn(async (text: string, _values?: readonly unknown[]) => {
		if (text.startsWith('SELECT "provider_id"')) return { rows: [] };
		if (text.includes("COUNT(*)")) return { rows: [{ total: 0 }] };
		if (text.startsWith('UPDATE "cinaauth_sign_in_settings"')) {
			return { rowCount: 1 };
		}
		if (text.startsWith("DELETE FROM")) return { rowCount: 1 };
		return { rows: [], rowCount: 1 };
	});
	return { database: { query } as unknown as CinaAuthDatabase, query };
};

const makeDependencies = (
	role: string | null = "super_admin",
	options: {
		createdAt?: Date;
		impersonatedBy?: string | null;
		allowed?: boolean;
		database?: CinaAuthDatabase;
	} = {},
) => {
	const fallback = makeDatabase();
	const getSession = vi.fn(async () =>
		role === null
			? null
			: {
					user: { id: "admin-1", role },
					session: {
						createdAt: options.createdAt ?? new Date(),
						impersonatedBy: options.impersonatedBy ?? null,
					},
				},
	);
	const dependencies: AdminSocialProvidersDependencies = {
		env,
		database: options.database ?? fallback.database,
		getSession,
		consumeRateLimit: vi.fn(async () => ({
			allowed: options.allowed ?? true,
			retryAfter: null,
		})),
		writeAuditEvent: vi.fn(async () => undefined),
		logEvent: vi.fn(),
	};
	return {
		dependencies,
		getSession,
		query: options.database
			? (options.database as unknown as { query: ReturnType<typeof vi.fn> })
					.query
			: fallback.query,
	};
};

const body = (value: unknown) => async () =>
	({ ok: true, body: value }) as const;

describe("admin social provider control plane", () => {
	it("audits every authentication method and exposes effective availability", async () => {
		const readDb = makeDatabase();
		readDb.query.mockImplementation(async (text: string) => {
			if (text.includes('FROM "cinaauth_social_provider"')) {
				return {
					rows: [
						{
							providerId: "google",
							kind: "social",
							clientId: "google-client",
							clientSecret: "google-secret",
							enabled: true,
							config: null,
						},
					],
				};
			}
			if (text.includes("cinaauth_sign_in_settings")) {
				return {
					rows: [
						{
							socialProviderLimit: 20,
							emailOtpLoginEnabled: true,
							emailPasswordLoginEnabled: false,
							passkeyLoginEnabled: false,
							siweLoginEnabled: true,
							googleOneTapEnabled: true,
						},
					],
				};
			}
			return { rows: [] };
		});
		const security = makeDependencies("security_admin", {
			database: readDb.database,
		});
		security.dependencies.getDeliveryCapabilities = vi.fn(async () => ({
			email: false,
			sms: true,
		}));

		const result = await handleAdminGetAuthenticationSettings(
			security.dependencies,
		);
		expect(result.status).toBe(200);
		expect(result.body).toMatchObject({
			ok: true,
			data: {
				settings: {
					emailOtpLoginEnabled: true,
					googleOneTapEnabled: true,
				},
				methods: {
					emailOtp: { available: false, effective: false },
					emailPassword: { available: true, effective: false },
					passkey: { available: true, effective: false },
					googleOneTap: { available: true, effective: true },
					phoneOtp: { available: true },
					magicLink: { available: false },
					username: { available: false },
					twoFactor: { available: true },
					sso: { available: true },
				},
			},
		});
	});

	it("governs authentication setting changes and prevents sign-in lockout", async () => {
		const settings = {
			emailOtpLoginEnabled: false,
			emailPasswordLoginEnabled: false,
			passkeyLoginEnabled: false,
			siweLoginEnabled: false,
			googleOneTapEnabled: false,
		};
		const locked = makeDependencies();
		locked.dependencies.getDeliveryCapabilities = vi.fn(async () => ({
			email: true,
			sms: false,
		}));
		expect(
			(
				await handleAdminUpdateAuthenticationSettings(
					locked.dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					body(settings),
				)
			).status,
		).toBe(409);

		const unavailableOneTap = makeDependencies();
		unavailableOneTap.dependencies.getDeliveryCapabilities = vi.fn(
			async () => ({ email: true, sms: false }),
		);
		expect(
			(
				await handleAdminUpdateAuthenticationSettings(
					unavailableOneTap.dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					body({
						...settings,
						emailOtpLoginEnabled: true,
						googleOneTapEnabled: true,
					}),
				)
			).status,
		).toBe(409);

		const withOAuth = makeDependencies();
		withOAuth.query.mockImplementation(async (text: string) => {
			if (text.includes('FROM "cinaauth_social_provider"')) {
				return {
					rows: [
						{
							providerId: "github",
							kind: "social",
							clientId: "github-id",
							clientSecret: "github-secret",
							enabled: true,
							config: null,
						},
					],
				};
			}
			if (text.startsWith('UPDATE "cinaauth_sign_in_settings"')) {
				return { rowCount: 1 };
			}
			return { rows: [] };
		});
		withOAuth.dependencies.getDeliveryCapabilities = vi.fn(async () => ({
			email: true,
			sms: false,
		}));
		const updated = await handleAdminUpdateAuthenticationSettings(
			withOAuth.dependencies,
			ADMIN_ORIGIN,
			ADMIN_ORIGIN,
			body(settings),
		);
		expect(updated.status).toBe(200);
		expect(withOAuth.query).toHaveBeenCalledWith(
			expect.stringContaining('"email_password_login_enabled" = $2'),
			[false, false, false, false, false, "admin-1"],
		);
		expect(withOAuth.dependencies.writeAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "security.authentication.settings",
				phase: "outcome",
				result: "success",
			}),
		);

		const hiddenOAuth = makeDependencies();
		hiddenOAuth.query.mockImplementation(async (text: string) => {
			if (text.includes('FROM "cinaauth_social_provider"')) {
				return {
					rows: [
						{
							providerId: "github",
							kind: "social",
							clientId: "github-id",
							clientSecret: "github-secret",
							enabled: true,
							config: null,
						},
					],
				};
			}
			if (text.includes("cinaauth_sign_in_settings")) {
				return {
					rows: [
						{
							socialProviderLimit: 0,
							emailOtpLoginEnabled: true,
							emailPasswordLoginEnabled: false,
							passkeyLoginEnabled: false,
							siweLoginEnabled: true,
							googleOneTapEnabled: false,
						},
					],
				};
			}
			return { rows: [] };
		});
		hiddenOAuth.dependencies.getDeliveryCapabilities = vi.fn(async () => ({
			email: false,
			sms: false,
		}));
		expect(
			(
				await handleAdminUpdateAuthenticationSettings(
					hiddenOAuth.dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					body(settings),
				)
			).status,
		).toBe(409);

		const readOnly = makeDependencies("security_admin");
		expect(
			(
				await handleAdminUpdateAuthenticationSettings(
					readOnly.dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					body({ ...settings, emailOtpLoginEnabled: true }),
				)
			).status,
		).toBe(403);
	});
	it("lists catalog providers without ever exposing secrets", async () => {
		const readDb = makeDatabase();
		readDb.query.mockImplementation(async (text: string) => {
			if (text.includes('FROM "cinaauth_social_provider"')) {
				return {
					rows: [
						{
							providerId: "google",
							kind: "social",
							clientId: "db-google-id",
							clientSecret: "db-google-secret",
							enabled: true,
							config: null,
						},
					],
				};
			}
			if (text.includes("cinaauth_sign_in_settings")) {
				return { rows: [{ socialProviderLimit: 4 }] };
			}
			return { rows: [] };
		});
		const { dependencies } = makeDependencies("super_admin", {
			database: readDb.database,
		});

		const result = await handleAdminGetSocialProviders(dependencies);
		expect(result.status).toBe(200);
		const payload = JSON.stringify(result.body);
		expect(payload).not.toContain("db-google-secret");
		expect(payload).toContain("db-google-id");
		expect(payload).toContain('"socialProviderLimit":4');

		const security = makeDependencies("security_admin", {
			database: readDb.database,
		});
		expect(
			(await handleAdminGetSocialProviders(security.dependencies)).status,
		).toBe(200);

		const anonymous = makeDependencies(null);
		expect(
			(await handleAdminGetSocialProviders(anonymous.dependencies)).status,
		).toBe(401);
	});

	it("requires manage permission, freshness, admin origin, and rate limit for writes", async () => {
		const readOnly = makeDependencies("security_admin");
		expect(
			(
				await handleAdminUpsertSocialProvider(
					readOnly.dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					body({
						kind: "social",
						providerId: "google",
						clientId: "id",
						clientSecret: "secret",
						enabled: true,
					}),
				)
			).status,
		).toBe(403);

		const stale = makeDependencies("super_admin", {
			createdAt: new Date(0),
		});
		expect(
			(
				await handleAdminUpsertSocialProvider(
					stale.dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					body({}),
				)
			).status,
		).toBe(403);

		const crossOrigin = makeDependencies();
		expect(
			(
				await handleAdminUpsertSocialProvider(
					crossOrigin.dependencies,
					"https://evil.example",
					ADMIN_ORIGIN,
					body({}),
				)
			).status,
		).toBe(403);

		const impersonated = makeDependencies("super_admin", {
			impersonatedBy: "admin-original",
		});
		expect(
			(
				await handleAdminUpsertSocialProvider(
					impersonated.dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					body({}),
				)
			).status,
		).toBe(403);

		const limited = makeDependencies("super_admin", { allowed: false });
		const limitedResult = await handleAdminUpsertSocialProvider(
			limited.dependencies,
			ADMIN_ORIGIN,
			ADMIN_ORIGIN,
			body({}),
		);
		expect(limitedResult.status).toBe(429);
	});

	it("upserts a social provider and audits without credentials", async () => {
		const { dependencies, query } = makeDependencies();
		const result = await handleAdminUpsertSocialProvider(
			dependencies,
			ADMIN_ORIGIN,
			ADMIN_ORIGIN,
			body({
				kind: "social",
				providerId: "discord",
				clientId: "discord-client-id",
				clientSecret: "discord-client-secret",
				enabled: true,
			}),
		);
		expect(result.status).toBe(200);
		const upsert = query.mock.calls.find(([text]) =>
			(text as string).includes('INSERT INTO "cinaauth_social_provider"'),
		);
		expect(upsert?.[1]).toEqual([
			"discord",
			"discord-client-id",
			"discord-client-secret",
			true,
			"admin-1",
		]);
		const auditCalls = (
			dependencies.writeAuditEvent as unknown as {
				mock: { calls: unknown[][] };
			}
		).mock.calls;
		expect(JSON.stringify(auditCalls)).not.toContain("discord-client-secret");

		const unknown = makeDependencies();
		expect(
			(
				await handleAdminUpsertSocialProvider(
					unknown.dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					body({
						kind: "social",
						providerId: "not-in-catalog",
						clientId: "id",
						clientSecret: "secret",
						enabled: true,
					}),
				)
			).status,
		).toBe(400);
	});

	it("upserts a generic provider against the production contract", async () => {
		const { dependencies } = makeDependencies();
		const result = await handleAdminUpsertSocialProvider(
			dependencies,
			ADMIN_ORIGIN,
			ADMIN_ORIGIN,
			body({
				kind: "generic",
				providerId: "enterprise-idp",
				clientId: "generic-client-id",
				clientSecret: "generic-client-secret",
				enabled: true,
				discoveryUrl:
					"https://idp.example.com/.well-known/openid-configuration",
			}),
		);
		expect(result.status).toBe(200);

		const missingEndpoints = makeDependencies();
		expect(
			(
				await handleAdminUpsertSocialProvider(
					missingEndpoints.dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					body({
						kind: "generic",
						providerId: "broken-idp",
						clientId: "generic-client-id",
						clientSecret: "generic-client-secret",
						enabled: true,
					}),
				)
			).status,
		).toBe(400);

		const reservedCatalogId = makeDependencies();
		expect(
			(
				await handleAdminUpsertSocialProvider(
					reservedCatalogId.dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					body({
						kind: "generic",
						providerId: "google",
						clientId: "generic-client-id",
						clientSecret: "generic-client-secret",
						enabled: true,
						discoveryUrl:
							"https://idp.example.com/.well-known/openid-configuration",
					}),
				)
			).status,
		).toBe(400);

		const unknownField = makeDependencies();
		expect(
			(
				await handleAdminUpsertSocialProvider(
					unknownField.dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					body({
						kind: "generic",
						providerId: "enterprise-idp",
						clientId: "generic-client-id",
						clientSecret: "generic-client-secret",
						enabled: true,
						discoveryUrl:
							"https://idp.example.com/.well-known/openid-configuration",
						unexpected: true,
					}),
				)
			).status,
		).toBe(400);
	});

	it("deletes a staged provider and reports unknown ids", async () => {
		const { dependencies } = makeDependencies();
		const result = await handleAdminDeleteSocialProvider(
			dependencies,
			ADMIN_ORIGIN,
			ADMIN_ORIGIN,
			body({ providerId: "discord" }),
		);
		expect(result.status).toBe(200);

		const missing = makeDependencies();
		missing.dependencies.database = (() => {
			const db = makeDatabase();
			db.query.mockImplementation(async () => ({ rowCount: 0 }));
			return db.database;
		})();
		expect(
			(
				await handleAdminDeleteSocialProvider(
					missing.dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					body({ providerId: "discord" }),
				)
			).status,
		).toBe(404);
	});

	it("updates the sign-in provider limit and OTP toggle within bounds", async () => {
		const { dependencies, query } = makeDependencies();
		const result = await handleAdminUpdateSignInSettings(
			dependencies,
			ADMIN_ORIGIN,
			ADMIN_ORIGIN,
			body({ socialProviderLimit: 3, emailOtpLoginEnabled: false }),
		);
		expect(result.status).toBe(200);
		expect(query.mock.calls[0]?.[1]).toEqual([3, false, "admin-1"]);

		for (const invalid of [
			{ socialProviderLimit: -1, emailOtpLoginEnabled: true },
			{ socialProviderLimit: 21, emailOtpLoginEnabled: true },
			{ socialProviderLimit: 1.5, emailOtpLoginEnabled: true },
			{ socialProviderLimit: 3, emailOtpLoginEnabled: "yes" },
			{ socialProviderLimit: 3 },
		]) {
			const rejected = makeDependencies();
			expect(
				(
					await handleAdminUpdateSignInSettings(
						rejected.dependencies,
						ADMIN_ORIGIN,
						ADMIN_ORIGIN,
						body(invalid),
					)
				).status,
			).toBe(400);
		}
	});
});
