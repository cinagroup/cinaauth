"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
	classifyTwoFactorVerificationData,
	getTwoFactorErrorMessage,
} from "@/lib/two-factor-verification";

const backupCodeSchema = z.object({
	code: z.string().trim().min(1, "Enter one of your backup codes."),
});

type BackupCodeFormValues = z.infer<typeof backupCodeSchema>;

interface TwoFactorBackupCodeFormProps {
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

export function TwoFactorBackupCodeForm({
	onSuccess,
	onError,
}: TwoFactorBackupCodeFormProps) {
	const [loading, startTransition] = useTransition();
	const [isVerified, setIsVerified] = useState(false);
	const form = useForm<BackupCodeFormValues>({
		resolver: zodResolver(backupCodeSchema),
		defaultValues: { code: "" },
	});

	const onSubmit = (data: BackupCodeFormValues) => {
		startTransition(async () => {
			try {
				const response = await authClient.twoFactor.verifyBackupCode({
					code: data.code.trim(),
					fetchOptions: { throw: true },
				});
				const outcome = classifyTwoFactorVerificationData(response);
				if (outcome === "session") {
					setIsVerified(true);
					onSuccess?.();
					return;
				}
				if (outcome === "redirect") return;
				throw new Error("Invalid backup code");
			} catch (error) {
				const errorMessage = getTwoFactorErrorMessage(
					error,
					"Invalid backup code",
				);
				onError?.(errorMessage);
				form.setError("code", { message: errorMessage });
			}
		});
	};

	if (isVerified) {
		return (
			<div className="flex flex-col items-center justify-center space-y-2 py-4">
				<CheckCircle2 className="h-12 w-12 text-green-500" />
				<p className="text-lg font-semibold">Verification successful</p>
			</div>
		);
	}

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
			<FieldGroup>
				<Controller
					name="code"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="backup-code">Backup code</FieldLabel>
							<Input
								{...field}
								id="backup-code"
								type="text"
								placeholder="Enter a saved backup code"
								autoComplete="one-time-code"
								aria-invalid={fieldState.invalid}
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</FieldGroup>
			<Button type="submit" className="w-full" disabled={loading}>
				{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
			</Button>
		</form>
	);
}
