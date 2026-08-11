import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import type { CinaAuthDatabase } from "../src/database";
import {
	getProviderNamespaceInvariantReadiness,
	installProviderNamespaceInvariant,
	PROVIDER_NAMESPACE_INVARIANT_ID,
} from "../src/provider-namespace-invariant";

const FIXED_PROVIDER_IDS = [
	"credential",
	"email-otp",
	"magic-link",
	"phone-number",
	"anonymous",
	"siwe",
	"google",
	"github",
];

const createInstallerClient = (collision = false) => {
	const query = vi.fn(
		async (text: string, _values: readonly unknown[] | undefined) => {
			if (text.includes('AS "collision"')) {
				return { rows: [{ collision }] };
			}
			return { rows: [] };
		},
	);
	return { client: { query } as unknown as PoolClient, query };
};

const createReadinessDatabase = ({
	installed,
	hasConflict = false,
}: {
	installed: boolean;
	hasConflict?: boolean;
}) => {
	const query = vi.fn(async (text: string) => {
		if (text.includes("cinaauth_provider_namespace_invariant_ready")) {
			return { rows: [{ ready: installed }] };
		}
		if (text.includes('AS "hasConflict"')) {
			return { rows: [{ hasConflict }] };
		}
		throw new Error("Unexpected readiness query");
	});
	return { database: { query } as unknown as CinaAuthDatabase, query };
};

type RegistryKind = "account" | "sso" | "scim";

/** Mirrors the trigger's PK-serialized claim decision for concurrency tests. */
const createRegistryModel = () => {
	const claims = new Map<string, RegistryKind>();
	const activeProviders = new Set<string>();
	return {
		claim: async (providerId: string, desiredKind: RegistryKind) => {
			const existingKind = claims.get(providerId);
			if (existingKind === undefined) {
				claims.set(providerId, desiredKind);
				if (desiredKind !== "account") {
					activeProviders.add(`${desiredKind}:${providerId}`);
				}
				return;
			}
			if (existingKind === desiredKind) {
				if (desiredKind !== "account") {
					activeProviders.add(`${desiredKind}:${providerId}`);
				}
				return;
			}
			if (
				desiredKind === "account" &&
				activeProviders.has(`${existingKind}:${providerId}`)
			) {
				return;
			}
			throw new Error("provider namespace collision");
		},
		deleteProvider: (providerId: string) => {
			const kind = claims.get(providerId);
			if (kind && kind !== "account") {
				activeProviders.delete(`${kind}:${providerId}`);
			}
			// Deletion deliberately leaves the durable registry tombstone.
		},
		kind: (providerId: string) => claims.get(providerId),
	};
};

describe("provider namespace database invariant installer", () => {
	it("installs an idempotent PK registry, write triggers, and ordered backfill", async () => {
		const { client, query } = createInstallerClient();
		await installProviderNamespaceInvariant(client, ["configured-generic"]);

		const sql = query.mock.calls.map(([text]) => text as string);
		const joined = sql.join("\n");
		expect(PROVIDER_NAMESPACE_INVARIANT_ID).toBe(
			"provider-namespace-registry-v1",
		);
		expect(joined).toContain(
			'CREATE TABLE IF NOT EXISTS "cinaauth_provider_namespace"',
		);
		expect(joined).toContain('"provider_id" TEXT PRIMARY KEY');
		expect(joined).toContain(
			'LOCK TABLE "account", "ssoProvider", "scimProvider"',
		);
		expect(joined).toContain(
			'INSERT OR UPDATE OF "providerId" ON "ssoProvider"',
		);
		expect(joined).toContain(
			'INSERT OR UPDATE OF "providerId" ON "scimProvider"',
		);
		expect(joined).toContain('INSERT OR UPDATE OF "providerId" ON "account"');
		expect(joined).toContain('ON CONFLICT ("provider_id") DO NOTHING');
		expect(joined).toContain("existing_kind <> desired_kind");
		expect(joined).toContain('FROM "ssoProvider"');
		expect(joined).toContain('FROM "scimProvider"');
		expect(joined).toContain("active_provider_exists");
		expect(joined).toContain("ERRCODE = 'unique_violation'");
		expect(joined).not.toContain("AFTER DELETE");
		expect(joined).not.toContain('DELETE FROM "cinaauth_provider_namespace"');

		const ssoBackfill = sql.findIndex((text) =>
			text.includes("SELECT DISTINCT \"providerId\", 'sso'"),
		);
		const scimBackfill = sql.findIndex((text) =>
			text.includes("SELECT DISTINCT \"providerId\", 'scim'"),
		);
		const accountBackfill = sql.findIndex((text) =>
			text.includes("SELECT DISTINCT \"providerId\", 'account'"),
		);
		const reservedBackfill = sql.findIndex((text) =>
			text.includes("unnest($1::text[])"),
		);
		expect(ssoBackfill).toBeGreaterThan(-1);
		expect(scimBackfill).toBeGreaterThan(ssoBackfill);
		expect(accountBackfill).toBeGreaterThan(scimBackfill);
		expect(reservedBackfill).toBeGreaterThan(accountBackfill);

		const reservedCall = query.mock.calls[reservedBackfill];
		const reservedIds = reservedCall?.[1]?.[0] as string[];
		expect(new Set(reservedIds)).toEqual(
			new Set([...FIXED_PROVIDER_IDS, "configured-generic"]),
		);
	});

	it("fails installation before backfill when existing claims conflict", async () => {
		const { client, query } = createInstallerClient(true);
		await expect(installProviderNamespaceInvariant(client)).rejects.toThrow(
			"Provider namespace contains conflicting claims",
		);
		const sql = query.mock.calls.map(([text]) => text as string).join("\n");
		expect(sql).not.toContain("SELECT DISTINCT \"providerId\", 'sso'");
	});
});

