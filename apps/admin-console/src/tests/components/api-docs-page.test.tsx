import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ApiDocsPage from "@/app/(admin)/api-docs/page";

const schema = {
	openapi: "3.1.1",
	info: { title: "CinaSeek Identity", version: "1.1.0" },
	paths: {
		"/sign-in/email": {
			post: { summary: "Sign in with email", tags: ["Authentication"] },
		},
		"/get-session": {
			get: { summary: "Get current session", tags: ["Session"] },
		},
	},
	components: { schemas: { Session: {}, User: {} } },
};

function renderPage() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<ApiDocsPage />
		</QueryClientProvider>,
	);
}

describe("ApiDocsPage", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders same-origin searchable OpenAPI operations without an iframe", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				Response.json({ ok: true, data: schema }, { status: 200 }),
			);
		vi.stubGlobal("fetch", fetchMock);

		const { container } = renderPage();

		expect(await screen.findByText("/sign-in/email")).toBeInTheDocument();
		expect(screen.getByText("/get-session")).toBeInTheDocument();
		expect(container.querySelector("iframe")).toBeNull();
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/admin/openapi",
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);

		fireEvent.change(screen.getByRole("searchbox"), {
			target: { value: "session" },
		});

		await waitFor(() =>
			expect(screen.queryByText("/sign-in/email")).not.toBeInTheDocument(),
		);
		expect(screen.getByText("/get-session")).toBeInTheDocument();
	});
});
