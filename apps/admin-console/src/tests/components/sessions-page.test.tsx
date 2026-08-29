import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SessionsPage from "@/app/(admin)/sessions/page";

vi.mock("@/components/role-guard", () => ({
	RoleGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

describe("SessionsPage", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders the global inventory and revokes by non-secret session id", async () => {
		const fetchMock = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input);
				if (url.startsWith("/api/admin/sessions?")) {
					return new Response(
						JSON.stringify({
							ok: true,
							data: {
								sessions: [
									{
										id: "session-2",
										userId: "user-2",
										createdAt: "2026-08-29T00:00:00.000Z",
										expiresAt: "2026-09-29T00:00:00.000Z",
										ipAddress: "203.0.113.8",
										userAgent: "Test Browser",
									},
								],
								total: 1,
							},
						}),
						{ status: 200, headers: { "content-type": "application/json" } },
					);
				}
				if (url === "/api/admin/sessions/revoke" && init?.method === "POST") {
					return new Response(JSON.stringify({ ok: true }), {
						status: 200,
						headers: { "content-type": "application/json" },
					});
				}
				return new Response(JSON.stringify({ ok: false }), { status: 404 });
			},
		);
		vi.stubGlobal("fetch", fetchMock);
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});

		render(
			<QueryClientProvider client={queryClient}>
				<SessionsPage />
			</QueryClientProvider>,
		);

		expect(await screen.findByRole("link", { name: "user-2" })).toHaveAttribute(
			"href",
			"/users/user-2",
		);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/admin/sessions?limit=50&offset=0&activeOnly=true",
			undefined,
		);

		fireEvent.click(screen.getByRole("button", { name: "撤销" }));
		fireEvent.click(screen.getByRole("button", { name: "确认撤销" }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/admin/sessions/revoke",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ sessionId: "session-2" }),
				}),
			),
		);
	});
});
