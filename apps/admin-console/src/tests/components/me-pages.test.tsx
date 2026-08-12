import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeAreaPage, MeOverviewPage } from "@/components/me/me-pages";
import { useAdminSession } from "@/hooks/use-admin-session";
import type { AdminSession } from "@/lib/cinaauth/types";

vi.mock("@/hooks/use-admin-session", () => ({
	useAdminSession: vi.fn(),
}));

const mockSession = vi.mocked(useAdminSession);
const admin: AdminSession = {
	userId: "admin-1",
	role: "super_admin",
	email: "admin@cinaseek.ai",
	impersonatedBy: null,
};

describe("administrator account handoff", () => {
	beforeEach(() => {
		mockSession.mockReturnValue({ data: admin } as ReturnType<
			typeof useAdminSession
		>);
	});

	it("uses the canonical Accounts route for a verified administrator session", () => {
		render(<MeAreaPage sectionKey="security" />);

		expect(screen.getByRole("link", { name: "打开 Accounts" })).toHaveAttribute(
			"href",
			"https://accounts.cinaseek.ai/dashboard/security",
		);
	});

	it("renders the administrator account overview without creating a direct write surface", () => {
		render(<MeOverviewPage />);

		expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
		expect(screen.getByText("admin@cinaseek.ai")).toBeInTheDocument();
		expect(screen.getByText("super_admin")).toBeInTheDocument();
		expect(screen.getAllByRole("link")).toHaveLength(5);
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("does not render a self-service link while impersonating", () => {
		mockSession.mockReturnValue({
			data: { ...admin, role: "user", impersonatedBy: "actor-admin" },
		} as ReturnType<typeof useAdminSession>);

		const { container } = render(<MeAreaPage sectionKey="privacy" />);

		expect(
			screen.getByText("模拟用户期间暂停 Accounts 跳转"),
		).toBeInTheDocument();
		expect(
			container.querySelector('a[href^="https://accounts.cinaseek.ai"]'),
		).toBeNull();
		expect(
			screen.getByRole("button", { name: /停止模拟后继续/ }),
		).toBeDisabled();
	});
});
