import type { AdminConsoleRole } from "./admin";
import { getAdminConsoleRoles } from "./admin";

/**
 * Platform-level permissions exposed by the CinaSeek Admin control plane.
 *
 * These permissions are intentionally separate from the Better Auth admin
 * plugin's `user` and `session` statements. They describe the console's
 * platform governance boundary and are enforced by authoritative server APIs.
 */
export const ADMIN_CONTROL_PERMISSIONS = [
	"dashboard.read",
	"identity.user.read",
	"identity.user.create",
	"identity.user.update",
	"identity.user.ban",
	"identity.user.delete",
	"identity.user.set-role",
	"identity.user.impersonate",
	"identity.user.reset-password",
	"identity.user.reset-2fa",
	"identity.user.send-verification",
	"identity.session.read",
	"identity.session.revoke",
	"identity.credential.read",
	"identity.credential.update",
	"identity.credential.revoke",
	"organization.read",
	"organization.create",
	"organization.update",
	"organization.delete",
	"organization.member.read",
	"organization.member.invite",
	"organization.member.update-role",
	"organization.member.remove",
	"organization.team.manage",
	"integration.api-key.read",
	"integration.api-key.manage",
	"integration.api-key.rotate",
	"integration.api-key.revoke",
	"integration.oauth-client.read",
	"integration.oauth-client.manage",
	"integration.sso.read",
	"integration.sso.manage",
	"integration.scim.read",
	"integration.scim.manage",
	"integration.health.read",
	"integration.delivery.read",
	"integration.delivery.manage",
	"integration.social-provider.read",
	"integration.social-provider.manage",
	"security.policy.read",
	"security.policy.publish",
	"security.audit.read",
	"security.audit.export",
	"security.alert.manage",
	"privacy.request.read",
	"privacy.request.manage",
	"privacy.erasure.read",
	"privacy.erasure.manage",
	"billing.subscription.read",
	"billing.subscription.manage",
	"platform.health.read",
] as const;

export type AdminControlPermission = (typeof ADMIN_CONTROL_PERMISSIONS)[number];

const SECURITY_ADMIN_PERMISSIONS = [
	"dashboard.read",
	"identity.user.read",
	"identity.user.ban",
	"identity.user.send-verification",
	"identity.session.read",
	"identity.session.revoke",
	"identity.credential.read",
	"identity.credential.revoke",
	"organization.read",
	"organization.member.read",
	"integration.api-key.read",
	"integration.oauth-client.read",
	"integration.sso.read",
	"integration.scim.read",
	"integration.health.read",
	"integration.delivery.read",
	"integration.social-provider.read",
	"security.policy.read",
	"security.audit.read",
	"security.alert.manage",
	"privacy.request.read",
	"privacy.erasure.read",
	"billing.subscription.read",
	"platform.health.read",
] as const satisfies readonly AdminControlPermission[];

/** Default platform permission presets for the currently enabled Admin roles. */
export const ADMIN_CONTROL_ROLE_PERMISSIONS = {
	super_admin: ADMIN_CONTROL_PERMISSIONS,
	security_admin: SECURITY_ADMIN_PERMISSIONS,
} as const satisfies Record<
	AdminConsoleRole,
	readonly AdminControlPermission[]
>;

const ADMIN_CONTROL_PERMISSION_SETS = {
	super_admin: new Set<AdminControlPermission>(
		ADMIN_CONTROL_ROLE_PERMISSIONS.super_admin,
	),
	security_admin: new Set<AdminControlPermission>(
		ADMIN_CONTROL_ROLE_PERMISSIONS.security_admin,
	),
} satisfies Record<AdminConsoleRole, ReadonlySet<AdminControlPermission>>;

/** Return whether a role has a platform-level Admin permission. */
export const hasAdminControlPermission = (
	role: string | null | undefined,
	permission: AdminControlPermission,
): boolean => {
	return getAdminConsoleRoles(role).some((candidate) =>
		ADMIN_CONTROL_PERMISSION_SETS[candidate].has(permission),
	);
};
