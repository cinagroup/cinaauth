import { describe, expect, it, vi } from "vitest";
import { getTestInstance } from "../../test-utils/test-instance";
import { anonymous } from "../anonymous";
import { anonymousClient } from "../anonymous/client";
import { adminAc, securityAdminAc, userAc } from "./access";
import { admin } from "./admin";
import { adminClient } from "./client";

const roles = {
	super_admin: adminAc,
	security_admin: securityAdminAc,
	operator: adminAc,
	user: userAc,
};

describe("admin last super_admin invariant", async () => {
	const setup = async (options?: {
		userDeleteBefore?: () => Promise<boolean>;
	}) => {
		const {
			auth,
			client,
			sessionSetter,
			signInWithTestUser,
			signInWithUser,
			testUser,
		} = await getTestInstance(
			{
				user: { deleteUser: { enabled: true } },
				plugins: [
					anonymous(),
					admin({
						adminRoles: ["super_admin", "security_admin", "operator"],
						roles,
					}),
				],
				databaseHooks: {
					user: {
						create: {
							before: async (user) => ({
								data: {
									...user,
									...(user.name === "Root"
										? { role: "super_admin" }
										: user.name === "Operator"
											? { role: "operator" }
											: user.name === "Whitespace Super"
												? { role: "user, super_admin" }
												: {}),
								},
							}),
						},
						...(options?.userDeleteBefore
							? {
									delete: {
										before: options.userDeleteBefore,
									},
								}
							: {}),
					},
				},
			},
			{
				testUser: { name: "Root" },
				clientOptions: {
					plugins: [anonymousClient(), adminClient({ roles })],
				},
			},
		);
		const { headers: rootHeaders, user: rootUser } = await signInWithTestUser();
		await client.signUp.email({
			email: "operator-last-super-admin@test.com",
			password: "password",
			name: "Operator",
		});
		const { headers: operatorHeaders, res: operatorSession } =
			await signInWithUser("operator-last-super-admin@test.com", "password");
		return {
			auth,
			client,
			operatorHeaders,
			operatorUser: operatorSession.user,
			rootHeaders,
			rootUser,
			sessionSetter,
			testUser,
		};
	};

	const signInAnonymously = async (
		client: Awaited<ReturnType<typeof setup>>["client"],
		sessionSetter: Awaited<ReturnType<typeof setup>>["sessionSetter"],
	) => {
		const headers = new Headers();
		await client.signIn.anonymous({
			fetchOptions: { onSuccess: sessionSetter(headers) },
		});
		const session = await client.getSession({ fetchOptions: { headers } });
		return { headers, user: session.data!.user };
	};

	it("rejects direct self-demotion of the sole super_admin via set-role", async () => {
		const { auth, client, rootHeaders, rootUser } = await setup();
		const result = await client.admin.setRole(
			{ userId: rootUser.id, role: "security_admin" },
			{ headers: rootHeaders },
		);

		expect(result.error?.status).toBe(400);
		expect(result.error?.code).toBe("YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN");
		const context = await auth.$context;
		const root = await context.internalAdapter.findUserById(rootUser.id);
		expect((root as { role?: string } | null)?.role).toBe("super_admin");
	});

	it("rejects direct self-demotion of the sole super_admin via update-user", async () => {
		const { client, rootHeaders, rootUser } = await setup();
		const result = await client.admin.updateUser(
			{ userId: rootUser.id, data: { role: "user" } },
			{ headers: rootHeaders },
		);

		expect(result.error?.status).toBe(400);
		expect(result.error?.code).toBe("YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN");
	});

	it("allows harmless updates to the sole super_admin", async () => {
		const { client, rootHeaders, rootUser } = await setup();

		const result = await client.admin.updateUser(
			{ userId: rootUser.id, data: { name: "Root Renamed" } },
			{ headers: rootHeaders },
		);

		expect(result.error).toBeNull();
		expect(result.data?.name).toBe("Root Renamed");
		expect(result.data?.role).toBe("super_admin");
	});

	it("rejects deleting the sole super_admin through the server API", async () => {
		const { auth, operatorHeaders, rootUser } = await setup();
		await expect(
			auth.api.removeUser({
				body: { userId: rootUser.id },
				headers: operatorHeaders,
			}),
		).rejects.toMatchObject({
			status: "BAD_REQUEST",
			body: { code: "YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN" },
		});
	});

	it("keeps the database delete hook as a final internal-adapter guard", async () => {
		const { auth, rootHeaders, rootUser } = await setup();
		const context = await auth.$context;
		const accountsBefore = await context.internalAdapter.findAccounts(
			rootUser.id,
		);
		const sessionsBefore = await context.internalAdapter.listSessions(
			rootUser.id,
		);
		expect(accountsBefore.length).toBeGreaterThan(0);
		expect(sessionsBefore.length).toBeGreaterThan(0);

		await expect(
			context.internalAdapter.deleteUser(rootUser.id),
		).rejects.toMatchObject({
			status: "BAD_REQUEST",
			body: { code: "YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN" },
		});
		expect(
			await context.internalAdapter.findUserById(rootUser.id),
		).not.toBeNull();
		expect(await context.internalAdapter.findAccounts(rootUser.id)).toEqual(
			accountsBefore,
		);
		expect(await context.internalAdapter.listSessions(rootUser.id)).toEqual(
			sessionsBefore,
		);
		expect(await auth.api.getSession({ headers: rootHeaders })).not.toBeNull();
	});

	it("rejects creating an anonymous exact super_admin", async () => {
		const { client, rootHeaders } = await setup();

		const result = await client.admin.createUser(
			{
				name: "Anonymous Super",
				email: "anonymous-super-create@test.com",
				password: "password",
				role: "super_admin",
				data: { isAnonymous: true },
			},
			{ headers: rootHeaders },
		);

		expect(result.error?.status).toBe(400);
		expect(result.error?.code).toBe("ANONYMOUS_USER_CANNOT_BE_SUPER_ADMIN");
	});

	it("rejects assigning exact super_admin to an anonymous user", async () => {
		const { client, rootHeaders, sessionSetter } = await setup();
		const anonymousSession = await signInAnonymously(client, sessionSetter);

		const result = await client.admin.setRole(
			{ userId: anonymousSession.user.id, role: "super_admin" },
			{ headers: rootHeaders },
		);

		expect(result.error?.status).toBe(400);
		expect(result.error?.code).toBe("ANONYMOUS_USER_CANNOT_BE_SUPER_ADMIN");
	});

	it("rejects update-user from creating an anonymous exact super_admin", async () => {
		const { client, rootHeaders } = await setup();
		const created = await client.admin.createUser(
			{
				name: "Future Anonymous Super",
				email: "future-anonymous-super@test.com",
				password: "password",
				role: "user",
			},
			{ headers: rootHeaders },
		);

		const result = await client.admin.updateUser(
			{
				userId: created.data!.user.id,
				data: { isAnonymous: true, role: "super_admin" },
			},
			{ headers: rootHeaders },
		);

		expect(result.error?.status).toBe(400);
		expect(result.error?.code).toBe("ANONYMOUS_USER_CANNOT_BE_SUPER_ADMIN");
	});

	it("requires an anonymous exact super_admin to be demoted before deletion", async () => {
		const { auth, client, sessionSetter } = await setup();
		const anonymousSession = await signInAnonymously(client, sessionSetter);
		const context = await auth.$context;
		await context.internalAdapter.updateUser(anonymousSession.user.id, {
			role: "super_admin",
		});

		await expect(
			context.internalAdapter.deleteUser(anonymousSession.user.id),
		).rejects.toMatchObject({
			status: "BAD_REQUEST",
			body: {
				code: "ANONYMOUS_SUPER_ADMIN_MUST_BE_DEMOTED_BEFORE_DELETION",
			},
		});
		expect(
			await context.internalAdapter.findUserById(anonymousSession.user.id),
		).not.toBeNull();
		expect(
			await auth.api.getSession({ headers: anonymousSession.headers }),
		).not.toBeNull();
	});

	it("rejects explicit anonymous deletion before its session is removed", async () => {
		const { auth, client, sessionSetter } = await setup();
		const anonymousSession = await signInAnonymously(client, sessionSetter);
		const context = await auth.$context;
		await context.internalAdapter.updateUser(anonymousSession.user.id, {
			role: "super_admin",
		});

		const result = await client.deleteAnonymousUser({
			fetchOptions: { headers: anonymousSession.headers },
		});

		expect(result.error?.status).toBe(400);
		expect(result.error?.code).toBe(
			"ANONYMOUS_SUPER_ADMIN_MUST_BE_DEMOTED_BEFORE_DELETION",
		);
		expect(
			await auth.api.getSession({ headers: anonymousSession.headers }),
		).not.toBeNull();
	});

	it("preserves an anonymous exact super_admin during post-link cleanup", async () => {
		const { auth, client, sessionSetter, testUser } = await setup();
		const anonymousSession = await signInAnonymously(client, sessionSetter);
		const context = await auth.$context;
		await context.internalAdapter.updateUser(anonymousSession.user.id, {
			role: "super_admin",
		});

		const linked = await client.signIn.email(testUser, {
			headers: anonymousSession.headers,
		});

		expect(linked.error).toBeNull();
		expect(
			await context.internalAdapter.findUserById(anonymousSession.user.id),
		).not.toBeNull();
	});

	it("keeps exact comma semantics for anonymous deletion guards", async () => {
		const { auth, client, sessionSetter } = await setup();
		const anonymousSession = await signInAnonymously(client, sessionSetter);
		const context = await auth.$context;
		await context.internalAdapter.updateUser(anonymousSession.user.id, {
			role: "user, super_admin",
		});

		await expect(
			context.internalAdapter.deleteUser(anonymousSession.user.id),
		).resolves.toBeUndefined();
		expect(
			await context.internalAdapter.findUserById(anonymousSession.user.id),
		).toBeNull();
	});

	it("rejects self-service deletion of the sole super_admin", async () => {
		const { auth, client, rootHeaders } = await setup();

		const result = await client.deleteUser({
			fetchOptions: { headers: rootHeaders },
		});

		expect(result.error?.status).toBe(400);
		expect(result.error?.code).toBe("YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN");
		expect(await auth.api.getSession({ headers: rootHeaders })).not.toBeNull();
	});

	it("rejects the actual delete-user callback sink for the sole super_admin", async () => {
		const { auth, rootHeaders } = await setup();
		const context = await auth.$context;
		const token = "sole-super-admin-delete-token";
		await context.internalAdapter.createVerificationValue({
			identifier: `delete-account-${token}`,
			value: (await auth.api.getSession({ headers: rootHeaders }))!.user.id,
			expiresAt: new Date(Date.now() + 60_000),
		});

		const response = await auth.handler(
			new Request(
				`http://localhost:3000/api/auth/delete-user/callback?token=${token}`,
				{ headers: rootHeaders },
			),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			code: "YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN",
		});
		expect(
			await context.internalAdapter.findVerificationValue(
				`delete-account-${token}`,
			),
		).not.toBeNull();
	});

	it("keeps the existing self-deletion prohibition", async () => {
		const { auth, rootHeaders, rootUser } = await setup();

		await expect(
			auth.api.removeUser({
				body: { userId: rootUser.id },
				headers: rootHeaders,
			}),
		).rejects.toMatchObject({
			status: "BAD_REQUEST",
			body: { code: "YOU_CANNOT_REMOVE_YOURSELF" },
		});
	});

	it("allows demoting one of multiple exact super_admin users", async () => {
		const { client, rootHeaders } = await setup();
		const created = await client.admin.createUser(
			{
				name: "Second Super",
				email: "second-super-admin@test.com",
				password: "password",
				role: ["user", "super_admin"],
			},
			{ headers: rootHeaders },
		);
		const targetId = created.data?.user.id ?? "";

		const result = await client.admin.setRole(
			{ userId: targetId, role: "security_admin" },
			{ headers: rootHeaders },
		);

		expect(result.error).toBeNull();
		expect(result.data?.user.role).toBe("security_admin");
	});

	it("treats composite roles exactly and ignores a whitespace-prefixed lookalike", async () => {
		const { client, rootHeaders, rootUser } = await setup();
		await client.signUp.email({
			email: "whitespace-super-admin@test.com",
			password: "password",
			name: "Whitespace Super",
		});
		const preserveComposite = await client.admin.setRole(
			{ userId: rootUser.id, role: ["user", "super_admin"] },
			{ headers: rootHeaders },
		);
		expect(preserveComposite.error).toBeNull();

		const demote = await client.admin.setRole(
			{ userId: rootUser.id, role: "user" },
			{ headers: rootHeaders },
		);
		expect(demote.error?.code).toBe("YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN");
	});

	it("does not block deleting a non-super-admin user", async () => {
		const { client, operatorHeaders, rootHeaders } = await setup();
		const created = await client.admin.createUser(
			{
				name: "Ordinary Target",
				email: "ordinary-delete-target@test.com",
				password: "password",
				role: "user",
			},
			{ headers: rootHeaders },
		);

		const result = await client.admin.removeUser(
			{ userId: created.data?.user.id ?? "" },
			{ headers: operatorHeaders },
		);

		expect(result.error).toBeNull();
		expect(result.data?.success).toBe(true);
	});

	it("preserves an Admin target's identities and sessions when delete.before vetoes", async () => {
		const userDeleteBefore = vi.fn(async () => false);
		const { auth, client, operatorUser, rootHeaders } = await setup({
			userDeleteBefore,
		});
		const context = await auth.$context;
		const accountsBefore = await context.internalAdapter.findAccounts(
			operatorUser.id,
		);
		const sessionsBefore = await context.internalAdapter.listSessions(
			operatorUser.id,
		);

		const result = await client.admin.removeUser(
			{ userId: operatorUser.id },
			{ headers: rootHeaders },
		);

		expect(result.error).toBeNull();
		expect(userDeleteBefore).toHaveBeenCalledOnce();
		expect(
			await context.internalAdapter.findUserById(operatorUser.id),
		).not.toBeNull();
		expect(await context.internalAdapter.findAccounts(operatorUser.id)).toEqual(
			accountsBefore,
		);
		expect(await context.internalAdapter.listSessions(operatorUser.id)).toEqual(
			sessionsBefore,
		);
	});

	it("allows deleting one of multiple super_admin users", async () => {
		const { client, operatorHeaders, rootHeaders } = await setup();
		const created = await client.admin.createUser(
			{
				name: "Removable Super",
				email: "removable-super-admin@test.com",
				password: "password",
				role: "super_admin",
			},
			{ headers: rootHeaders },
		);

		const result = await client.admin.removeUser(
			{ userId: created.data?.user.id ?? "" },
			{ headers: operatorHeaders },
		);

		expect(result.error).toBeNull();
		expect(result.data?.success).toBe(true);
	});

	it("preserves user delete hooks and ordinary self-service deletion", async () => {
		const userDeleteBefore = vi.fn(async () => undefined);
		const { client, signInWithTestUser } = await getTestInstance(
			{
				user: { deleteUser: { enabled: true } },
				databaseHooks: {
					user: { delete: { before: userDeleteBefore } },
				},
				plugins: [
					admin({
						adminRoles: ["super_admin", "security_admin"],
						roles,
					}),
				],
			},
			{ clientOptions: { plugins: [adminClient({ roles })] } },
		);
		const { headers } = await signInWithTestUser();

		const result = await client.deleteUser({ fetchOptions: { headers } });

		expect(result.error).toBeNull();
		expect(result.data?.success).toBe(true);
		expect(userDeleteBefore).toHaveBeenCalledOnce();
	});

	it("preserves default admin-role behavior when super_admin is not configured", async () => {
		const { client, signInWithTestUser } = await getTestInstance(
			{
				plugins: [admin()],
				databaseHooks: {
					user: {
						create: {
							before: async (user) => ({
								data: { ...user, role: "admin" },
							}),
						},
					},
				},
			},
			{ clientOptions: { plugins: [adminClient()] } },
		);
		const { headers, user } = await signInWithTestUser();

		const result = await client.admin.setRole(
			{ userId: user.id, role: "user" },
			{ headers },
		);

		expect(result.error).toBeNull();
		expect(result.data?.user.role).toBe("user");
	});
});
