import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScimPage from "@/app/(admin)/settings/scim/page";
import { useAdminSession } from "@/hooks/use-admin-session";

vi.mock("@/hooks/use-admin-session", () => ({
	useAdminSession: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

const mockSession = vi.mocked(useAdminSession);

function renderPage() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<ScimPage />
		</QueryClientProvider>,
	);
}

describe("ScimPage loading boundaries", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it("disables tenant selection and explains that organizations are loading", () => {
		mockSession.mockReturnValue({
			data: {
				userId: "admin-1",
				role: "super_admin",
				email: "admin@cinaseek.ai",
				impersonatedBy: null,
			},
			isPending: false,
		} as ReturnType<typeof useAdminSession>);
		vi.stubGlobal(
			"fetch",
			vi.fn(() => new Promise<Response>(() => {})),
		);

		renderPage();

		expect(
			screen.getByRole("combobox", { name: "当前选择的组织" }),
		).toBeDisabled();
		expect(screen.getByText("正在加载可用组织…")).toBeInTheDocument();
	});

	it("does not flash a read-only state while the admin session is loading", () => {
		mockSession.mockReturnValue({
			data: undefined,
			isPending: true,
		} as ReturnType<typeof useAdminSession>);
		vi.stubGlobal(
			"fetch",
			vi.fn(() => new Promise<Response>(() => {})),
		);

		renderPage();

		expect(screen.getByText("正在确认管理员权限…")).toBeInTheDocument();
		expect(
			screen.queryByText(
				"你的角色可以查看租户范围内的 SCIM 提供商，但不能修改。",
			),
		).not.toBeInTheDocument();
	});
});
