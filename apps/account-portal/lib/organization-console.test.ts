import { describe, expect, it } from "vitest";
import {
	canAssignOrganizationRole,
	canLeaveOrganization,
	canManageOrganizationMember,
	formatOrganizationAuditActor,
	formatOrganizationDate,
	getOrganizationAuditActionLabel,
	getOrganizationInvitationUrl,
	getOrganizationPermissions,
	getOrganizationRoleLabel,
	parseOrganizationRoles,
} from "./organization-console";

describe("organization console policy helpers", () => {
	it("normalizes comma-separated roles and removes duplicates", () => {
		expect(parseOrganizationRoles("member, admin,member")).toEqual([
			"member",
			"admin",
		]);
		expect(parseOrganizationRoles("  ")).toEqual([]);
	});

	it("derives permissions from the strongest static role", () => {
		expect(getOrganizationPermissions("member")).toEqual({
			canManageMembers: false,
			canManageInvitations: false,
			canAssignOwner: false,
		});
		expect(getOrganizationPermissions("member,admin")).toEqual({
			canManageMembers: true,
			canManageInvitations: true,
			canAssignOwner: false,
		});
		expect(getOrganizationPermissions("owner")).toEqual({
			canManageMembers: true,
			canManageInvitations: true,
			canAssignOwner: true,
		});
	});

	it("prevents administrators from changing owners or assigning owner", () => {
		expect(canManageOrganizationMember("admin", "owner")).toBe(false);
		expect(canManageOrganizationMember("admin", "member")).toBe(true);
		expect(canManageOrganizationMember("owner", "owner")).toBe(true);
		expect(canManageOrganizationMember("member", "member")).toBe(false);
		expect(canAssignOrganizationRole("admin", "owner")).toBe(false);
		expect(canAssignOrganizationRole("admin", "admin")).toBe(true);
		expect(canAssignOrganizationRole("owner", "owner")).toBe(true);
	});

	it("prevents the only owner from leaving while allowing other members", () => {
		expect(canLeaveOrganization("owner", 1)).toBe(false);
		expect(canLeaveOrganization("owner,admin", 1)).toBe(false);
		expect(canLeaveOrganization("owner", 2)).toBe(true);
		expect(canLeaveOrganization("admin", 1)).toBe(true);
		expect(canLeaveOrganization("member", 1)).toBe(true);
		expect(canLeaveOrganization("", 1)).toBe(false);
	});

	it("formats multi-role labels and timestamps deterministically", () => {
		expect(getOrganizationRoleLabel("owner,admin")).toBe("Owner + Admin");
		expect(getOrganizationRoleLabel("custom-role")).toBe("Custom Role");
		expect(formatOrganizationDate("2026-01-02T03:04:00.000Z")).toBe(
			"Jan 2, 2026, 3:04 AM UTC",
		);
	});

	it("formats tenant audit actions without exposing full actor identifiers", () => {
		expect(getOrganizationAuditActionLabel("org.member_role_update")).toBe(
			"Member role updated",
		);
		expect(getOrganizationAuditActionLabel("org.custom_action")).toBe(
			"Custom Action",
		);
		expect(
			formatOrganizationAuditActor("user-1234567890", "current-user"),
		).toBe("Member 34567890");
		expect(formatOrganizationAuditActor("current-user", "current-user")).toBe(
			"You",
		);
		expect(formatOrganizationAuditActor(null, "current-user")).toBe("System");
	});

	it("builds invitation links only from web origins and opaque identifiers", () => {
		expect(
			getOrganizationInvitationUrl(
				"https://auth.cinaseek.ai",
				"invitation_123456",
			),
		).toBe("https://auth.cinaseek.ai/accept-invitation/invitation_123456");
		expect(
			getOrganizationInvitationUrl("javascript:alert(1)", "invitation_123456"),
		).toBeNull();
		expect(
			getOrganizationInvitationUrl(
				"https://auth.cinaseek.ai",
				"../../security",
			),
		).toBeNull();
	});
});
