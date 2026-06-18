import { describe, expect, it } from "vitest";
import { getTestInstance } from "../../test-utils/test-instance";
import { admin } from "./admin";
import { auditLog } from "../audit-log";
import { siwe } from "../siwe";

const WALLET = "0xDeAd000000000000000000000000000000000000";

/**
 * Test instance: admin + auditLog + siwe, with the test user promoted to the
 * "admin" role (so it passes the wallet:list / wallet:unbind permission gate).
 */
async function walletsInstance() {
	return getTestInstance(
		{
			plugins: [
				admin(),
				auditLog(),
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

describe("admin wallet endpoints", () => {
	it("lists a user's wallets, unbinds one, and writes audit", async () => {
		const { auth, signInWithTestUser } = await walletsInstance();
		const { headers } = await signInWithTestUser();
		const ctx = await auth.$context;

		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id;
		expect(userId).toBeTruthy();

		await ctx.adapter.create({
			model: "walletAddress",
			data: {
				userId: userId as string,
				address: WALLET,
				chainId: 1,
				isPrimary: true,
				createdAt: new Date(),
			},
		});

		// list-user-wallets returns the bound wallet.
		const list = (await auth.api.listUserWallets({
			headers,
			query: { userId: userId as string },
		})) as { wallets: { address: string; isPrimary: boolean }[] };
		expect(list.wallets.length).toBe(1);
		expect(list.wallets[0]?.address).toBe(WALLET);

		// unbind-wallet removes it.
		await auth.api.unbindWallet({
			headers,
			body: { userId: userId as string, address: WALLET, chainId: 1 },
		});
		const list2 = (await auth.api.listUserWallets({
			headers,
			query: { userId: userId as string },
		})) as { wallets: unknown[] };
		expect(list2.wallets.length).toBe(0);

		// The unbind was audited.
		const auditRow = await ctx.adapter.findOne({
			model: "auditLog",
			where: [{ field: "action", operator: "eq", value: "siwe.unbind" }],
		});
		expect(auditRow).not.toBeNull();
	});

	it("unbind-wallet is rejected for a non-admin role", async () => {
		// Separate instance WITHOUT the role-promotion hook → test user is "user".
		const { auth, signInWithTestUser } = await getTestInstance({
			plugins: [admin(), auditLog(), siwe({
				domain: "localhost",
				getNonce: async () => "nonce",
				verifyMessage: async () => true,
			})],
		});
		const { headers } = await signInWithTestUser();
		await expect(
			auth.api.unbindWallet({
				headers,
				body: {
					userId: "any",
					address: WALLET,
					chainId: 1,
				},
			}),
		).rejects.toThrow();
	});
});
