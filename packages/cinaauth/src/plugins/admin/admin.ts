import type { CinaAuthPlugin } from "@cinaauth/core";
import { createAuthMiddleware } from "@cinaauth/core/api";
import { APIError, CinaAuthError } from "@cinaauth/core/error";
import { getAuthoritativeSessionFromCtx } from "../../api";
import { mergeSchema } from "../../db/schema";
import { getEndpointResponse } from "../../utils/plugin-helper";
import { PACKAGE_VERSION } from "../../version";
import { defaultRoles } from "./access";
import { ADMIN_ERROR_CODES } from "./error-codes";
import {
	adminDeleteUserPasskey,
	adminListUserPasskeys,
	adminUpdateUserPasskey,
} from "./passkeys";
import {
	adminUpdateUser,
	banUser,
	createUser,
	getUser,
	impersonateUser,
	listUserSessions,
	listUsers,
	removeUser,
	resetTwoFactor,
	revokeUserSession,
	revokeUserSessions,
	setRole,
	setUserPassword,
	stopImpersonating,
	unbanUser,
	userHasPermission,
} from "./routes";
import { schema } from "./schema";
import { listAllSessions, revokeUserSessionById } from "./session-admin";
import { statsOverview, statsSecurityToday, statsSignups } from "./stats";
import {
	assertAnonymousUserIsNotSuperAdmin,
	assertSuperAdminCanBeDeleted,
} from "./super-admin";
import type {
	AdminOptions,
	SessionWithImpersonatedBy,
	UserWithRole,
} from "./types";
import { listUserWallets, unbindWallet } from "./wallets";

declare module "@cinaauth/core" {
	interface CinaAuthPluginRegistry<AuthOptions, Options> {
		admin: {
			creator: typeof admin;
		};
	}
}

export const admin = <O extends AdminOptions>(options?: O | undefined) => {
	const opts = {
		...(options || {}),
		defaultRole: options?.defaultRole ?? "user",
		adminRoles: options?.adminRoles ?? ["admin"],
		bannedUserMessage:
			options?.bannedUserMessage ??
			"You have been banned from this application. Please contact support if you believe this is an error.",
	} as O &
		Required<
			Pick<AdminOptions, "defaultRole" | "adminRoles" | "bannedUserMessage">
		>;

	if (options?.adminRoles) {
		const adminRoles = Array.isArray(options.adminRoles)
			? options.adminRoles
			: [...options.adminRoles.split(",")];
		const invalidRoles = adminRoles.filter(
			(role) =>
				!Object.keys(options?.roles || defaultRoles)
					.map((r) => r.toLowerCase())
					.includes(role.toLowerCase()),
		);
		if (invalidRoles.length > 0) {
			throw new CinaAuthError(
				`Invalid admin roles: ${invalidRoles.join(", ")}. Admin roles must be defined in the 'roles' configuration.`,
			);
		}
	}

	return {
		id: "admin",
		version: PACKAGE_VERSION,
		init(context) {
			return {
				options: {
					databaseHooks: {
						user: {
							create: {
								async before(user) {
									const data = {
										role: options?.defaultRole ?? "user",
										...user,
									};
									assertAnonymousUserIsNotSuperAdmin(opts, {
										role: typeof data.role === "string" ? data.role : undefined,
										isAnonymous:
											"isAnonymous" in data && data.isAnonymous === true,
									});
									return {
										data,
									};
								},
							},
							delete: {
								async before(user) {
									await assertSuperAdminCanBeDeleted(
										context.internalAdapter,
										opts,
										{
											id: user.id,
											role:
												typeof user.role === "string" ? user.role : undefined,
											isAnonymous:
												"isAnonymous" in user && user.isAnonymous === true,
										},
									);
								},
							},
						},
						session: {
							create: {
								async before(session, ctx) {
									if (!ctx) {
										return;
									}
									const user = (await ctx.context.internalAdapter.findUserById(
										session.userId,
									)) as UserWithRole | null;

									if (user?.banned) {
										if (
											user.banExpires &&
											new Date(user.banExpires).getTime() < Date.now()
										) {
											await ctx.context.internalAdapter.updateUser(
												session.userId,
												{
													banned: false,
													banReason: null,
													banExpires: null,
												},
											);
											return;
										}

										throw APIError.from("FORBIDDEN", {
											message: opts.bannedUserMessage,
											code: "BANNED_USER",
										});
									}
								},
							},
						},
					},
				},
			};
		},
		hooks: {
			before: [
				{
					matcher(context) {
						return (
							context.path === "/delete-user" ||
							context.path === "/delete-user/callback" ||
							context.path === "/delete-anonymous-user"
						);
					},
					handler: createAuthMiddleware(async (ctx) => {
						const session = await getAuthoritativeSessionFromCtx(ctx);
						if (!session) return;
						await assertSuperAdminCanBeDeleted(
							ctx.context.internalAdapter,
							opts,
							{
								id: session.user.id,
								role:
									typeof session.user.role === "string"
										? session.user.role
										: undefined,
								isAnonymous:
									"isAnonymous" in session.user &&
									session.user.isAnonymous === true,
							},
						);
					}),
				},
			],
			after: [
				{
					matcher(context) {
						return context.path === "/list-sessions";
					},
					handler: createAuthMiddleware(async (ctx) => {
						const response =
							await getEndpointResponse<SessionWithImpersonatedBy[]>(ctx);

						if (!response) {
							return;
						}
						const newJson = response.filter((session) => {
							return !session.impersonatedBy;
						});

						return ctx.json(newJson);
					}),
				},
			],
		},
		endpoints: {
			listAllSessions: listAllSessions(opts),
			revokeUserSessionById: revokeUserSessionById(opts),
			adminListUserPasskeys: adminListUserPasskeys(opts),
			adminDeleteUserPasskey: adminDeleteUserPasskey(opts),
			adminUpdateUserPasskey: adminUpdateUserPasskey(opts),
			setRole: setRole(opts),
			getUser: getUser(opts),
			createUser: createUser(opts),
			adminUpdateUser: adminUpdateUser(opts),
			listUsers: listUsers(opts),
			listUserSessions: listUserSessions(opts),
			unbanUser: unbanUser(opts),
			banUser: banUser(opts),
			impersonateUser: impersonateUser(opts),
			stopImpersonating: stopImpersonating(),
			revokeUserSession: revokeUserSession(opts),
			revokeUserSessions: revokeUserSessions(opts),
			removeUser: removeUser(opts),
			setUserPassword: setUserPassword(opts),
			resetTwoFactor: resetTwoFactor(opts),
			userHasPermission: userHasPermission(opts as O),
			statsOverview: statsOverview(opts),
			statsSignups: statsSignups(opts),
			statsSecurityToday: statsSecurityToday(opts),
			listUserWallets: listUserWallets(opts),
			unbindWallet: unbindWallet(opts),
		},
		$ERROR_CODES: ADMIN_ERROR_CODES,
		schema: mergeSchema(schema, opts.schema),
		options: options as NoInfer<O>,
	} satisfies CinaAuthPlugin;
};
