import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import {
	createSCIMOwnershipToken,
	migrateLegacySCIMProviderOwnership,
	parseSCIMOwnershipMigrationInput,
} from "../src/scim-ownership-migration";

type QueryCall = {
	text: string;
	values: readonly unknown[];
};

type Fixture = {
	provider?: {
		id: string;
		providerId: string;
		organizationId: string | null;
		userId: string | null;
	} | null;
	organizationExists?: boolean;
	ownerExists?: boolean;
	memberRole?: string | null;
	accountCount?: number;
	failOn?: string;
	ssoProviderExists?: boolean;
};

const migrationInput = {
	providerId: "legacy-scim",
	organizationId: "org-1",
	ownerUserId: "owner-1",
};

const makePool = (fixture: Fixture = {}) => {
	const calls: QueryCall[] = [];
	const release = vi.fn();
	const client = {
		query: async (text: string, values: readonly unknown[] = []) => {
			calls.push({ text, values });
			if (fixture.failOn && text.includes(fixture.failOn)) {
				throw new Error("simulated PostgreSQL timeout");
			}
			if (text.includes('FROM "scimProvider"')) {
				return {
					rows:
						fixture.provider === undefined
							? [
									{
										id: "scim-row-1",
										providerId: "legacy-scim",
										organizationId: null,
										userId: null,
									},
								]
							: fixture.provider
								? [fixture.provider]
								: [],
				};
			}
			if (text.includes('FROM "ssoProvider"')) {
				return {
					rows: fixture.ssoProviderExists ? [{ id: "sso-row-1" }] : [],
				};
			}
			if (text.includes('FROM "organization"')) {
				return {
					rows: fixture.organizationExists === false ? [] : [{ id: "org-1" }],
				};
			}
			if (text.includes('FROM "user"')) {
				return {
					rows: fixture.ownerExists === false ? [] : [{ id: "owner-1" }],
				};
			}
			if (text.includes('FROM "member"')) {
				const role =
					fixture.memberRole === undefined ? "owner" : fixture.memberRole;
				return { rows: role === null ? [] : [{ role }] };
			}
			if (text.includes('FROM "account"')) {
				return { rows: [{ count: fixture.accountCount ?? 0 }] };
			}
			if (text.startsWith('UPDATE "scimProvider"')) {
				return { rows: [{ id: "scim-row-1" }], rowCount: 1 };
			}
			return { rows: [], rowCount: 1 };
		},
		release,
	};
	const connect = vi.fn(async () => client);
	const pool = {
		connect,
	} as unknown as Pool;
	return { calls, connect, pool, release };
};

describe("SCIM ownership migration request validation", () => {
	it("defaults to preview and rejects ambiguous or extra fields", () => {
		expect(parseSCIMOwnershipMigrationInput(migrationInput)).toEqual({
			...migrationInput,
			apply: false,
		});
		expect(
			parseSCIMOwnershipMigrationInput({ ...migrationInput, apply: true }),
		).toEqual({ ...migrationInput, apply: true });
		expect(
			parseSCIMOwnershipMigrationInput({ ...migrationInput, apply: "true" }),
		).toBeNull();
		expect(
			parseSCIMOwnershipMigrationInput({ ...migrationInput, unexpected: true }),
		).toBeNull();
		expect(
			parseSCIMOwnershipMigrationInput({
				...migrationInput,
				organizationId: " org-1 ",
			}),
		).toBeNull();
		expect(
			parseSCIMOwnershipMigrationInput({
				...migrationInput,
				providerId: "legacy:scim",
			}),
		).toBeNull();
		expect(
			parseSCIMOwnershipMigrationInput({
				...migrationInput,
				providerId: "legacy\nscim",
			}),
		).toBeNull();
		for (const providerId of ["credential", "email-otp", "google", "github"]) {
			expect(
				parseSCIMOwnershipMigrationInput({
					...migrationInput,
					providerId,
				}),
			).toBeNull();
		}
		expect(
			parseSCIMOwnershipMigrationInput(
				{ ...migrationInput, providerId: "google" },
				["google"],
			),
		).toBeNull();
	});
});

