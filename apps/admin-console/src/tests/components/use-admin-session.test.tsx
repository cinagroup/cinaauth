import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useAdminSession } from "@/hooks/use-admin-session";
import type { AdminSession } from "@/lib/cinaauth/types";

describe("useAdminSession", () => {
	it("uses the server-authoritative session without a duplicate first-load request", () => {
		const initialSession: AdminSession = {
			userId: "admin-1",
			role: "super_admin",
			email: "admin@cinaseek.ai",
			impersonatedBy: null,
		};
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});

		const { result } = renderHook(() => useAdminSession(initialSession), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			),
		});

		expect(result.current.data).toEqual(initialSession);
		expect(result.current.isPending).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
