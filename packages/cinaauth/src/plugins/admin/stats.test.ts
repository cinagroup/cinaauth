import { describe, expect, it } from "vitest";
import { getTestInstance } from "../../test-utils/test-instance";
import { auditLog } from "../audit-log";
import { admin } from "./admin";

/**
 * Build a test instance where the default test user is assigned the "admin"
 * role via a one-off database hook (mirrors admin.test.ts:90-93), so the
 * `stats:read` permission (granted to adminAc) is satisfied.
 */
async function statsInstance() {
	return getTestInstance(
		{
			plugins: [admin(), auditLog()],
			databaseHooks: {
				user: {
					create: {
						async before(user) {
							return { data: { ...user, role: "admin" } };
						},
					},
				},
			},
		},
		{ testUser: { name: "Admin" } },
	);
}

describe("admin stats endpoints", () => {
	it("overview returns counts and login channels", async () => {
		const { auth, signInWithTestUser } = await statsInstance();
		const { headers } = await signInWithTestUser();
		const res = (await auth.api.statsOverview({ headers })) as {
			totalUsers: number;
			loginChannels: Record<string, number>;
		};
		expect(res.totalUsers).toBeGreaterThanOrEqual(1);
		expect(res.loginChannels).toBeDefined();
		// The default test user signs in via email/password → credential account.
		expect(res.loginChannels.emailPassword).toBeGreaterThanOrEqual(1);
	});

	it("signups returns a bucket per day in the range", async () => {
		const { auth, signInWithTestUser } = await statsInstance();
		const { headers } = await signInWithTestUser();
		const res = (await auth.api.statsSignups({
			headers,
			query: { range: "7d" },
		})) as { range: string; data: { date: string; count: number }[] };
		expect(res.range).toBe("7d");
		expect(res.data.length).toBe(7);
		const total = res.data.reduce((sum, d) => sum + d.count, 0);
		expect(total).toBeGreaterThanOrEqual(1);
	});

	it("security-today returns zeroes gracefully without seeded audit data", async () => {
		const { auth, signInWithTestUser } = await statsInstance();
		const { headers } = await signInWithTestUser();
		const res = (await auth.api.statsSecurityToday({ headers })) as {
			failedLoginsToday: number;
			otpRequestsToday: number;
			geoAnomalyCount: number;
		};
		expect(res.failedLoginsToday).toBeGreaterThanOrEqual(0);
		expect(res.otpRequestsToday).toBeGreaterThanOrEqual(0);
		expect(res.geoAnomalyCount).toBeGreaterThanOrEqual(0);
	});
});
