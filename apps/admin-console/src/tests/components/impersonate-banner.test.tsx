import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImpersonateBanner } from "@/components/layout/impersonate-banner";

vi.mock("@/hooks/use-admin-session", () => ({
	useAdminSession: () => ({
		data: {
			userId: "target-user",
			email: "target@cina.test",
			role: "user",
			impersonatedBy: "admin-user",
		},
	}),
}));

describe("ImpersonateBanner", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("keeps the banner visible and reports a failed stop request", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ ok: false }), {
					status: 502,
					headers: { "content-type": "application/json" },
				}),
			),
		);

		render(<ImpersonateBanner onStopped={vi.fn()} />);
		fireEvent.click(screen.getByRole("button", { name: "停止模拟" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"无法停止模拟登录，请重试。",
		);
		expect(screen.getByText(/target@cina\.test/)).toBeInTheDocument();
	});

	it("reloads only after the server confirms restoration", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
			),
		);
		const onStopped = vi.fn();

		render(<ImpersonateBanner onStopped={onStopped} />);
		fireEvent.click(screen.getByRole("button", { name: "停止模拟" }));

		await waitFor(() => expect(onStopped).toHaveBeenCalledTimes(1));
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});
