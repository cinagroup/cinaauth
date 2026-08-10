export const ORGANIZATION_PERMISSION_STATEMENT = {
	organization: ["update", "delete"],
	member: ["create", "update", "delete"],
	invitation: ["create", "cancel"],
	team: ["create", "update", "delete"],
	ac: ["create", "read", "update", "delete"],
} as const;

export type OrganizationPermissionResource =
	keyof typeof ORGANIZATION_PERMISSION_STATEMENT;

export type OrganizationPermissionMap = Partial<
	Record<OrganizationPermissionResource, string[]>
>;

export type DynamicRoleDraft = {
	role: string;
	permission: OrganizationPermissionMap;
};

export type OrganizationTeamSummary = {
	id: string;
	name: string;
	organizationId: string;
	createdAt: string;
	updatedAt: string | null;
};

export type OrganizationDynamicRoleSummary = {
	id: string;
	organizationId: string;
	role: string;
	permission: OrganizationPermissionMap;
	createdAt: string;
	updatedAt: string | null;
};

export const ORGANIZATION_PERMISSION_RESOURCES = Object.keys(
	ORGANIZATION_PERMISSION_STATEMENT,
) as OrganizationPermissionResource[];

const RESERVED_ROLE_NAMES = new Set(["owner", "admin", "member"]);
const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_-]{1,31}$/;

const STATIC_ROLE_PERMISSIONS: Record<
	"owner" | "admin" | "member",
	OrganizationPermissionMap
> = {
	owner: {
		organization: ["update", "delete"],
		member: ["create", "update", "delete"],
		invitation: ["create", "cancel"],
		team: ["create", "update", "delete"],
		ac: ["create", "read", "update", "delete"],
	},
	admin: {
		organization: ["update"],
		member: ["create", "update", "delete"],
		invitation: ["create", "cancel"],
		team: ["create", "update", "delete"],
		ac: ["create", "read", "update", "delete"],
	},
	member: { ac: ["read"] },
};

const parseRoles = (value: string) =>
	value
		.split(",")
		.map((role) => role.trim())
		.filter(Boolean);

export const createEmptyDynamicRoleDraft = (): DynamicRoleDraft => ({
	role: "",
	permission: {},
});

export const getTeamNameError = (value: string): string | null => {
	const name = value.trim();
	if (!name) return "Enter a team name.";
	if (name.length > 64) return "Team names must be 64 characters or less.";
	if (/\p{Cc}/u.test(name)) {
		return "Team names cannot contain control characters.";
	}
	return null;
};

export const toggleRolePermission = <
	Resource extends OrganizationPermissionResource,
>(
	draft: DynamicRoleDraft,
	resource: Resource,
	action: (typeof ORGANIZATION_PERMISSION_STATEMENT)[Resource][number],
	enabled: boolean,
): DynamicRoleDraft => {
	const selected = new Set(draft.permission[resource] ?? []);
	if (enabled) selected.add(action);
	else selected.delete(action);
	const allowed = ORGANIZATION_PERMISSION_STATEMENT[
		resource
	] as readonly string[];

	return {
		...draft,
		permission: {
			...draft.permission,
			[resource]: allowed.filter((candidate) => selected.has(candidate)),
		},
	};
};

export const toRolePermissionPayload = (
	permission: OrganizationPermissionMap,
): OrganizationPermissionMap => {
	const normalized: OrganizationPermissionMap = {};
	for (const resource of ORGANIZATION_PERMISSION_RESOURCES) {
		const selected = new Set(permission[resource] ?? []);
		const allowed = ORGANIZATION_PERMISSION_STATEMENT[
			resource
		] as readonly string[];
		const actions = allowed.filter((action) => selected.has(action));
		if (actions.length > 0) normalized[resource] = actions;
	}
	return normalized;
};

export const getDynamicRoleDraftError = ({
	draft,
	roles,
	editingRole,
}: {
	draft: DynamicRoleDraft;
	roles: Array<{ role: string }>;
	editingRole?: string;
}): string | null => {
	const role = draft.role.trim();
	if (!role) return "Enter a role name.";
	if (RESERVED_ROLE_NAMES.has(role)) {
		return "Owner, admin, and member are reserved roles.";
	}
	if (!ROLE_NAME_PATTERN.test(role)) {
		return "Role names must start with a letter and use lowercase letters, numbers, hyphens, or underscores.";
	}
	if (
		role !== editingRole &&
		roles.some((candidate) => candidate.role === role)
	) {
		return "That role name already exists.";
	}
	if (Object.keys(toRolePermissionPayload(draft.permission)).length === 0) {
		return "Select at least one permission.";
	}
	return null;
};

export const hasOrganizationPermission = ({
	role,
	dynamicRoles,
	resource,
	action,
}: {
	role: string;
	dynamicRoles: Array<{
		role: string;
		permission: OrganizationPermissionMap;
	}>;
	resource: OrganizationPermissionResource;
	action: string;
}) =>
	parseRoles(role).some((roleName) => {
		if (roleName === "owner" || roleName === "admin" || roleName === "member") {
			return STATIC_ROLE_PERMISSIONS[roleName][resource]?.includes(action);
		}
		return dynamicRoles
			.find((candidate) => candidate.role === roleName)
			?.permission[resource]?.includes(action);
	});

export const getMemberRoleSelectionError = ({
	actorRole,
	targetRole,
	selectedRoles,
	availableRoles,
	ownerCount,
	actorCanManage,
}: {
	actorRole: string;
	targetRole: string;
	selectedRoles: string[];
	availableRoles: string[];
	ownerCount: number;
	actorCanManage?: boolean;
}): string | null => {
	const selected = [
		...new Set(selectedRoles.map((role) => role.trim())),
	].filter(Boolean);
	if (selected.length === 0) return "Select at least one role.";
	const available = new Set(availableRoles);
	if (selected.some((role) => !available.has(role))) {
		return "One or more selected roles are no longer available.";
	}
	const actorRoles = new Set(parseRoles(actorRole));
	const targetRoles = new Set(parseRoles(targetRole));
	const actorIsOwner = actorRoles.has("owner");
	const canManage = actorCanManage ?? (actorIsOwner || actorRoles.has("admin"));
	if (!canManage) return "You cannot change organization roles.";
	if (targetRoles.has("owner") && !actorIsOwner) {
		return "Only an owner can change another owner role.";
	}
	if (selected.includes("owner") && !actorIsOwner) {
		return "Only an owner can assign the owner role.";
	}
	if (
		targetRoles.has("owner") &&
		ownerCount <= 1 &&
		!selected.includes("owner")
	) {
		return "Transfer ownership before removing the final owner role.";
	}
	return null;
};
