import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	cloudflareContext: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
	getCloudflareContext: mocks.cloudflareContext,
}));

const CLIENT_SECRET = `cina_cs_${"c".repeat(40)}`;
const BRIDGE_SECRET = "b".repeat(40);
const TRANSACTION_SECRET = "t".repeat(40);
const LEGACY_NAMES = [
	"CINAADMIN_OIDC_CLIENT_SECRET",
	"CINAADMIN_OIDC_BRIDGE_SECRET",
	"CINAADMIN_OIDC_TRANSACTION_SECRET",
] as const;

const setLegacySecrets = () => {
	process.env.CINAADMIN_OIDC_CLIENT_SECRET = `cina_cs_${"l".repeat(40)}`;
	process.env.CINAADMIN_OIDC_BRIDGE_SECRET = "l".repeat(40);
	process.env.CINAADMIN_OIDC_TRANSACTION_SECRET = "x".repeat(40);
};

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	setLegacySecrets();
});

afterEach(() => {
	for (const name of LEGACY_NAMES) delete process.env[name];
});

describe("Admin OIDC Secrets Store resolution", () => {
	it("prefers every V2 binding over a populated legacy secret", async () => {
		const getClient = vi.fn().mockResolvedValue(CLIENT_SECRET);
		const getBridge = vi.fn().mockResolvedValue(BRIDGE_SECRET);
		const getTransaction = vi.fn().mockResolvedValue(TRANSACTION_SECRET);
		mocks.cloudflareContext.mockResolvedValue({
			env: {
				CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2: { get: getClient },
				CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2: { get: getBridge },
				CINAADMIN_OIDC_TRANSACTION_SECRET_STORE_V2: {
					get: getTransaction,
				},
			},
		});
		const { getAdminOidcSecrets } = await import("@/lib/cinaauth/oidc-secrets");

		await expect(getAdminOidcSecrets()).resolves.toEqual({
			CINAADMIN_OIDC_CLIENT_SECRET: CLIENT_SECRET,
			CINAADMIN_OIDC_BRIDGE_SECRET: BRIDGE_SECRET,
			CINAADMIN_OIDC_TRANSACTION_SECRET: TRANSACTION_SECRET,
		});
		expect(getClient).toHaveBeenCalledOnce();
		expect(getBridge).toHaveBeenCalledOnce();
		expect(getTransaction).toHaveBeenCalledOnce();
	});

	it("fails closed when an existing Store binding cannot be read", async () => {
		mocks.cloudflareContext.mockResolvedValue({
			env: {
				CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2: {
					get: vi.fn().mockRejectedValue(new Error("store unavailable")),
				},
			},
		});
		const { getAdminOidcSecrets } = await import("@/lib/cinaauth/oidc-secrets");

		await expect(getAdminOidcSecrets()).rejects.toThrow(
			"Unable to read Admin OIDC Secrets Store binding",
		);
	});

	it("fails closed when an existing Store binding contains a weak value", async () => {
		mocks.cloudflareContext.mockResolvedValue({
			env: {
				CINAADMIN_OIDC_TRANSACTION_SECRET_STORE_V2: {
					get: vi.fn().mockResolvedValue("weak"),
				},
			},
		});
		const { getAdminOidcTransactionSecret } = await import(
			"@/lib/cinaauth/oidc-secrets"
		);

		await expect(getAdminOidcTransactionSecret()).rejects.toThrow(
			"Missing or weak Admin OIDC secret",
		);
	});

	it("does not treat an explicitly broken binding as absent", async () => {
		mocks.cloudflareContext.mockResolvedValue({
			env: { CINAADMIN_OIDC_TRANSACTION_SECRET_STORE_V2: undefined },
		});
		const { getAdminOidcTransactionSecret } = await import(
			"@/lib/cinaauth/oidc-secrets"
		);

		await expect(getAdminOidcTransactionSecret()).rejects.toThrow(
			"Invalid Admin OIDC Secrets Store binding",
		);
	});

	it("uses legacy values only when the corresponding bindings are absent", async () => {
		mocks.cloudflareContext.mockResolvedValue({ env: {} });
		const { getAdminOidcSecrets } = await import("@/lib/cinaauth/oidc-secrets");

		await expect(getAdminOidcSecrets()).resolves.toEqual({
			CINAADMIN_OIDC_CLIENT_SECRET: `cina_cs_${"l".repeat(40)}`,
			CINAADMIN_OIDC_BRIDGE_SECRET: "l".repeat(40),
			CINAADMIN_OIDC_TRANSACTION_SECRET: "x".repeat(40),
		});
	});

	it("reads only the transaction binding for recent-auth verification", async () => {
		const getTransaction = vi.fn().mockResolvedValue(TRANSACTION_SECRET);
		const getOther = vi.fn().mockRejectedValue(new Error("must not be read"));
		mocks.cloudflareContext.mockResolvedValue({
			env: {
				CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2: { get: getOther },
				CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2: { get: getOther },
				CINAADMIN_OIDC_TRANSACTION_SECRET_STORE_V2: {
					get: getTransaction,
				},
			},
		});
		const { getAdminOidcTransactionSecret } = await import(
			"@/lib/cinaauth/oidc-secrets"
		);

		await expect(getAdminOidcTransactionSecret()).resolves.toBe(
			TRANSACTION_SECRET,
		);
		expect(getTransaction).toHaveBeenCalledOnce();
		expect(getOther).not.toHaveBeenCalled();
	});
});