describe("provider namespace invariant readiness", () => {
	it("requires both installed triggers and complete registry coverage", async () => {
		const ready = createReadinessDatabase({ installed: true });
		await expect(
			getProviderNamespaceInvariantReadiness(ready.database, [
				"configured-generic",
			]),
		).resolves.toEqual({
			id: PROVIDER_NAMESPACE_INVARIANT_ID,
			ready: true,
		});
		expect(ready.query).toHaveBeenCalledTimes(2);
		const installationQuery = ready.query.mock.calls[0]?.[0] as string;
		expect(installationQuery).toContain("JOIN pg_proc");
		expect(installationQuery).toContain("trigger.tgfoid");
		expect(installationQuery).toContain("trigger.tgenabled IN ('O', 'A')");
		expect(installationQuery).toContain("information_schema.columns");
		expect(installationQuery).toContain("FROM pg_constraint");
		expect(installationQuery).toContain("registry_constraint.contype = 'p'");
		expect(installationQuery).toContain(
			"registry_namespace.nspname = current_schema()",
		);
		expect(installationQuery).toContain(
			"function_namespace.oid = relation_namespace.oid",
		);
		expect(installationQuery).not.toContain("current_schemas(false)");

		const missing = createReadinessDatabase({ installed: false });
		await expect(
			getProviderNamespaceInvariantReadiness(missing.database),
		).resolves.toEqual({
			id: PROVIDER_NAMESPACE_INVARIANT_ID,
			ready: false,
		});
		expect(missing.query).toHaveBeenCalledOnce();

		const inconsistent = createReadinessDatabase({
			installed: true,
			hasConflict: true,
		});
		await expect(
			getProviderNamespaceInvariantReadiness(inconsistent.database),
		).resolves.toEqual({
			id: PROVIDER_NAMESPACE_INVARIANT_ID,
			ready: false,
		});
	});
});

describe("provider namespace registry claim semantics", () => {
	it("atomically permits only one of concurrent SSO and SCIM claims", async () => {
		const registry = createRegistryModel();
		const results = await Promise.allSettled([
			registry.claim("concurrent-enterprise", "sso"),
			registry.claim("concurrent-enterprise", "scim"),
		]);
		expect(
			results.filter((result) => result.status === "fulfilled"),
		).toHaveLength(1);
		expect(
			results.filter((result) => result.status === "rejected"),
		).toHaveLength(1);
	});

	it("keeps the same-kind tombstone across SCIM delete and recreate rotation", async () => {
		const registry = createRegistryModel();
		await registry.claim("rotating-scim", "scim");
		await registry.claim("rotating-scim", "account");
		registry.deleteProvider("rotating-scim");
		await expect(
			registry.claim("rotating-scim", "scim"),
		).resolves.toBeUndefined();
		await expect(registry.claim("rotating-scim", "sso")).rejects.toThrow(
			"provider namespace collision",
		);
		expect(registry.kind("rotating-scim")).toBe("scim");
	});

	it("allows active enterprise provisioning but rejects account inserts against tombstones", async () => {
		for (const kind of ["sso", "scim"] as const) {
			const providerId = `enterprise-${kind}`;
			const registry = createRegistryModel();
			await registry.claim(providerId, kind);
			await expect(
				registry.claim(providerId, "account"),
			).resolves.toBeUndefined();
			registry.deleteProvider(providerId);
			await expect(registry.claim(providerId, "account")).rejects.toThrow(
				"provider namespace collision",
			);
			await registry.claim(providerId, kind);
			await expect(
				registry.claim(providerId, "account"),
			).resolves.toBeUndefined();
		}
	});

	it("retains an account reservation after provider configuration is removed", async () => {
		const registry = createRegistryModel();
		await registry.claim("retired-generic", "account");
		// A later deployment no longer seeds this configured provider id.
		await expect(registry.claim("retired-generic", "sso")).rejects.toThrow(
			"provider namespace collision",
		);
		expect(registry.kind("retired-generic")).toBe("account");
	});
});
