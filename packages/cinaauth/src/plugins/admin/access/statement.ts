import { createAccessControl } from "../../access";

export const defaultStatements = {
	user: [
		"create",
		"list",
		"set-role",
		"ban",
		"impersonate",
		"impersonate-admins",
		"delete",
		"set-password",
		"set-email",
		"get",
		"update",
	],
	session: ["list", "revoke", "delete"],
	stats: ["read"],
	wallet: ["list", "unbind"],
} as const;

export const defaultAc = createAccessControl(defaultStatements);

export const adminAc = defaultAc.newRole({
	user: [
		"create",
		"list",
		"set-role",
		"ban",
		"impersonate",
		"delete",
		"set-password",
		"set-email",
		"get",
		"update",
	],
	session: ["list", "revoke", "delete"],
	stats: ["read"],
	wallet: ["list", "unbind"],
});

/**
 * security_admin: a scoped admin role for the CinaGroup console. Can manage
 * user bans, sessions, wallets, and read stats/audit — but cannot create or
 * delete users, set roles, impersonate, set passwords, or edit security policy.
 */
export const securityAdminAc = defaultAc.newRole({
	user: ["list", "get", "ban"],
	session: ["list", "revoke", "delete"],
	stats: ["read"],
	wallet: ["list", "unbind"],
});

export const userAc = defaultAc.newRole({
	user: [],
	session: [],
});

export const defaultRoles = {
	admin: adminAc,
	security_admin: securityAdminAc,
	user: userAc,
};
