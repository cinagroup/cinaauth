import { describe, expect, it } from "vitest";
import {
	createEmptyDynamicRoleDraft,
	getDynamicRoleDraftError,
	getMemberRoleSelectionError,
	getTeamNameError,
	hasOrganizationPermission,
	toggleRolePermission,
	toRolePermissionPayload,
} from "./advanced-organization-console";

describe("advanced organization console policy", () => {
	it("validates bounded team names", () => {
		expect(getTeamNameError(" Platform ")).toBeNull();
		expect(getTeamNameError(" ")).toBe("Enter a team name.");
		expect(getTeamNameError("x".repeat(65))).toBe(
			"Team names must be 64 characters or less.",
		);
		expect(getTeamNameError("Platform\nAdmin")).toBe(
			"Team names cannot contain control characters.",
		);
	});

	it("normalizes only known permission actions", () => {
		let draft = createEmptyDynamicRoleDraft();
		draft = { ...draft, role: "support_agent" };
		draft = toggleRolePermission(draft, "member", "update", true);
		draft = toggleRolePermission(draft, "member", "update", true);
		draft = toggleRolePermission(draft, "ac", "read", true);

		expect(toRolePermissionPayload(draft.permission)).toEqual({
			member: ["update"],
			ac: ["read"],
		});
	});

	it("rejects static, duplicate, malformed, and empty custom roles", () => {
		const base = createEmptyDynamicRoleDraft();
		expect(
			getDynamicRoleDraftError({
				draft: { ...base, role: "owner", permission: { ac: ["read"] } },
				roles: [],
			}),
		).toBe("Owner, admin, and member are reserved roles.");
		expect(
			getDynamicRoleDraftError({
				draft: {
					...base,
					role: "Support Agent",
					permission: { ac: ["read"] },
				},
				roles: [],
			}),
		).toBe(
			"Role names must start with a letter and use lowercase letters, numbers, hyphens, or underscores.",
		);
		expect(
			getDynamicRoleDraftError({
				draft: {
					...base,
					role: "support_agent",
					permission: { ac: ["read"] },
				},
				roles: [{ role: "support_agent" }],
			}),
		).toBe("That role name already exists.");
		expect(
			getDynamicRoleDraftError({
				draft: { ...base, role: "support_agent" },
				roles: [],
			}),
		).toBe("Select at least one permission.");
	});

	it("protects the final owner while allowing a valid custom assignment", () => {
		expect(
			getMemberRoleSelectionError({
				actorRole: "owner",
				targetRole: "owner",
				selectedRoles: ["support_agent"],
				availableRoles: ["owner", "admin", "member", "support_agent"],
				ownerCount: 1,
			}),
		).toBe("Transfer ownership before removing the final owner role.");
		expect(
			getMemberRoleSelectionError({
				actorRole: "owner",
				targetRole: "member",
				selectedRoles: ["member", "support_agent"],
				availableRoles: ["owner", "admin", "member", "support_agent"],
				ownerCount: 1,
			}),
		).toBeNull();
	});

	it("derives UI capabilities from assigned dynamic roles without bypassing the server", () => {
		const roles = [
			{
				role: "team_lead",
				permission: { team: ["create", "update", "delete"] },
			},
		];
		expect(
			hasOrganizationPermission({
				role: "member,team_lead",
				dynamicRoles: roles,
				resource: "team",
				action: "update",
			}),
		).toBe(true);
		expect(
			hasOrganizationPermission({
				role: "member,team_lead",
				dynamicRoles: roles,
				resource: "ac",
				action: "create",
			}),
		).toBe(false);
	});
});
