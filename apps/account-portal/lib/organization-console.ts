import type { OrganizationRole } from "./auth-api";
import type { Locale } from "./i18n";

export type OrganizationMember = {
	id: string;
	userId: string;
	organizationId: string;
	role: string;
	createdAt: string;
	user: {
		id: string;
		name: string;
		email: string;
		image: string | null;
	};
};

export type OrganizationInvitation = {
	id: string;
	organizationId: string;
	email: string;
	role: string;
	status: "pending" | "accepted" | "rejected" | "canceled";
	expiresAt: string;
	createdAt: string;
};

export type OrganizationSummary = {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
};

export type OrganizationDetail = OrganizationSummary & {
	createdAt: string;
	members: OrganizationMember[];
	invitations: OrganizationInvitation[];
};

export type OrganizationAuditEvent = {
	id: string;
	timestamp: string;
	action: string;
	result: string;
	actorId: string | null;
	actorRole: string | null;
};

export type OrganizationPermissions = {
	canManageMembers: boolean;
	canManageInvitations: boolean;
	canAssignOwner: boolean;
};

const STATIC_ROLE_LABELS: Record<OrganizationRole, string> = {
	owner: "Owner",
	admin: "Admin",
	member: "Member",
};

const CHINESE_STATIC_ROLE_LABELS: Record<OrganizationRole, string> = {
	owner: "所有者",
	admin: "管理员",
	member: "成员",
};

const ORGANIZATION_AUDIT_ACTION_LABELS: Record<string, string> = {
	"org.create": "Organization created",
	"org.update": "Organization updated",
	"org.delete": "Organization deleted",
	"org.member_invite": "Member invited",
	"org.invitation_cancel": "Invitation canceled",
	"org.invitation_accept": "Invitation accepted",
	"org.invitation_reject": "Invitation rejected",
	"org.member_remove": "Member removed",
	"org.member_role_update": "Member role updated",
	"org.member_leave": "Member left",
	"org.role_create": "Role created",
	"org.role_update": "Role updated",
	"org.role_delete": "Role deleted",
	"org.team_create": "Team created",
	"org.team_update": "Team updated",
	"org.team_delete": "Team deleted",
	"org.team_member_add": "Team member added",
	"org.team_member_remove": "Team member removed",
};

const CHINESE_ORGANIZATION_AUDIT_ACTION_LABELS: Record<string, string> = {
	"org.create": "组织已创建",
	"org.update": "组织已更新",
	"org.delete": "组织已删除",
	"org.member_invite": "成员已邀请",
	"org.invitation_cancel": "邀请已取消",
	"org.invitation_accept": "邀请已接受",
	"org.invitation_reject": "邀请已拒绝",
	"org.member_remove": "成员已移除",
	"org.member_role_update": "成员角色已更新",
	"org.member_leave": "成员已退出",
	"org.role_create": "角色已创建",
	"org.role_update": "角色已更新",
	"org.role_delete": "角色已删除",
	"org.team_create": "团队已创建",
	"org.team_update": "团队已更新",
	"org.team_delete": "团队已删除",
	"org.team_member_add": "团队成员已添加",
	"org.team_member_remove": "团队成员已移除",
};

const organizationDateFormatters: Record<Locale, Intl.DateTimeFormat> = {
	en: new Intl.DateTimeFormat("en", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "UTC",
	}),
	"zh-CN": new Intl.DateTimeFormat("zh-CN", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "UTC",
	}),
};

/** Normalize the comma-separated role representation returned by CinaAuth. */
export const parseOrganizationRoles = (role: string) => [
	...new Set(
		role
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean),
	),
];

const hasOrganizationRole = (role: string, expected: OrganizationRole) =>
	parseOrganizationRoles(role).includes(expected);

export const getOrganizationPermissions = (
	role: string,
): OrganizationPermissions => {
	const owner = hasOrganizationRole(role, "owner");
	const administrator = owner || hasOrganizationRole(role, "admin");
	return {
		canManageMembers: administrator,
		canManageInvitations: administrator,
		canAssignOwner: owner,
	};
};

export const canManageOrganizationMember = (
	actorRole: string,
	targetRole: string,
) => {
	const permissions = getOrganizationPermissions(actorRole);
	if (!permissions.canManageMembers) return false;
	return (
		permissions.canAssignOwner || !hasOrganizationRole(targetRole, "owner")
	);
};

export const canAssignOrganizationRole = (
	actorRole: string,
	nextRole: OrganizationRole,
) => {
	const permissions = getOrganizationPermissions(actorRole);
	return (
		permissions.canManageMembers &&
		(nextRole !== "owner" || permissions.canAssignOwner)
	);
};

/** The server rejects an owner leaving when no second owner can take over. */
export const canLeaveOrganization = (role: string, ownerCount: number) => {
	const roles = parseOrganizationRoles(role);
	if (roles.length === 0) return false;
	return !roles.includes("owner") || ownerCount > 1;
};

const toTitleCase = (value: string) =>
	value
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");

export const getOrganizationRoleLabel = (role: string, locale: Locale = "en") =>
	parseOrganizationRoles(role)
		.map(
			(item) =>
				(locale === "zh-CN"
					? CHINESE_STATIC_ROLE_LABELS[item as OrganizationRole]
					: STATIC_ROLE_LABELS[item as OrganizationRole]) ?? toTitleCase(item),
		)
		.join(" + ") || (locale === "zh-CN" ? "无角色" : "No role");

export const getOrganizationAuditActionLabel = (
	action: string,
	locale: Locale = "en",
) =>
	(locale === "zh-CN"
		? CHINESE_ORGANIZATION_AUDIT_ACTION_LABELS[action]
		: ORGANIZATION_AUDIT_ACTION_LABELS[action]) ??
	toTitleCase(action.replace(/^org\./, ""));

export const formatOrganizationAuditActor = (
	actorId: string | null,
	currentUserId: string,
	locale: Locale = "en",
) => {
	if (!actorId) return locale === "zh-CN" ? "系统" : "System";
	if (actorId === currentUserId) return locale === "zh-CN" ? "您" : "You";
	return locale === "zh-CN"
		? `成员 ${actorId.slice(-8)}`
		: `Member ${actorId.slice(-8)}`;
};

/** Format organization timestamps identically during SSR and hydration. */
export const formatOrganizationDate = (value: string, locale: Locale = "en") =>
	`${organizationDateFormatters[locale].format(new Date(value))} UTC`;

export const getOrganizationInvitationUrl = (
	origin: string,
	invitationId: string,
) => {
	if (!/^[A-Za-z0-9_-]{8,128}$/.test(invitationId)) return null;
	try {
		const baseURL = new URL(origin);
		if (baseURL.protocol !== "https:" && baseURL.protocol !== "http:") {
			return null;
		}
		return new URL(
			`/accept-invitation/${encodeURIComponent(invitationId)}`,
			baseURL,
		).toString();
	} catch {
		return null;
	}
};
