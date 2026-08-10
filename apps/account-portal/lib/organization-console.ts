import type { OrganizationRole } from "./auth-api";

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

const organizationDateFormatter = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});

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

export const getOrganizationRoleLabel = (role: string) =>
	parseOrganizationRoles(role)
		.map(
			(item) =>
				STATIC_ROLE_LABELS[item as OrganizationRole] ?? toTitleCase(item),
		)
		.join(" + ") || "No role";

export const getOrganizationAuditActionLabel = (action: string) =>
	ORGANIZATION_AUDIT_ACTION_LABELS[action] ??
	toTitleCase(action.replace(/^org\./, ""));

export const formatOrganizationAuditActor = (
	actorId: string | null,
	currentUserId: string,
) => {
	if (!actorId) return "System";
	if (actorId === currentUserId) return "You";
	return `Member ${actorId.slice(-8)}`;
};

/** Format organization timestamps identically during SSR and hydration. */
export const formatOrganizationDate = (value: string) =>
	`${organizationDateFormatter.format(new Date(value))} UTC`;

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