describe("controlled legacy SCIM ownership migration", () => {
	it("rejects built-in and configured provider ids before opening PostgreSQL", async () => {
		for (const providerId of [
			"credential",
			"email-otp",
			"google",
			"github",
			"configured-social",
		]) {
			for (const apply of [false, true]) {
				const { calls, connect, pool } = makePool();
				const createToken = vi.fn();
				const result = await migrateLegacySCIMProviderOwnership(
					pool,
					{ ...migrationInput, providerId, apply },
					{
						reservedProviderIds:
							providerId === "configured-social" ? ["configured-social"] : [],
						createToken,
					},
				);

				expect(result.status).toBe("provider_id_collision");
				expect(result.tokenRotated).toBe(false);
				expect(result).not.toHaveProperty("scimToken");
				expect(connect).not.toHaveBeenCalled();
				expect(createToken).not.toHaveBeenCalled();
				expect(calls).toEqual([]);
			}
		}
	});

	it("rejects an existing SSO provider collision without update, token, or audit", async () => {
		for (const apply of [false, true]) {
			const { calls, pool } = makePool({ ssoProviderExists: true });
			const createToken = vi.fn();
			const result = await migrateLegacySCIMProviderOwnership(
				pool,
				{ ...migrationInput, apply },
				{ createToken },
			);

			expect(result.status).toBe("provider_id_collision");
			expect(result.tokenRotated).toBe(false);
			expect(result).not.toHaveProperty("scimToken");
			expect(createToken).not.toHaveBeenCalled();
			expect(
				calls.some((call) => call.text.startsWith('UPDATE "scimProvider"')),
			).toBe(false);
			expect(
				calls.some((call) => call.text.startsWith('INSERT INTO "auditLog"')),
			).toBe(false);
			expect(calls.map((call) => call.text)).toContain("COMMIT");
		}
	});

	it("previews a zero-account null-owner provider without changing it", async () => {
		const { calls, pool, release } = makePool();

		const result = await migrateLegacySCIMProviderOwnership(pool, {
			...migrationInput,
			apply: false,
		});

		expect(result).toMatchObject({
			mode: "preview",
			status: "ready",
			providerId: "legacy-scim",
			organizationId: "org-1",
			ownerUserId: "owner-1",
			accountCount: 0,
			tokenRotated: false,
		});
		expect(
			calls.some((call) => call.text.startsWith('UPDATE "scimProvider"')),
		).toBe(false);
		expect(
			calls.some((call) => call.text.startsWith('INSERT INTO "auditLog"')),
		).toBe(true);
		expect(calls.map((call) => call.text)).toContain("COMMIT");
		expect(calls.map((call) => call.text)).not.toContain("ROLLBACK");
		expect(release).toHaveBeenCalledOnce();
	});

	it("claims and rotates a zero-account provider atomically", async () => {
		const { calls, pool } = makePool();
		const plaintextToken = "one-time-plaintext-scim-token";

		const result = await migrateLegacySCIMProviderOwnership(
			pool,
			{ ...migrationInput, apply: true },
			{
				createToken: async () => ({
					scimToken: plaintextToken,
					storedToken: "sha256-token-hash",
				}),
			},
		);

		expect(result).toEqual({
			mode: "apply",
			status: "migrated",
			providerId: "legacy-scim",
			organizationId: "org-1",
			ownerUserId: "owner-1",
			accountCount: 0,
			tokenRotated: true,
			scimToken: plaintextToken,
		});
		expect(calls[0]?.text).toBe("BEGIN ISOLATION LEVEL SERIALIZABLE");
		const update = calls.find((call) =>
			call.text.startsWith('UPDATE "scimProvider"'),
		);
		expect(update?.text).toContain('"organizationId" IS NULL');
		expect(update?.text).toContain('"userId" IS NULL');
		expect(update?.values).toContain("sha256-token-hash");
		expect(update?.values).not.toContain(plaintextToken);
		const audit = calls.find((call) =>
			call.text.startsWith('INSERT INTO "auditLog"'),
		);
		expect(audit?.values).not.toContain(plaintextToken);
		expect(JSON.stringify(audit?.values)).not.toContain("sha256-token-hash");
		expect(calls.map((call) => call.text)).toContain("COMMIT");
	});

	it("is idempotent for the exact destination without issuing another token", async () => {
		const { calls, pool } = makePool({
			provider: {
				id: "scim-row-1",
				providerId: "legacy-scim",
				organizationId: "org-1",
				userId: "owner-1",
			},
			accountCount: 4,
		});

		const result = await migrateLegacySCIMProviderOwnership(pool, {
			...migrationInput,
			apply: true,
		});

		expect(result).toMatchObject({
			mode: "apply",
			status: "already_migrated",
			tokenRotated: false,
		});
		expect(result).not.toHaveProperty("scimToken");
		expect(calls.some((call) => call.text.includes('FROM "account"'))).toBe(
			false,
		);
		expect(
			calls.some((call) => call.text.startsWith('UPDATE "scimProvider"')),
		).toBe(false);
	});

	it("fails closed when the legacy provider already has SCIM accounts", async () => {
		const { calls, pool } = makePool({ accountCount: 1 });

		const result = await migrateLegacySCIMProviderOwnership(pool, {
			...migrationInput,
			apply: true,
		});

		expect(result).toMatchObject({
			status: "provider_has_accounts",
			accountCount: 1,
			tokenRotated: false,
		});
		expect(
			calls.some((call) => call.text.startsWith('UPDATE "scimProvider"')),
		).toBe(false);
	});

	it("never rebinds an owned or partially owned provider", async () => {
		for (const provider of [
			{
				id: "scim-row-1",
				providerId: "legacy-scim",
				organizationId: "org-other",
				userId: "owner-other",
			},
			{
				id: "scim-row-1",
				providerId: "legacy-scim",
				organizationId: null,
				userId: "owner-1",
			},
		]) {
			const { calls, pool } = makePool({ provider });
			const result = await migrateLegacySCIMProviderOwnership(pool, {
				...migrationInput,
				apply: true,
			});

			expect(result.status).toBe("provider_already_owned");
			expect(
				calls.some((call) => call.text.startsWith('UPDATE "scimProvider"')),
			).toBe(false);
		}
	});

	it("requires the designated owner to be an owner or admin in the destination", async () => {
		for (const memberRole of [null, "member"] as const) {
			const { calls, pool } = makePool({ memberRole });
			const result = await migrateLegacySCIMProviderOwnership(pool, {
				...migrationInput,
				apply: true,
			});

			expect(result.status).toBe("owner_not_authorized");
			expect(
				calls.some((call) => call.text.startsWith('UPDATE "scimProvider"')),
			).toBe(false);
		}
	});

	it("audits blocked claims without token material", async () => {
		for (const fixture of [
			{ provider: null },
			{ organizationExists: false },
			{ ownerExists: false },
			{ memberRole: "member" },
			{ accountCount: 1 },
		] satisfies Fixture[]) {
			const { calls, pool } = makePool(fixture);
			const result = await migrateLegacySCIMProviderOwnership(pool, {
				...migrationInput,
				apply: true,
			});
			const audit = calls.find((call) =>
				call.text.startsWith('INSERT INTO "auditLog"'),
			);

			expect(result.status).not.toBe("migrated");
			expect(audit).toBeDefined();
			expect(JSON.stringify(audit?.values)).not.toContain("scimToken");
			expect(JSON.stringify(audit?.values)).not.toContain("storedToken");
			expect(calls.map((call) => call.text)).toContain("COMMIT");
		}
	});

	it("rolls back and releases the connection when a statement timeout setup fails", async () => {
		const { calls, pool, release } = makePool({
			failOn: "SET LOCAL statement_timeout",
		});

		await expect(
			migrateLegacySCIMProviderOwnership(pool, {
				...migrationInput,
				apply: true,
			}),
		).rejects.toThrow("simulated PostgreSQL timeout");
		expect(calls.map((call) => call.text)).toContain("ROLLBACK");
		expect(calls.map((call) => call.text)).not.toContain("COMMIT");
		expect(release).toHaveBeenCalledOnce();
	});
});

describe("SCIM ownership token rotation", () => {
	it("binds the one-time bearer to the destination and stores only its hash", async () => {
		const result = await createSCIMOwnershipToken(
			"legacy-scim",
			"org:with:separator",
			new Uint8Array(Array.from({ length: 32 }, (_, index) => index)),
		);
		const decoded = new TextDecoder().decode(
			Uint8Array.from(
				atob(
					result.scimToken.replace(/-/g, "+").replace(/_/g, "/") +
						"=".repeat((4 - (result.scimToken.length % 4)) % 4),
				),
				(character) => character.charCodeAt(0),
			),
		);

		expect(decoded).toContain(":legacy-scim:org:with:separator");
		expect(result.storedToken).not.toContain(decoded.split(":")[0]);
		expect(result.storedToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(result.scimToken).not.toContain("=");
	});
});
