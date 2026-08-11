"use client";

import { useId, useState, type ReactElement, type ReactNode } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/i18n-context";

/**
 * Destructive-action confirmation dialog (Radix-backed). `trigger` opens it;
 * on confirm, `onConfirm` runs. The trigger is wrapped via `asChild` so the
 * caller's own element receives the click — preserving the original API.
 *
 * The content is a real form so Enter submits consistently. Returning `false`
 * from `onConfirm` keeps the dialog open with the entered values intact.
 */
export function ConfirmDialog({
	trigger,
	title,
	description,
	children,
	confirmText,
	cancelText,
	danger,
	confirmationText,
	confirmationLabel,
	onConfirm,
}: {
	trigger: ReactElement;
	title: string;
	description?: string;
	children?: ReactNode;
	confirmText?: string;
	cancelText?: string;
	danger?: boolean;
	confirmationText?: string;
	confirmationLabel?: string;
	onConfirm: () => unknown | Promise<unknown>;
}) {
	const { t } = useI18n();
	const confirmationInputId = useId();
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [confirmationValue, setConfirmationValue] = useState("");
	const _confirmText = confirmText ?? t("common.confirm");
	const _cancelText = cancelText ?? t("common.cancel");

	const confirm = async () => {
		if (confirmationText && confirmationValue !== confirmationText) return;
		setPending(true);
		setActionError(null);
		try {
			const result = await onConfirm();
			if (result !== false) setOpen(false);
		} catch {
			setActionError(t("toast.actionFailed"));
		} finally {
			setPending(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (pending) return;
				setOpen(nextOpen);
				if (!nextOpen) {
					setActionError(null);
					setConfirmationValue("");
				}
			}}
		>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				<form
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						void confirm();
					}}
				>
					{children && <div className="space-y-3">{children}</div>}
					{confirmationText && (
						<div className="space-y-1.5">
							<Label htmlFor={confirmationInputId}>
								{confirmationLabel ?? `Type ${confirmationText} to confirm`}
							</Label>
							<Input
								id={confirmationInputId}
								value={confirmationValue}
								onChange={(event) => setConfirmationValue(event.target.value)}
								autoComplete="off"
								spellCheck={false}
							/>
						</div>
					)}
					{actionError && (
						<p role="alert" className="text-[13px] leading-5 text-error">
							{actionError}
						</p>
					)}
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="secondary" size="sm" disabled={pending}>
								{_cancelText}
							</Button>
						</DialogClose>
						<Button
							type="submit"
							variant={danger ? "danger" : "primary"}
							size="sm"
							disabled={
								pending ||
								Boolean(
									confirmationText && confirmationValue !== confirmationText,
								)
							}
						>
							{_confirmText}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
