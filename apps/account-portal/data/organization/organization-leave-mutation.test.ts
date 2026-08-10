import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	leave: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
	authClient: {
		organization: {
			leave: mocks.leave,
		},
	},
}));

import { leaveOrganization } from "./organization-leave-mutation";

describe("leaveOrganization", () => {
	beforeEach(() => {
		mocks.leave.mockReset();
	});

	it("calls the authoritative organization leave endpoint", async () => {
		const member = { id: "member-1", organizationId: "organization-1" };
		mocks.leave.mockResolvedValue({ data: member, error: null });

		await expect(
			leaveOrganization({ organizationId: "organization-1" }),
		).resolves.toBe(member);
		expect(mocks.leave).toHaveBeenCalledWith({
			organizationId: "organization-1",
		});
	});

	it("surfaces the server policy error", async () => {
		mocks.leave.mockResolvedValue({
			data: null,
			error: { message: "Transfer ownership before leaving" },
		});

		await expect(
			leaveOrganization({ organizationId: "organization-1" }),
		).rejects.toThrow("Transfer ownership before leaving");
	});
});
