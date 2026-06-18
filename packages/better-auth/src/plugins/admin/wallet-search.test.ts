import { describe, expect, it } from "vitest";
import { getTestInstance } from "../../test-utils/test-instance";
import { admin } from "./admin";
import { siwe } from "../siwe";

/**
 * Test instance where the default test user is promoted to the "admin" role
 * via a one-off database hook (so it can call listUsers, which requires
 * user:list).
 */
async function walletSearchInstance() {
	return getTestInstance(
		{
			plugins: [
				admin(),
				siwe({
					domain: "localhost",
					getNonce: async () => "nonce",
					verifyMessage: async () => true,
				}),
			],
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

describe("admin list-users wallet search", () => {
	it("finds users by SIWE wallet address substring", async () => {
		const { auth, signInWithTestUser } = await walletSearchInstance();
		const { headers } = await signInWithTestUser();
		const ctx = await auth.$context;

		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id;
		expect(userId).toBeTruthy();

		const walletAddress = "0xAbC1234567890123456789012345678901234567";
		await ctx.adapter.create({
			model: "walletAddress",
			data: {
				userId: userId as string,
				address: walletAddress,
				chainId: 1,
				isPrimary: true,
				createdAt: new Date(),
			},
		});

		const res = (await auth.api.listUsers({
			headers,
			query: {
				searchField: "wallet",
				searchValue: "0xAbC1",
			},
		})) as { users: { id: string }[]; total: number };

		expect(res.total).toBe(1);
		expect(res.users.length).toBe(1);
		expect(res.users[0]?.id).toBe(userId);
	});

	it("returns empty when no wallet matches", async () => {
		const { auth, signInWithTestUser } = await walletSearchInstance();
		const { headers } = await signInWithTestUser();
		const res = (await auth.api.listUsers({
			headers,
			query: {
				searchField: "wallet",
				searchValue: "0xNONEXISTENT0000",
			},
		})) as { users: unknown[]; total: number };
		expect(res.total).toBe(0);
		expect(res.users.length).toBe(0);
	});
});
