export const ADMIN_CONSOLE_ROLES = [
	"super_admin",
	"security_admin",
] as const;

export type AdminConsoleRole = (typeof ADMIN_CONSOLE_ROLES)[number];
export type AdminRole =
	| AdminConsoleRole
	| "admin"
	| "user"
	| (string & Record<never, never>);

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
} as const;

export const ADMIN_ROLE_PERMISSIONS = {
	super_admin: ADMIN_PERMISSION_STATEMENT,
	security_admin: {
		user: ["list", "ban", "get", "update"],
		session: ["list", "revoke", "delete"],
		stats: ["read"],
	},
	user: {
		user: [],
		session: [],
		stats: [],
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
	if (role === "super_admin") return SUPER_ADMIN_ACCESS;
	if (role === "security_admin") return SECURITY_ADMIN_ACCESS;
	return NO_ADMIN_ACCESS;
};

export type AdminSession = {
	userId: string;
	role: AdminRole;
	email?: string;
	name?: string;
	impersonatedBy?: string | null;
};

export type StandardResponse<T> = {
	ok: boolean;
	data?: T;
	error?: { code: string; message: string; status?: number };
};
