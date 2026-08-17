"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { getTwoFactorPasswordBody } from "@/lib/security-center";

const disableSchema = z.object({
	password: z.string().min(8, "Password must be at least 8 characters."),
});

type DisableFormValues = z.infer<typeof disableSchema>;

interface TwoFactorDisableFormProps {
	onSuccess?: () => void;
	requiresPassword?: boolean;
}

export function TwoFactorDisableForm({
	onSuccess,
	requiresPassword = true,
}: TwoFactorDisableFormProps) {
	const [loading, startTransition] = useTransition();

	const form = useForm<DisableFormValues>({
		resolver: zodResolver(disableSchema),
		defaultValues: {
			password: "",
		},
	});

	const disableTwoFactor = (password: string) => {
		startTransition(async () => {
			await authClient.twoFactor.disable({
				...getTwoFactorPasswordBody(requiresPassword, password),
				fetchOptions: {
					onSuccess() {
						toast.success("2FA disabled successfully");
						onSuccess?.();
					},
					onError(context) {
						toast.error(context.error.message);
					},
				},
			});
		});
	};

	const onSubmit = (data: DisableFormValues) => {
		disableTwoFactor(data.password);
	};

	if (!requiresPassword) {
		return (
			<div className="flex flex-col gap-4">
				<p className="text-sm text-muted-foreground">
					Your recent passwordless sign-in confirms this security change.
				</p>
				<Button
					type="button"
					variant="destructive"
					disabled={loading}
					onClick={() => disableTwoFactor("")}
				>
					{loading ? (
						<Loader2 size={16} className="animate-spin" />
					) : (
						"Disable 2FA"
					)}
				</Button>
			</div>
		);
	}

	return (
		<form
			onSubmit={form.handleSubmit(onSubmit)}
			className="flex flex-col gap-4"
		>
			<FieldGroup>
				<Controller
					name="password"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="disable-password">Password</FieldLabel>
							<PasswordInput
								{...field}
								id="disable-password"
								placeholder="Enter your password"
								aria-invalid={fieldState.invalid}
								autoComplete="current-password"
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</FieldGroup>
			<Button type="submit" variant="destructive" disabled={loading}>
				{loading ? (
					<Loader2 size={16} className="animate-spin" />
				) : (
					"Disable 2FA"
				)}
			</Button>
		</form>
	);
}
