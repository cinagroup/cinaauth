import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

describe("ConfirmDialog", () => {
	it("does not nest the trigger button and waits for confirmation to finish", async () => {
		let finish: (() => void) | undefined;
		const onConfirm = vi.fn(
			() => new Promise<void>((resolve) => {
				finish = resolve;
			}),
		);
		const { container } = render(
			<ConfirmDialog
				trigger={<Button>Open</Button>}
				title="Confirm action"
				confirmText="Continue"
				onConfirm={onConfirm}
			/>,
		);

		expect(container.querySelector("button button")).toBeNull();
		fireEvent.click(screen.getByText("Open"));
		fireEvent.click(screen.getByText("Continue"));
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(screen.getByText("Confirm action")).toBeTruthy();

		await act(async () => finish?.());
		await waitFor(() => expect(screen.queryByText("Confirm action")).toBeNull());
	});

	it("submits as a form and preserves values when the action reports failure", async () => {
		const onConfirm = vi.fn(async () => false);
		render(
			<ConfirmDialog
				trigger={<Button>Open retry</Button>}
				title="Retry action"
				confirmText="Submit"
				onConfirm={onConfirm}
			>
				<input aria-label="Name" required defaultValue="Cina" />
			</ConfirmDialog>,
		);

		fireEvent.click(screen.getByText("Open retry"));
		fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

		await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
		expect(screen.getByText("Retry action")).toBeTruthy();
		expect(screen.getByLabelText("Name")).toHaveValue("Cina");
	});
});
