import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mock: admin-api.ts imports `cinaauthFetch` from this module path.
const fetchMock = vi.fn();
vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: fetchMock,
}));

// Import AFTER the mock is registered so admin-api picks up the mock.
const {
	listUsers,
	listAudit,
	statsOverview,
	statsSecurityToday,
} = await import("@/lib/cinaauth/admin-api");

beforeEach(() => {
	fetchMock.mockReset();
});

describe("admin-api DTO mapping safety", () => {
	it("listUsers maps a sparse user record with defaults", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			data: { users: [{ id: "1" }], total: 1 },
		});
		const page = await listUsers("", {});
		expect(page.total).toBe(1);
		const u = page.rows[0];
		expect(u).toBeDefined();
		expect(u!.email).toBe("");
		expect(u!.role).toBe("user");
		expect(u!.banned).toBe(false);
		expect(u!.twoFactorEnabled).toBe(false);
		expect(u!.name).toBeNull();
	});

	it("listUsers throws when cinaauthFetch fails", async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			error: { code: "X", message: "boom" },
		});
		await expect(listUsers("", {})).rejects.toThrow("boom");
	});

	it("listAudit parses JSON-string metadata into an object", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			data: {
				rows: [
					{
						id: "a1",
						timestamp: "2026-01-01T00:00:00.000Z",
						category: "wallet",
						action: "siwe.bind",
						result: "success",
						metadata: '{"address":"0xAbC"}',
					},
				],
				total: 1,
			},
		});
		const page = await listAudit("", {});
		expect(page.rows[0]?.metadata).toEqual({ address: "0xAbC" });
	});

	it("listAudit tolerates malformed metadata (null)", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			data: {
				rows: [
					{
						id: "a2",
						category: "auth",
						action: "user.login",
						result: "failure",
						metadata: "{not json",
					},
				],
				total: 1,
			},
		});
		const page = await listAudit("", {});
		expect(page.rows[0]?.metadata).toBeNull();
	});

	it("statsOverview returns the DTO on success", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			data: {
				totalUsers: 5,
				newUsers30d: 2,
				activeSessions: 3,
				organizationCount: 1,
				bannedCount: 0,
				usersWithout2FA: 1,
				loginChannels: { emailPassword: 4, github: 1, siwe: 0 },
			},
		});
		const s = await statsOverview("");
		expect(s.totalUsers).toBe(5);
		expect(s.loginChannels.emailPassword).toBe(4);
	});

	it("statsSecurityToday falls back to zeroes on failure", async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			error: { code: "X", message: "down" },
		});
		const s = await statsSecurityToday("");
		expect(s).toEqual({
			failedLoginsToday: 0,
			otpRequestsToday: 0,
			geoAnomalyCount: 0,
		});
	});
});
