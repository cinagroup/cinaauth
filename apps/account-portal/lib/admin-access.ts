import {
	ADMIN_PERMISSION_STATEMENT,
	ADMIN_ROLE_PERMISSIONS,
} from "@cinaauth/auth-web-contract";
import { createAccessControl } from "cinaauth/plugins/access";

export type { AdminAccess } from "@cinaauth/auth-web-contract";
export { getAdminAccess } from "@cinaauth/auth-web-contract";

/**
 * Keep the browser client's role inference aligned with the Auth Worker's
 * authorization matrix. The server remains the enforcement boundary.
 */
export const adminAccessControl = createAccessControl({
	user: [...ADMIN_PERMISSION_STATEMENT.user],
	session: [...ADMIN_PERMISSION_STATEMENT.session],
	stats: [...ADMIN_PERMISSION_STATEMENT.stats],
});

export const adminRoles = {
	super_admin: adminAccessControl.newRole({
		user: [...ADMIN_ROLE_PERMISSIONS.super_admin.user],
		session: [...ADMIN_ROLE_PERMISSIONS.super_admin.session],
		stats: [...ADMIN_ROLE_PERMISSIONS.super_admin.stats],
	}),
	security_admin: adminAccessControl.newRole({
		user: [...ADMIN_ROLE_PERMISSIONS.security_admin.user],
		session: [...ADMIN_ROLE_PERMISSIONS.security_admin.session],
		stats: [...ADMIN_ROLE_PERMISSIONS.security_admin.stats],
	}),
	user: adminAccessControl.newRole({
		user: [...ADMIN_ROLE_PERMISSIONS.user.user],
		session: [...ADMIN_ROLE_PERMISSIONS.user.session],
		stats: [...ADMIN_ROLE_PERMISSIONS.user.stats],
	}),
};
