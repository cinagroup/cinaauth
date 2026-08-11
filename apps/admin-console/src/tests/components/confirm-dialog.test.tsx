import { readFileSync } from "node:fs";
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

	it("blocks a destructive action until the exact confirmation phrase is typed", async () => {
		const onConfirm = vi.fn(async () => undefined);
		render(
			<ConfirmDialog
				trigger={<Button>Delete account</Button>}
				title="Delete account"
				danger
				confirmText="Confirm"
				confirmationText="user-123"
				confirmationLabel="Type user-123 to confirm"
				onConfirm={onConfirm}
			/>,
		);

		fireEvent.click(screen.getByText("Delete account"));
		const submit = screen.getByRole("button", { name: "Confirm" });
		expect(submit).toBeDisabled();

		fireEvent.change(screen.getByLabelText("Type user-123 to confirm"), {
			target: { value: "USER-123" },
		});
		expect(submit).toBeDisabled();

		fireEvent.change(screen.getByLabelText("Type user-123 to confirm"), {
			target: { value: "user-123" },
		});
		expect(submit).toBeEnabled();
		fireEvent.click(submit);

		await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
	});

	it("requires typed confirmation for permanent user, organization, and batch deletion", () => {
		for (const path of [
			"src/app/(admin)/users/[id]/user-actions.tsx",
			"src/app/(admin)/organizations/[id]/page.tsx",
			"src/components/data-table/batch-action-bar.tsx",
		]) {
			const source = readFileSync(path, "utf8");
			expect(source, path).toContain("confirmationText=");
			expect(source, path).toContain("common.typeToConfirm");
		}
	});
});
