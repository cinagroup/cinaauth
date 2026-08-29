export const ADMIN_CONSOLE_ROLES = ["super_admin", "security_admin"] as const;

export type AdminConsoleRole = (typeof ADMIN_CONSOLE_ROLES)[number];
export type AdminRole =
	| AdminConsoleRole
	| "admin"
	| "user"
	| (string & Record<never, never>);

/** Parse the comma-separated role representation used by the Admin plugin. */
export const getAdminConsoleRoles = (
	role: string | null | undefined,
): AdminConsoleRole[] =>
	role
		?.split(",")
		.filter((candidate): candidate is AdminConsoleRole =>
			(ADMIN_CONSOLE_ROLES as readonly string[]).includes(candidate),
		) ?? [];

export const ADMIN_PERMISSION_STATEMENT = {
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
	passkey: ["list", "revoke", "update"],
} as const;

export const ADMIN_ROLE_PERMISSIONS = {
	super_admin: ADMIN_PERMISSION_STATEMENT,
	security_admin: {
		user: ["list", "ban", "get"],
		session: ["list", "revoke", "delete"],
		stats: ["read"],
		wallet: ["list", "unbind"],
		passkey: ["list", "revoke"],
	},
	user: {
		user: [],
		session: [],
		stats: [],
		wallet: [],
		passkey: [],
	},
} as const;

export type AdminAccess = {
	canView: boolean;
	canBan: boolean;
	canRevokeSessions: boolean;
	canCreateUser: boolean;
	canDeleteUser: boolean;
	canImpersonate: boolean;
};

const NO_ADMIN_ACCESS: AdminAccess = {
	canView: false,
	canBan: false,
	canRevokeSessions: false,
	canCreateUser: false,
	canDeleteUser: false,
	canImpersonate: false,
};

const SECURITY_ADMIN_ACCESS: AdminAccess = {
	canView: true,
	canBan: true,
	canRevokeSessions: true,
	canCreateUser: false,
	canDeleteUser: false,
	canImpersonate: false,
};

const SUPER_ADMIN_ACCESS: AdminAccess = {
	canView: true,
	canBan: true,
	canRevokeSessions: true,
	canCreateUser: true,
	canDeleteUser: true,
	canImpersonate: true,
};

/** Shared UI projection of the production Auth Worker role matrix. */
export const getAdminAccess = (
	role: string | null | undefined,
): AdminAccess => {
	const roles = getAdminConsoleRoles(role);
	if (roles.includes("super_admin")) return SUPER_ADMIN_ACCESS;
	if (roles.includes("security_admin")) return SECURITY_ADMIN_ACCESS;
	return NO_ADMIN_ACCESS;
};

export type AdminSession = {
	userId: string;
	role: AdminRole;
	email?: string;
	name?: string;
	impersonatedBy?: string | null;
	/** Organization currently selected in the authoritative CinaAuth session. */
	activeOrganizationId?: string | null;
};

export type StandardResponse<T> = {
	ok: boolean;
	data?: T;
	error?: { code: string; message: string; status?: number };
};
