import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoleGuard } from "@/components/role-guard";

const sessionState = vi.hoisted(() => ({
	role: "user, super_admin",
}));

vi.mock("@/hooks/use-admin-session", () => ({
	useAdminSession: () => ({ data: { role: sessionState.role } }),
}));

describe("RoleGuard", () => {
	it("honors comma-separated administrator roles", async () => {
		render(
			<RoleGuard allow={["super_admin"]} fallback={<span>Denied</span>}>
				<span>Allowed</span>
			</RoleGuard>,
		);

		expect(await screen.findByText("Allowed")).toBeInTheDocument();
		expect(screen.queryByText("Denied")).not.toBeInTheDocument();
	});
});
